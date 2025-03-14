const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./databases/users.db');

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (id TEXT, username TEXT, password TEXT, role TEXT)");
});

async function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function addUser(id, username, password, role) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?)");
        stmt.run(id, username, password, role, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve({ id, username, password, role });
            }
            stmt.finalize();
        });
    });
}

module.exports = {
    getUserByUsername,
    addUser
};
