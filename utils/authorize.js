const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const jwt = require("jsonwebtoken");
require("dotenv").config();

function authorize(roles = []) {
  return async function (req, res, next) {
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });

    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Acess denied" });
    }
    next();
  };
}

//verifies authentication status of user and manages valid/invalid tokens
async function ensureAuth(req, res, next) {
  const accessToken = req.headers.authorization;

  if (!accessToken) {
    return res.status(401).json({ message: "Access token not found" });
  }
  //check if invalid token is being used
  if (await prisma.invalidTokens.findFirst({ where: { accessToken } })) {
    return res.status(401).json({
      message: "Access token invalid",
      code: "AccessTokenInvalid",
    });
  }
  try {
    const decodedAccessToken = jwt.verify(accessToken, process.env.SECRET);
    req.accessToken = { value: accessToken, exp: decodedAccessToken.exp };
    req.user = { id: decodedAccessToken.userId };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: "Access token expired",
        code: "AccessTokenExpired",
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: "Access token invalid",
        code: "AccessTokenInvalid",
      });
    } else {
      return res.status(500).json({ message: error.message });
    }
  }
}
module.exports = { ensureAuth, authorize };
