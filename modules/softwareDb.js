const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

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
 * Mengambil daftar versi dari API eksternal berdasarkan nama software.
 */
async function getSoftwareVersions(name) {
    const versionUrls = {
        "Minecraft Vanilla": "https://launchermeta.mojang.com/mc/game/version_manifest.json",
        "Paper": "https://api.papermc.io/v2/projects/paper",
        "Purpur": "https://api.purpurmc.org/v2/purpur",
        "Forge": "https://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json",
        "Fabric": "https://meta.fabricmc.net/v2/versions/game"
    };

    const url = versionUrls[name];
    if (!url) throw new Error(`No version URL found for software: ${name}`);

    const response = await axios.get(url);
    let versions = [];

    switch (name) {
        case "Minecraft Vanilla":
            versions = response.data.versions.map(version => version.id);
            break;
        case "Paper":
            versions = response.data.versions.map(version => version.version);
            break;
        case "Purpur":
            versions = response.data.versions.map(version => version.version);
            break;
        case "Forge":
            versions = Object.keys(response.data.promos).map(key => key.replace("-recommended", "").replace("-latest", ""));
            break;
        case "Fabric":
            versions = response.data.map(version => version.version);
            break;
    }

    return versions;
}

/**
 * Mengambil URL download berdasarkan ID software.
 */
async function getDownloadUrl(id, version) {
    const software = await getServerSoftwareById(id);
    if (!software || !software.download_url) throw new Error("Software tidak ditemukan atau tidak memiliki URL.");

    const downloadUrl = software.download_url.replace("{version}", version);
    console.log(`Generated download URL: ${downloadUrl}`); // Debugging information

    if (downloadUrl.includes("serverjar.org")) {
        const response = await axios.get(downloadUrl);
        return response.data.url;
    }

    return downloadUrl;
}

module.exports = {
    addServerSoftware,
    getServerSoftware,
    getServerSoftwareById,
    getSoftwareVersions,
    getDownloadUrl
};
