import {Query} from "./query.mjs"

export async function runQuery(reader, spec, logger){
  try{
    let cache = new Cache(reader, logger)
    let query = new Query(spec, cache)
    await query.init();
    let result = query.run();
    query.dataSources.forEach(ds => console.log(ds.name, ds.results))
    return result;
  } catch(err){
    throw err
  }
}

class Cache{
  logTexts = [];
  constructor(reader, logger){
    this.reader = reader
    this.logger = logger
    this.cacheRecords = new Map()
    this.cacheMeta = new Map()
  }
  async getRecords(tabName){
    if(this.cacheRecords.has(tabName)) return this.cacheRecords.get(tabName)
    this.log(`Fetching ${this.reader.tables[tabName]?.recordCount?.toLocaleString()||"N/A"} records from table ${tabName}...`)
    let rows = await this.reader.getAllRecords(tabName)
    this.log(`Finished retrieving ${rows.length} rows from ${tabName}`)
    this.cacheRecords.set(tabName, rows)
    return rows
  }

  async getFields(tabName){
    if(this.cacheMeta.has(tabName)) return this.cacheMeta.get(tabName)
    await this.reader.fillTableMetadata(tabName)
    let meta = this.reader.tables[tabName];
    this.cacheMeta.set(tabName, meta)
    return meta.fields
  }

  hasTable(tabName){
    return this.reader.tables[tabName] !== undefined
  }

  log(text){
    this.logTexts.push(text)
    if(typeof this.logger === "function"){
      this.logger(text)
    }
  }
}

export function valueToString(value){
  if(value === undefined || value === null) return "";
  if(typeof value === "number") return value.toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2})
  if(Array.isArray(value)) return JSON.stringify(value);
  return value;
}