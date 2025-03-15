const express = require("express");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const Log = require("cat-loggr");
const session = require("express-session");
const { initializeWebSocket, broadcastLog } = require("./modules/webSocket");
const { setupFileManagerRoutes } = require("./modules/fileManager");
const { startServer, stopServer, serverProcesses, serverLogs } = require("./modules/serverManager");

const log = new Log();
const app = express();
const PORT = 3000;

const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" }); // Ensure the path is set to /ws

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Use the routes
app.use("/", require("./routes/dashboard"));
app.use("/", require("./routes/login"));
app.use("/", require("./routes/server"));
app.use("/", require("./routes/admin"));

// Ensure setupFileManagerRoutes is correctly defined and used
setupFileManagerRoutes(app);

// Initialize WebSocket server
initializeWebSocket(wss, { startServer, stopServer, serverProcesses, serverLogs, broadcastLog });

server.listen(PORT, () => {
    log.info(`Server berjalan di http://localhost:${PORT}`);
});
