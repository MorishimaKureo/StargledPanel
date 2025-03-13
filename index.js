const express = require("express");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const Log = require("cat-loggr");
const { startServer, stopServer, serverProcesses, serverLogs } = require("./modules/serverManager");
const { getSystemStats } = require("./modules/systemStats");
const { initializeWebSocket, broadcastLog } = require("./modules/webSocket");

const log = new Log();
const app = express();
const PORT = 3000;
const SERVERS_DIR = path.join(__dirname, "servers");

const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));
app.set("view engine", "ejs");

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
app.get("/logs/:name", async (req, res) => {
    const serverName = req.params.name;
    if (serverLogs[serverName]) {
        const serverPath = path.join(SERVERS_DIR, serverName);
        const stats = await getSystemStats(serverPath);
        res.json({ logs: serverLogs[serverName], stats });
    } else {
        res.status(404).json({ error: "Log tidak ditemukan untuk server ini." });
    }
});

// Initialize WebSocket server
initializeWebSocket(wss, { startServer, stopServer, serverProcesses, serverLogs, broadcastLog });

server.listen(PORT, () => {
    log.info(`Server berjalan di http://localhost:${PORT}`);
});
