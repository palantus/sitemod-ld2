import moment from "/libs/moment.js"
import "/libs/jszip.min.js"

export default class LD2Reader{
  files = [];

  constructor(_jszip){

    if(_jszip && "undefined" === typeof JSZip){
      this.JSZip = _jszip
    } else {
      this.JSZip = JSZip
    }
    this.nextRecId = 1;
  }

  async loadZip(buffer){
    let zip = await this.JSZip.loadAsync(buffer);

    let data = await zip.file("metadata").async("arraybuffer");
    let dataView = new DataView(data);

    let tableHeaderSize = dataView.getInt32(0);

    let headerRaw = this.byteArray2str(new Uint8Array(data.slice(4, 4+tableHeaderSize)));
    let headerSplit = headerRaw.split(";");

    let header = {}

    for(let h of headerSplit){
      let vSplit = h.split("=");
      header[vSplit[0]] = vSplit[1];
    }

    header.tables = header.tables.split(",")

    let tables = {}
    for(let tabLine of header.tables){
      let tabSplit = tabLine.split("*")
      tables[tabSplit[0]] = {name: tabSplit[0], recordCount: parseInt(tabSplit[1])}
    }

    this.files.push({id: this.files.length, zip, header, tables});
  }

  get tables(){
    let ret = {}
    for(let file of this.files){
      for(let tabName of Object.keys(file.tables)){
        if(ret[tabName] === undefined){
          ret[tabName] = JSON.parse(JSON.stringify(file.tables[tabName]));
          continue;
        }
        
        ret[tabName].recordCount += file.tables[tabName].recordCount
      }
    }
    return ret;
  }

  get header(){
    return this.files[0]?.header
  }

  async getRecord(tableName, idx){
    return (await this.getRecordsInRange(tableName, idx, 1))[0] || null;
  }

  async getRecordsInRange(tableName, offset, num){
    if(!this.tables[tableName]) return [];
    await this.fillTableMetadata(tableName);
    let records = [];

    for(let file of this.files){
      let meta = file.tables[tableName];
      if(!meta) continue;

      let data = await file.zip.file(tableName).async("arraybuffer");
      let dataView = new DataView(data);

      let recordsAdded = 0;
      for(let i = offset; i < Math.min(meta.recordCount, offset+num); i++){
        let record = {};

        let pos = meta.dataPosition + meta.recordPositions[i];

        for(let f = 0; f < meta.fields.length; f++){
          let fieldSize = dataView.getInt32(pos);
          pos += 4;

          if(fieldSize == 0){
            record[meta.fields[f].name] = null;
            continue;
          }

          record[meta.fields[f].name] = this.parseValue(dataView, data, pos, fieldSize, meta.fields[f].type)

          pos += fieldSize;
        }

        if(!record.RecId){
          record.RecId = this.nextRecId++;
        }

        records.push(record);
        recordsAdded++;
      }
      num -= recordsAdded;
      offset = Math.max(offset - meta.recordCount, 0);
    }

    return records
  }

  async getAllRecords(tableName){
    if(!this.tables[tableName]) return [];
    await this.fillTableMetadata(tableName);
    let meta = this.tables[tableName];
    return await this.getRecordsInRange(tableName, 0, meta.recordCount)
  }

  parseValue(dataView, data, pos, length, typeName){
    switch(typeName){
      case "string":
      case "enum":
        return this.byteArray2str(new Uint8Array(data.slice(pos, pos+length)));

      case "integer":
        if(length > 4){
          /*let bytes = new Uint8Array(data.slice(pos, pos+length))
          return new Uint64BE(bytes) + ""; //Need to represent it as string, because javascript doesn't natively support 64-bit integers
          */
          return dataView.getBigInt64(pos);
        } else {
          return dataView.getInt32(pos);
        }

      case "real":
        //return Math.round(dataView.getFloat64(pos) * 100) / 100;
        return Math.round(dataView.getFloat64(pos) * 10000) / 10000;

      case "date":
        let daysDiff = dataView.getInt32(pos);
        if(daysDiff > 0)
          return moment("1900-01-01").add(daysDiff, "days").format("YYYY-MM-DD")
        break;

      case "datetime":
        let daysDiff2 = dataView.getInt32(pos);
        let timeDiff = dataView.getInt32(pos+4);
        if(daysDiff2 > 0)
          return moment.utc("1900-01-01").add(daysDiff2, "days").add(timeDiff, "seconds").local().toISOString();
        break;

      case "container":
        let con = []
        let curOffset = 0;
        while(curOffset < length){
          let typeLength = dataView.getInt32(pos+curOffset);
          curOffset += 4;
          let itemType = this.byteArray2str(new Uint8Array(data.slice(pos+curOffset, pos+curOffset+typeLength)));
          curOffset+= typeLength;
          let valueLength = dataView.getInt32(pos+curOffset);
          curOffset += 4;
          con.push(this.parseValue(dataView, data, pos+curOffset, valueLength, itemType));
          curOffset += valueLength;
        }
        //console.log(con);
        return con;
    }
    return null;
  }

  async fillTableMetadata(tableName){
    for(let file of this.files){
      if(!file.tables[tableName]) 
        continue;

      if(file.tables[tableName].dataPosition !== undefined)
        continue;

      let data = await file.zip.file(tableName).async("arraybuffer");
      let dataView = new DataView(data);

      let tableHeaderSize = dataView.getInt32(0);

      let header = this.byteArray2str(new Uint8Array(data.slice(4, 4+tableHeaderSize)));
      let headerSplit = header.split(";");
      let fieldsLine = headerSplit[1].split(",");
      let fields = [];
      for(let fieldStr of fieldsLine){
        let fieldSplit = fieldStr.split(":");
        fields.push({name: fieldSplit[0], type: fieldSplit[1]})
      }

      let dataPosition = 4 + tableHeaderSize;
      let numRecords = parseInt(headerSplit[2]);
      let recordPositions = []
      for(let i = 0; i < numRecords; i++){
        recordPositions.push(dataView.getInt32(dataPosition));
        dataPosition += 4;
      }

      file.tables[tableName] = {name: tableName, fields, recordCount: numRecords, dataPosition: dataPosition, recordPositions: recordPositions}
    }
  }

  async read(buffer){
    await this.loadZip(buffer);
  }

  reset(){
    this.files = []
    this.nextRecId = 1;
  }

  getTableNamesAsArray(){
    let tabs = []
    for(let tableName in this.tables){
      tabs.push(tableName)
    }
    return tabs.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1)
  }

  byteArray2str(byteArray){
    return new TextDecoder("utf-8").decode(byteArray);
  }
}