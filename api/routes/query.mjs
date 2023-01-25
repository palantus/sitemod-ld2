import express from "express"
import { noGuest, validateAccess } from "../../../../services/auth.mjs";
import Query from "../../models/query.mjs";
const { Router, Request, Response } = express;
const route = Router();

export default (app) => {

  const route = Router();
  app.use("/ld2/query", route)

  route.get("/:id", (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.query.read" })) return;
    let e = Query.lookup(req.params.id)
    if(!e) return res.sendStatus(404);
    if(!e.validateAccess(res, 'r')) return;
    res.json(e.toObjSpec(res.locals.user, res.locals.shareKey))
  })

  route.get("/", (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.query.read" })) return;
    res.json(Query.allUser(res.locals.user, res.locals.shareKey).map(e => e.toObj(res.locals.user, res.locals.shareKey)))
  })

  route.post("/", noGuest, (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.query.edit" })) return;
    if(!req.body.title) throw "title is mandatory"
    let e = new Query(req.body.title, res.locals.user)
    e.patch(req.body, res.locals.user)
    res.json(e.toObj(res.locals.user, res.locals.shareKey))
  })

  route.patch("/:id", noGuest, (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.query.edit" })) return;
    let e = Query.lookup(req.params.id)
    if(!e) return res.sendStatus(404);
    if(!e.validateAccess(res, 'w')) return;
    e.patch(req.body, res.locals.user)
    res.json(e.toObjSpec(res.locals.user, res.locals.shareKey))
  })

  route.delete("/:id", noGuest, (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.query.edit" })) return;
    let e = Query.lookup(req.params.id)
    if(!e) return res.sendStatus(404);
    if(!e.validateAccess(res, 'w')) return;
    e.delete()
    res.json({success:true})
  })
};