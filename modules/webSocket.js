const Log = require("cat-loggr");
const WebSocket = require("ws"); // Import WebSocket
const { getSystemStats } = require("./systemStats");
const path = require("path");

const log = new Log();

function initializeWebSocket(wss, { startServer, stopServer, serverProcesses, serverLogs, broadcastLog }) {
    wss.on("connection", (ws, req) => {
        log.info("Client WebSocket terhubung.");

        const urlParams = new URL(req.url, `http://${req.headers.host}`);
        const serverName = urlParams.searchParams.get("server");

        if (serverName) {
            // Kirim log lama ke client yang baru terhubung
            if (serverLogs[serverName]) {
                ws.send(JSON.stringify({ type: "logs", logs: serverLogs[serverName] }));
            }
            // Kirim ukuran folder server ke client yang baru terhubung
            const serverPath = path.join(__dirname, "../servers", serverName);
            getSystemStats(serverPath).then(stats => {
                ws.send(JSON.stringify({
                    type: "stats",
                    serverName,
                    ...stats
                }));
            });
        }

        ws.on("message", async (message) => {
            const data = JSON.parse(message);
            const { action, serverName, command } = data;

            if (!serverName) {
                ws.send(JSON.stringify({ type: "error", message: "Nama server tidak valid." }));
                return;
            }

            switch (action) {
                case "start":
                    startServer(serverName, ws, (serverName, message) => broadcastLog(wss, serverName, message));
                    break;
                case "command":
                    if (serverProcesses[serverName]) {
                        serverProcesses[serverName].process.stdin.write(command + "\n");
                    }
                    break;
                case "stop":
                    stopServer(serverName, ws, async (serverName, message) => {
                        broadcastLog(wss, serverName, message);
                        const serverPath = path.join(__dirname, "../servers", serverName);
                        const stats = await getSystemStats(serverPath);
                        ws.send(JSON.stringify({
                            type: "stats",
                            serverName,
                            cpu: "0",
                            ram: "0",
                            disk: stats.disk // Keep the disk size unchanged
                        }));
                    });
                    break;
                case "restart":
                    if (serverProcesses[serverName]) {
                        ws.send(JSON.stringify({ type: "clear" })); // Clear console before restarting
                        stopServer(serverName, ws, (serverName, message) => broadcastLog(wss, serverName, message));
                        startServer(serverName, ws, (serverName, message) => broadcastLog(wss, serverName, message));
                    }
                    break;
                case "kill":
                    if (serverProcesses[serverName]) {
                        serverProcesses[serverName].process.kill();
                        delete serverProcesses[serverName];
                        ws.send(JSON.stringify({ type: "status", message: "Server telah dihentikan secara paksa." }));
                        const serverPath = path.join(__dirname, "../servers", serverName);
                        const stats = await getSystemStats(serverPath);
                        ws.send(JSON.stringify({
                            type: "stats",
                            serverName,
                            cpu: "0",
                            ram: "0",
                            disk: stats.disk // Keep the disk size unchanged
                        }));
                    }
                    break;
                default:
                    ws.send(JSON.stringify({ type: "error", message: "Aksi tidak valid." }));
            }
        });

        ws.on("close", () => {
            log.warn("Client WebSocket terputus.");
            clearInterval(ws.statsInterval); // Clear the interval when the connection is closed
        });

        ws.statsInterval = setInterval(async () => {
            if (ws.readyState === WebSocket.OPEN) {
                for (const serverName of Object.keys(serverProcesses)) {
                    const serverPath = path.join(__dirname, "../servers", serverName);
                    const stats = await getSystemStats(serverPath);
                    ws.send(JSON.stringify({
                        type: "stats",
                        serverName,
                        ...stats
                    }));
                }
            }
        }, 1000); // Update interval to 1 second
    });
}

// Fungsi untuk mengirim log ke semua client yang terhubung
function broadcastLog(wss, serverName, message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

module.exports = { initializeWebSocket, broadcastLog };