let elementName = "ld2-edit-query-component"

import "/components/ld2-edit/datasource.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    :host{display: block;}
    #datasources ld2-edit-query-ds-component{
      margin-bottom: 15px;
    }
    button{margin-bottom: 10px;}
  </style>
  <div id="container">
    <h2>Data sources:</h2>
    <div id="datasources">
    </div>
    <button id="add-ds" class="styled">Add data source</button>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

  }

  refreshUI(){
    for(let dsSpec of this.spec.dataSources||[]){
      let ds = document.createElement("ld2-edit-query-ds-component")
      ds.setSpec(dsSpec)
      ds.classList.add("section")
      this.shadowRoot.getElementById("datasources").appendChild(ds);
    }
  }

  setSpec(spec){
    this.spec = spec
    this.refreshUI();
  }

  getSpec(){

  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}