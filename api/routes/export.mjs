import express from "express"
import { noGuest } from "../../../../services/auth.mjs";
import Export from "../../models/export.mjs";
const { Router, Request, Response } = express;
const route = Router();

export default (app) => {

  const route = Router();
  app.use("/ld2/export", route)

  route.get("/:id", (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.export.read" })) return;
    let e = Export.lookup(req.params.id)
    if(!e) return res.sendStatus(404);
    if(!e.validateAccess(res, 'r')) return;
    res.json(e.toObjSpec())
  })

  route.get("/", (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.export.read" })) return;
    res.json(Export.allUser(res.locals.user, res.locals.shareKey).map(e => e.toObj()))
  })

  route.post("/", noGuest, (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.export.edit" })) return;
    if(!req.body.title) throw "title is mandatory"
    let e = new Export(req.body.title, res.locals.user)
    e.patch(req.body, res.locals.user)
    res.json(e.toObj())
  })

  route.patch("/:id", noGuest, (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.export.edit" })) return;
    let e = Export.lookup(req.params.id)
    if(!e) return res.sendStatus(404);
    if(!e.validateAccess(res, 'w')) return;
    e.patch(req.body, res.locals.user)
    res.json(e.toObjSpec())
  })

  route.delete("/:id", noGuest, (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.export.edit" })) return;
    let e = Export.lookup(req.params.id)
    if(!e) return res.sendStatus(404);
    if(!e.validateAccess(res, 'w')) return;
    e.delete()
    res.json({success:true})
  })
};