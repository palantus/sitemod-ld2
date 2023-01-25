export class Query{
  dataSources = [];
  mainDS = null;
  
  constructor(spec, cache){
    this.cache = cache;

    for(let dsSpec of spec.dataSources){
      let ds = new DataSource(dsSpec)
      this.dataSources.push(ds)
      if(ds.name == spec.mainDS){
        this.mainDS = ds
      }
    }
  }

  async init(reader){
    this.sortDataSources();

    for(let ds of this.dataSources){
      let records = await this.cache.getRecords(ds.table)
      let metaFields = await this.cache.getFields(ds.table)
      ds.init(this, records, metaFields)
    }
  }

  run(){
    for(let ds of this.dataSources){
      ds.run()

      if(ds.name == this.mainDS){
        return ds.result
      }
    }
    return null;
  }

  sortDataSources(){
    let sortedDataSources = []
    let addedThisIteration = null;
    let addedDS = new Set();
    while(sortedDataSources.length < this.dataSources.length || addedThisIteration === null || addedThisIteration > 0){
      addedThisIteration = 0;
      for(let ds of this.dataSources){
        if(addedDS.has(ds.name)) continue;
        if(ds.dsDependencies.size > 0){
          if([...ds.dsDependencies].find(name => !addedDS.has(name))){
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
    }

    if(spec.join?.ds && spec.join.ds != this.name) this.dsDependencies.add(spec.join.ds);
  }

  init(query, records, metaFields){
    this.sourceRecords = records;
    this.metaFields = metaFields;

    for(let field of this.fields){
      field.init(this, query)
    }
  }

  run(){
    this.results = this.sourceRecords

    if(this.conditions){
      this.results = this.results.filter(r => this.conditions.check(r))
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
  }

  init(ds, query){

  }

  fill(record, sourceRecord){
    record[this.name] = sourceRecord[this.field]
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
    switch(this.spec.type){
      case "range":
        let val = record[this.spec.field]
        if(this.spec.from && val < this.spec.from) return false;
        if(this.spec.to && val > this.spec.to) return false;
        break;
    }
    return true;
  }
}

class DataSourceGroupBy{
  constructor(spec){
    this.spec = spec
    this.fields = spec.fields
    this.sum = spec.sum||null
  }

  run(records){
    let groups = new Map()
    for(let record of records){
      let key = this.fields.map(f => record[f]).join("--");
      let group;
      if(groups.has(key)){
        group = groups.get(key);
      } else {
        group = {}
        for(let f of this.fields){
          group[f] = record[f]
        }
        groups.set(key, group)
      }
      
      if(this.sum){
        for(let f of this.sum){
          if(group[f] === undefined) group[f] = 0;
          if(isNaN(record[f])) continue;
          group[f] += record[f]
        }
      }
    }
    return [...groups.values()]
  }
}