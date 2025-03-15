const express = require("express");
const fs = require("fs");
const path = require("path");
const { isAuthenticated } = require("../modules/auth");
const { getUserServers } = require("../modules/serverDb"); // Add this line

const router = express.Router();
const SERVERS_DIR = path.join(__dirname, "../servers");

router.get("/", isAuthenticated, async (req, res) => { // Add isAuthenticated middleware
    const userId = req.session.user.id;
    try {
        const servers = await getUserServers(userId); // Get servers owned by the user
        res.render("dashboard", { servers, user: req.session.user });
    } catch (err) {
        res.status(500).json({ error: "Gagal membaca folder servers" });
    }
});

module.exports = router;
