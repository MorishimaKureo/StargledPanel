const express = require("express");
const fs = require("fs");
const path = require("path");
const { createServer } = require("./serverManager");
const { isAuthenticated, isAdmin } = require("./auth");
const { getServerSoftware, getSoftwareVersions, getServerSoftwareById } = require("./softwareDb");

const router = express.Router();
const SERVERS_DIR = path.join(__dirname, "../servers");

// Admin manage servers route
router.get("/admin/manage-servers", isAuthenticated, isAdmin, async (req, res) => {
    fs.readdir(SERVERS_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: "Gagal membaca folder servers" });

        const servers = files.filter(file => fs.statSync(path.join(SERVERS_DIR, file)).isDirectory());
        res.render("adminManageServers", { servers });
    });
});

// Admin create server route
router.get("/admin/create-server", isAuthenticated, isAdmin, async (req, res) => {
    const softwareOptions = await getServerSoftware();
    res.render("adminCreateServer", { softwareOptions });
});

// Endpoint to fetch versions for a specific software
router.get("/admin/get-versions/:softwareId", isAuthenticated, isAdmin, async (req, res) => {
    const softwareId = req.params.softwareId;
    const software = await getServerSoftwareById(softwareId);
    if (!software) {
        return res.status(404).send("Software not found");
    }

    try {
        const versions = await getSoftwareVersions(software.name);
        log.info(`Fetched versions for ${software.name}:`, versions); // Debugging information
        res.json({ versions });
    } catch (err) {
        log.error(`Error fetching versions for ${software.name}:`, err.message); // Debugging information
        res.status(500).send("Error fetching versions: " + err.message);
    }
});

// Endpoint to create a new server (admin only)
router.post("/admin/create-server", isAuthenticated, isAdmin, async (req, res) => {
    const { serverName, softwareId, version } = req.body;
    if (!serverName) {
        return res.status(400).send("Server name is required");
    }
    const userId = req.session.user.id;
    if (!userId) {
        return res.status(400).send("User ID is required");
    }
    const serverId = await createServer(userId, serverName, softwareId, version);
    res.redirect(`/admin/manage-servers`);
});

// Endpoint to delete a server (admin only)
router.post("/admin/manage-servers/delete-server", isAuthenticated, isAdmin, (req, res) => {
    const { serverName } = req.body;
    if (!serverName) {
        return res.status(400).send("Server name is required");
    }
    const serverPath = path.join(SERVERS_DIR, serverName);

    if (fs.existsSync(serverPath)) {
        fs.rmSync(serverPath, { recursive: true });
        res.redirect("/admin/manage-servers");
    } else {
        res.status(404).send("Server tidak ditemukan");
    }
});

module.exports = router;
