let elementName = "ld2-edit-query-aggregate-component"

import "/components/field-edit-inline.mjs"
import "/components/field-list.mjs"
import { toggleEditMode } from "../ld2-query.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
    }
    field-list{
      width: 500px;
    }
    field-edit-inline{margin-left: 3px; margin-right: 3px;}
  </style>
  <span id="container">
    by getting 
      <field-edit-inline type="select" label="Type" id="type">
        <option value=""></option>
        <option value="sum">Sum of all values</option>
        <option value="count">Count of all values</option>
        <option value="first">First value</option>
        <option value="last">Last value</option>
      </field-edit-inline>
    <span id="field-container">
      from field 
        <field-edit-inline type="text" label="Field" id="field"></field-edit-inline>
    </span>
    naming it
      <field-edit-inline type="text" label="Name" id="name"></field-edit-inline>
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

    this.shadowRoot.getElementById("type").addEventListener("value-changed", () => {
      let type = this.shadowRoot.getElementById("type").getValue()
      this.shadowRoot.getElementById("field-container").classList.toggle("hidden", type == "count" || !type)
    })
  }

  refreshUI(){
    this.shadowRoot.getElementById("field").setAttribute("value", this.spec.field||"")
    this.shadowRoot.getElementById("type").setAttribute("value", this.spec.type||"")
    this.shadowRoot.getElementById("name").setAttribute("value", this.spec.name||"")
    this.shadowRoot.getElementById("field-container").classList.toggle("hidden", this.spec.type == "count" || !this.spec.type)
  }

  setSpec(spec){
    this.spec = spec
    this.refreshUI();
  }

  getSpec(){
    let newSpec = {
      field: this.shadowRoot.getElementById("field").getValue(),
      type: this.shadowRoot.getElementById("type").getValue(),
      name: this.shadowRoot.getElementById("name").getValue()
    }
    this.spec = newSpec
    return this.spec.type && (this.spec.field||this.spec.name) ? this.spec : null
  }

  static get observedAttributes() {
    return ["edit-mode"];
  }  

  attributeChangedCallback(name, oldValue, newValue) {
    toggleEditMode(this, newValue != null)
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}