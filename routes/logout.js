const express = require("express");
const { logout } = require("../modules/auth");

const router = express.Router();

router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Failed to log out.");
        }
        res.clearCookie('connect.sid'); // Clear the session cookie immediately
        res.redirect("/login");
    });
});

router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Failed to log out.");
        }
        res.clearCookie('connect.sid'); // Clear the session cookie immediately
        res.redirect("/login");
    });
});

module.exports = router;
