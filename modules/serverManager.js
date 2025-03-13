const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const SERVERS_DIR = path.join(__dirname, "../servers");

let serverProcesses = {}; // Menyimpan proses server yang berjalan
let serverLogs = {}; // Menyimpan log untuk setiap server

// Fungsi untuk menghentikan server
function stopServer(serverName, ws, broadcastLog) {
    if (serverProcesses[serverName]) {
        serverProcesses[serverName].process.stdin.write("stop\n");
        serverProcesses[serverName].process.on("close", () => {
            delete serverProcesses[serverName];
            serverLogs[serverName] = []; // Clear logs when server stops
            broadcastLog(serverName, { type: "clear" }); // Clear console when server stops
            broadcastLog(serverName, { type: "status", message: "Server berhenti." });
            ws.send(JSON.stringify({ type: "status", message: "Server telah berhenti." }));
        });
    } else {
        ws.send(JSON.stringify({ type: "error", message: "Server tidak berjalan." }));
    }
}

// Fungsi untuk memulai server
function startServer(serverName, ws, broadcastLog) {
    const serverPath = path.join(SERVERS_DIR, serverName);
    const jarPath = path.join(serverPath, "server.jar");

    if (serverProcesses[serverName]) {
        ws.send(JSON.stringify({ type: "error", message: "Server sudah berjalan!" }));
        return;
    }

    if (!fs.existsSync(jarPath)) {
        ws.send(JSON.stringify({ type: "error", message: `server.jar tidak ditemukan di ${serverPath}` }));
        return;
    }

    const serverProcess = spawn("java", ["-Xmx1024M", "-Xms1024M", "-jar", "server.jar", "nogui"], {
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

    serverProcess.on("close", () => {
        delete serverProcesses[serverName];
        serverLogs[serverName] = []; // Clear logs when server stops
        broadcastLog(serverName, { type: "clear" }); // Clear console when server stops
        broadcastLog(serverName, { type: "status", message: "Server berhenti." });
    });

    ws.send(JSON.stringify({ type: "status", message: "Server dimulai." }));
}

module.exports = {
    startServer,
    stopServer,
    serverProcesses,
    serverLogs
};
