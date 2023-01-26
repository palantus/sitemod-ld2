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
  </style>
  <div id="container">
    <h2>Data source: <span id="header-title"></span></h2>
    <div id="summary">
      <div id="summary-text"></div>
      <button id="show-details">Show details</button>
    </div>
    <div id="details" class="hidden">
      <field-list labels-pct="20">
        <field-edit type="text" label="Name" id="name"></field-edit>
        <field-edit type="text" label="Table" id="table"></field-edit>
      </field-list>
      <h3>Fields:</h3>
      <div id="fields">
      </div>
      <button id="add-field" class="styled">Add field</button>

      <h3>Group by:</h3>
      <field-list labels-pct="20">
        <field-edit type="text" label="Fields" id="groupfields" title="Enter comma-separated list of fields to group by"></field-edit>
        <field-edit type="text" label="Sum" id="sumfields" title="Enter comma-separated list of fields to sum"></field-edit>
      </field-list>

      <h3>Join:</h3>
      <field-list labels-pct="20">
        <field-edit type="select" label="Type" id="join-type">
          <option value="">None</option>
          <option value="exist">Exist (matching records must exist in remote data source)</option>
        </field-edit>
      </field-list>
      <div id="join-container">
        <field-list labels-pct="20">
          <field-edit type="text" label="Data source" id="join-ds"></field-edit>
        </field-list>
        <h4>On:</h4>
        <div id="join-ons">
        </div>
        <button id="add-on" class="styled">Add join field</button>
      </div>
    
      <h3>Conditions:</h3>
      <div id="wheres">
      </div>
      <button id="add-where" class="styled">Add condition</button>
    </div>
  </div>
`;

class Element extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.shadowRoot.getElementById("show-details").addEventListener("click", () => {
      this.shadowRoot.getElementById("details").classList.toggle("hidden")
      this.shadowRoot.getElementById("show-details").innerText = this.shadowRoot.getElementById("details").classList.contains("hidden") ? "Show details" : "Hide details"
    })
  }

  refreshUI(){
    this.shadowRoot.getElementById("summary-text").innerHTML = `
      This data source fetches data from <span class="highlight">${this.spec.table}</span>.<br>
      The output consists of the following columns: ${(this.spec.fields||[]).map(f => `<span class="highlight">${f.name||f.field}</span>`).join(", ")}.
      `

    this.shadowRoot.getElementById("header-title").innerText = this.spec.name||"N/A"
    this.shadowRoot.getElementById("name").setAttribute("value", this.spec.name||"");
    this.shadowRoot.getElementById("table").setAttribute("value", this.spec.table||"");

    for(let fieldSpec of this.spec.fields||[]){
      let field = document.createElement("ld2-edit-query-field-component")
      field.setSpec(fieldSpec)
      field.classList.add("section")
      this.shadowRoot.getElementById("fields").appendChild(field);
    }

    this.shadowRoot.getElementById("groupfields").setAttribute("value", this.spec.groupBy?.fields?.join(", ")||"");
    this.shadowRoot.getElementById("sumfields").setAttribute("value", this.spec.groupBy?.sum?.join(", ")||"");

    for(let whereSpec of this.spec.where||[]){
      let where = document.createElement("ld2-edit-query-where-component")
      where.setSpec(whereSpec)
      where.classList.add("section")
      this.shadowRoot.getElementById("wheres").appendChild(where);
    }

    this.shadowRoot.getElementById("join-type").setAttribute("value", this.spec.join?.type||"");
    this.shadowRoot.getElementById("join-ds").setAttribute("value", this.spec.join?.ds||"");
    for(let onSpec of this.spec.join?.on||[]){
      let on = document.createElement("ld2-edit-query-on-component")
      on.setSpec(onSpec)
      on.classList.add("section")
      this.shadowRoot.getElementById("join-ons").appendChild(on);
    }
    this.shadowRoot.getElementById("join-container").classList.toggle("hidden", !!!this.spec.join?.type)
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