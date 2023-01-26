import {addFileAction} from "/libs/actions.mjs"

export async function load(){
  addFileAction("application/ld2", {title: "Inspect data", gotoPath: "/ld2", access: "r", permission: "ld2.read"})
}