let elementName = "ld2-edit-query-ds-component"

import "../../components/ld2-edit/field.mjs"
import "../../components/ld2-edit/aggregate.mjs"
import "../../components/ld2-edit/group.mjs"
import "../../components/field-edit-inline.mjs"
import "../../components/field-list.mjs"
import "../../components/context-menu.mjs"
import {alertDialog} from "../../components/dialog.mjs"
import { toggleEditMode } from "../ld2-query.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <link rel='stylesheet' href='/css/ld2.css'>
  <style>
    :host{display: block;}
    #container{
    }
    #fields ld2-edit-query-field-component{
      margin-bottom: 15px;
    }
    field-list{
      width: 500px;
    }
    #summary{margin-bottom: 5px;}
    button{margin-bottom: 10px;}
    #groupfields,#sumfields{width: 300px;}
    field-edit-inline{margin-left: 3px; margin-right: 3px;}
    div.field-container{
      position: relative;
    }
    context-menu{
      position: absolute;
      top: 8px;
      right: 7px;
      font-size: 111%;
      padding: 10px;
    }
  </style>
  <div id="container">
    <div id="summary">
      Get data from table 
      <field-edit-inline type="text" label="Table" id="table"></field-edit-inline>
      and name it 
      <field-edit-inline type="text" label="Name" id="name"></field-edit-inline>
      . Return the following fields:
    </div>
    
    <div id="fields" class="container">
    </div>
    <button id="add-field" class="styled">Add field</button>
    <br>
    Group by 
    <span id="groups"></span>
    <span id="add-group" class="add-button" title="Add group">&#x2795;</span>

    <span id="aggregate-container">
      <br>
      Aggregate
      <span id="aggregates"></span>
      <span id="add-aggregate" class="add-button" title="Add aggregate">&#x2795;</span>
    </span>
    <br>
    Join 
    <field-edit-inline type="select" label="Type" id="join-type">
      <option value="">None</option>
      <option value="exist">Exist (matching records must exist in remote data source)</option>
    </field-edit-inline>
    <span id="join-container">
      with data source 
        <field-edit-inline type="text" label="Data source" id="join-ds"></field-edit-inline>
      where 
      <span id="join-ons">
      </span>
      <span id="add-on" class="add-button" title="Add join field">&#x2795;</span>
    </span>
  
    <br>
    Where
    <span id="wheres">
    </span>
    <span id="add-where" class="add-button" title="Add condition">&#x2795;</span>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.storeAndRefreshUI = this.storeAndRefreshUI.bind(this)

    this.shadowRoot.getElementById("add-field").addEventListener("click", () => this.addField({}, true));
    this.shadowRoot.getElementById("add-on").addEventListener("click", () => this.addOn({}, true));
    this.shadowRoot.getElementById("add-where").addEventListener("click", () => this.addWhere({}, true));
    this.shadowRoot.getElementById("add-group").addEventListener("click", () => this.addGroup({}, true));
    this.shadowRoot.getElementById("add-aggregate").addEventListener("click", () => this.addAggregate({}, true));

    this.shadowRoot.getElementById("table").addEventListener("value-changed", this.storeAndRefreshUI);
    this.shadowRoot.getElementById("name").addEventListener("value-changed", this.storeAndRefreshUI);

    this.shadowRoot.getElementById("table").addEventListener("value-changed", () => {
      if(!this.shadowRoot.getElementById("name").getValue()){
        this.shadowRoot.getElementById("name").setAttribute("value", this.shadowRoot.getElementById("table").getValue())
      }
    })

    this.shadowRoot.getElementById("join-type").addEventListener("value-changed", () => {
      this.shadowRoot.getElementById("join-container").classList.toggle("hidden", !!!this.shadowRoot.getElementById("join-type").getValue())
    })

    this.shadowRoot.getElementById("fields").addEventListener("item-clicked", e => {
      let container = e.detail.menu.closest(".field-container")
      let field =  container?.querySelector("ld2-edit-query-field-component")
      let fieldSpec = field?.getSpec()
      if(!container||!field) return;
      switch(e.detail.button){
        case "remove":
          container?.remove();
          this.getSpec()
          break;
        case "duplicate":
          this.getSpec()
          this.spec.fields.push(this.spec.fields.find(f => (f.name||f.field) == (fieldSpec.name||fieldSpec.field)))
          break;
        case "move-up":
          if(container.previousElementSibling) container.parentNode.insertBefore(container, container.previousElementSibling);
          this.getSpec()
          break;
        case "move-down":
          if(container.nextElementSibling) container.parentNode.insertBefore(container.nextElementSibling, container);
          this.getSpec()
          break;
        case "move-top":
          container.parentNode.insertBefore(container, container.parentNode.firstElementChild);
          this.getSpec()
          break;
        case "move-bottom":
          container.parentNode.insertBefore(container, null);
          this.getSpec()
          break;
        default:
          alertDialog("Not implemented yet - sorry!")
      }
      this.refreshUI();
    })
  }

  refreshUI(){
    this.shadowRoot.getElementById("fields").innerHTML = ""
    this.shadowRoot.getElementById("wheres").innerHTML = ""
    this.shadowRoot.getElementById("join-ons").innerHTML = ""
    this.shadowRoot.getElementById("aggregates").innerHTML = "none"
    this.shadowRoot.getElementById("groups").innerHTML = "none"

    this.shadowRoot.getElementById("name").setAttribute("value", this.spec.name||"");
    this.shadowRoot.getElementById("table").setAttribute("value", this.spec.table||"");
    this.spec.fields?.forEach(spec => this.addField(spec))
    this.spec.where?.forEach(spec => this.addWhere(spec))
    this.shadowRoot.getElementById("join-type").setAttribute("value", this.spec.join?.type||"");
    this.shadowRoot.getElementById("join-ds").setAttribute("value", this.spec.join?.ds||"");
    this.spec.join?.on?.forEach(spec => this.addOn(spec))
    this.spec.groupBy?.aggregate?.forEach(spec => this.addAggregate(spec))
    this.spec.groupBy?.sum?.forEach(field => this.addAggregate({field, name: field, type: "sum"}))
    this.spec.groupBy?.fields?.forEach(spec => this.addGroup(spec))
    this.shadowRoot.getElementById("join-container").classList.toggle("hidden", !!!this.spec.join?.type)
    this.shadowRoot.getElementById("aggregate-container").classList.toggle("hidden", !!!(this.spec.groupBy?.fields?.length > 0))
  }

  storeAndRefreshUI(){
    this.getSpec();
    this.refreshUI();
    this.dispatchEvent(new CustomEvent("ds-name-changed", {bubbles: true, cancelable: true, detail: {ds: this, name: this.spec.name||this.spec.table}}))
  }

  addField(spec, userEvent = false){
    let container = document.createElement("div")
    container.classList.add("field-container")
    container.setAttribute("data-name", spec.name||spec.field)
    container.innerHTML = `
      <context-menu width="150px">
        <span data-button="remove">Remove field</span>
        <span data-button="duplicate">Duplicate field</span>
        <span data-button="move-up">Move field up</span>
        <span data-button="move-down">Move field down</span>
        <span data-button="move-top">Move field to top</span>
        <span data-button="move-bottom">Move field to bottom</span>
      </context-menu>
    `
    let field = document.createElement("ld2-edit-query-field-component")
    field.setSpec(spec)
    container.appendChild(field)
    this.shadowRoot.getElementById("fields").appendChild(container);
    if(userEvent) field.toggleAttribute("edit-mode", true)
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
    if(this.shadowRoot.getElementById("join-ons").querySelectorAll("ld2-edit-query-on-component").length > 0){
      this.shadowRoot.getElementById("join-ons").appendChild(document.createTextNode(" and "));
    } else {
      this.shadowRoot.getElementById("join-ons").innerHTML = "";
    }
    let on = document.createElement("ld2-edit-query-on-component")
    on.setSpec(spec)
    this.shadowRoot.getElementById("join-ons").appendChild(on);
    if(userEvent) on.toggleAttribute("edit-mode", true)
  }

  addAggregate(spec, userEvent = false){
    if(this.shadowRoot.getElementById("aggregates").querySelectorAll("ld2-edit-query-aggregate-component").length > 0){
      this.shadowRoot.getElementById("aggregates").appendChild(document.createTextNode(" and "));
    } else {
      this.shadowRoot.getElementById("aggregates").innerHTML = "";
    }
    let aggregate = document.createElement("ld2-edit-query-aggregate-component")
    aggregate.setSpec(spec)
    this.shadowRoot.getElementById("aggregates").appendChild(aggregate);
    if(userEvent) aggregate.toggleAttribute("edit-mode", true)
  }

  addGroup(_spec, userEvent = false){
    let spec = typeof _spec === "string" ? {name: _spec, field: _spec} : _spec
    if(this.shadowRoot.getElementById("groups").querySelectorAll("ld2-edit-query-group-component").length > 0){
      this.shadowRoot.getElementById("groups").appendChild(document.createTextNode(" and "));
    } else {
      this.shadowRoot.getElementById("groups").innerHTML = "";
    }
    let group = document.createElement("ld2-edit-query-group-component")
    group.setSpec(spec)
    this.shadowRoot.getElementById("groups").appendChild(group);
    this.shadowRoot.getElementById("aggregate-container").classList.toggle("hidden", false);
    if(userEvent) group.toggleAttribute("edit-mode", true)
  }

  setSpec(spec){
    this.spec = spec
    this.refreshUI();
  }

  getSpec(){
    let groupByFields = [...this.shadowRoot.getElementById("groups").querySelectorAll("ld2-edit-query-group-component")].map(e => e.getSpec()).filter(spec => !!spec)
    let aggregates = [...this.shadowRoot.getElementById("aggregates").querySelectorAll("ld2-edit-query-aggregate-component")].map(e => e.getSpec()).filter(spec => !!spec)
    let wheres = [...this.shadowRoot.getElementById("wheres").querySelectorAll("ld2-edit-query-where-component")].map(e => e.getSpec()).filter(spec => !!spec) 

    let newSpec = {
      name: this.shadowRoot.getElementById("name").getValue(),
      table: this.shadowRoot.getElementById("table").getValue(),
      fields: [...this.shadowRoot.getElementById("fields").querySelectorAll("ld2-edit-query-field-component")].map(e => e.getSpec()).filter(spec => !!spec),
      groupBy: groupByFields.length > 0 ? {
        fields: groupByFields,
        aggregate: aggregates.length > 0 ? aggregates : undefined,
      } : undefined,
      where: wheres.length > 0 ? wheres : undefined,
      join: this.shadowRoot.getElementById("join-type").getValue() ? {
        type: this.shadowRoot.getElementById("join-type").getValue(),
        ds: this.shadowRoot.getElementById("join-ds").getValue(),
        on: [...this.shadowRoot.getElementById("join-ons").querySelectorAll("ld2-edit-query-on-component")].map(e => e.getSpec()).filter(spec => !!spec),
      } : undefined,
    }
    this.spec = newSpec
    return this.spec.name && this.spec.table ? this.spec : null
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}