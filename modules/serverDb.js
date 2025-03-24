const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database('./databases/servers.db');
const SERVERS_DIR = './servers';

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

/**
 * Mengambil semua server milik pengguna dengan detail.
 */
async function getUserServersWithDetails(userId) {
    return new Promise((resolve, reject) => {
        db.all("SELECT server_name FROM user_servers WHERE user_id = ?", [userId], (err, rows) => {
            if (err) return reject(err);
            
            const servers = rows.map(row => {
                try {
                    const serverPath = path.join(SERVERS_DIR, row.server_name);
                    const configPath = path.join(serverPath, 'config.json');

                    if (!fs.existsSync(configPath)) {
                        console.warn(`Config file missing: ${configPath}`);
                        return null;
                    }

                    const serverConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                    return {
                        id: row.server_name,
                        name: serverConfig.name,
                        ip: serverConfig.ip,
                        ramUsed: serverConfig.ramUsed,
                        ramTotal: serverConfig.ramTotal,
                        cpuUsage: serverConfig.cpuUsage,
                        diskUsed: serverConfig.diskUsed,
                        diskTotal: serverConfig.diskTotal,
                        status: serverConfig.status
                    };
                } catch (error) {
                    console.error(`Error reading server config for ${row.server_name}:`, error);
                    return null;
                }
            }).filter(server => server !== null);

            resolve(servers);
        });
    });
}

/**
 * Mengambil semua server dengan detail.
 */
async function getAllServersWithDetails() {
    return new Promise((resolve, reject) => {
        db.all("SELECT server_name FROM user_servers", (err, rows) => {
            if (err) return reject(err);
            
            const servers = rows.map(row => {
                try {
                    const serverPath = path.join(SERVERS_DIR, row.server_name);
                    const configPath = path.join(serverPath, 'config.json');

                    if (!fs.existsSync(configPath)) {
                        console.warn(`Config file missing: ${configPath}`);
                        return null;
                    }

                    const serverConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

                    return {
                        id: row.server_name,
                        name: serverConfig.name,
                        ip: serverConfig.ip,
                        ramUsed: serverConfig.ramUsed,
                        ramTotal: serverConfig.ramTotal,
                        cpuUsage: serverConfig.cpuUsage,
                        diskUsed: serverConfig.diskUsed,
                        diskTotal: serverConfig.diskTotal,
                        status: serverConfig.status
                    };
                } catch (error) {
                    console.error(`Error reading server config for ${row.server_name}:`, error);
                    return null;
                }
            }).filter(server => server !== null);

            resolve(servers);
        });
    });
}

module.exports = {
    addUserServer,
    deleteUserServer,
    getUserServers,
    getUserServersWithDetails,
    getAllServersWithDetails // Export the function
};
