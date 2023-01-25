let elementName = "export-csv-component"

import api from "/system/api.mjs"
import moment from "/libs/moment.js"
import { promptDialog } from "/components/dialog.mjs"
import "/components/table-paging.mjs"
import "/components/export-csv-export.mjs"

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
    #existing-container .export{
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
    <br><br>
    <h2>Export data to CSV-file</h2>

    <h3>Select Export or create a new</h3>

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

    <div id="cur-exp-container" class="hidden">
      <export-csv-export-component id="cur-exp"></export-csv-export-component>
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
    this.shadowRoot.getElementById("new-btn").addEventListener("click", this.createNew)
    this.shadowRoot.getElementById("existing-container").addEventListener("click", this.existingClicked)
    
  }

  async init(reader){
    this.reader = reader
    await this.reader.fillTableMetadata(this.tableName)
    this.meta = this.reader.tables[this.tableName];
    this.refreshData()
  }

  async refreshData(){
    let exports = await api.get("ld2/export");
    ["mine", "shared", "common"].forEach(cat => {
      this.shadowRoot.getElementById(cat).innerHTML = exports.filter(e => e.category == cat).map(e => `
        <tr data-id="${e.id}" class="export">
          <td>${e.title}</td>
        </tr>
      `).join("")
    })
  }

  async createNew(){
    let title = await promptDialog("Enter title")
    if(!title) return;
    await api.post("ld2/export", {title})
    this.refreshData()
  }

  async existingClicked(e){
    let id = e.target?.closest("tr.export")?.getAttribute("data-id");
    if(!id) return;
    this.shadowRoot.getElementById("cur-exp").setReader(this.reader)
    this.shadowRoot.getElementById("cur-exp").setAttribute("export", id)
    this.shadowRoot.getElementById("cur-exp-container").classList.toggle("hidden", false)
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}


window.customElements.define(elementName, Element);
export {Element, elementName as name}