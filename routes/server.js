const express = require("express");
const path = require("path");
const { getSystemStats } = require("../modules/systemStats");
const { serverLogs } = require("../modules/serverManager");

const router = express.Router();
const SERVERS_DIR = path.join(__dirname, "../servers");

router.get("/server/:name", (req, res) => {
    const serverName = req.params.name;
    res.render("console", { serverName });
});

router.get("/logs/:name", async (req, res) => {
    const serverName = req.params.name;
    if (serverLogs[serverName]) {
        const serverPath = path.join(SERVERS_DIR, serverName);
        const stats = await getSystemStats(serverPath);
        res.json({ logs: serverLogs[serverName], stats });
    } else {
        res.status(404).json({ error: "Log tidak ditemukan untuk server ini." });
    }
});

module.exports = router;
