let elementName = "ld2-edit-query-on-component"

import "../../components/field-edit-inline.mjs"
import "../../components/field-list.mjs"
import { toggleEditMode } from "../ld2-query.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    #container{
    }
    field-edit-inline{margin-left: 3px; margin-right: 3px;}
  </style>
  <span id="container">
    the field 
      <field-edit-inline type="text" label="This field" id="this"></field-edit-inline>
    in <u>this</u> data source must be equal to 
      <field-edit-inline type="text" label="Remote field" id="remote"></field-edit-inline>
    in the <u>other</u>
  </span>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById("this").addEventListener("value-changed", () => {
      if(!this.shadowRoot.getElementById("remote").getValue()){
        this.shadowRoot.getElementById("remote").setAttribute("value", this.shadowRoot.getElementById("this").getValue())
      }
    })
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
    let newSpec = {
      remote: this.shadowRoot.getElementById("remote").getValue(),
      this: this.shadowRoot.getElementById("this").getValue(),
    }
    this.spec = newSpec
    return this.spec.remote && this.spec.this ? this.spec : null
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