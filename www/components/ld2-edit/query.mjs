let elementName = "ld2-edit-query-component"

import "/components/ld2-edit/datasource.mjs"
import "/components/field-list.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    :host{display: block;}
    #datasources ld2-edit-query-ds-component{
      margin-bottom: 20px;
    }
    field-list{
      width: 400px;
    }
    button{margin-bottom: 10px;}
  </style>
  <div id="container">
    <h2>Query</h2>
    <field-list labels-pct="35">
      <field-edit type="text" label="Main datasource" id="main-ds"></field-edit>
    </field-list>
    <br>

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
    this.shadowRoot.getElementById("main-ds").setAttribute("value", this.spec.mainDS||"")

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
    return this.spec
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}