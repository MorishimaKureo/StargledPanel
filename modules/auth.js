const db = require("./db");
const bcrypt = require("bcrypt");

async function authenticateUser(req, username, password) {
    const user = await db.getUserByUsername(username);
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = user;
        return new Promise((resolve, reject) => {
            req.session.save(err => {
                if (err) {
                    reject(err);
                } else {
                    resolve(user);
                }
            });
        });
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

function isManager(req, res, next) {
    if (req.session.user && req.session.user.role === 'manager') {
        next();
    } else {
        res.status(403).send("Access denied");
    }
}

function logout(req, res) {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send("Failed to log out");
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.redirect("/login");
    });

}

module.exports = {
    authenticateUser,
    checkAdminRole,
    isAuthenticated,
    isAdmin,
    isManager,
    logout
};
