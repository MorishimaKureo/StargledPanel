const express = require("express");
const { authenticateUser } = require("../modules/auth");

const router = express.Router();

router.get("/login", (req, res) => {
    res.render("login");
});

router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await authenticateUser(req, username, password);
        if (user) {
            res.clearCookie('connect.sid'); // Clear any existing session cookie
            req.session.regenerate((err) => { // Regenerate session to ensure a new session ID
                if (err) {
                    return res.render("login", { error: "Failed to regenerate session. Please try again." });
                }
                req.session.user = user;
                req.session.save((err) => {
                    if (err) {
                        return res.render("login", { error: "Failed to save session. Please try again." });
                    }
                    res.redirect("/");
                });
            });
        } else {
            res.render("login", { error: "Invalid username or password" });
        }
    } catch (err) {
        res.render("login", { error: "Failed to save session. Please try again." });
    }
});

module.exports = router;
