let elementName = "ld2-edit-query-component"

import "/components/ld2-edit/datasource.mjs"
import "/components/field-list.mjs"
import "/components/field-edit-inline.mjs"
import "/components/context-menu.mjs"

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
    .ds-container{
      position: relative;
    }
    context-menu{
      position: absolute;
      top: 5px;
      right: 5px;
    }
  </style>
  <div id="container">
    <h2>Query</h2>

    <div id="summary">
      <div id="summary-text"></div>
    </div>

    Output data from data source 
    <field-edit-inline type="text" label="Main datasource" id="main-ds"></field-edit-inline>
    .
    <br><br>

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

    this.shadowRoot.getElementById("add-ds").addEventListener("click", () => this.addDS({}));

    this.shadowRoot.getElementById("datasources").addEventListener("item-clicked", e => {
      let container = e.target.closest(".ds-container")
      let ds =  container?.querySelector("ld2-edit-query-ds-component")
      if(!container||!ds) return;
      switch(e.detail){
        case "remove":
          container?.remove();
          this.getSpec()
          break;
        default:
          alertDialog("Not implemented yet - sorry!")
      }
      this.refreshUI();
    })
  }

  refreshUI(){
    /*
    this.shadowRoot.getElementById("summary-text").innerHTML = `
      Fetches data from <span class="highlight">${this.spec.dataSources?.length||0}</span> datasources and results in the output from data source <span class="highlight">${this.spec.mainDS||this.spec.dataSources?.[0]?.name||"N/A"}</span>.
      `
    */

    this.shadowRoot.getElementById("main-ds").setAttribute("value", this.spec.mainDS||"")

    this.shadowRoot.getElementById("datasources").innerHTML = '';
    for(let dsSpec of this.spec.dataSources||[]){
      this.addDS(dsSpec)
    }
  }

  addDS(spec){
    let container = document.createElement("div")
    container.classList.add("ds-container")
    container.setAttribute("data-name", spec.name||spec.field)
    container.innerHTML = `
      <context-menu width="150px">
        <span data-button="remove">Remove data source</span>
      </context-menu>
    `
    let ds = document.createElement("ld2-edit-query-ds-component")
    ds.setSpec(spec)
    ds.classList.add("section")
    container.appendChild(ds)
    this.shadowRoot.getElementById("datasources").appendChild(container);
  }

  setSpec(spec){
    this.spec = spec
    this.refreshUI();
  }

  getSpec(){
    let newSpec = {
      mainDS: this.shadowRoot.getElementById("main-ds").getValue(),
      dataSources: [...this.shadowRoot.getElementById("datasources").querySelectorAll("ld2-edit-query-ds-component")].map(dsE => dsE.getSpec()).filter(spec => !!spec)
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