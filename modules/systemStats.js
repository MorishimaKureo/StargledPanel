const si = require("systeminformation");

async function getSystemStats() {
    const cpu = await si.currentLoad();
    const mem = await si.mem();

    return {
        cpu: cpu.currentLoad.toFixed(2),
        ram: ((mem.used / mem.total) * 100).toFixed(2),
        disk: "N/A"
    };
}

module.exports = {
    getSystemStats
};
