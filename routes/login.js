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
        req.session.regenerate((err) => {
            if (err) {
                return res.status(500).send("Failed to regenerate session.");
            }
            req.session.user = user;
            req.session.save((err) => {
                if (err) {
                    return res.status(500).send("Failed to save session.");
                }
                res.redirect("/");
            });
        });
    } else {
        res.status(401).send("Invalid username or password");
    }
});

module.exports = router;
