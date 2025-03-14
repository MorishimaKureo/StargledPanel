const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Log = require("cat-loggr");

const SERVERS_DIR = path.join(__dirname, "../servers");
const upload = multer({ dest: "uploads/" });
const log = new Log();

function deleteFolderRecursive(folderPath) {
    if (fs.existsSync(folderPath)) {
        fs.readdirSync(folderPath).forEach((file) => {
            const curPath = path.join(folderPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(folderPath);
    }
}

function setupFileManagerRoutes(app, isAuthenticated) {
    // Endpoint untuk mendapatkan daftar file di server tertentu
    app.get("/server/:name/files/*?", isAuthenticated, (req, res) => {
        const serverName = req.params.name;
        const relativePath = req.params[0] || ""; 
        const serverPath = path.join(SERVERS_DIR, serverName, relativePath);

        log.info(`Accessing files for server: ${serverName}, relative path: ${relativePath}`);

        fs.readdir(serverPath, { withFileTypes: true }, (err, files) => {
            if (err) {
                log.error(`Error reading directory: ${serverPath}`, err);
                return res.status(500).json({ error: "Gagal membaca direktori server." });
            }

            const directories = files.filter(file => file.isDirectory());
            const regularFiles = files.filter(file => !file.isDirectory());

            const fileList = [...directories, ...regularFiles].map(file => ({
                name: file.name,
                isDirectory: file.isDirectory()
            }));

            res.render("fileManager", { serverName, fileList, relativePath });
        });
    });

    // Endpoint untuk membuka file dalam editor
    app.get("/server/:name/edit/*", isAuthenticated, (req, res) => {
        const serverName = req.params.name;
        const relativePath = req.params[0];
        const filePath = path.join(SERVERS_DIR, serverName, relativePath);

        fs.readFile(filePath, "utf8", (err, content) => {
            if (err) {
                return res.status(500).json({ error: "Gagal membuka file." });
            }
            res.render("editFile", { serverName, relativePath, content });
        });
    });

    // Endpoint untuk menyimpan perubahan file
    app.post("/server/:name/save/*", isAuthenticated, (req, res) => {
        const serverName = req.params.name;
        const relativePath = req.params[0];
        const filePath = path.join(SERVERS_DIR, serverName, relativePath);
        const newContent = req.body.content;

        fs.writeFile(filePath, newContent, "utf8", (err) => {
            if (err) {
                return res.status(500).json({ error: "Gagal menyimpan file." });
            }
            res.redirect(`/server/${serverName}/files/${relativePath.split('/').slice(0, -1).join('/')}`);
        });
    });
}

module.exports = { setupFileManagerRoutes };
