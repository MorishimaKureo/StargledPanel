const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../databases/minecraft-vanilla.db'); // Adjusted path
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error(err.message);
    else console.log('Connected to the SQLite database.');
});

// Create table
const createTable = () => {
    db.run(`CREATE TABLE IF NOT EXISTS minecraft_servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        server_jar_url TEXT NOT NULL
    )`);
};

const fetchAndProcessData = async () => {
    try {
        const url = 'https://gist.githubusercontent.com/cliffano/77a982a7503669c3e1acb0a0cf6127e9/raw/ee42c6d5daee95afe377054d19c7d6aa7cd04785/minecraft-server-jar-downloads.md';
        const response = await axios.get(url);
        const lines = response.data.split('\n');
        
        const data = [];
        
        for (let line of lines) {
            const match = line.match(/\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
            if (match) {
                const version = match[1].trim();
                const serverJarUrl = match[2].trim(); // Ambil hanya Server Jar Download URL
                data.push({ version, serverJarUrl });
            }
        }

        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        return [];
    }
};

const insertData = (data) => {
    db.serialize(() => {
        const stmt = db.prepare('INSERT INTO minecraft_servers (version, server_jar_url) VALUES (?, ?)');
        data.forEach(({ version, serverJarUrl }) => {
            stmt.run(version, serverJarUrl);
        });
        stmt.finalize();
    });
};

const main = async () => {
    createTable();
    const data = await fetchAndProcessData();
    if (data.length > 0) {
        insertData(data);
        console.log('Data inserted successfully!');
    } else {
        console.log('No data to insert.');
    }
    db.close();
};

main();
