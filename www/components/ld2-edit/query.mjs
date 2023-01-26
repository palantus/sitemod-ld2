let elementName = "ld2-edit-query-component"

import "/components/ld2-edit/datasource.mjs"
import "/components/field-list.mjs"

const template = document.createElement('template');
template.innerHTML = `
  <link rel='stylesheet' href='/css/global.css'>
  <style>
    :host{display: block;}
    #summary-text{margin-bottom: 5px;}
    #details{margin-bottom: 15px;}
    #datasources ld2-edit-query-ds-component{
      margin-bottom: 20px;
    }
    field-list{
      width: 400px;
    }
    button{margin-bottom: 10px;}
  </style>
  <div id="container">
    <h2>Query</h2>

    <div id="summary">
      <div id="summary-text"></div>
      <button id="show-details">Show details</button>
    </div>

    <div id="details" class="hidden">
      <field-list labels-pct="35">
        <field-edit type="text" label="Main datasource" id="main-ds"></field-edit>
      </field-list>
    </div>

    <div id="datasources">
    </div>
    <button id="add-ds" class="styled">Add data source</button>
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
      Fetches data from <span class="highlight">${this.spec.dataSources?.length||0}</span> datasources and results in the output from data source <span class="highlight">${this.spec.mainDS||this.spec.dataSources?.[0]?.name||"N/A"}</span>.
      `

    this.shadowRoot.getElementById("main-ds").setAttribute("value", this.spec.mainDS||"")

    this.shadowRoot.getElementById("datasources").innerHTML = '';
    for(let dsSpec of this.spec.dataSources||[]){
      let ds = document.createElement("ld2-edit-query-ds-component")
      ds.setSpec(dsSpec)
      ds.classList.add("section")
      this.shadowRoot.getElementById("datasources").appendChild(ds);
    }
  }

  setSpec(spec){
    this.spec = spec
    this.refreshUI();
  }

  getSpec(){
    let newSpec = {
      mainDS: this.shadowRoot.getElementById("main-ds").getValue(),
      dataSources: [...this.shadowRoot.getElementById("datasources").querySelectorAll("ld2-edit-query-ds-component")].map(dsE => dsE.getSpec())
    }
    this.spec = newSpec
    return this.spec
  }

  connectedCallback() {
  }

  disconnectedCallback() {
  }
}

window.customElements.define(elementName, Element);
export {Element, elementName as name}