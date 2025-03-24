const express = require("express");
const { isAuthenticated } = require("../modules/auth");
const { updateUserUsername, updateUserPassword } = require("../modules/userDb");

const router = express.Router();

router.get("/account", isAuthenticated, (req, res) => {
    res.render("account", { user: req.session.user, error: null });
});

router.post("/account/update-username", isAuthenticated, async (req, res) => {
    const { newUsername } = req.body;
    try {
        await updateUserUsername(req.session.user.id, newUsername);
        req.session.user.username = newUsername; // Update session
        req.session.save((err) => {
            if (err) {
                return res.render("account", { user: req.session.user, error: "Failed to save session. Please try again." });
            }
            res.redirect("/account");
        });
    } catch (err) {
        res.render("account", { user: req.session.user, error: "Failed to update username. Please try again." });
    }
});

router.post("/account/update-password", isAuthenticated, async (req, res) => {
    const { newPassword } = req.body;
    try {
        await updateUserPassword(req.session.user.id, newPassword);
        res.redirect("/account");
    } catch (err) {
        res.render("account", { user: req.session.user, error: "Failed to update password. Please try again." });
    }
});

module.exports = router;
