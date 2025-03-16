const express = require("express");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const Log = require("cat-loggr");
const { startServer, stopServer, serverProcesses, serverLogs, createServer } = require("./modules/serverManager");
const { getSystemStats } = require("./modules/systemStats");
const { initializeWebSocket, broadcastLog } = require("./modules/webSocket");
const { setupFileManagerRoutes } = require("./modules/fileManager");
const session = require("express-session");
const bodyParser = require("body-parser");
const compression = require("compression");
const cache = require("express-cache-middleware");
const CacheManager = require("cache-manager");
const { authenticateUser, checkAdminRole } = require("./modules/auth");
const { getUserServersWithDetails } = require("./modules/serverDb"); // Update this line

const log = new Log();
const app = express();
const PORT = 3000;
const SERVERS_DIR = path.join(__dirname, "servers");

const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false, // Set to false to avoid saving uninitialized sessions
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware untuk compression
app.use(compression());

// Middleware untuk caching
const cacheMiddleware = new cache(
    CacheManager.caching({
        store: 'memory',
        max: 100,
        ttl: 10 /* seconds */
    })
);
cacheMiddleware.attach(app);

// Login route
const loginRoutes = require("./routes/login");
app.use(loginRoutes);

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect("/login");
    }
}

// Endpoint untuk mendapatkan daftar server
app.get("/", isAuthenticated, async (req, res) => {
    try {
        const servers = await getUserServersWithDetails(req.session.user.id); // Update this line
        res.render("dashboard", { servers, user: req.session.user });
    } catch (err) {
        res.status(500).json({ error: "Gagal membaca folder servers" });
    }
});

// Halaman console per server
app.get("/server/:id", isAuthenticated, (req, res) => {
    const serverId = req.params.id;
    res.render("console", { serverName: serverId });
});

// Endpoint untuk mendapatkan log server
app.get("/logs/:id", isAuthenticated, (req, res) => {
    const serverId = req.params.id;
    if (serverLogs[serverId]) {
        const serverPath = path.join(SERVERS_DIR, serverId);
        getSystemStats(serverPath).then(stats => {
            res.json({ logs: serverLogs[serverId], stats });
        }).catch(err => {
            res.status(500).json({ error: "Gagal mendapatkan statistik sistem" });
        });
    } else {
        res.status(404).json({ error: "Log tidak ditemukan untuk server ini." });
    }
});

// Endpoint untuk mengelola file di server
setupFileManagerRoutes(app, isAuthenticated);

const adminRoutes = require("./routes/admin");
const manageServersRoutes = require("./modules/manageServers");
app.use(adminRoutes);
app.use(manageServersRoutes);

// Initialize WebSocket server
initializeWebSocket(wss, { startServer, stopServer, serverProcesses, serverLogs, broadcastLog });

server.listen(PORT, () => {
    log.info(`Server berjalan di http://localhost:${PORT}`);
});

module.exports = { log };
