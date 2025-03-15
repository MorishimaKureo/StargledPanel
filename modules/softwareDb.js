const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const Log = require("cat-loggr");

const log = new Log();
const db = new sqlite3.Database('./databases/software.db');

// Buat tabel jika belum ada
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS server_software (
            id TEXT PRIMARY KEY,
            name TEXT,
            start_script TEXT,
            environment TEXT,
            download_url TEXT
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS software_versions (
            software_id TEXT,
            version TEXT,
            FOREIGN KEY (software_id) REFERENCES server_software(id)
        )
    `);
});

/**
 * Menambahkan atau memperbarui entri software server.
 */
async function addServerSoftware(id, name, startScript, environment, downloadUrl) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO server_software (id, name, start_script, environment, download_url)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(id, name, startScript, environment, downloadUrl, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve({ id, name, startScript, environment, downloadUrl });
            }
            stmt.finalize();
        });
    });
}

/**
 * Menambahkan versi untuk software server.
 */
async function addSoftwareVersion(softwareId, version) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT INTO software_versions (software_id, version)
            VALUES (?, ?)
        `);
        stmt.run(softwareId, version, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve({ softwareId, version });
            }
            stmt.finalize();
        });
    });
}

/**
 * Mengambil semua software server dari database.
 */
async function getServerSoftware() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM server_software", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * Mengambil satu software berdasarkan ID.
 */
async function getServerSoftwareById(id) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM server_software WHERE id = ?", [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

/**
 * Mengambil daftar versi dari database berdasarkan ID software.
 */
async function getSoftwareVersions(softwareId) {
    return new Promise((resolve, reject) => {
        db.all("SELECT version FROM software_versions WHERE software_id = ?", [softwareId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(row => row.version));
        });
    });
}

/**
 * Mengambil URL download berdasarkan ID software.
 */
async function getDownloadUrl(id, version) {
    const software = await getServerSoftwareById(id);
    if (!software || !software.download_url) throw new Error("Software tidak ditemukan atau tidak memiliki URL.");

    const downloadUrl = software.download_url.replace("{version}", version);
    log.info(`Generated download URL: ${downloadUrl}`); // Replaced console.log

    return downloadUrl;
}

module.exports = {
    addServerSoftware,
    addSoftwareVersion,
    getServerSoftware,
    getServerSoftwareById,
    getSoftwareVersions,
    getDownloadUrl
};
