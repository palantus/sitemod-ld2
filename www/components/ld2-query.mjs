let elementName = "ld2-query-component"

import api from "/system/api.mjs"
import {confirmDialog, alertDialog, promptDialog} from "/components/dialog.mjs"
import Toast from "/components/toast.mjs"
import "/components/table-paging.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"
import "/components/ld2-edit/query.mjs"
import { runQuery, valueToString } from "../libs/ld2-query.mjs"
import {saveFileCSV} from "/libs/file.mjs"
import {userPermissions} from "/system/user.mjs"
import "/components/acl.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style> 
    #description-header{margin-bottom: 10px;}
    table thead tr{
      border-bottom: 1px solid gray;
    }
    table th.number, table td.number{
      text-align: right;
    }
    table tbody td, table thead th {
      padding-left: 15px;
    }
    field-list{
      width: 400px;
    }
    #spec{width: 500px; min-height: 200px;}
    #result{margin-top: 10px;}
    #edit-raw-container,#edit-ui-container,#edit-info-container{margin-bottom: 10px;margin-top: 10px;}
    #log{margin-top: 15px;}
  </style>
  <div id="container">
    <h2 id="title-header"></h2>
    <div id="description-header"></div>

    <button id="run-and-show-btn" class="styled">Run and show</button>
    <button id="run-csv-btn" class="styled">Export to CSV</button>
    <button class="styled hidden" id="edit-info-btn">Edit info</button>
    <button class="styled hidden" id="edit-ui-btn">Edit in UI</button>
    <button class="styled hidden" id="edit-raw-btn">Edit raw JSON</button>
    <button class="styled hidden" id="duplicate-btn">Duplicate</button>

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
        <field-edit type="text" id="title" label="Title"></field-edit>
        <field-edit type="textarea" id="description" label="Description" cols="50" rows="4"></field-edit>
        <field-edit type="checkbox" id="common" label="Common" class="hidden"></field-edit>
      </field-list>
      <br>
      <button class="styled" id="delete-query-btn">Delete query</button>
      <br><br>
      <h3>Permissions:</h3>
      <acl-component id="acl" rights="rw" disabled always-show></acl-component>
    </div>

    <table id="result">
      <thead>
        <tr></tr>
      </thead>
      <tbody></tbody>
    </table>

    <div id="log" class="hidden"></div>
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
    this.saveSpec = this.saveSpec.bind(this)
    this.editRaw = this.editRaw.bind(this)
    this.editUI = this.editUI.bind(this)
    this.editInfo = this.editInfo.bind(this)
    this.deleteQuery = this.deleteQuery.bind(this)
    this.duplicate = this.duplicate.bind(this)
    this.titleChanged = this.titleChanged.bind(this)
    this.log = this.log.bind(this)

    this.shadowRoot.getElementById("run-and-show-btn").addEventListener("click", this.runAndShow)
    this.shadowRoot.getElementById("run-csv-btn").addEventListener("click", this.runCSV)
    this.shadowRoot.getElementById("save-spec-raw-btn").addEventListener("click", this.saveSpec)
    this.shadowRoot.getElementById("save-spec-ui-btn").addEventListener("click", this.saveSpec)
    this.shadowRoot.getElementById("edit-raw-btn").addEventListener("click", this.editRaw)
    this.shadowRoot.getElementById("edit-ui-btn").addEventListener("click", this.editUI)
    this.shadowRoot.getElementById("edit-info-btn").addEventListener("click", this.editInfo)
    this.shadowRoot.getElementById("title").addEventListener("value-changed", this.titleChanged)
    this.shadowRoot.getElementById("description").addEventListener("value-changed", this.refreshData)
    this.shadowRoot.getElementById("delete-query-btn").addEventListener("click", this.deleteQuery)
    this.shadowRoot.getElementById("duplicate-btn").addEventListener("click", this.duplicate)
    this.shadowRoot.getElementById("common").addEventListener("value-changed", () => new Toast({text: "When marking a query as common, remember to set read permission accordingly!"}))

    userPermissions().then(permissions => {
      if(permissions.includes("ld2.query.admin")){
        this.shadowRoot.getElementById("common").classList.remove("hidden")
      }
      if(permissions.includes("ld2.query.edit")){
        this.shadowRoot.getElementById("duplicate-btn").classList.remove("hidden")
      }
    })
  }

  async refreshData(){
    if(!this.queryId) return;
    let query = this.query = await api.get(`ld2/query/${this.queryId}`);

    this.shadowRoot.getElementById("title-header").innerText = query.title||"Untitled"
    this.shadowRoot.getElementById("description-header").innerText = query.description||""

    this.shadowRoot.getElementById("acl").setAttribute("type", "ld2-query")
    this.shadowRoot.getElementById("acl").setAttribute("entity-id", query.id)
    setTimeout(() => this.shadowRoot.getElementById("acl").removeAttribute("disabled"), 100)

    userPermissions().then(permissions => {
      let allowEdit = permissions.includes("ld2.query.edit") && query.access.includes("w");
      this.shadowRoot.getElementById("edit-info-btn").classList.toggle("hidden", !allowEdit)
      this.shadowRoot.getElementById("edit-raw-btn").classList.toggle("hidden", !allowEdit)
      this.shadowRoot.getElementById("edit-ui-btn").classList.toggle("hidden", !allowEdit)
    })
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
        this.shadowRoot.getElementById("result").classList.add("hidden")
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
    this.hideEditors();
    try{
      this.initLog();
      let result = await runQuery(this.reader, JSON.parse(spec), this.log)
      if(result.length < 1) return alertDialog("The query returned no data");

      let fields = [...Object.keys(result[0])]
      this.shadowRoot.querySelector("#result thead").innerHTML = fields.map(f => `<th class="${typeof result[0][f]}">${f}</th>`).join("")
      this.shadowRoot.querySelector("#result tbody").innerHTML = result.map(r => `
          <tr class="result">${fields.map(f => `<td class="${typeof r[f]}">${valueToString(r[f])}</td>`).join("")}</tr>
        `).join("")
      this.shadowRoot.getElementById("result").classList.remove("hidden")
      this.removeLog();
    } catch(err){
      new Toast({text: `Error: ${err}`})
      this.log(`Error: ${terr}`)
    }
  }

  async runCSV(){
    let spec = this.getCurSpec()
    if(!spec) return;
    try{
      this.initLog();
      let result = await runQuery(this.reader, JSON.parse(spec), this.log)
      if(result.length < 1) return alertDialog("The query returned no data");
      
      let fields = [...Object.keys(result[0])]
      let header = fields.join(";")

      result = result.map(r => {
        let row = []
        for(let f of fields){
          let displayValue = (r[f] === undefined || r[f] === null) ? ""
                          : typeof r[f] === "number" ? r[f].toFixed(2)
                          : Array.isArray(r[f]) ? JSON.stringify(r[f]) 
                          : r[f];
          row.push(displayValue)
        }
        return row.join(";")
      })

      await saveFileCSV([header, ...result], `${this.query.title}.csv`)
      this.removeLog();
    } catch(err){
      new Toast({text: `Error: ${err}`})
      this.log(`Error: ${terr}`)
    }
  }

  log(text){
    this.shadowRoot.getElementById("log").innerHTML += `<div>${text}</div>`
  }

  initLog(){
    this.shadowRoot.getElementById("log").innerHTML = ''
    this.shadowRoot.getElementById("log").classList.remove("hidden")
  }

  removeLog(){
    this.shadowRoot.getElementById("log").classList.add("hidden")
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
    this.shadowRoot.getElementById("title").setAttribute("value", this.query.title||"")
    this.shadowRoot.getElementById("title").setAttribute("patch", `ld2/query/${this.query.id}`)
    this.shadowRoot.getElementById("description").setAttribute("value", this.query.description||"")
    this.shadowRoot.getElementById("description").setAttribute("patch", `ld2/query/${this.query.id}`)
    this.shadowRoot.getElementById("common").setAttribute("value", this.query.common||false)
    this.shadowRoot.getElementById("common").setAttribute("patch", `ld2/query/${this.query.id}`)

    this.hideEditors();
    this.shadowRoot.getElementById("edit-info-container").classList.toggle("hidden", false)
  }

  getCurSpec(){
    if(!this.shadowRoot.getElementById("edit-raw-container").classList.contains("hidden")){
      return this.shadowRoot.getElementById("spec").value || "{}"
    } else if(!this.shadowRoot.getElementById("edit-ui-container").classList.contains("hidden")){
      return JSON.stringify(this.shadowRoot.getElementById("query-ui").getSpec(), null, 2) || "{}"
    } else {
      return this.query.spec || "{}"
    }
  }

  async saveSpec(){
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

  async deleteQuery(){
    if(!(await confirmDialog(`Are you sure that you want to delete query ${this.query.title}?`))) return;
    await api.del(`ld2/query/${this.query.id}`)
    this.dispatchEvent(new CustomEvent("query-deleted", {bubbles: false, cancelable: false}));
  }

  titleChanged(){
    this.dispatchEvent(new CustomEvent("title-changed", {bubbles: false, cancelable: false}));
    this.refreshData();
  }

  async duplicate(){
    let title = await promptDialog("Enter title for your new query, which will be a copy of the current one", this.query.title)
    if(title == this.query.title) return alertDialog("Please name the query something new");
    if(!title) return;
    await api.post("ld2/query", {title, spec: this.query.spec, description: this.query.description})
    this.refreshData()
    this.dispatchEvent(new CustomEvent("duplicated", {bubbles: false, cancelable: false}));
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}


window.customElements.define(elementName, Element);
export {Element, elementName as name}