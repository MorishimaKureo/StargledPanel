const Log = require("cat-loggr");
const { startServer, serverProcesses, serverLogs } = require("./serverManager");
const { getSystemStats } = require("./systemStats");

const log = new Log();

function initializeWebSocket(wss) {
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
            const stats = await getSystemStats();
            Object.keys(serverProcesses).forEach(serverName => {
                ws.send(JSON.stringify({
                    type: "stats",
                    ...stats
                }));
            });
        }, 5000);
    });
}

// Fungsi untuk mengirim log ke semua client yang terhubung
function broadcastLog(serverName, message) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

module.exports = { initializeWebSocket };
