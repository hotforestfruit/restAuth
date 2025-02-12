const { PrismaClient } = require("@prisma/client");
const { Router } = require("express");
const router = Router();
const prisma = new PrismaClient();

const { ensureAuth, authorize } = require("../utils/authorize");
require("dotenv").config();

router.get("/current", ensureAuth, async (req, res) => {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.user.id } });

    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get(
  "/moderator",
  ensureAuth,
  authorize(["ADMIN", "MOD"]),
  (req, res) => {
    return res
      .status(200)
      .json({ messagee: "Only admins and mods can access this route" });
  }
);

router.post("/deleteAll", async (req, res) => {
  await prisma.user.deleteMany({});
  res.send("done");
});

module.exports = router;
