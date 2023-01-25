let elementName = "ld2-query-component"

import api from "/system/api.mjs"
import { alertDialog } from "/components/dialog.mjs"
import Toast from "/components/toast.mjs"
import "/components/table-paging.mjs"
import { runQuery } from "../libs/ld2-query.mjs"
import {saveFileCSV} from "/libs/file.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/searchresults.css'>
  <style> 
    table thead tr{
      border-bottom: 1px solid gray;
    }
  </style>
  <div id="container">
    <h2 id="title"></h2>

    <button id="run-and-show-btn" class="styled">Run and show</button>
    <button id="run-csv-btn" class="styled">Export to CSV</button>
    <br>
    <textarea id="spec"></textarea>
    <br>
    <button id="save-spec-btn" class="styled">Save</button>

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
    this.saveSpec = this.saveSpec.bind(this)

    this.shadowRoot.getElementById("run-and-show-btn").addEventListener("click", this.runAndShow)
    this.shadowRoot.getElementById("run-csv-btn").addEventListener("click", this.runCSV)
    this.shadowRoot.getElementById("save-spec-btn").addEventListener("click", this.saveSpec)

  }

  async refreshData(){
    if(!this.queryId) return;
    let exp = this.exp = await api.get(`ld2/query/${this.queryId}`);

    this.shadowRoot.getElementById("title").innerText = exp.title
    this.shadowRoot.getElementById("spec").value = exp.spec
  }

  static get observedAttributes() {
    return ["query"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "query":
        this.queryId = parseInt(newValue);
        this.refreshData();
        break;
    }
  }

  async setReader(reader){
    this.reader = reader;
  }

  async runAndShow(){
    if(!this.exp.spec) return;
    let result = await runQuery(this.reader, JSON.parse(this.exp.spec))
    if(result.length < 1) return alertDialog("The query returned no data");

    let fields = [...Object.keys(result[0])]
    this.shadowRoot.querySelector("#result thead").innerHTML = fields.map(f => `<th>${f}</th>`).join("")
    this.shadowRoot.querySelector("#result tbody").innerHTML = result.map(r => `
        <tr class="result">${fields.map(f => `<td>${r[f]||""}</td>`).join("")}</tr>
      `).join("")
  }


  async runCSV(){
    if(!this.exp.spec) return;
    let result = await runQuery(this.reader, JSON.parse(this.exp.spec))
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

    saveFileCSV([header, ...result], `${this.exp.title}.csv`)
  }

  async saveSpec(){
    let spec = this.shadowRoot.getElementById("spec").value
    try{
      JSON.parse(spec)
    } catch(err){
      await alertDialog("Query spec is not valid JSON")
      return;
    }
    await api.patch(`ld2/query/${this.queryId}`, {spec})
    new Toast({text: "Saved!"})
    this.refreshData();
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}


window.customElements.define(elementName, Element);
export {Element, elementName as name}