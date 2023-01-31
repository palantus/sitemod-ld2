export class Query{
  dataSources = [];
  mainDS = null;
  
  constructor(spec, cache){
    this.cache = cache;

    if(!spec.dataSources || spec.dataSources.length < 1) 
      throw "Queries must have at least one datasource"

    for(let dsSpec of spec.dataSources){
      let ds = new DataSource(dsSpec)
      this.dataSources.push(ds)
      if(ds.name == spec.mainDS){
        this.mainDS = ds
      }
    }
    if(!spec.mainDS) {
      this.mainDS = spec.dataSources[0]
    }
    if(!this.mainDS) {
      throw "Missing or invalid main data source"
    }
  }

  async init(){
    this.cache.log("Initializing query")
    this.sortDataSources();

    for(let ds of this.dataSources){
      if(!ds.table) throw "Missing table on data source " + ds.name
      if(!this.cache.hasTable(ds.table)) throw `Unknown table ${ds.table} on data source ${ds.name}`
      let records = await this.cache.getRecords(ds.table)
      let metaFields = await this.cache.getFields(ds.table)
      ds.init(this, records, metaFields)
    }
  }

  run(){
    this.cache.log("Running query")
    for(let ds of this.dataSources){
      this.cache.log(`Executing data source ${ds.name}`)
      ds.run()

      if(ds.name == this.mainDS.name){
        return ds.results
      }
    }
    this.cache.log("Finished running query")
    return null;
  }

  sortDataSources(){
    let sortedDataSources = []
    let addedThisIteration = null;
    let addedDS = new Set();
    while(sortedDataSources.length < this.dataSources.length && (addedThisIteration === null || addedThisIteration > 0)){
      addedThisIteration = 0;
      for(let ds of this.dataSources){
        if(addedDS.has(ds.name)) continue;
        if(ds.dsDependencies.size > 0){
          let unmetDependency = [...ds.dsDependencies].find(name => !addedDS.has(name))
          if(unmetDependency){
            if(!this.dataSources.find(ds => ds.name == unmetDependency)) throw `Data source ${unmetDependency} doesn't exist. The data source ${ds.name} depends on it.`
            continue;
          }
        }

        sortedDataSources.push(ds)
        addedDS.add(ds.name)
        addedThisIteration++;
      }
    }

    if(sortedDataSources.length != this.dataSources.length){
      throw "Could not sort datasources, which might be due to circular dependencies"
    }

    this.dataSources = sortedDataSources;
  }
}

class DataSource{
  dsDependencies = new Set();
  sourceRecords = null;
  metaFields = null;
  fields = [];
  results = null;
  conditions = null;
  groupBy = null;

  constructor(spec){
    this.spec = spec
    this.name = spec.name;
    this.table = spec.table;

    for(let fieldSpec of this.spec.fields||[]){
      let field = new DataSourceField(fieldSpec);
      this.fields.push(field)
      if(fieldSpec.ds && fieldSpec.ds != this.name) this.dsDependencies.add(fieldSpec.ds);
    }

    if(spec.where){
      this.conditions = new DataSourceConditions(spec.where);
    }

    if(spec.groupBy){
      this.groupBy = new DataSourceGroupBy(spec.groupBy);

      // Add fields automatically
      for(let g of spec.groupBy.fields||[]){
        if(this.fields.find(f => f.name == (g.name||g.field))) continue;
        let field = new DataSourceField({field: g.name||g.field});
        this.fields.push(field)
      }

      // Add fields from aggregates automatically
      for(let agg of spec.groupBy.aggregate||[]){
        if(this.fields.find(f => f.name == (agg.name||agg.field))) continue;
        let field = new DataSourceField({field: agg.name||agg.field});
        this.fields.push(field)
      }
    }

    if(spec.join){
      this.join = new DataSourceJoin(spec.join);
      if(spec.join.ds != this.name) this.dsDependencies.add(spec.join.ds);
    }
  }

  init(query, records, metaFields){
    if(this.fields.length < 1){
      for(let metaField of metaFields){
        let field = new DataSourceField({field: metaField.name});
        this.fields.push(field)
      }
    }

    this.sourceRecords = records;
    this.metaFields = metaFields;

    for(let field of this.fields){
      field.init(query)
    }

    this.join?.init(query)
  }

  run(){
    this.results = this.sourceRecords

    if(this.conditions){
      this.results = this.results.filter(r => this.conditions.check(r))
    }

    if(this.join){
      this.results = this.join.run(this.results);
    }

    if(this.groupBy){
      this.results = this.groupBy.run(this.results);
    }

    this.results = this.results.map(r => {
      let record = {}
      for(let field of this.fields){
        field.fill(record, r)
      }
      return record;
    })
  }
}

