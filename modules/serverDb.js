const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./databases/servers.db');

// Buat tabel jika belum ada
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS user_servers (
            user_id TEXT,
            server_name TEXT,
            PRIMARY KEY (user_id, server_name)
        )
    `);
});

/**
 * Menambahkan server untuk pengguna.
 */
async function addUserServer(userId, serverName) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT INTO user_servers (user_id, server_name)
            VALUES (?, ?)
        `);
        stmt.run(userId, serverName, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve({ userId, serverName });
            }
            stmt.finalize();
        });
    });
}

/**
 * Menghapus server dari pengguna.
 */
async function deleteUserServer(serverName) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            DELETE FROM user_servers WHERE server_name = ?
        `);
        stmt.run(serverName, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
            stmt.finalize();
        });
    });
}

/**
 * Mengambil semua server milik pengguna.
 */
async function getUserServers(userId) {
    return new Promise((resolve, reject) => {
        db.all("SELECT server_name FROM user_servers WHERE user_id = ?", [userId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(row => row.server_name));
        });
    });
}

module.exports = {
    addUserServer,
    deleteUserServer,
    getUserServers
};
