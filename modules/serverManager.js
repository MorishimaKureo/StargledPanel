const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const Log = require("cat-loggr");

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

module.exports = {
    startServer,
    stopServer,
    restartServer,
    serverProcesses,
    serverLogs
};
