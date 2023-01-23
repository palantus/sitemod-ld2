import Role from "../../models/role.mjs"
import DataType from "../../models/datatype.mjs"
import Export, {UNIQUE_TYPE_NAME as ExportTypeName} from "./models/export.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("LD2-Admin").addPermission(["ld2.export.edit", "ld2.export.admin", "ld2.export.read", "ld2.read"], true)

  DataType.lookupOrCreate(ExportTypeName, {title: "LD2 export template", permission: "ld2.read", api: "ld2/template", nameField: "title", uiPath: "ld2/template", acl: "r:private;w:private"})
          .init({typeModel: Export})

  return {}
}