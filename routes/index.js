const auth = require("./auth");
const user = require("./user");
const admin = require("./admin");

const { Router } = require("express");
const router = Router();

module.exports = { auth, user, admin };
