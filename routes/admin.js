const express = require("express");
const fs = require("fs");
const path = require("path");
const { isAuthenticated, isAdmin } = require("../modules/auth");
const { addServerSoftware, getServerSoftware, getSoftwareVersions, getServerSoftwareById } = require("../modules/softwareDb");
const { createServer } = require("../modules/serverManager");
const { deleteUserServer } = require("../modules/serverDb"); // Add this line
const { v4: uuidv4 } = require("uuid");
const Log = require("cat-loggr");

const router = express.Router();
const log = new Log();
const SERVERS_DIR = path.join(__dirname, "../servers");

// Admin welcome route
router.get("/admin", isAuthenticated, isAdmin, (req, res) => {
    res.render("adminWelcome");
});

// Admin manage server software route
router.get("/admin/manage-software", isAuthenticated, isAdmin, async (req, res) => {
    const softwareOptions = await getServerSoftware();
    res.render("adminManageSoftware", { softwareOptions });
});

// Admin add server software route
router.post("/admin/add-software", isAuthenticated, isAdmin, (req, res) => {
    const { name, startScript, environment } = req.body;
    const id = uuidv4();
    addServerSoftware(id, name, startScript, environment).then(() => {
        res.redirect("/admin/manage-software");
    }).catch(err => {
        res.status(500).send("Error adding server software: " + err.message);
    });
});

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
    try {
        const serverId = await createServer(userId, serverName, softwareId, version);
        res.redirect(`/admin/manage-servers`);
    } catch (error) {
        res.status(500).send("Error creating server: " + error.message);
    }
});

// Endpoint to delete a server (admin only)
router.post("/admin/manage-servers/delete-server", isAuthenticated, isAdmin, async (req, res) => {
    const { serverName } = req.body;
    if (!serverName) {
        return res.status(400).send("Server name is required");
    }
    const serverPath = path.join(SERVERS_DIR, serverName);

    if (fs.existsSync(serverPath)) {
        fs.rmSync(serverPath, { recursive: true });
        await deleteUserServer(serverName); // Add this line to remove the server entry from the database
        res.redirect("/admin/manage-servers");
    } else {
        res.status(404).send("Server tidak ditemukan");
    }
});

// Endpoint to fetch versions for a specific software
router.get("/admin/get-versions/:softwareId", isAuthenticated, isAdmin, async (req, res) => {
    const softwareId = req.params.softwareId;
    const software = await getServerSoftwareById(softwareId);
    if (!software) {
        return res.status(404).send("Software not found");
    }

    try {
        const versions = await getSoftwareVersions(softwareId);
        res.json({ versions });
    } catch (err) {
        log.error(`Error fetching versions for software ID ${softwareId}: ${err.message}`);
        res.status(500).send("Error fetching versions: " + err.message);
    }
});

module.exports = router;
