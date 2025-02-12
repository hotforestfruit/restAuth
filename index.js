const express = require("express");
const app = express();
require("dotenv").config();
const routes = require("./routes");

app.use(express.json());

app.use("/api/auth", routes.auth);
app.use("/api/users", routes.user);
app.use("/api/admin", routes.admin);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
// 1.05.498
