let elementName = "ld2-edit-query-field-component"

import "../../components/field-edit-inline.mjs"
import "../../components/field-list.mjs"

import "../../components/ld2-edit/on.mjs"
import "../../components/ld2-edit/where.mjs"
import { toggleEditMode } from "../ld2-query.mjs"
import { stylesheets, siteURL } from "../../system/core.mjs"

const template = document.createElement('template');
template.innerHTML = `
<link rel='stylesheet' href='${siteURL()}/css/ld2.css'>
  <style>
    :host{display: block;}
    #container{
      border: 1px solid var(--contrast-color-muted);
      padding: 7px;
    }
    field-list{
      width: 500px;
    }
    h3{margin-top: 00px;}
    field-edit-inline{margin-left: 3px; margin-right: 3px;}
  </style>
  <div id="container">
    <h3><span id="field-title"></span></h3>

    Get field <field-edit-inline type="text" label="Field" id="field"></field-edit-inline> from 
    <field-edit-inline type="select" label="Source" id="source">
      <option value="this">This data source</option>
      <option value="remote">Another data source</option>
    </field-edit-inline>
    and name it <field-edit-inline type="text" label="Name" id="name"></field-edit-inline>

    <div id="remote-fields">
      Use data source
        <field-edit-inline type="text" label="Data source" id="ds"></field-edit-inline>
      as the source and fetch 
        <field-edit-inline type="select" label="Type" id="type">
          <option value=""></option>
          <option value="sum">Sum of all records</option>
          <option value="count">Record count</option>
          <option value="first">First record</option>
          <option value="last">Last record</option>
        </field-edit-inline>
      where

      <span id="ons">
      </span>
      <span id="add-on" class="add-button" title="Add join field">&#x2795;</span>
    
      <br>
      Where
      <span id="wheres">
      </span>
      <span id="add-where" class="add-button" title="Add condition">&#x2795;</span>
    </div>

  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' })
        .adoptedStyleSheets = [stylesheets.global];
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById("field").addEventListener("value-changed", () => {
      if(!this.shadowRoot.getElementById("name").getValue()){
        this.shadowRoot.getElementById("name").setAttribute("value", this.shadowRoot.getElementById("field").getValue())
      }
    })

    this.shadowRoot.getElementById("name").addEventListener("value-changed", () => {
      this.getSpec()
      this.refreshUI()
    })

    this.shadowRoot.getElementById("add-on").addEventListener("click", () => this.addOn({}, true));
    this.shadowRoot.getElementById("add-where").addEventListener("click", () => this.addWhere({}, true));

    this.shadowRoot.getElementById("source").addEventListener("value-changed", () => {
      this.shadowRoot.getElementById("remote-fields").classList.toggle("hidden", this.shadowRoot.getElementById("source").getValue() == "this")
      if(this.shadowRoot.getElementById("ons").querySelectorAll("ld2-edit-query-on-component").length == 0){
        this.addOn({}, true)
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

  addWhere(spec, userEvent = false){
    if(this.shadowRoot.getElementById("wheres").querySelectorAll("ld2-edit-query-where-component").length > 0){
      this.shadowRoot.getElementById("wheres").appendChild(document.createTextNode(" and "));
    } else {
      this.shadowRoot.getElementById("wheres").innerHTML = "";
    }
    let where = document.createElement("ld2-edit-query-where-component")
    where.setSpec(spec)
    this.shadowRoot.getElementById("wheres").appendChild(where);
    if(userEvent) where.toggleAttribute("edit-mode", true)
  }

  addOn(spec, userEvent = false){
    if(this.shadowRoot.getElementById("ons").querySelectorAll("ld2-edit-query-on-component").length > 0){
      this.shadowRoot.getElementById("ons").appendChild(document.createTextNode(" and "));
    } else {
      this.shadowRoot.getElementById("ons").innerHTML = "";
    }
    let on = document.createElement("ld2-edit-query-on-component")
    on.setSpec(spec)
    this.shadowRoot.getElementById("ons").appendChild(on);
    if(userEvent) on.toggleAttribute("edit-mode", true)
  }

  setSpec(spec){
    this.spec = spec
    this.refreshUI();
  }

  getSpec(){
    let ons = [...this.shadowRoot.getElementById("ons").querySelectorAll("ld2-edit-query-on-component")].map(e => e.getSpec()).filter(spec => !!spec)
    let wheres = [...this.shadowRoot.getElementById("wheres").querySelectorAll("ld2-edit-query-where-component")].map(e => e.getSpec()).filter(spec => !!spec)

    let newSpec = {
      name: (this.shadowRoot.getElementById("name").getValue() != this.shadowRoot.getElementById("field").getValue() 
           ? this.shadowRoot.getElementById("name").getValue() 
           : undefined) || undefined,
      field: this.shadowRoot.getElementById("field").getValue(),
      ds: this.shadowRoot.getElementById("ds").getValue()||undefined,
      type: this.shadowRoot.getElementById("type").getValue()||undefined,
      on: ons.length > 0 ? ons : undefined,
      where: wheres.length > 0 ? wheres : undefined,
    }
    this.spec = newSpec
    return this.spec.field ? this.spec : null
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