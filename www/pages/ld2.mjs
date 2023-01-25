const elementName = 'ld2-page'
import moment from "/libs/moment.js"
import LD2Reader from "/libs/ld2reader.mjs"
import "/components/action-bar.mjs"
import "/components/action-bar-item.mjs"
import "/components/tablebrowser.mjs"
import "/components/ld2-queries.mjs"
import api from "/system/api.mjs"
import {state, pushStateQuery, setPageTitle} from "/system/core.mjs"
import {on, off} from "/system/events.mjs"
import { alertDialog } from "/components/dialog.mjs"
import {saveFileCSV} from "/libs/file.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
        padding: 10px;
        position: relative;
        height: calc(100% - 20px);
    }
    h1{
      margin-bottom: 5px;
    }
    #fileinput{
      padding-bottom: 5px;
      margin-top: 10px;
    }
    #hash{width: 250px;}
    
    #header span{color: var(--accent-color-light);}
    #query-btn{margin-bottom: 5px;}

    /* Overview */

    #file-content{display: inline;
      overflow: hidden;} /* For scroll to work */
    
    #fileoverviewtab {
        border-collapse: collapse;
        width: 100%;
        border-top: 1px solid gray;
    }
    
    #fileoverviewtab th, #fileoverviewtab td {
        padding-left: 8px;
        padding-right: 8px;
        text-align: left;
        border-bottom: 1px solid gray;
        padding-top: 4px;
    }
    
    #fileoverviewtab td:last-child, #fileoverviewtab th:last-child{
      text-align: right;
    }
    
    #fileoverviewtab tr:hover{
      background-color: var(--table-hover);
    }
    
    #fileoverviewtab tbody tr{cursor: pointer;}
    
    #header{
      margin-top: 5px;
      margin-bottom: 5px;
    }
    
    .hidden{display: none !important;}

    #flex{
      display: flex;
      height: 100%;
    }
    #left{overflow-y: auto; width: 400px;}
    #right{overflow: auto; padding-left: 10px; max-width: calc(100% - 400px);}
    #rightheader{margin-bottom: 10px;}
  </style>

  <div id="container">
    <h1>Inspect LD2 file</h1>
    <div id="controls">
      <input type="file" id="fileinput" />
    </div>
    <ld2-queries-component id="query-component" class="hidden"></ld2-queries-component>
    <div id="file-content" class="hidden">
      <div id="header"></div>
      <button id="query-btn" class="styled">Query data</button>
      <button id="downloadFile" class="styled hidden">Download</button>
      <div id="flex">
        <div id="left">
          <table id="fileoverviewtab">
            <thead>
              <tr>
              <th>Table</th>
              <th>Records</th>
              </tr>
            </thead>
            <tbody>
            </tbody>
          </table>
          <br><br><br><br><br><br><br><br>
        </div>
        <div id="right" class="hidden">
          <div id="rightheader">
            <h2></h2>
            <button id="export-table-csv-btn" class="styled">Export to CSV</button>
          </div>
          <tablebrowser-component></tablebrowser-component>
        </div>
      </div>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.readSingleFile = this.readSingleFile.bind(this)
    this.queryData = this.queryData.bind(this)
    this.tableClicked = this.tableClicked.bind(this)
    this.exportTableCSV = this.exportTableCSV.bind(this)

    this.reader = null;
    this.curTable = null;

    this.shadowRoot.getElementById('fileinput').addEventListener('change', this.readSingleFile, false);
    this.shadowRoot.getElementById("query-btn").addEventListener("click", this.queryData)
    this.shadowRoot.querySelector("#fileoverviewtab tbody").addEventListener("click", this.tableClicked)
    this.shadowRoot.getElementById("export-table-csv-btn").addEventListener("click", this.exportTableCSV)
    this.shadowRoot.getElementById("query-component").addEventListener("back-clicked", () => {
      this.shadowRoot.getElementById("query-component").classList.toggle("hidden", true)
      this.shadowRoot.getElementById("file-content").classList.toggle("hidden", false)
      this.shadowRoot.getElementById("controls").classList.toggle("hidden", false)
    })
  }

  async attemptLoadParmFile(){
    let hash = state().query.hash || this.getAttribute("hash")
    if(hash){
      this.loadFileFromHash(hash)
    }
  }

  async loadFileFromHash(fileHash){
    if(!fileHash) return;
    this.shadowRoot.getElementById('downloadFile').classList.toggle("hidden", false)
    if(!this.hasAttribute("hidecontrols")){
      pushStateQuery({hash: fileHash})
    }

    let fileMeta = await api.get(`file/${fileHash}`)
    let ext = fileMeta.name.split(".").pop();
    let response = await api.fetch(`file/download/${fileHash}`)
    let data = ext == "ld2" ? await response.blob() : await response.text();
    this.onFile({target: {result: data}}, fileMeta.name, "." + ext)

    this.shadowRoot.getElementById("downloadFile").addEventListener("click", () => window.open(fileMeta.links.download, '_blank'))
  }
  
  readSingleFile(evt) {
    //Retrieve the first (and only!) File from the FileList object
    var f = evt.target.files[0];

    if (f) {
      let ext = f.name.substring(f.name.lastIndexOf('.'))

      let r = new FileReader();
      r.onload = (e) => this.onFile(e, f.name, ext);

      pushStateQuery(undefined)
      this.shadowRoot.getElementById('downloadFile').style.display = "none"

      switch(ext.toLowerCase()){
        case ".ld2":
            r.readAsArrayBuffer(f);
            break;
        case ".ld":
        case ".xpo":
            r.readAsText(f, 'ISO-8859-1');
            break;
        default:
          alertDialog(`Unknown file extension ${ext}`)
          return;
      }

    } else {
      alertDialog("Failed to load file");
    }
  }

  async onFile(e, filename, ext){
    let buffer = e.target.result;
    switch(ext.toLowerCase()){
      case ".ld2":
          this.reader = new LD2Reader(buffer);
          break;
      default:
        alertDialog(`Unknown file extension ${ext}`)
        return;
    }
  
    await this.reader.read();
  
    this.shadowRoot.querySelector("#fileoverviewtab tbody").innerHTML = '';
  
    this.shadowRoot.getElementById("header").innerHTML = `File format: <span>${this.reader.header.formatversion || "N/A"}</span>, AX version: <span>${this.reader.header.axversion || "N/A"}</span>, Exported at: <span>${this.reader.header.date ? moment(this.reader.header.date + " " + this.reader.header.time).format("D. MMM YYYY HH:mm:ss") : "N/A"}</span>`
  
    let tables = this.reader.getTableNamesAsArray();
    for(let tableName of tables){
      let tab = this.reader.tables[tableName];
      let row = `<tr><td class="tabname">${tableName}</td><td>${tab.recordCount}</td></tr>`;
      //row.click(function(){tableClicked($(this).find(".tabname").text())})
      this.shadowRoot.querySelector("#fileoverviewtab tbody").innerHTML += row;
    }

    this.shadowRoot.getElementById("file-content").classList.toggle("hidden", false)
  }

  async tableClicked(e){
    let tabName = e.target.closest("tr")?.querySelector(".tabname")?.innerText
    if(!tabName) return;
    this.curTabName = tabName;
    let right = this.shadowRoot.getElementById("right")
    right.classList.toggle("hidden", false)
    right.querySelector("#rightheader h2").innerText = tabName;
    let browser = right.querySelector("tablebrowser-component")
    browser.setReader(this.reader)
    browser.browse(tabName)
  }

  async exportTableCSV(){
    let data = await this.reader.getAllRecords(this.curTabName);
    await this.reader.fillTableMetadata(this.curTabName)
    let meta = this.reader.tables[this.curTabName];

    let header = []
    for(let f of meta.fields){
      header.push(f.name)
    }
    header = header.join(";")

    data = data.map(r => {
      let row = []
      for(let f of meta.fields){
        let displayValue = (r[f.name] !== undefined && r[f.name] !== null)
                        ? (Array.isArray(r[f.name]) ? JSON.stringify(r[f.name]) : r[f.name])
                        : "";
        row.push(displayValue)
      }
      return row.join(";")
    })

    saveFileCSV([header, ...data], `${this.curTabName}.csv`)
  }

  async queryData(){
    this.shadowRoot.getElementById("file-content").classList.toggle("hidden", true)
    this.shadowRoot.getElementById("controls").classList.toggle("hidden", true)
    let component = this.shadowRoot.getElementById("query-component")
    await component.init(this.reader)
    component.classList.toggle("hidden", false)
  }

  connectedCallback() {
    on("changed-page-query", elementName, (query) => this.loadFileFromHash(query.hash))
    this.attemptLoadParmFile();
    if(this.hasAttribute("hidecontrols")){
      this.shadowRoot.getElementById("controls").classList.toggle("hidden", true)
      this.shadowRoot.querySelector("h1").classList.toggle("hidden", true)
    } else {
      setPageTitle("Inspect LD2")
    }
  }

  disconnectedCallback() {
    off("changed-page-query", elementName)
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}