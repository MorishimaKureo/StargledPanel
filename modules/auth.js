const db = require("./db");
const bcrypt = require("bcrypt");

async function authenticateUser(username, password) {
    const user = await db.getUserByUsername(username);
    if (user && await bcrypt.compare(password, user.password)) {
        return user;
    }
    return null;
}

function checkAdminRole(req, res, next) {
    if (req.session.user.role === "admin") {
        next();
    } else {
        res.status(403).send("Access denied");
    }
}

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect("/login");
    }
}

function isAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).send("Access denied");
    }
}

module.exports = {
    authenticateUser,
    checkAdminRole,
    isAuthenticated,
    isAdmin
};
