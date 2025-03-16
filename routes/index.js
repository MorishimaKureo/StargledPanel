const express = require("express");
const fs = require("fs");
const path = require("path");
const { isAuthenticated, isAdmin, authenticateUser } = require("../modules/auth");
const { addServerSoftware, getServerSoftware, getSoftwareVersions, getServerSoftwareById } = require("../modules/softwareDb");
const { createServer } = require("../modules/serverManager");
const { deleteUserServer } = require("../modules/serverDb");
const { v4: uuidv4 } = require("uuid");
const Log = require("cat-loggr");
const { addUser, getAllUsers, deleteUser, updateUserPassword } = require("../modules/userDb");
const { getSystemStats } = require("../modules/systemStats");
const { serverLogs } = require("../modules/serverManager");

const router = express.Router();
const log = new Log();
const SERVERS_DIR = path.join(__dirname, "../servers");

// Login route
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

// Logout route
router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Failed to log out.");
        }
        res.redirect("/login");
    });
});

// Admin routes
router.get("/admin", isAuthenticated, isAdmin, (req, res) => {
    res.render("adminWelcome");
});

router.get("/admin/manage-software", isAuthenticated, isAdmin, async (req, res) => {
    const softwareOptions = await getServerSoftware();
    res.render("adminManageSoftware", { softwareOptions });
});

router.post("/admin/add-software", isAuthenticated, isAdmin, (req, res) => {
    const { name, startScript, environment } = req.body;
    const id = uuidv4();
    addServerSoftware(id, name, startScript, environment).then(() => {
        res.redirect("/admin/manage-software");
    }).catch(err => {
        res.status(500).send("Error adding server software: " + err.message);
    });
});

router.get("/admin/manage-users", isAuthenticated, isAdmin, async (req, res) => {
    const users = await getAllUsers();
    res.render("adminManageUsers", { users });
});

router.post("/admin/add-user", isAuthenticated, isAdmin, (req, res) => {
    const { username, password, role } = req.body;
    addUser(username, password, role).then(() => {
        res.redirect("/admin/manage-users");
    }).catch(err => {
        res.status(500).send("Error adding user: " + err.message);
    });
});

router.post("/admin/delete-user", isAuthenticated, isAdmin, async (req, res) => {
    const { userId } = req.body;
    await deleteUser(userId);
    res.redirect("/admin/manage-users");
});

router.post("/admin/update-user-password", isAuthenticated, isAdmin, async (req, res) => {
    const { userId, newPassword } = req.body;
    await updateUserPassword(userId, newPassword);
    res.redirect("/admin/manage-users");
});

router.get("/admin/manage-servers", isAuthenticated, isAdmin, async (req, res) => {
    fs.readdir(SERVERS_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: "Gagal membaca folder servers" });

        const servers = files.filter(file => fs.statSync(path.join(SERVERS_DIR, file)).isDirectory());
        res.render("adminManageServers", { servers });
    });
});

router.get("/admin/create-server", isAuthenticated, isAdmin, async (req, res) => {
    const softwareOptions = await getServerSoftware();
    res.render("adminCreateServer", { softwareOptions });
});

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

router.post("/admin/manage-servers/delete-server", isAuthenticated, isAdmin, async (req, res) => {
    const { serverName } = req.body;
    if (!serverName) {
        return res.status(400).send("Server name is required");
    }
    const serverPath = path.join(SERVERS_DIR, serverName);

    if (fs.existsSync(serverPath)) {
        fs.rmSync(serverPath, { recursive: true });
        await deleteUserServer(serverName);
        res.redirect("/admin/manage-servers");
    } else {
        res.status(404).send("Server tidak ditemukan");
    }
});

router.get("/admin/get-versions/:softwareId", isAuthenticated, isAdmin, async (req, res) => {
    const softwareId = req.params.softwareId;
    const software = await getServerSoftwareById(softwareId);
    if (!software) {
        return res.status(404).send("Software not found");
    }

    try {
        const versions = await getSoftwareVersions(software.name);
        res.json({ versions });
    } catch (err) {
        log.error(`Error fetching versions for software ID ${softwareId}: ${err.message}`);
        res.status(500).send("Error fetching versions: " + err.message);
    }
});

// Server routes
router.get("/server/:name", isAuthenticated, (req, res) => {
    const serverName = req.params.name;
    res.render("console", { serverName });
});

router.get("/logs/:name", isAuthenticated, async (req, res) => {
    const serverName = req.params.name;
    if (serverLogs[serverName]) {
        const serverPath = path.join(SERVERS_DIR, serverName);
        const stats = await getSystemStats(serverPath);
        res.json({ logs: serverLogs[serverName], stats });
    } else {
        res.status(404).json({ error: "Log tidak ditemukan untuk server ini." });
    }
});

// Dashboard route
router.get("/", isAuthenticated, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const servers = await getUserServers(userId);
        res.render("dashboard", { servers, user: req.session.user });
    } catch (err) {
        res.status(500).json({ error: "Gagal membaca folder servers" });
    }
});

module.exports = router;
