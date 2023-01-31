let elementName = "ld2-edit-query-group-component"

import "/components/field-edit.mjs"
import "/components/field-list.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
    }
    field-list{
      width: 500px;
    }
    field-edit{margin-left: 3px; margin-right: 3px;}
  </style>
  <span id="container">
    field 
        <field-edit type="text" label="Field" id="field"></field-edit>
    </span>
    naming it
      <field-edit type="text" label="Name" id="name"></field-edit>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById("field").addEventListener("value-changed", () => {
      if(!this.shadowRoot.getElementById("name").getValue()){
        this.shadowRoot.getElementById("name").setAttribute("value", this.shadowRoot.getElementById("field").getValue())
      }
    })
  }

  refreshUI(){
    this.shadowRoot.getElementById("field").setAttribute("value", this.spec.field||"")
    this.shadowRoot.getElementById("name").setAttribute("value", this.spec.name||"")
  }

  setSpec(spec){
    this.spec = spec
    this.refreshUI();
  }

  getSpec(){
    let newSpec = {
      field: this.shadowRoot.getElementById("field").getValue(),
      name: this.shadowRoot.getElementById("name").getValue()
    }
    this.spec = newSpec
    return this.spec.field ? this.spec : null
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}