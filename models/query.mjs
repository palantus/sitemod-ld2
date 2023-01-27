import Entity, {query, nextNum} from "entitystorage"
import ACL from "../../../models/acl.mjs"
import DataType from "../../../models/datatype.mjs"
import User from "../../../models/user.mjs"

export const UNIQUE_TYPE_NAME = "ld2-query"

export default class Query extends Entity {
  initNew(title, owner) {
    this.id = nextNum(UNIQUE_TYPE_NAME)
    this.title = title
    this.spec = ""

    this.tag(UNIQUE_TYPE_NAME)
    ACL.setDefaultACLOnEntity(this, owner, DataType.lookup(UNIQUE_TYPE_NAME))
  }

  static lookup(id) {
    if(!id) return null;
    return query.type(Query).id(id).tag(UNIQUE_TYPE_NAME).first
  }

  static all(){
    return query.type(Query).tag(UNIQUE_TYPE_NAME).all
  }

  static allUser(user){
    let type = DataType.lookup(UNIQUE_TYPE_NAME)
    return query.type(Query).tag(UNIQUE_TYPE_NAME).all.filter(l => new ACL(l, type).hasAccess(user, 'r'))
  }

  patch(obj, user){
    if(typeof obj.title === "string" && obj.title) this.title = obj.title;
    if(typeof obj.description === "string") this.description = obj.description;
    if(typeof obj.spec === "string") {
      try{
        JSON.parse(obj.spec)
      } catch(err){
        throw "Invalid JSON"
      }
      if(obj.spec.length > 50000) throw "Spec is too large. Can't support more than 50.000 characters";
      this.spec = obj.spec;
    }
    if(typeof obj.common === "boolean" && user.hasPermission("ld2.query.admin")) this.common = obj.common;
  }

  hasAccess(user, accessType = 'r', shareKey = null) {
    return new ACL(this, DataType.lookup(UNIQUE_TYPE_NAME)).hasAccess(user, accessType, shareKey)
  }

  validateAccess(res, accessType, respondIfFalse = true) {
    return new ACL(this, DataType.lookup(UNIQUE_TYPE_NAME)).validateAccess(res, accessType, respondIfFalse)
  }

  access(user, shareKey) {
    let acl = new ACL(this, DataType.lookup(UNIQUE_TYPE_NAME))
    return "" + (acl.hasAccess(user, "r", shareKey) ? 'r' : '') + (acl.hasAccess(user, "w", shareKey) ? 'w' : '')
  }

  get owner(){
    return User.from(this.related.owner)
  }

  toObj(user, shareKey) {
    let owner = this.owner
    return {
      id: this._id,
      title: this.title,
      this: this.spec,
      owner: owner?.toObjSimple()||null,
      access: this.access(user, shareKey),
      common: this.common,
      category: this.common ? "common" : owner.id == user.id ? "mine" : "shared",
    }
  }

  toObjSpec(user, shareKey) {
    return {
      ...this.toObj(user, shareKey),
      spec: this.spec,
      description: this.description||null
    }
  }
}