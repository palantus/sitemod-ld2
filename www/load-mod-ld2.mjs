export async function load(){
  //Ensure that it works without files installed
  try{
    let actions = await import("./libs/actions.mjs")
    actions?.addFileAction("application/ld2", {title: "Inspect data", gotoPath: "/ld2", access: "r", permission: "ld2.read"})
  } catch(err){}
}