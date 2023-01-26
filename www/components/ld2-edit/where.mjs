let elementName = "ld2-edit-query-where-component"

import "/components/field-edit.mjs"
import "/components/field-list.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    :host{display: block;}
    #container{
    }
    field-list{
      width: 500px;
    }
    field-edit{margin-left: 3px; margin-right: 3px;}
  </style>
  <div id="container">
    
    Where 
      <field-edit type="text" label="Field" id="field"></field-edit>
    is a 
      <field-edit type="select" label="Type" id="type">
        <option value=""></option>
        <option value="fixed">Fixed value</option>
        <option value="range">Range of values</option>
      </field-edit>
    
    of 
    <span id="fixed-container" class="hidden">
      <field-edit type="text" label="Value" id="value"></field-edit>
    </span>

    <span id="range-container" class="hidden">
      <field-edit type="text" label="From" id="from" title="Value is inclusive. Dates are formattet as YYYYMMDD"></field-edit>
      <field-edit type="text" label="To" id="to" title="Value is inclusive. Dates are formattet as YYYYMMDD"></field-edit>
    </span>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

  }

  refreshUI(){
    this.shadowRoot.getElementById("field").setAttribute("value", this.spec.field||"")
    this.shadowRoot.getElementById("type").setAttribute("value", this.spec.type||"")
    this.shadowRoot.getElementById("value").setAttribute("value", this.spec.value||"")
    this.shadowRoot.getElementById("from").setAttribute("value", this.spec.from||"")
    this.shadowRoot.getElementById("to").setAttribute("value", this.spec.to||"")

    this.shadowRoot.getElementById("fixed-container").classList.toggle("hidden", this.spec.type != "fixed")
    this.shadowRoot.getElementById("range-container").classList.toggle("hidden", this.spec.type != "range")
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