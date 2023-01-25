let elementName = "ld2-edit-query-field-component"

import "/components/field-edit.mjs"
import "/components/field-list.mjs"

import "/components/ld2-edit/on.mjs"
import "/components/ld2-edit/where.mjs"

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
    h3{margin-top: 10px;}
  </style>
  <div id="container">
    <field-list labels-pct="20">
      <field-edit type="text" label="Field" id="field"></field-edit>
      <field-edit type="text" label="Name" id="name"></field-edit>
      <field-edit type="select" label="Source" id="source">
        <option value="this">This data source</option>
        <option value="remote">Another data source</option>
      </field-edit>
    </field-list>

    <div id="remote-fields">
      <field-list labels-pct="20">
        <field-edit type="text" label="Data source" id="ds"></field-edit>
        <field-edit type="select" label="Type" id="type">
          <option value=""></option>
          <option value="sum">Sum of all records</option>
          <option value="first">First record</option>
        </field-edit>
      </field-list>

      <h3>Join on:</h3>
      <div id="ons">
      </div>
      <button id="add-on" class="styled">Add field</button>
  
      <h3>Conditions:</h3>
      <div id="wheres">
      </div>
      <button id="add-where" class="styled">Add field</button>
    </div>

  </div>
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
    this.shadowRoot.getElementById("name").setAttribute("value", this.spec.name||this.spec.field||"")
    this.shadowRoot.getElementById("field").setAttribute("value", this.spec.field||"")
    this.shadowRoot.getElementById("source").setAttribute("value", this.spec.ds ? "remote" : "this")
    this.shadowRoot.getElementById("remote-fields").classList.toggle("hidden", !!!this.spec.ds)
    this.shadowRoot.getElementById("ds").setAttribute("value", this.spec.ds||"")
    this.shadowRoot.getElementById("type").setAttribute("value", this.spec.type||"")
    
    for(let onSpec of this.spec.on||[]){
      let on = document.createElement("ld2-edit-query-on-component")
      on.setSpec(onSpec)
      on.classList.add("section")
      this.shadowRoot.getElementById("ons").appendChild(on);
    }
    
    for(let whereSpec of this.spec.where||[]){
      let where = document.createElement("ld2-edit-query-where-component")
      where.setSpec(whereSpec)
      where.classList.add("section")
      this.shadowRoot.getElementById("wheres").appendChild(where);
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