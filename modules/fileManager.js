const fs = require("fs");
const path = require("path");
const multer = require("multer");

const SERVERS_DIR = path.join(__dirname, "../servers");
const upload = multer({ dest: "uploads/" });

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

function setupFileManagerRoutes(app) {
    // Endpoint untuk mendapatkan daftar file di server tertentu
    app.get("/server/:name/files/*?", (req, res) => {
        const serverName = req.params.name;
        const relativePath = req.params[0] || ""; // Ambil path setelah /files/
        const serverPath = path.join(SERVERS_DIR, serverName, relativePath);

        fs.readdir(serverPath, { withFileTypes: true }, (err, files) => {
            if (err) return res.status(500).json({ error: "Gagal membaca direktori server." });

            const directories = files.filter(file => file.isDirectory());
            const regularFiles = files.filter(file => !file.isDirectory());

            const fileList = [...directories, ...regularFiles].map(file => ({
                name: file.name,
                isDirectory: file.isDirectory()
            }));

            res.render("fileManager", { serverName, fileList, relativePath });
        });
    });

    // Endpoint untuk mengunggah file ke server tertentu
    app.post("/server/:name/upload/*?", upload.single("file"), (req, res) => {
        const serverName = req.params.name;
        const relativePath = req.params[0] || "";
        const serverPath = path.join(SERVERS_DIR, serverName, relativePath, req.file.originalname);

        fs.rename(req.file.path, serverPath, (err) => {
            if (err) return res.status(500).json({ error: "Gagal mengunggah file." });

            res.redirect(`/server/${serverName}/files/${relativePath}`);
        });
    });

    // Endpoint untuk menghapus file atau folder di server tertentu
    app.post("/server/:name/delete", (req, res) => {
        const { fileName, folderPath, isDirectory } = req.body;
        const serverName = req.params.name;
        const targetPath = path.join(SERVERS_DIR, serverName, folderPath || "", fileName);

        if (isDirectory === "true") {
            deleteFolderRecursive(targetPath);
        } else {
            fs.unlinkSync(targetPath);
        }

        res.redirect(`/server/${serverName}/files/${folderPath || ""}`);
    });
}

module.exports = { setupFileManagerRoutes };