let elementName = "export-csv-component"

import moment from "/libs/moment.js"
import "/components/table-paging.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>    
  </style>
  <div id="container">
    <button class="styled" id="back-btn">Back to content</button>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById("back-btn").addEventListener("click", () => this.dispatchEvent(new CustomEvent("back-clicked", {bubbles: true, cancelable: false})))
  }
  async init(reader){
    this.reader = reader
    await this.reader.fillTableMetadata(this.tableName)
    this.meta = this.reader.tables[this.tableName];
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}


window.customElements.define(elementName, Element);
export {Element, elementName as name}