const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const Log = require("cat-loggr");
const { v4: uuidv4 } = require("uuid");
const { getServerSoftwareById } = require("./softwareDb");
const axios = require("axios");

const log = new Log();
const SERVERS_DIR = path.join(__dirname, "../servers");

let serverProcesses = {}; // Menyimpan proses server yang sedang berjalan
let serverLogs = {}; // Menyimpan log untuk setiap server

// Fungsi untuk menghentikan server
function stopServer(serverName, ws, broadcastLog, callback) {
    if (serverProcesses[serverName]) {
        log.info(`Menghentikan server ${serverName}...`);
        serverProcesses[serverName].process.stdin.write("stop\n");
        serverProcesses[serverName].process.on("exit", () => {
            delete serverProcesses[serverName]; // Pastikan server dihapus lebih awal
            serverLogs[serverName] = []; // Menghapus log ketika server berhenti
            broadcastLog(serverName, { type: "clear" }); // Menghapus tampilan konsol saat server berhenti
            broadcastLog(serverName, { type: "status", message: "Server berhenti." });
            ws.send(JSON.stringify({ type: "status", message: "Server telah berhenti." }));
            setTimeout(() => {
                if (callback) callback();
            }, 2000); // Tunggu 2 detik sebelum callback dieksekusi
        });
    } else {
        ws.send(JSON.stringify({ type: "error", message: "Server tidak berjalan." }));
        if (callback) callback();
    }
}

// Fungsi untuk memulai server
function startServer(serverName, ws, broadcastLog) {
    const serverPath = path.join(SERVERS_DIR, serverName);
    const jarPath = path.join(serverPath, "server.jar");
    serverLogs[serverName] = [];
    broadcastLog(serverName, { type: "clear" }); // Menghapus tampilan konsol saat server baru dimulai

    if (serverProcesses[serverName]) {
        ws.send(JSON.stringify({ type: "error", message: "Server sudah berjalan!" }));
        return;
    }

    if (!fs.existsSync(jarPath)) {
        ws.send(JSON.stringify({ type: "error", message: `server.jar tidak ditemukan di ${serverPath}` }));
        return;
    }

    log.info(`Memulai server ${serverName}...`);
    const serverProcess = spawn("java", ["-Xmx1024M", "-Xms1024M", "-jar", jarPath, "nogui"], {
        cwd: serverPath,
        shell: true
    });

    serverProcesses[serverName] = { process: serverProcess, ws };
    serverLogs[serverName] = serverLogs[serverName] || [];

    serverProcess.stdout.on("data", (data) => {
        const message = data.toString();
        serverLogs[serverName].push(message);
        broadcastLog(serverName, { type: "output", message });
    });

    serverProcess.stderr.on("data", (data) => {
        const message = data.toString();
        serverLogs[serverName].push(message);
        broadcastLog(serverName, { type: "error", message });
    });

    serverProcess.on("exit", () => {
        delete serverProcesses[serverName];
        serverLogs[serverName] = []; // Menghapus log ketika server berhenti
        broadcastLog(serverName, { type: "clear" }); // Menghapus tampilan konsol saat server berhenti
        broadcastLog(serverName, { type: "status", message: "Server berhenti." });
    });

    ws.send(JSON.stringify({ type: "status", message: "Server dimulai." }));
}

// Fungsi untuk merestart server
function restartServer(serverName, ws, broadcastLog) {
    if (serverProcesses[serverName]) {
        log.info(`Memulai proses restart untuk server ${serverName}...`);
        stopServer(serverName, ws, broadcastLog, () => {
            log.info(`Server ${serverName} telah berhenti, menunggu sebelum restart...`);
            setTimeout(() => {
                log.info(`Memulai ulang server ${serverName}...`);
                startServer(serverName, ws, broadcastLog);
            }, 30000); // Tunggu  detik sebelum memulai server kembali
        });
    } else {
        ws.send(JSON.stringify({ type: "error", message: "Server tidak berjalan." }));
    }
}

// Fungsi untuk membuat server baru
async function createServer(userId, serverName, softwareId, version) {
    const serverId = uuidv4();
    const serverPath = path.join(SERVERS_DIR, serverName);

    if (!fs.existsSync(serverPath)) {
        fs.mkdirSync(serverPath);
        // Store the server ID in a file inside the server's directory
        fs.writeFileSync(path.join(serverPath, "serverId.txt"), serverId);
        // Get the start script and environment variables for the selected software
        const software = await getServerSoftwareById(softwareId);
        if (software) {
            fs.writeFileSync(path.join(serverPath, "start.sh"), software.start_script);
            fs.writeFileSync(path.join(serverPath, "environment.json"), software.environment);
        }
        // Download the appropriate server jar
        const jarUrl = `https://download.example.com/${software.name.toLowerCase()}/${version}/server.jar`; // Replace with actual URL
        console.log(`Downloading server jar from: ${jarUrl}`); // Debugging information
        const jarPath = path.join(serverPath, "server.jar");
        const response = await axios({
            url: jarUrl,
            method: 'GET',
            responseType: 'stream'
        });
        response.data.pipe(fs.createWriteStream(jarPath));
        await new Promise((resolve, reject) => {
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });
        // Initialize the server directory with necessary files
        fs.writeFileSync(path.join(serverPath, "server.properties"), ""); // Placeholder for server.properties
    }

    return serverId;
}

module.exports = {
    createServer,
    startServer,
    stopServer,
    restartServer,
    serverProcesses,
    serverLogs
};
