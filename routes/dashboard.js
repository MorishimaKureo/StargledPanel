const express = require("express");
const fs = require("fs");
const path = require("path");
const { isAuthenticated } = require("../modules/auth"); // Add this line

const router = express.Router();
const SERVERS_DIR = path.join(__dirname, "../servers");

router.get("/", isAuthenticated, (req, res) => { // Add isAuthenticated middleware
    fs.readdir(SERVERS_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: "Gagal membaca folder servers" });

        const servers = files.filter(file => fs.statSync(path.join(SERVERS_DIR, file)).isDirectory());
        res.render("dashboard", { servers, user: req.session.user });
    });
});

module.exports = router;
