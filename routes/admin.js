const express = require("express");
const fs = require("fs");
const path = require("path");
const { isAuthenticated, isAdmin } = require("../modules/auth");
const { addServerSoftware, getServerSoftware, getSoftwareVersions, getServerSoftwareById } = require("../modules/softwareDb");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();
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
        res.status(500).send("Error fetching versions: " + err.message);
    }
});

module.exports = router;
