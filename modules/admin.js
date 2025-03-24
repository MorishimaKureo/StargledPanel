const express = require("express");
const { isAuthenticated, isAdmin, logout } = require("./auth");
const { addServerSoftware, getServerSoftware } = require("./softwareDb");
const { v4: uuidv4 } = require("uuid");
const { addUser } = require("./userDb");

const router = express.Router();

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

// Admin add user page route
router.get("/admin/add-user", isAuthenticated, isAdmin, (req, res) => {
    res.render("adminAddUser");
});

// Admin add user form submission route
router.post("/admin/add-user", isAuthenticated, isAdmin, (req, res) => {
    const { username, password, role } = req.body;
    addUser(username, password, role).then(() => {
        res.redirect("/admin");
    }).catch(err => {
        res.status(500).send("Error adding user: " + err.message);
    });
});

// Logout route
router.get("/logout", isAuthenticated, logout);

module.exports = router;
