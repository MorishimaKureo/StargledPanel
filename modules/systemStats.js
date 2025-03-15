const si = require("systeminformation");
const fs = require("fs").promises;
const path = require("path");

async function getDirectorySize(directory) {
    const files = await fs.readdir(directory);
    const stats = await Promise.all(files.map(async file => {
        const filePath = path.join(directory, file);
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            return getDirectorySize(filePath);
        } else {
            return stat.size;
        }
    }));
    return stats.reduce((acc, size) => acc + size, 0);
}

async function getSystemStats(serverPath) {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const diskSize = await getDirectorySize(serverPath);

    return {
        cpu: cpu.currentLoad.toFixed(2),
        ram: ((mem.used / mem.total) * 100).toFixed(2),
        disk: (diskSize / (1024 * 1024)).toFixed(2) // Convert to MB
    };
}

module.exports = {
    getSystemStats
};
