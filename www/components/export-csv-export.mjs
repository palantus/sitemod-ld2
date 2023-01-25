let elementName = "export-csv-export-component"

import api from "/system/api.mjs"
import moment from "/libs/moment.js"
import { alertDialog } from "/components/dialog.mjs"
import Toast from "/components/toast.mjs"
import "/components/table-paging.mjs"
import { doExport } from "../libs/exporter.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style> 
  </style>
  <div id="container">
    <h2 id="title"></h2>

    <button id="run" class="styled">Run!</button>
    <br>
    <textarea id="spec"></textarea>
    <br>
    <button id="save-spec-btn" class="styled">Save</button>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.refreshData = this.refreshData.bind(this)
    this.run = this.run.bind(this)
    this.saveSpec = this.saveSpec.bind(this)

    this.shadowRoot.getElementById("run").addEventListener("click", this.run)
    this.shadowRoot.getElementById("save-spec-btn").addEventListener("click", this.saveSpec)

  }

  async refreshData(){
    if(!this.expId) return;
    let exp = this.exp = await api.get(`ld2/export/${this.expId}`);

    this.shadowRoot.getElementById("title").innerText = exp.title
    this.shadowRoot.getElementById("spec").value = exp.spec
  }

  static get observedAttributes() {
    return ["export"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch(name){
      case "export":
        this.expId = parseInt(newValue);
        this.refreshData();
        break;
    }
  }

  async setReader(reader){
    this.reader = reader;
  }

  run(){
    if(!this.exp.spec) return;
    doExport(this.reader, JSON.parse(this.exp.spec))
  }

  async saveSpec(){
    let spec = this.shadowRoot.getElementById("spec").value
    try{
      JSON.parse(spec)
    } catch(err){
      await alertDialog("Export spec is not valid JSON")
      return;
    }
    await api.patch(`ld2/export/${this.expId}`, {spec})
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