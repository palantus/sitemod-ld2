let elementName = "ld2-edit-query-on-component"

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
  </style>
  <div id="container">
    <field-list labels-pct="20">
      <field-edit type="text" label="This field" id="this"></field-edit>
      <field-edit type="text" label="Remote field" id="remote"></field-edit>
    </field-list>
  </div>
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