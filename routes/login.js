const express = require("express");
const { authenticateUser } = require("../modules/auth");

const router = express.Router();

router.get("/login", (req, res) => {
    res.render("login");
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await authenticateUser(username, password);
    if (user) {
        req.session.user = user;
        res.redirect("/");
    } else {
        res.status(401).send("Invalid username or password");
    }
});

module.exports = router;
