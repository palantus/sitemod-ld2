import Role from "../../models/role.mjs"
import DataType from "../../models/datatype.mjs"
import Query, {UNIQUE_TYPE_NAME as QueryTypeName} from "./models/query.mjs"

export default async () => {
  // init
  Role.lookupOrCreate("LD2-Admin").addPermission(["ld2.query.edit", "ld2.query.admin", "ld2.query.read", "ld2.read"], true)

  DataType.lookupOrCreate(QueryTypeName, {title: "LD2 query", permission: "ld2.query.read", api: "ld2/query", nameField: "title", acl: "r:private;w:private"})
          .init({typeModel: Query})

  return {}
}