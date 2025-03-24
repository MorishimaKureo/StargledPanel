const sqlite3 = require('sqlite3').verbose();
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const db = new sqlite3.Database('./databases/users.db');

async function addUser(username, password, role) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    return new Promise((resolve, reject) => {
        const stmt = db.prepare("INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)");
        stmt.run(id, username, hashedPassword, role, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve({ id, username, hashedPassword, role });
            }
            stmt.finalize();
        });
    });
}

async function getAllUsers() {
    return new Promise((resolve, reject) => {
        db.all("SELECT id, username, role FROM users", (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

async function deleteUser(userId) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare("DELETE FROM users WHERE id = ?");
        stmt.run(userId, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
            stmt.finalize();
        });
    });
}

async function updateUserPassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return new Promise((resolve, reject) => {
        const stmt = db.prepare("UPDATE users SET password = ? WHERE id = ?");
        stmt.run(hashedPassword, userId, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
            stmt.finalize();
        });
    });
}

async function updateUserUsername(userId, newUsername) {
    return new Promise((resolve, reject) => {
        db.run("UPDATE users SET username = ? WHERE id = ?", [newUsername, userId], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

module.exports = { addUser, getAllUsers, deleteUser, updateUserPassword, updateUserUsername };
