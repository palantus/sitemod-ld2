let elementName = "ld2-query-component"

import api from "/system/api.mjs"
import {confirmDialog, alertDialog} from "/components/dialog.mjs"
import Toast from "/components/toast.mjs"
import "/components/table-paging.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import "/components/ld2-edit/query.mjs"
import { runQuery, valueToString } from "../libs/ld2-query.mjs"
import {saveFileCSV} from "/libs/file.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style> 
    table thead tr{
      border-bottom: 1px solid gray;
    }
    field-list{
      width: 400px;
    }
    #spec{width: 500px; min-height: 200px;}
    #result{margin-top: 10px;}
    #edit-raw-container,#edit-ui-container,#edit-info-container{margin-bottom: 10px;margin-top: 10px;}
  </style>
  <div id="container">
    <h2 id="title-header"></h2>

    <button id="run-and-show-btn" class="styled">Run and show</button>
    <button id="run-csv-btn" class="styled">Export to CSV</button>
    <button class="styled" id="edit-info-btn">Edit info</button>
    <button class="styled" id="edit-raw-btn">Edit raw JSON</button>
    <button class="styled" id="edit-ui-btn">Edit in UI</button>

    <div id="edit-raw-container" class="hidden">
      <textarea id="spec"></textarea>
      <br>
      <button id="save-spec-raw-btn" class="styled">Save</button>
    </div>
    <div id="edit-ui-container" class="hidden">
      <ld2-edit-query-component id="query-ui"></ld2-edit-query-component>
      <button id="save-spec-ui-btn" class="styled">Save</button>
    </div>
    <div id="edit-info-container" class="hidden">
      <field-list labels-pct="20">
        <field-edit type="text" id="title" field="title" label="Title"></field-edit>
      </field-list>
      <br>
      <button class="styled" id="delete-query-btn">Delete query</button>
    </div>

    <table id="result">
      <thead>
        <tr></tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this)
    this.runAndShow = this.runAndShow.bind(this)
    this.runCSV = this.runCSV.bind(this)
    this.saveSpecUI = this.saveSpecUI.bind(this)
    this.saveSpecRaw = this.saveSpecRaw.bind(this)
    this.editRaw = this.editRaw.bind(this)
    this.editUI = this.editUI.bind(this)
    this.editInfo = this.editInfo.bind(this)
    this.deleteQuery = this.deleteQuery.bind(this)
    this.titleChanged = this.titleChanged.bind(this)

    this.shadowRoot.getElementById("run-and-show-btn").addEventListener("click", this.runAndShow)
    this.shadowRoot.getElementById("run-csv-btn").addEventListener("click", this.runCSV)
    this.shadowRoot.getElementById("save-spec-raw-btn").addEventListener("click", this.saveSpecRaw)
    this.shadowRoot.getElementById("save-spec-ui-btn").addEventListener("click", this.saveSpecUI)
    this.shadowRoot.getElementById("edit-raw-btn").addEventListener("click", this.editRaw)
    this.shadowRoot.getElementById("edit-ui-btn").addEventListener("click", this.editUI)
    this.shadowRoot.getElementById("edit-info-btn").addEventListener("click", this.editInfo)
    this.shadowRoot.getElementById("title").addEventListener("value-changed", this.titleChanged)
    this.shadowRoot.getElementById("delete-query-btn").addEventListener("click", this.deleteQuery)
  }

  async refreshData(){
    if(!this.queryId) return;
    let query = this.query = await api.get(`ld2/query/${this.queryId}`);

    this.shadowRoot.getElementById("title-header").innerText = query.title
  }

  hideEditors(){
    this.shadowRoot.getElementById("edit-ui-container").classList.toggle("hidden", true)
    this.shadowRoot.getElementById("edit-raw-container").classList.toggle("hidden", true)
    this.shadowRoot.getElementById("edit-info-container").classList.toggle("hidden", true)
  }

  static get observedAttributes() {
    return ["query"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "query":
        this.queryId = parseInt(newValue);
        this.hideEditors();
        this.refreshData();
        break;
    }
  }

  async setReader(reader){
    this.reader = reader;
  }

  async runAndShow(){
    let spec = this.getCurSpec()
    if(!spec) return;
    let result = await runQuery(this.reader, JSON.parse(spec))
    if(result.length < 1) return alertDialog("The query returned no data");

    let fields = [...Object.keys(result[0])]
    this.shadowRoot.querySelector("#result thead").innerHTML = fields.map(f => `<th>${f}</th>`).join("")
    this.shadowRoot.querySelector("#result tbody").innerHTML = result.map(r => `
        <tr class="result">${fields.map(f => `<td>${valueToString(r[f])}</td>`).join("")}</tr>
      `).join("")
  }

  async runCSV(){
    let spec = this.getCurSpec()
    if(!spec) return;
    let result = await runQuery(this.reader, JSON.parse(spec))
    if(result.length < 1) return alertDialog("The query returned no data");
    
    let fields = [...Object.keys(result[0])]
    let header = fields.join(";")

    result = result.map(r => {
      let row = []
      for(let f of fields){
        let displayValue = (r[f] !== undefined && r[f] !== null)
                        ? (Array.isArray(r[f]) ? JSON.stringify(r[f]) : r[f])
                        : "";
        row.push(displayValue)
      }
      return row.join(";")
    })

    saveFileCSV([header, ...result], `${this.query.title}.csv`)
  }

  editUI(){
    if(!this.shadowRoot.getElementById("edit-ui-container").classList.contains("hidden")){
      this.shadowRoot.getElementById("edit-ui-container").classList.toggle("hidden", true)
      return;
    }
    this.shadowRoot.getElementById("query-ui").setSpec(JSON.parse(this.getCurSpec()))

    this.hideEditors();
    this.shadowRoot.getElementById("edit-ui-container").classList.toggle("hidden", false)
  }

  editRaw(){
    if(!this.shadowRoot.getElementById("edit-raw-container").classList.contains("hidden")){
      this.shadowRoot.getElementById("edit-raw-container").classList.toggle("hidden", true)
      return;
    }
    this.shadowRoot.getElementById("spec").value = this.getCurSpec()

    this.hideEditors();
    this.shadowRoot.getElementById("edit-raw-container").classList.toggle("hidden", false)
  }

  editInfo(){
    if(!this.shadowRoot.getElementById("edit-info-container").classList.contains("hidden")){
      this.shadowRoot.getElementById("edit-info-container").classList.toggle("hidden", true)
      return;
    }
    this.shadowRoot.getElementById("title").setAttribute("value", this.query.title)
    this.shadowRoot.getElementById("title").setAttribute("patch", `ld2/query/${this.query.id}`)

    this.hideEditors();
    this.shadowRoot.getElementById("edit-info-container").classList.toggle("hidden", false)
  }

  getCurSpec(){
    if(!this.shadowRoot.getElementById("edit-raw-container").classList.contains("hidden")){
      return this.shadowRoot.getElementById("spec").value
    } else if(!this.shadowRoot.getElementById("edit-ui-container").classList.contains("hidden")){
      return JSON.stringify(this.shadowRoot.getElementById("query-ui").getSpec(), null, 2)
    } else {
      return this.query.spec
    }
  }

  async saveSpecRaw(){
    let spec = this.getCurSpec()
    try{
      JSON.parse(spec)
    } catch(err){
      await alertDialog("Query spec is not valid JSON")
      return;
    }
    await api.patch(`ld2/query/${this.queryId}`, {spec})
    new Toast({text: "Saved!"})
    this.refreshData(false);
  }

  async saveSpecUI(){
    new Toast({text: "NOT IMPLEMENTED"})
  }

  async deleteQuery(){
    if(!(await confirmDialog(`Are you sure that you want to delete query ${this.query.title}?`))) return;
    await api.del(`ld2/query/${this.query.id}`)
    this.dispatchEvent(new CustomEvent("query-deleted", {bubbles: false, cancelable: false}));
  }

  titleChanged(){
    this.dispatchEvent(new CustomEvent("title-changed", {bubbles: false, cancelable: false}));
    this.refreshData();
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}


window.customElements.define(elementName, Element);
export {Element, elementName as name}