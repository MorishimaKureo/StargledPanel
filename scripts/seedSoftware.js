console.log('seedServerSoftware.js is running');

const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const path = require('path');

// Database paths
const softwareDbPath = path.join(__dirname, '../databases/software.db');
const minecraftVanillaDbPath = path.join(__dirname, '../databases/minecraft-vanilla.db');

// Connect to software database
const softwareDb = new sqlite3.Database(softwareDbPath, (err) => {
    if (err) {
        console.error('Error connecting to software database:', err.message);
    } else {
        console.log('Connected to the software database.');
    }
});

// Connect to Minecraft Vanilla database
const minecraftVanillaDb = new sqlite3.Database(minecraftVanillaDbPath, (err) => {
    if (err) {
        console.error('Error connecting to Minecraft Vanilla database:', err.message);
    } else {
        console.log('Connected to the Minecraft Vanilla database.');
    }
});

// Create tables
softwareDb.serialize(() => {
    softwareDb.run("CREATE TABLE IF NOT EXISTS server_software (id TEXT, name TEXT, start_script TEXT, environment TEXT, versions TEXT, download_url TEXT)", (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Table server_software created or already exists.');
        }
    });
});

minecraftVanillaDb.serialize(() => {
    minecraftVanillaDb.run(`CREATE TABLE IF NOT EXISTS minecraft_servers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL,
        server_jar_url TEXT NOT NULL
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Table minecraft_servers created or already exists.');
        }
    });
});

// Seed software database
const seedSoftwareDatabase = async () => {
    const softwareOptions = [
        {
            id: uuidv4(),
            name: "Minecraft Vanilla",
            start_script: "java -Xmx1024M -Xms1024M -jar server.jar nogui",
            environment: JSON.stringify({}),
            download_url: "https://launchermeta.mojang.com/v1/packages/{version}/server.jar"
        },
        {
            id: uuidv4(),
            name: "Paper",
            start_script: "java -Xmx1024M -Xms1024M -jar server.jar nogui",
            environment: JSON.stringify({}),
            download_url: "https://papermc.io/api/v2/projects/paper/versions/{version}/builds/latest/downloads/paper-{version}.jar"
        },
        {
            id: uuidv4(),
            name: "Purpur",
            start_script: "java -Xmx1024M -Xms1024M -jar server.jar nogui",
            environment: JSON.stringify({}),
            download_url: "https://api.purpurmc.org/v2/purpur/{version}/latest/download"
        },
        {
            id: uuidv4(),
            name: "Forge",
            start_script: "java -Xmx1024M -Xms1024M -jar server.jar nogui",
            environment: JSON.stringify({}),
            download_url: "https://files.minecraftforge.net/maven/net/minecraftforge/forge/{version}/forge-{version}-installer.jar"
        },
        {
            id: uuidv4(),
            name: "Fabric",
            start_script: "java -Xmx1024M -Xms1024M -jar server.jar nogui",
            environment: JSON.stringify({}),
            download_url: "https://meta.fabricmc.net/v2/versions/loader/{version}/fabric-server-mc.{version}.jar"
        }
    ];

    const versionUrls = {
        "Minecraft Vanilla": "https://launchermeta.mojang.com/mc/game/version_manifest.json",
        "Paper": "https://api.papermc.io/v2/projects/paper",
        "Purpur": "https://api.purpurmc.org/v2/purpur",
        "Forge": "https://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json",
        "Fabric": "https://meta.fabricmc.net/v2/versions/game"
    };

    const stmt = softwareDb.prepare("INSERT INTO server_software VALUES (?, ?, ?, ?, ?, ?)");
    for (const option of softwareOptions) {
        try {
            const response = await axios.get(versionUrls[option.name]);
            let versions = [];

            switch (option.name) {
                case "Minecraft Vanilla":
                    versions = response.data.versions.map(version => version.id);
                    break;
                case "Paper":
                    versions = response.data.versions.map(version => version.version);
                    break;
                case "Purpur":
                    versions = response.data.versions;
                    break;
                case "Forge":
                    versions = Object.keys(response.data.promos).map(key => key.replace("-recommended", "").replace("-latest", ""));
                    break;
                case "Fabric":
                    versions = response.data.map(version => version.version);
                    break;
            }

            console.log(`Fetched versions for ${option.name}:`, versions); // Debugging information

            stmt.run(option.id, option.name, option.start_script, option.environment, JSON.stringify(versions), option.download_url, (err) => {
                if (err) {
                    console.error('Error inserting server software:', err.message);
                } else {
                    console.log(`Server software ${option.name} created successfully`);
                }
            });
        } catch (err) {
            console.error(`Error fetching versions for ${option.name}:`, err.message);
        }
    }
    stmt.finalize((err) => {
        if (err) {
            console.error('Error finalizing statement:', err.message);
        } else {
            console.log('Statement finalized successfully.');
        }
    });

    softwareDb.close((err) => {
        if (err) {
            console.error('Error closing software database:', err.message);
        } else {
            console.log('Software database connection closed.');
        }
    });
};

// Seed Minecraft Vanilla database
const seedMinecraftVanillaDatabase = async () => {
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
        minecraftVanillaDb.serialize(() => {
            const stmt = minecraftVanillaDb.prepare('INSERT INTO minecraft_servers (version, server_jar_url) VALUES (?, ?)');
            data.forEach(({ version, serverJarUrl }) => {
                stmt.run(version, serverJarUrl, (err) => {
                    if (err) {
                        console.error('Error inserting data:', err.message);
                    } else {
                        console.log(`Data for version ${version} inserted successfully.`);
                    }
                });
            });
            stmt.finalize((err) => {
                if (err) {
                    console.error('Error finalizing statement:', err.message);
                } else {
                    console.log('Statement finalized successfully.');
                }
            });
        });
    };

    const data = await fetchAndProcessData();
    if (data.length > 0) {
        insertData(data);
        console.log('Data inserted successfully!');
    } else {
        console.log('No data to insert.');
    }

    minecraftVanillaDb.close((err) => {
        if (err) {
            console.error('Error closing Minecraft Vanilla database:', err.message);
        } else {
            console.log('Minecraft Vanilla database connection closed.');
        }
    });
};

// Main function to seed both databases
const main = async () => {
    await seedSoftwareDatabase();
    await seedMinecraftVanillaDatabase();
};

main();
