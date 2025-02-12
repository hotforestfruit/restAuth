const { PrismaClient } = require("@prisma/client");
const { Router } = require("express");
const router = Router();

const jwt = require("jsonwebtoken");
require("dotenv").config();

router.get("/", ensureAuth, async (req, res) => {
  return res.status(200).json({ message: "Only admins can access this route" });
});

async function ensureAuth(req, res, next) {
  const accessToken = req.headers.authorization;

  if (!accessToken) {
    return res.status(401).json({ message: "Access token not found" });
  }

  try {
    const decodedAccessToken = jwt.verify(accessToken, process.env.SECRET);

    req.user = { id: decodedAccessToken.userId };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Access token invalid or expired" });
  }
}

module.exports = router;