class DataSourceField{

  constructor(spec){
    this.spec = spec
    this.name = spec.name || spec.field;
    this.field = spec.field

    if(spec.where){
      this.conditions = new DataSourceConditions(spec.where);
    }
  }

  init(query){
    this.query = query
    if(this.spec.ds){
      this.ds = query.dataSources.find(ds => ds.name == this.spec.ds)
      if(!this.ds) throw `Data source ${this.spec.ds} on field ${this.name} doesn't exist`
    }
    if(!this.field) throw "Missing field on datasource field";
  }

  fill(record, sourceRecord){
    if(!this.ds){
      record[this.name] = sourceRecord[this.field]
      return;
    }

    let remoteRecords = this.ds.results

    if(this.conditions){
      remoteRecords = remoteRecords.filter(r => this.conditions.check(r))
    }

    if(this.spec.on){
      let key = this.spec.on.map(f => sourceRecord[f.this]).join("--");
      remoteRecords = remoteRecords.filter(r => this.spec.on.map(f => r[f.remote]).join("--") == key)
    }

    switch(this.spec.type){
      case "first":
        record[this.name] = remoteRecords[0]?.[this.field] || null
        break;
      case "last":
        record[this.name] = remoteRecords[remoteRecords.length - 1]?.[this.field] || null
        break;
      case "sum":
        record[this.name] = remoteRecords.reduce((sum, cur) => sum + (cur[this.field]||0), 0)||0;
        break;
      case "count":
        record[this.name] = remoteRecords.length;
        break;
      default: 
        throw "Unsupported ds field type: " + this.spec.type
    }
  }
}

class DataSourceConditions{
  conditions = []

  constructor(spec){
    this.spec = spec

    for(let conditionSpec of spec||[]){
      let condition = new DataSourceCondition(conditionSpec);
      this.conditions.push(condition)
    }
  }

  check(record){
    for(let condition of this.conditions){
      if(!condition.check(record)) return false;
    }
    return true;
  }
}

class DataSourceCondition{

  constructor(spec){
    this.spec = spec
  }

  check(record){
    let val = record[this.spec.field]
    switch(this.spec.type){
      case "range":
        if(this.spec.from && val < this.spec.from) return false;
        if(this.spec.to && val > this.spec.to) return false;
        break;
      case "fixed":
        if(this.spec.value != val) return false;
        break;
      case "fixed-not":
        if(this.spec.value == val) return false;
        break;
      default: 
        throw "Unsupported condition type: " + this.spec.type
    }
    return true;
  }
}

class DataSourceGroupBy{
  constructor(spec){
    this.spec = spec
    this.fields = spec.fields
    this.aggregate = spec.aggregate||null
  }

  run(records){
    let groups = new Map()
    for(let record of records){
      let key = this.fields.map(f => record[f.field]).join("--");
      let group;
      if(groups.has(key)){
        group = groups.get(key);
      } else {
        group = {}
        for(let f of this.fields){
          group[f.name||f.field] = record[f.field]
        }
        groups.set(key, group)
      }
      
      for(let agg of this.aggregate||[]){
        let name = agg.name||agg.field
        switch(agg.type){
          case "sum":
            if(group[name] === undefined) group[name] = 0;
            if(isNaN(record[agg.field])) continue;
            group[name] += record[agg.field]
            break;
          case "count":
            if(group[name] === undefined) group[name] = 0;
            group[name] += 1
            break;
          case "first":
            if(group[name] === undefined) group[name] = record[agg.field];
            break;
          case "last":
            group[name] = record[agg.field];
            break;
        }
      }
    }
    return [...groups.values()]
  }
}

class DataSourceJoin{
  constructor(spec){
    this.spec = spec
    this.type = spec.type
    this.on = spec.on
  }

  init(query){
    this.query = query
    this.ds = query.dataSources.find(ds => ds.name == this.spec.ds)
    if(!this.type) throw "Missing type in datasource join";
    if(!this.ds) throw "Missing ds in datasource join";
    if(!this.on || this.on.length < 1) throw "Missing on in datasource join";
  }

  run(records){
    switch(this.type){
      case "exist":
        return this.runExist(records);
      default: 
        throw "Unsupported join type: " + this.type
    }
  }

  runExist(records){
    let remoteRecords = this.ds.results||[]
    let genKeyRemote = record => this.on.map(f => record[f.remote]).join("--");
    let genKeyThis = record => this.on.map(f => record[f.this]).join("--");
    let remoteKeys = new Set(remoteRecords.map(genKeyRemote));
    return records.filter(record => remoteKeys.has(genKeyThis(record)))
  }
}