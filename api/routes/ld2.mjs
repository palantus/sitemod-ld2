import express from "express"
const { Router, Request, Response } = express;
const route = Router();

export default (app) => {

  const route = Router();
  app.use("/ld2", route)

  /*
  route.get("/searchhelp", (req, res) => {
    res.json(tokens)
  })
  */
};