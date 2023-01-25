import {Query} from "./query.mjs"

export async function runQuery(reader, spec){
  let cache = new Cache(reader)
  let query = new Query(spec, cache)
  await query.init();
  let result = query.run();
  console.log(result);
  query.dataSources.forEach(ds => console.log(ds.name, ds.results))
  return result;
}

class Cache{
  constructor(reader){
    this.reader = reader
    this.cacheRecords = new Map()
    this.cacheMeta = new Map()
  }
  async getRecords(tabName){
    if(this.cacheRecords.has(tabName)) return this.cacheRecords.get(tabName)
    let rows = await this.reader.getAllRecords(tabName)
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
}