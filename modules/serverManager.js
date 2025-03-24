const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const Log = require("cat-loggr");
const { v4: uuidv4 } = require("uuid");
const { getServerSoftwareById, getDownloadUrl } = require("./softwareDb");
const axios = require("axios");

const log = new Log();
const SERVERS_DIR = path.resolve(__dirname, "../servers");

let serverProcesses = {}; // Menyimpan proses server yang sedang berjalan
let serverLogs = {}; // Menyimpan log untuk setiap server

// Fungsi untuk menghentikan server
function stopServer(serverName, ws, broadcastLog, callback) {
    if (serverProcesses[serverName]) {
        log.info(`Menghentikan server ${serverName}...`);
        serverProcesses[serverName].process.stdin.write("stop\n");
        serverProcesses[serverName].process.on("exit", () => {
            delete serverProcesses[serverName]; // Pastikan server dihapus lebih awal
            delete serverLogs[serverName]; // Menghapus log ketika server berhenti
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
    const serverPath = path.resolve(SERVERS_DIR, serverName);
    const jarPath = path.resolve(serverPath, "server.jar");
    const configPath = path.resolve(serverPath, "config.json");
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

    if (!fs.existsSync(configPath)) {
        ws.send(JSON.stringify({ type: "error", message: `config.json tidak ditemukan di ${serverPath}` }));
        return;
    }

    const serverConfig = require(configPath);
    const ramLimit = serverConfig.ramLimit || 1024; // Default to 1024MB if not specified

    log.info(`Memulai server ${serverName} dengan RAM limit ${ramLimit}MB...`);
    const serverProcess = spawn("java", [`-Xmx${ramLimit}M`, `-Xms${ramLimit}M`, "-jar", jarPath, "nogui"], {
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

        // Check for invalid or corrupt JAR file error
        if (message.includes("Invalid or corrupt jarfile")) {
            log.error(`Error: Invalid or corrupt jarfile for server ${serverName}`);
            ws.send(JSON.stringify({ type: "error", message: "Error: Invalid or corrupt jarfile" }));
            stopServer(serverName, ws, broadcastLog, () => {
                log.info(`Server ${serverName} telah berhenti karena file JAR yang rusak.`);
            });
        }
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
async function createServer(userId, serverName, softwareId, version, ramLimit) {
    const serverId = uuidv4();
    const serverPath = path.resolve(SERVERS_DIR, serverName);

    if (!fs.existsSync(serverPath)) {
        fs.mkdirSync(serverPath);
        fs.writeFileSync(path.join(serverPath, "serverId.txt"), serverId);
    }

    const software = await getServerSoftwareById(softwareId);
    if (!software) {
        throw new Error(`Software dengan ID ${softwareId} tidak ditemukan.`);
    }

    // Ambil URL unduhan dari database
    const jarUrl = await getDownloadUrl(softwareId, version);
    log.info(`Mengunduh server.jar dari: ${jarUrl}`);

    if (!jarUrl) {
        throw new Error(`URL unduhan tidak valid untuk ${software.name} versi ${version}`);
    }

    const tempJarPath = path.resolve(serverPath, "temp_server.jar");
    const finalJarPath = path.resolve(serverPath, "server.jar");

    try {
        const response = await axios({
            url: jarUrl,
            method: 'GET',
            responseType: 'stream'
        });
        response.data.pipe(fs.createWriteStream(tempJarPath));

        await new Promise((resolve, reject) => {
            response.data.on('end', resolve);
            response.data.on('error', reject);
        });

        // Verifikasi ukuran file JAR yang diunduh
        const stats = fs.statSync(tempJarPath);
        log.info(`Ukuran file JAR yang diunduh: ${stats.size} bytes`);
        if (stats.size < 1024) { // Ukuran file JAR yang valid biasanya lebih besar dari 1KB
            throw new Error("File JAR yang diunduh terlalu kecil, kemungkinan rusak.");
        }

        // Rename the downloaded jar file to the final name
        fs.renameSync(tempJarPath, finalJarPath);

        // Additional check to verify the JAR file integrity
        const jarCheckProcess = spawn("java", ["-jar", finalJarPath, "--version"], {
            cwd: serverPath,
            shell: true
        });

        await new Promise((resolve, reject) => {
            jarCheckProcess.on('exit', (code) => {
                if (code !== 0) {
                    reject(new Error("File JAR yang diunduh tidak valid atau rusak."));
                } else {
                    resolve();
                }
            });
        });

        log.info(`Unduhan server.jar untuk ${serverName} selesai.`);
    } catch (error) {
        log.error(`Gagal mengunduh server.jar: ${error.message}`);
        throw new Error(`Gagal mengunduh server.jar untuk ${software.name} versi ${version}`);
    }

    // Save server configuration
    const serverConfig = {
        name: serverName,
        ip: "127.0.0.1",
        ramUsed: 0,
        ramTotal: ramLimit,
        cpuUsage: 0,
        diskUsed: 0,
        diskTotal: 0,
        status: "offline",
        ramLimit
    };
    fs.writeFileSync(path.join(serverPath, "config.json"), JSON.stringify(serverConfig, null, 2));

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
