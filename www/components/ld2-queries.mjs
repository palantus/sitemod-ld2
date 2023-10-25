let elementName = "ld2-queries-component"

import api from "../system/api.mjs"
import { promptDialog } from "../components/dialog.mjs"
import {userPermissions} from "../system/user.mjs"
import "../components/table-paging.mjs"
import "../components/ld2-query.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style> 
    #initial-help-text{margin-bottom: 20px;}
    #existing-container{
      display: flex;
      gap:10px;
      height: 200px;
      overflow-y: hidden;
    }
    #existing-container > div{
      max-width: 300px;
      min-width: 100px;
      border: 1px solid var(--contrast-color-muted);
      overflow-y: auto;
      padding: 5px;
    }
    #existing-container > div > h4{
      border-bottom: 1px solid var(--contrast-color-muted);
    }
    #existing-container .query{
      cursor: pointer;
      user-select: none;
    }
    #existing-container .query:hover{
      background: var(--table-hover);
    }
    #cur-exp-container{
      margin-top: 10px;
      padding-top: 5px;
      border-top: 1px solid var(--contrast-color-muted);
    }
  </style>
  <div id="container">
    <br>
    <button class="styled" id="back-btn">Back to content</button>
    <button class="styled" id="toggle-existing-btn">Hide queries</button>
    <br><br>
    <h2>Query data in file</h2>

    <div id="initial-help-text">
      This will allow you to query data in the file chosen before.<br>
      Note that, if you have selected a file from your own computer, the data will <u>never</u> be transmitted to our server. <br>
      All processing of queries etc. are done locally on <u>your</u> computer in <u>your</u> browser. <br>
      This means that it is safe to use this on sensitive customer data.
    </div>

    <div id="existing-container-container">
      <h3>Select an existing query or create a new</h3>
      <div id="existing-container">
        <div>
          <h4 title="Queries that you have created and only you can see">Mine</h4>
          <table>
            <tbody id="mine">
            </tbody>
          </table>
        </div>
        <div>
          <h4 title="Queries that an administrator has decided to show for all users">Common</h4>
          <table>
            <tbody id="common">
            </tbody>
          </table>
        </div>
        <div>
          <h4 title="Queries that other users has shared with you">Shared</h4>
          <table>
            <tbody id="shared">
            </tbody>
          </table>
        </div>
      </div>
      <br>
      <button id="new-btn" class="styled hidden">Create new</button>
    </div>

    <div id="cur-exp-container" class="hidden">
      <ld2-query-component id="cur-exp"></export-ld2-query-component>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this)
    this.createNew = this.createNew.bind(this)
    this.existingClicked = this.existingClicked.bind(this)

    this.shadowRoot.getElementById("back-btn").addEventListener("click", () => this.dispatchEvent(new CustomEvent("back-clicked", {bubbles: true, cancelable: false})))
    this.shadowRoot.getElementById("toggle-existing-btn").addEventListener("click", () => this.toggleExistingQueries())
    this.shadowRoot.getElementById("new-btn").addEventListener("click", this.createNew)
    this.shadowRoot.getElementById("existing-container").addEventListener("click", this.existingClicked)
    this.shadowRoot.getElementById("cur-exp").addEventListener("query-deleted", () => {
      this.refreshData()
      this.shadowRoot.getElementById("cur-exp-container").classList.add("hidden")
      this.toggleExistingQueries(true)
    })
    this.shadowRoot.getElementById("cur-exp").addEventListener("title-changed", this.refreshData);  
    this.shadowRoot.getElementById("cur-exp").addEventListener("duplicated", () => {
      this.refreshData()
      this.shadowRoot.getElementById("cur-exp-container").classList.add("hidden")
      this.toggleExistingQueries(true)
    })
    
    userPermissions().then(permissions => {
      if(permissions.includes("ld2.query.edit")){
        this.shadowRoot.getElementById("new-btn").classList.remove("hidden")
      }
    })
  }

  async init(reader){
    this.reader = reader
    await this.reader.fillTableMetadata(this.tableName)
    this.meta = this.reader.tables[this.tableName];
    await this.refreshData()
    this.shadowRoot.getElementById("cur-exp")?.clearCaches();
  }

  async refreshData(){
    let queries = await api.get("ld2/query");
    ["mine", "shared", "common"].forEach(cat => {
      this.shadowRoot.getElementById(cat).innerHTML = queries.filter(e => e.category == cat).sort((a, b) => a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1).map(e => `
        <tr data-id="${e.id}" class="query" title="Made by ${e.owner?.name||"N/A"} (${e.owner?.id||"N/A"})">
          <td>${e.title}</td>
        </tr>
      `).join("")
    })
  }

  async createNew(){
    let title = await promptDialog("Enter title")
    if(!title) return;
    await api.post("ld2/query", {title})
    this.refreshData()
  }

  async existingClicked(e){
    let id = e.target?.closest("tr.query")?.getAttribute("data-id");
    if(!id) return;
    this.shadowRoot.getElementById("cur-exp").setReader(this.reader)
    this.shadowRoot.getElementById("cur-exp").setAttribute("query", id)
    this.shadowRoot.getElementById("cur-exp-container").classList.toggle("hidden", false)
    this.shadowRoot.getElementById("initial-help-text").classList.add("hidden")
    this.toggleExistingQueries(false)
  }

  toggleExistingQueries(forceValue){
    let show = typeof forceValue === "boolean" ? forceValue : this.shadowRoot.getElementById("existing-container-container").classList.contains("hidden")
    this.shadowRoot.getElementById("existing-container-container").classList.toggle("hidden", !show)
    this.shadowRoot.getElementById("toggle-existing-btn").innerText = show ? "Hide queries" : "Show queries"
    if(show) this.refreshData();
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}


window.customElements.define(elementName, Element);
export {Element, elementName as name}