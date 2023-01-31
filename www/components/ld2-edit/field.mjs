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
      border: 1px solid var(--contrast-color-muted);
      padding: 5px
    }
    field-list{
      width: 500px;
    }
    h3{margin-top: 00px;}
    field-edit{margin-left: 3px; margin-right: 3px;}
    #add-on,#add-where{display: block;}
  </style>
  <div id="container">
    <h3><span id="field-title"></span></h3>

    Get field <field-edit type="text" label="Field" id="field"></field-edit> from 
    <field-edit type="select" label="Source" id="source">
      <option value="this">This data source</option>
      <option value="remote">Another data source</option>
    </field-edit>
    and name it <field-edit type="text" label="Name" id="name"></field-edit>

    <div id="remote-fields">
      Use 
        <field-edit type="text" label="Data source" id="ds"></field-edit>
      as the source and fetch 
        <field-edit type="select" label="Type" id="type">
          <option value=""></option>
          <option value="sum">Sum of all records</option>
          <option value="count">Record count</option>
          <option value="first">First record</option>
          <option value="last">Last record</option>
        </field-edit>
      where

      <span id="ons">
      </span>
      <button id="add-on" class="styled">Add join field</button>
  
      <span id="wheres">
      </span>
      <button id="add-where" class="styled">Add condition</button>
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

    this.shadowRoot.getElementById("add-on").addEventListener("click", () => this.addOn({}));
    this.shadowRoot.getElementById("add-where").addEventListener("click", () => this.addWhere({}));

    this.shadowRoot.getElementById("source").addEventListener("value-changed", () => {
      this.shadowRoot.getElementById("remote-fields").classList.toggle("hidden", this.shadowRoot.getElementById("source").getValue() == "this")
      if(this.shadowRoot.getElementById("ons").querySelectorAll("ld2-edit-query-on-component").length == 0){
        this.addOn({})
      }
    })
  }

  refreshUI(){
    this.shadowRoot.getElementById("field-title").innerText = this.spec.name||this.spec.field||"";
    this.shadowRoot.getElementById("name").setAttribute("value", this.spec.name||this.spec.field||"")
    this.shadowRoot.getElementById("field").setAttribute("value", this.spec.field||"")
    this.shadowRoot.getElementById("source").setAttribute("value", this.spec.ds ? "remote" : "this")
    this.shadowRoot.getElementById("remote-fields").classList.toggle("hidden", !!!this.spec.ds)
    this.shadowRoot.getElementById("ds").setAttribute("value", this.spec.ds||"")
    this.shadowRoot.getElementById("type").setAttribute("value", this.spec.type||"")
    
    this.shadowRoot.getElementById("wheres").innerHTML = ""
    this.shadowRoot.getElementById("ons").innerHTML = ""

    this.spec.on?.forEach(spec => this.addOn(spec))
    this.spec.where?.forEach(spec => this.addWhere(spec))
  }

  addWhere(spec){
    let where = document.createElement("ld2-edit-query-where-component")
    where.setSpec(spec)
    this.shadowRoot.getElementById("wheres").appendChild(where);
  }

  addOn(spec){
    if(this.shadowRoot.getElementById("ons").childNodes.length > 0){
      this.shadowRoot.getElementById("ons").appendChild(document.createTextNode(" and "));
    }
    let on = document.createElement("ld2-edit-query-on-component")
    on.setSpec(spec)
    this.shadowRoot.getElementById("ons").appendChild(on);
  }

  setSpec(spec){
    this.spec = spec
    this.refreshUI();
  }

  getSpec(){
    let newSpec = {
      name: (this.shadowRoot.getElementById("name").getValue()!=this.shadowRoot.getElementById("field").getValue() ? this.shadowRoot.getElementById("name").getValue() : undefined) || undefined,
      field: this.shadowRoot.getElementById("field").getValue(),
      ds: this.shadowRoot.getElementById("ds").getValue()||undefined,
      type: this.shadowRoot.getElementById("type").getValue()||undefined,
      on: this.shadowRoot.getElementById("ons").querySelectorAll("ld2-edit-query-on-component").length > 0 ? [...this.shadowRoot.getElementById("ons").querySelectorAll("ld2-edit-query-on-component")].map(e => e.getSpec()) : undefined,
      where: this.shadowRoot.getElementById("wheres").querySelectorAll("ld2-edit-query-where-component").length > 0 ? [...this.shadowRoot.getElementById("wheres").querySelectorAll("ld2-edit-query-where-component")].map(e => e.getSpec()).filter(spec => !!spec) : undefined,
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