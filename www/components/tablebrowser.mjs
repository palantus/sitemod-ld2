let elementName = "tablebrowser-component"

import { valueToString } from "../libs/ld2-query.mjs";
import "/components/table-paging.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>    
    #curtabrecords, #curtabrecords td, #curtabrecords th {
        border: 1px solid #ddd;
        text-align: left;
    }
    
    #curtabrecords {
        border-collapse: collapse;
        width: 100%;
        margin-top: 10px;
        white-space: nowrap;
        font-size: 90%;
    }
    
    #curtabrecords th, #curtabrecords td {
        padding-left: 1px;
        padding-right: 1px;
    }

    #tabcontainer{
      overflow-x: scroll;
    }
    #topflex{display: flex;gap: 10px;}
    
  </style>
  <div id="container">
    <div id="tabcontent" class="hidden">

      <div id="topflex">
        <div><input id="search" placeholder="Search"></input></div>
        <table-paging maxPerPage=20></table-paging>
      </div>
      <div id="tabcontainer">
        <table id="curtabrecords">
          <thead>
            <tr>
            </tr>
          </thead>
          <tbody>
          </tbody>
        </table>
      </div>

      <div>Showing records <span id="showfrom"></span> to <span id="showto"></span> of <span id="showtotal"></span></div>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.pagerPageChange = this.pagerPageChange.bind(this);
    this.doSearch = this.doSearch.bind(this);
    this.browse = this.browse.bind(this);
    this.showRecords = this.showRecords.bind(this);

    this.shadowRoot.querySelector("table-paging").addEventListener("page-change", this.pagerPageChange)
    this.shadowRoot.getElementById("search").addEventListener("change", this.doSearch)
  }

  setReader(reader){
    this.reader = reader
  }

  async browse(tableName){
    this.curOffset = 0;
    this.recordsPerPage = 20;
    this.tableName = tableName

    this.shadowRoot.querySelector("table-paging").page = 1
    await this.reader.fillTableMetadata(this.tableName)
    this.meta = this.reader.tables[this.tableName];
    this.showRecords()
  }

  doSearch(){
    this.curOffset = 0;
    if(this.shadowRoot.querySelector("table-paging").page != 1) 
      this.shadowRoot.querySelector("table-paging").page = 1
    else
      this.showRecords()
  }

  async findFirstRecordsMatching(query){
    let result = []
    let startIdx = 0;
    let recordsPerFetch = 1000;
    let isQueryNumber = !isNaN(query)
    while(result.length < this.recordsPerPage + this.curOffset + 1 && startIdx < this.meta.recordCount){
      let records = await this.reader.getRecordsInRange(this.tableName, startIdx, recordsPerFetch);
      result.push(...records.filter(r => {
        for(let field of this.meta.fields){
          switch(field.type){
            case "string":
            case "enum":
              if(r[field.name] == query || r[field.name]?.toLowerCase().includes(query)) return true;
              break;
            case "integer":
              if(isQueryNumber && r[field.name] == parseInt(query)) return true;
              break;
            case "real":
              if(isQueryNumber && r[field.name] == parseFloat(query)) return true;
              break;
          }
        }
        return false;
      }))
      startIdx += recordsPerFetch
    }
    return result.slice(this.curOffset, this.curOffset + this.recordsPerPage + 1)
  }

  async showRecords(){
    this.shadowRoot.getElementById("tabcontent").classList.toggle("hidden", false);
    this.shadowRoot.querySelector("#curtabrecords tbody").innerHTML = '';
    this.shadowRoot.querySelector("#curtabrecords thead tr").innerHTML = '';
  
    let query = this.shadowRoot.getElementById("search").value
    let records = query ? await this.findFirstRecordsMatching(query)
                        : await this.reader.getRecordsInRange(this.tableName, this.curOffset, this.recordsPerPage);
  
    for(let f of this.meta.fields){
      this.shadowRoot.querySelector("#curtabrecords thead tr").innerHTML += `<th>${f.name}</th>`
    }
  
    let tbody = this.shadowRoot.querySelector("#curtabrecords tbody");
    for(let r of records){
      let row = '';
      for(let f of this.meta.fields){
        let displayValue = valueToString(r[f.name]);
        row += `<td>${displayValue}</td>`
      }
      tbody.innerHTML += `<tr>${row}</tr>`;
    }
  
    this.shadowRoot.getElementById("showfrom").innerText = this.curOffset + 1;
    this.shadowRoot.getElementById("showto").innerText = Math.min(this.meta.recordCount, this.curOffset + this.recordsPerPage);
    this.shadowRoot.getElementById("showtotal").innerText = query ? "N/A" : this.meta.recordCount;

    this.shadowRoot.querySelector("table-paging").total = query ? Math.min(this.meta.recordCount, records.length+1) : this.meta.recordCount
  }

  pagerPageChange({detail:{page, start, end}}){
    this.curOffset = start;
    this.recordsPerPage = end-start+1;
    this.showRecords();
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}


window.customElements.define(elementName, Element);
export {Element, elementName as name}