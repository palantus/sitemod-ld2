let elementName = "ld2-edit-query-on-component"

import "/components/field-edit.mjs"
import "/components/field-list.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
    }
    field-edit{margin-left: 3px; margin-right: 3px;}
  </style>
  <span id="container">
    the field 
      <field-edit type="text" label="This field" id="this"></field-edit>
    in this data source must be equal to 
      <field-edit type="text" label="Remote field" id="remote"></field-edit>
    in the other
    
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

  }

  refreshUI(){
    this.shadowRoot.getElementById("remote").setAttribute("value", this.spec.remote||"")
    this.shadowRoot.getElementById("this").setAttribute("value", this.spec.this||"")
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