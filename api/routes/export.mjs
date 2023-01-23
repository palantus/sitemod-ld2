import express from "express"
import { noGuest } from "../../../../services/auth.mjs";
import Export from "../../models/export.mjs";
const { Router, Request, Response } = express;
const route = Router();

export default (app) => {

  const route = Router();
  app.use("/ld2/export", route)

  route.get("/", (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.export.read" })) return;
    res.json(Export.allUser(res.locals.user, res.locals.shareKey).map(e => e.toObj()))
  })

  route.post("/", noGuest, (req, res) => {
    if (!validateAccess(req, res, { permission: "ld2.export.edit" })) return;
    if(!req.body.title) throw "title is mandatory"
    let e = new Export(req.body.title, res.locals.user)
    res.json(e.toObj())
  })
};