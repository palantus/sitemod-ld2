const elementName = 'ld2-page'
import moment from "../libs/moment.js"
import LD2Reader from "../libs/ld2reader.mjs"
import "../components/action-bar.mjs"
import "../components/action-bar-item.mjs"
import "../components/tablebrowser.mjs"
import "../components/ld2-queries.mjs"
import "../components/field.mjs"
import api from "../system/api.mjs"
import {state, pushStateQuery, setPageTitle, stylesheets} from "../system/core.mjs"
import {on, off} from "../system/events.mjs"
import { alertDialog, showDialog } from "../components/dialog.mjs"
import {saveFileCSV} from "../libs/file.mjs"
import {userPermissions} from "../system/user.mjs"
import { makeRowsSelectable } from "../libs/table-tools.mjs"

const template = document.createElement('template');
template.innerHTML = `
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
    #new-file-tables td:first-child{max-width: 25px;}
  </style>

  <div id="container">
    <h1>Inspect ld2 file</h1>
    <div id="controls">
      <input type="file" id="fileinput" multiple />
    </div>
    <ld2-queries-component id="query-component" class="hidden"></ld2-queries-component>
    <div id="file-content" class="hidden">
      <div id="header"></div>
      <button id="query-btn" class="styled hidden">Query data</button>
      <button id="save-new-file-btn" class="styled">Generate new ld2</button>
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
  
  <dialog-component title="Generate new ld2 file" id="save-file-dialog">
    <field-component label="Filename"><input id="new-filename"></input></field-component>
    <p id="multi-file-note" class="hidden">WARNING: You have combined data from multiple files. If a given table exists in multiple files, only the data from the first file is exported.</p>
    <button id="save-select-all" class="styled">Select all</button>
    <button id="save-select-none" class="styled">Select none</button>
    <br><br>
    <table>
      <tbody id="new-file-tables">
      </tbody>
    </table>
  </dialog-component>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global];
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.filesSelected = this.filesSelected.bind(this)
    this.queryData = this.queryData.bind(this)
    this.tableClicked = this.tableClicked.bind(this)
    this.exportTableCSV = this.exportTableCSV.bind(this)
    this.saveNewFile = this.saveNewFile.bind(this)

    this.reader = null;
    this.curTable = null;

    this.shadowRoot.getElementById('fileinput').addEventListener('change', this.filesSelected, false);
    this.shadowRoot.getElementById("query-btn").addEventListener("click", this.queryData)
    this.shadowRoot.querySelector("#fileoverviewtab tbody").addEventListener("click", this.tableClicked)
    this.shadowRoot.getElementById("export-table-csv-btn").addEventListener("click", this.exportTableCSV)
    this.shadowRoot.getElementById("query-component").addEventListener("back-clicked", () => {
      this.shadowRoot.getElementById("query-component").classList.toggle("hidden", true)
      this.shadowRoot.getElementById("file-content").classList.toggle("hidden", false)
      this.shadowRoot.getElementById("controls").classList.toggle("hidden", false)
    })
    this.shadowRoot.getElementById("save-new-file-btn").addEventListener("click", this.saveNewFile)
    this.shadowRoot.getElementById("save-select-all").addEventListener("click", () => this.shadowRoot.getElementById("new-file-tables").parentElement.selectionTool?.selectAll())
    this.shadowRoot.getElementById("save-select-none").addEventListener("click", () => this.shadowRoot.getElementById("new-file-tables").parentElement.selectionTool?.clear())

    userPermissions().then(permissions => {
      if(permissions.includes("ld2.query.read")){
        this.shadowRoot.getElementById("query-btn").classList.remove("hidden")
      }
    })
  }

  async attemptLoadParmFile(){
    this.federationId = state().query["federation-id"] || this.getAttribute("federation-id") || null;
    let hash = state().query.hash || this.getAttribute("hash")
    if(hash){
      this.loadFileFromHash(hash)
      return;
    }
    let id = state().query["file-id"] || this.getAttribute("file-id")
    if(id){
      this.loadFileFromId(id)
      return;
    }
  }

  async loadFileFromHash(fileHash){
    if(!fileHash) return;
    this.shadowRoot.getElementById('downloadFile').classList.toggle("hidden", false)
    if(!this.hasAttribute("hidecontrols")){
      pushStateQuery({hash: fileHash, "federation-id": this.federationId || undefined})
    }

    let fileUrl = this.federationId ? `federation/${this.federationId}/api/file/${fileHash}` : `file/${fileHash}`;
    let fileDownloadUrl = this.federationId ? `federation/${this.federationId}/api/file/dl/${fileHash}` : `file/dl/${fileHash}`;
    let fileMeta = await api.get(fileUrl)
    let ext = fileMeta.name.split(".").pop();
    let response = await api.fetch(fileDownloadUrl)
    let data = ext == "ld2" ? await response.blob() : await response.text();
    
    if(this.reader) this.reader.reset();
    else this.reader = new LD2Reader();
    await this.reader.read(data, fileMeta.name, "."+ext);

    this.shadowRoot.getElementById("downloadFile").addEventListener("click", () => window.open(fileMeta.links.download, '_blank'))
    this.refreshTableList();
  }

  async loadFileFromId(id){
    if(!id) return;
    this.shadowRoot.getElementById('downloadFile').classList.toggle("hidden", false)
    if(!this.hasAttribute("hidecontrols")){
      pushStateQuery({"file-id": id, "federation-id": this.federationId || undefined})
    }

    let fileUrl = this.federationId ? `federation/${this.federationId}/api/file/${id}` : `file/${id}`;
    let fileDownloadUrl = this.federationId ? `federation/${this.federationId}/api/file/dl/${id}` : `file/dl/${id}`;
    let fileMeta = await api.get(fileUrl)
    let ext = fileMeta.name.split(".").pop();
    let response = await api.fetch(fileDownloadUrl)
    let data = ext == "ld2" ? await response.blob() : await response.text();

    if(this.reader) this.reader.reset();
    else this.reader = new LD2Reader();
    await this.reader.read(data, fileMeta.name, "."+ext);

    this.shadowRoot.getElementById("downloadFile").addEventListener("click", () => window.open(fileMeta.links.download, '_blank'))
    this.refreshTableList();
  }
  
  async filesSelected(evt) {
    if (!evt.target.files[0]) {
      alertDialog("Failed to load file");
      return;
    }

    pushStateQuery(undefined)
    this.shadowRoot.getElementById('downloadFile').style.display = "none"

    if(this.reader) this.reader.reset();
    else this.reader = new LD2Reader();

    for(let f of evt.target.files){
      let ext = f.name.substring(f.name.lastIndexOf('.'))

      if(ext.toLowerCase() != ".ld2"){
        alertDialog(`Unknown file extension ${ext}`)
        continue;
      }

      await new Promise(resolve => {
        let r = new FileReader();
        r.onload = async (e) => {
          await this.reader.read(e.target.result);
          resolve();
        };
        r.readAsArrayBuffer(f);
      })
    }

    this.refreshTableList();
  }

  refreshTableList(){
    this.shadowRoot.getElementById("header").innerHTML = `File format: <span>${this.reader.header.formatversion || "N/A"}</span>, AX version: <span>${this.reader.header.axversion || "N/A"}</span>, Exported at: <span>${this.reader.header.date ? moment(this.reader.header.date + " " + this.reader.header.time).format("D. MMM YYYY HH:mm:ss") : "N/A"}</span>`
  
    this.shadowRoot.querySelector("#fileoverviewtab tbody").innerHTML = this.reader.getTableNamesAsArray().map(tableName => `
      <tr>
        <td class="tabname">${tableName}</td>
        <td>${this.reader.tables[tableName].recordCount}</td>
      </tr>`).join("")

    this.shadowRoot.getElementById("file-content").classList.toggle("hidden", false)
    this.shadowRoot.getElementById("right").classList.toggle("hidden", true)
  }

  async tableClicked(e){
    let tabName = e.target.closest("tr")?.querySelector(".tabname")?.innerText
    if(!tabName) return;
    let right = this.shadowRoot.getElementById("right")
    right.classList.toggle("hidden", true)
    this.curTabName = tabName;
    right.querySelector("#rightheader h2").innerText = tabName;
    let browser = right.querySelector("tablebrowser-component")
    browser.setReader(this.reader)
    await browser.browse(tabName)
    right.classList.toggle("hidden", false)
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

  async saveNewFile(){
    let dialog = this.shadowRoot.getElementById("save-file-dialog")
    this.shadowRoot.getElementById("new-file-tables").innerHTML = this.reader.getTableNamesAsArray().map(tableName => `
      <tr>
        <td class="tabname">${tableName}</td>
      </tr>`).join("")

    let tab = this.shadowRoot.getElementById("new-file-tables").parentElement
    tab.selectionTool = makeRowsSelectable(tab);

    this.shadowRoot.getElementById("multi-file-note").classList.toggle("hidden", this.reader.files.length <= 1)
    
    showDialog(dialog, {
      show: () => this.shadowRoot.querySelector("#new-filename").focus(),
      ok: async (val) => {
        this.reader.saveToNewFile(val.tables, val.filename)
      },
      validate: (val) => 
          val.tables.length < 1 ? "Please select at least one table"
        : !val.filename ? "Filename not specified"
        : true,
      values: () => {return {
        tables: tab.selectionTool.getSelected().map(tr => tr.querySelector("td:last-child").innerText),
        filename: this.shadowRoot.getElementById("new-filename").value
      }},
      close: () => {
        this.shadowRoot.getElementById("new-file-tables").innerHTML = ''
      }
    })
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