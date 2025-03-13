const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const WebSocket = require("ws");
const si = require("systeminformation");
const Log = require("cat-loggr");

const log = new Log();
const app = express();
const PORT = 3000;
const SERVERS_DIR = path.join(__dirname, "servers");

const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));
app.set("view engine", "ejs");

let serverProcesses = {}; // Menyimpan proses server yang berjalan
let serverLogs = {}; // Menyimpan log untuk setiap server

// Endpoint untuk mendapatkan daftar server
app.get("/", (req, res) => {
    fs.readdir(SERVERS_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: "Gagal membaca folder servers" });

        const servers = files.filter(file => fs.statSync(path.join(SERVERS_DIR, file)).isDirectory());
        res.render("dashboard", { servers });
    });
});

// Halaman console per server
app.get("/server/:name", (req, res) => {
    const serverName = req.params.name;
    res.render("console", { serverName });
});

// Endpoint untuk mendapatkan log server
app.get("/logs/:name", (req, res) => {
    const serverName = req.params.name;
    if (serverLogs[serverName]) {
        res.json({ logs: serverLogs[serverName] });
    } else {
        res.status(404).json({ error: "Log tidak ditemukan untuk server ini." });
    }
});

// WebSocket server initialization
wss.on("connection", (ws, req) => {
    log.info("Client WebSocket terhubung.");

    const urlParams = new URL(req.url, `http://${req.headers.host}`);
    const serverName = urlParams.searchParams.get("server");

    if (serverName) {
        // Kirim log lama ke client yang baru terhubung
        if (serverLogs[serverName]) {
            ws.send(JSON.stringify({ type: "logs", logs: serverLogs[serverName] }));
        }
    }

    ws.on("message", (message) => {
        const data = JSON.parse(message);
        const { action, serverName, command } = data;

        if (!serverName) {
            ws.send(JSON.stringify({ type: "error", message: "Nama server tidak valid." }));
            return;
        }

        switch (action) {
            case "start":
                startServer(serverName, ws);
                break;
            case "command":
                if (serverProcesses[serverName]) {
                    serverProcesses[serverName].process.stdin.write(command + "\n");
                }
                break;
            case "stop":
                if (serverProcesses[serverName]) {
                    serverProcesses[serverName].process.stdin.write("stop\n");
                    serverProcesses[serverName].process.on("close", () => {
                        delete serverProcesses[serverName];
                        ws.send(JSON.stringify({ type: "status", message: "Server telah berhenti." }));
                    });
                }
                break;
            case "restart":
                if (serverProcesses[serverName]) {
                    ws.send(JSON.stringify({ type: "clear" })); // Clear console before restarting
                    serverProcesses[serverName].process.stdin.write("stop\n");
                    serverProcesses[serverName].process.on("close", () => {
                        delete serverProcesses[serverName];
                        startServer(serverName, ws);
                    });
                }
                break;
            case "kill":
                if (serverProcesses[serverName]) {
                    serverProcesses[serverName].process.kill();
                    delete serverProcesses[serverName];
                    ws.send(JSON.stringify({ type: "status", message: "Server telah dihentikan secara paksa." }));
                }
                break;
            default:
                ws.send(JSON.stringify({ type: "error", message: "Aksi tidak valid." }));
        }
    });

    ws.on("close", () => {
        log.warn("Client WebSocket terputus.");
    });

    setInterval(async () => {
        const cpu = await si.currentLoad();
        const mem = await si.mem();

        Object.keys(serverProcesses).forEach(serverName => {
            ws.send(JSON.stringify({
                type: "stats",
                cpu: cpu.currentLoad.toFixed(2),
                ram: ((mem.used / mem.total) * 100).toFixed(2),
                disk: "N/A"
            }));
        });
    }, 5000);
});

// Fungsi untuk memulai server
function startServer(serverName, ws) {
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

// Fungsi untuk mengirim log ke semua client yang terhubung
function broadcastLog(serverName, message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

server.listen(PORT, () => {
    log.info(`Server berjalan di http://localhost:${PORT}`);
});
