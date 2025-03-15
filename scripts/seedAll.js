const { exec } = require('child_process');
const path = require('path');

const seedServerSoftwarePath = path.join(__dirname, 'seedServerSoftware.js');
const seedMinecraftVanillaPath = path.join(__dirname, 'seedMinecraftVanilla.js');

exec(`node ${seedServerSoftwarePath}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error running seedServerSoftware.js: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
    console.log('seedServerSoftware.js completed successfully.');

    exec(`node ${seedMinecraftVanillaPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error running seedMinecraftVanilla.js: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.log('seedMinecraftVanilla.js completed successfully.');
    });
});
