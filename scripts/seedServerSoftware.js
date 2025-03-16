const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const db = new sqlite3.Database('./databases/software.db');

db.serialize(async () => {
    db.run("CREATE TABLE IF NOT EXISTS server_software (id TEXT, name TEXT, start_script TEXT, environment TEXT, versions TEXT, download_url TEXT)");

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

    const stmt = db.prepare("INSERT INTO server_software VALUES (?, ?, ?, ?, ?, ?)");
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
    stmt.finalize();

    db.close();
});
