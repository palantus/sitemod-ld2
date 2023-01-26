let elementName = "ld2-edit-query-ds-component"

import "/components/ld2-edit/field.mjs"
import "/components/field-edit.mjs"
import "/components/field-list.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    :host{display: block;}
    #container{
    }
    #summary-text{margin-bottom: 5px;}
    #fields ld2-edit-query-field-component{
      margin-bottom: 15px;
    }
    field-list{
      width: 500px;
    }
    button{margin-bottom: 10px;}
    #add-on,#add-where{display: block;}
    #groupfields,#sumfields{width: 300px;}
    field-edit{margin-left: 3px; margin-right: 3px;}
  </style>
  <div id="container">
    <h2>Data source: <span id="header-title"></span></h2>
    <div id="summary">
      <div id="summary-text"></div>
      <button id="show-details">Show details</button>
    </div>
    <div id="details" class="hidden">
      Get data from table 
      <field-edit type="text" label="Table" id="table"></field-edit>
      and name it 
      <field-edit type="text" label="Name" id="name"></field-edit>
      <br>
      Return the following fields:
      <div id="fields">
      </div>
      <button id="add-field" class="styled">Add field</button>
      <br>
      Group by <field-edit type="text" label="Fields" id="groupfields" title="Enter comma-separated list of fields to group by"></field-edit>.
      <br>
      Sum the fields <field-edit type="text" label="Sum" id="sumfields" title="Enter comma-separated list of fields to sum"></field-edit>.
      <br>
      Join 
        <field-edit type="select" label="Type" id="join-type">
          <option value="">None</option>
          <option value="exist">Exist (matching records must exist in remote data source)</option>
        </field-edit>
      <span id="join-container">
        with data source 
          <field-edit type="text" label="Data source" id="join-ds"></field-edit>
        where 
        <span id="join-ons">
        </span>
        <button id="add-on" class="styled">Add join field</button>
      </span>
    
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

    this.storeAndRefreshUI = this.storeAndRefreshUI.bind(this)

    this.shadowRoot.getElementById("show-details").addEventListener("click", () => {
      this.shadowRoot.getElementById("details").classList.toggle("hidden")
      this.shadowRoot.getElementById("show-details").innerText = this.shadowRoot.getElementById("details").classList.contains("hidden") ? "Show details" : "Hide details"
    })

    this.shadowRoot.getElementById("add-field").addEventListener("click", () => this.addField({}));
    this.shadowRoot.getElementById("add-on").addEventListener("click", () => this.addOn({}));
    this.shadowRoot.getElementById("add-where").addEventListener("click", () => this.addWhere({}));

    this.shadowRoot.getElementById("table").addEventListener("value-changed", this.storeAndRefreshUI);
    this.shadowRoot.getElementById("name").addEventListener("value-changed", this.storeAndRefreshUI);
  }

  refreshUI(){
    this.shadowRoot.getElementById("summary-text").innerHTML = `
      This data source fetches data from <span class="highlight">${this.spec.table}</span>.<br>
      The output consists of the following columns: ${(this.spec.fields||[]).map(f => `<span class="highlight">${f.name||f.field}</span>`).join(", ")}.
      `

    this.shadowRoot.getElementById("fields").innerHTML = ""
    this.shadowRoot.getElementById("wheres").innerHTML = ""
    this.shadowRoot.getElementById("join-ons").innerHTML = ""

    this.shadowRoot.getElementById("header-title").innerText = this.spec.name||"N/A"
    this.shadowRoot.getElementById("name").setAttribute("value", this.spec.name||"");
    this.shadowRoot.getElementById("table").setAttribute("value", this.spec.table||"");
    this.spec.fields?.forEach(spec => this.addField(spec))
    this.shadowRoot.getElementById("groupfields").setAttribute("value", this.spec.groupBy?.fields?.join(", ")||"");
    this.shadowRoot.getElementById("sumfields").setAttribute("value", this.spec.groupBy?.sum?.join(", ")||"");
    this.spec.where?.forEach(spec => this.addWhere(spec))
    this.shadowRoot.getElementById("join-type").setAttribute("value", this.spec.join?.type||"");
    this.shadowRoot.getElementById("join-ds").setAttribute("value", this.spec.join?.ds||"");
    this.spec.join?.on?.forEach(spec => this.addOn(spec))
    this.shadowRoot.getElementById("join-container").classList.toggle("hidden", !!!this.spec.join?.type)
  }

  storeAndRefreshUI(){
    this.getSpec();
    this.refreshUI();
  }

  addField(spec){
    let field = document.createElement("ld2-edit-query-field-component")
    field.setSpec(spec)
    this.shadowRoot.getElementById("fields").appendChild(field);
  }

  addWhere(spec){
    let where = document.createElement("ld2-edit-query-where-component")
    where.setSpec(spec)
    this.shadowRoot.getElementById("wheres").appendChild(where);
  }

  addOn(spec){
    let on = document.createElement("ld2-edit-query-on-component")
    on.setSpec(spec)
    this.shadowRoot.getElementById("join-ons").appendChild(on);
  }

  setSpec(spec){
    this.spec = spec
    this.refreshUI();
  }

  getSpec(){
    let newSpec = {
      name: this.shadowRoot.getElementById("name").getValue(),
      table: this.shadowRoot.getElementById("table").getValue(),
      fields: [...this.shadowRoot.getElementById("fields").querySelectorAll("ld2-edit-query-field-component")].map(e => e.getSpec()),
      groupBy: (this.shadowRoot.getElementById("groupfields").getValue() || this.shadowRoot.getElementById("groupfields").getValue()) ? {
        fields: this.shadowRoot.getElementById("groupfields").getValue() ? this.shadowRoot.getElementById("groupfields").getValue().split(",").map(f => f.trim()) : undefined,
        sum: this.shadowRoot.getElementById("sumfields").getValue() ? this.shadowRoot.getElementById("sumfields").getValue().split(",").map(f => f.trim()) : undefined,
      } : undefined,
      where: this.shadowRoot.getElementById("wheres").querySelectorAll("ld2-edit-query-where-component").length > 0
        ? [...this.shadowRoot.getElementById("wheres").querySelectorAll("ld2-edit-query-where-component")].map(e => e.getSpec()).filter(spec => !!spec) 
        : undefined,
      join: this.shadowRoot.getElementById("join-type").getValue() ? {
        type: this.shadowRoot.getElementById("join-type").getValue(),
        ds: this.shadowRoot.getElementById("join-ds").getValue(),
        on: [...this.shadowRoot.getElementById("join-ons").querySelectorAll("ld2-edit-query-on-component")].map(e => e.getSpec()),
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