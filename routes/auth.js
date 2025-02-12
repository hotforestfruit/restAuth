const { PrismaClient } = require("@prisma/client");
const { Router } = require("express");
const router = Router();
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticator } = require("otplib");
const qrcode = require("qrcode");
const { ensureAuth } = require("../utils/authorize");
const crypto = require("crypto");
const NodeCache = require("node-cache");

const cache = new NodeCache();

require("dotenv").config();

router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(422).json({ message: "Please fill in all fields" });
    }
    if (await prisma.user.findFirst({ where: { email } })) {
      return res.status(409).json({ message: "Email already registered" });
    }
    if (await prisma.user.findFirst({ where: { username } })) {
      return res.status(409).json({ message: "Username already registered" });
    }
    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
      try {
        await prisma.user.create({
          data: {
            email,
            username,
            password: hashedPassword,
            role,
            twoFASecret: null,
          },
        });

        return res
          .status(201)
          .json({ message: `User Registered Successfully` });
      } catch (err) {
        return next(err);
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(422).json({ message: "Please fill in all fields" });
    }

    const user = await prisma.user.findFirst({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: "Username not found" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Incorrect password" });
    }
    if (user["twoFAEnable"]) {
      const tempToken = crypto.randomUUID();

      cache.set(
        process.env.cacheTemporaryTokenPrefix + tempToken,
        user.id,
        process.env.cacheTemporaryTokenExpiresInSeconds
      );
      return res.status(200).json({
        tempToken,
        expiresInSeconds: process.env.cacheTemporaryTokenExpiresInSeconds,
      });
    } else {
      const accessToken = jwt.sign({ userId: user.id }, process.env.SECRET, {
        subject: "accessApi",
        expiresIn: process.env.accessTokenExpiresIn,
      });

      const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH, {
        subject: "refreshToken",
        expiresIn: process.env.refreshTokenExpiresIn,
      });

      await prisma.userTokens.create({
        data: { refreshToken, userId: user.id },
      });

      return res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email,
        accessToken,
        refreshToken,
      });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/login/2fa", async (req, res) => {
  try {
    const { tempToken, totp } = req.body;

    if (!tempToken || !totp) {
      return res
        .status(422)
        .json({ message: "Please fill in all fields (tempToken and totp" });
    }
    const userId = cache.get(process.env.cacheTemporaryTokenPrefix + tempToken);
    if (!userId) {
      return res
        .status(401)
        .json({ message: "The provided temp token is incorrect of expired" });
    }

    const user = await prisma.user.findFirst({ where: { id: userId } });

    const verified = authenticator.check(totp, user["twoFASecret"]);

    if (!verified) {
      return res
        .status(401)
        .json({ message: "The provided totp is incorrect or expired" });
    }

    const accessToken = jwt.sign({ userId: user.id }, process.env.SECRET, {
      subject: "accessApi",
      expiresIn: process.env.accessTokenExpiresIn,
    });

    const refreshToken = jwt.sign({ userId: user.id }, process.env.REFRESH, {
      subject: "refreshToken",
      expiresIn: process.env.refreshTokenExpiresIn,
    });

    await prisma.userTokens.create({
      data: { refreshToken, userId: user.id },
    });

    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/delete/refresh-tokens", async (req, res) => {
  await prisma.userTokens.deleteMany({});
  return res.send("done");
});

router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }
    const decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH);
    const userRefreshToken = await prisma.userTokens.findFirst({
      where: { refreshToken, userId: decodedRefreshToken.userId },
    });

    if (!userRefreshToken) {
      return res
        .status(401)
        .json({ message: "Refresh token invalid or expired" });
    }

    await prisma.userTokens.deleteMany({
      where: { userId: userRefreshToken.userId },
    });

    const accessToken = jwt.sign(
      { userId: decodedRefreshToken.userId },
      process.env.SECRET,
      {
        subject: "accessApi",
        expiresIn: process.env.accessTokenExpiresIn,
      }
    );

    const newRefreshToken = jwt.sign(
      { userId: decodedRefreshToken.userId },
      process.env.REFRESH,
      {
        subject: "refreshToken",
        expiresIn: process.env.refreshTokenExpiresIn,
      }
    );

    await prisma.userTokens.create({
      data: {
        refreshToken: newRefreshToken,
        userId: decodedRefreshToken.userId,
      },
    });
    return res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    if (
      err instanceof jwt.TokenExpiredError ||
      err instanceof jwt.JsonWebTokenError
    ) {
      return res
        .status(401)
        .json({ message: "Refresh token invalid or expired" });
    }
    return res.status(500).json({ message: err.message });
  }
});

//logout marks invalid token with expiration time to be deleted via a seperate chron job
router.post("/logout", ensureAuth, async (req, res) => {
  try {
    // const { refreshToken } = req.body;

    //This will remove all refresh tokens for this user
    //including tokens created on other devices
    await prisma.userTokens.deleteMany({ where: { userId: req.user.id } });

    // await prisma.userTokens.delete({ where: { refreshToken } });

    await prisma.invalidTokens.create({
      data: {
        accessToken: req.accessToken.value,
        userId: req.user.id,
        expirationTime: req.accessToken.exp,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
  return res.status(204).send();
});

router.get("/2fa/generate", ensureAuth, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });

    const secret = authenticator.generateSecret();
    const uri = authenticator.keyuri(user.email, "hotforesfruit", secret);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFASecret: secret },
    });

    const qrCode = await qrcode.toBuffer(uri, { type: "image/png", margin: 1 });

    res.setHeader("Content-Disposition", "attachement; filename=qrcode.png");

    return res.status(200).type("image/png").send(qrCode);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/2fa/validate", ensureAuth, async (req, res) => {
  try {
    const { totp } = req.body;

    if (!totp) {
      return res.status(422).json({ message: "TOTP is required" });
    }

    const user = await prisma.user.findFirst({ where: { id: req.user.id } });
    const verified = authenticator.check(totp, user[`twoFASecret`]);

    if (!verified) {
      return res
        .status(400)
        .json({ message: "TOTP is not correct or expired" });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFAEnable: true },
    });
    return res.status(200).json({ message: "TOTP validated successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
