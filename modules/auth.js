const db = require("./db"); // Assume you have a module to interact with your database

async function authenticateUser(username, password) {
    const user = await db.getUserByUsername(username);
    if (user && user.password === password) {
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

module.exports = { authenticateUser, checkAdminRole };
