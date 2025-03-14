const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const db = new sqlite3.Database('./databases/software.db');

db.serialize(async () => {
    db.run("CREATE TABLE IF NOT EXISTS server_software (id TEXT, name TEXT, start_script TEXT, environment TEXT, versions TEXT)");

    const softwareOptions = [
        {
            id: uuidv4(),
            name: "Minecraft Vanilla",
            start_script: "java -Xmx1024M -Xms1024M -jar server.jar nogui",
            environment: JSON.stringify({})
        },
        {
            id: uuidv4(),
            name: "Paper",
            start_script: "java -Xmx1024M -Xms1024M -jar paper.jar nogui",
            environment: JSON.stringify({})
        },
        {
            id: uuidv4(),
            name: "Purpur",
            start_script: "java -Xmx1024M -Xms1024M -jar purpur.jar nogui",
            environment: JSON.stringify({})
        },
        {
            id: uuidv4(),
            name: "Forge",
            start_script: "java -Xmx1024M -Xms1024M -jar forge.jar nogui",
            environment: JSON.stringify({})
        },
        {
            id: uuidv4(),
            name: "Fabric",
            start_script: "java -Xmx1024M -Xms1024M -jar fabric.jar nogui",
            environment: JSON.stringify({})
        }
    ];

    const versionUrls = {
        "Minecraft Vanilla": "https://launchermeta.mojang.com/mc/game/version_manifest.json",
        "Paper": "https://qing762.is-a.dev/api/papermc",
        "Purpur": "https://api.purpurmc.org/v2/purpur",
        "Forge": "https://files.minecraftforge.net/maven/net/minecraftforge/forge/promotions_slim.json",
        "Fabric": "https://meta.fabricmc.net/v2/versions/game"
    };

    const stmt = db.prepare("INSERT INTO server_software VALUES (?, ?, ?, ?, ?)");
    for (const option of softwareOptions) {
        try {
            const response = await axios.get(versionUrls[option.name]);
            let versions = [];

            switch (option.name) {
                case "Minecraft Vanilla":
                    versions = response.data.versions.map(version => version.id);
                    break;
                case "Paper":
                    versions = response.data.versions;
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

            stmt.run(option.id, option.name, option.start_script, option.environment, JSON.stringify(versions), (err) => {
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
