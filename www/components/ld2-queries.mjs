let elementName = "ld2-queries-component"

import api from "/system/api.mjs"
import { promptDialog } from "/components/dialog.mjs"
import "/components/table-paging.mjs"
import "/components/ld2-query.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style> 
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
      overflow-y: scroll;
      padding: 5px;
    }
    #existing-container > div > h4{
      border-bottom: 1px solid var(--contrast-color-muted);
    }
    #existing-container .query{
      cursor: pointer;
      user-select: none;
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

    <div id="existing-container-container">
      <h3>Select an existing query or create a new</h3>
      <div id="existing-container">
        <div>
          <h4>Mine</h4>
          <table>
            <tbody id="mine">
            </tbody>
          </table>
        </div>
        <div>
          <h4>Common</h4>
          <table>
            <tbody id="common">
            </tbody>
          </table>
        </div>
        <div>
          <h4>Shared</h4>
          <table>
            <tbody id="shared">
            </tbody>
          </table>
        </div>
      </div>
      <br>
      <button id="new-btn" class="styled">Create new</button>
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
  }

  async init(reader){
    this.reader = reader
    await this.reader.fillTableMetadata(this.tableName)
    this.meta = this.reader.tables[this.tableName];
    this.refreshData()
  }

  async refreshData(){
    let queries = await api.get("ld2/query");
    ["mine", "shared", "common"].forEach(cat => {
      this.shadowRoot.getElementById(cat).innerHTML = queries.filter(e => e.category == cat).map(e => `
        <tr data-id="${e.id}" class="query">
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
    this.toggleExistingQueries(false)
  }

  toggleExistingQueries(forceValue){
    let show = typeof forceValue === "boolean" ? forceValue : this.shadowRoot.getElementById("existing-container-container").classList.contains("hidden")
    this.shadowRoot.getElementById("existing-container-container").classList.toggle("hidden", !show)
    this.shadowRoot.getElementById("toggle-existing-btn").innerText = show ? "Hide queries" : "Show queries"
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}


window.customElements.define(elementName, Element);
export {Element, elementName as name}