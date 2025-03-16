let consoleDiv; // Dideklarasikan secara global

document.addEventListener("DOMContentLoaded", function () {
    consoleDiv = document.getElementById("console");

    if (!consoleDiv) {
        console.error("Elemen #console tidak ditemukan! Pastikan ada <div id='console'> di HTML.");
        return;
    }

    loadLogsFromServer();
    connectWebSocket();
});

const serverName = window.SERVER_NAME;
let ws;

function connectWebSocket() {
    if (!serverName) {
        console.error("serverName tidak ditemukan.");
        return;
    }

    const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    const wsUrl = `${protocol}${window.location.host}/ws?server=${serverName}`;
    console.log(`Connecting to WebSocket at ${wsUrl}`); // Debugging information
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket connected!");
        loadLogsFromStorage();  // Muat ulang log dari localStorage saat terhubung
    };

    ws.onerror = (err) => console.error("WebSocket error:", err);

    ws.onclose = () => {
        console.warn("WebSocket disconnected. Mencoba menyambung ulang...");
        setTimeout(connectWebSocket, 3000);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === "output" || data.type === "error" || data.type === "status") {
            addConsoleLog(data.message);
        }

        if (data.type === "stats") {
            document.getElementById("cpu").textContent = data.cpu + "%";
            document.getElementById("ram").textContent = data.ram + "%";
            document.getElementById("disk").textContent = data.disk + " MB";
        }

        if (data.type === "clear") {
            clearConsole();
        }

        if (data.type === "logs") {
            data.logs.forEach(log => addConsoleLog(log));
        }
    };
}

function sendCommand(action) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error("WebSocket belum terhubung.");
        return;
    }

    let command = "";
    if (action === "command") {
        command = document.getElementById("commandInput").value.trim();
        if (!command) return;
        document.getElementById("commandInput").value = ""; // Hapus input setelah dikirim
    }

    if (action === "restart") {
        addConsoleLog("Server sedang restart, harap tunggu...");
        clearConsole(); // Hapus log hanya jika server restart
    }

    ws.send(JSON.stringify({ action, serverName, command }));
    addConsoleLog(`> ${command || action}`);
}

function addConsoleLog(message) {
    if (!consoleDiv) {
        console.error("consoleDiv tidak ditemukan saat menambahkan log!");
        return;
    }

    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    consoleDiv.appendChild(messageElement);
    consoleDiv.scrollTop = consoleDiv.scrollHeight;

    saveLogToStorage(message);
}

function saveLogToStorage(message) {
    let logs = JSON.parse(localStorage.getItem(`consoleLogs_${serverName}`)) || [];
    logs.push(message);
    localStorage.setItem(`consoleLogs_${serverName}`, JSON.stringify(logs));
}

function loadLogsFromStorage() {
    let logs = JSON.parse(localStorage.getItem(`consoleLogs_${serverName}`)) || [];
    logs.forEach(log => addConsoleLog(log));
}

function handleEnter(event) {
    if (event.key === "Enter") {
        sendCommand("command");
    }
}

function clearConsole() {
    if (consoleDiv) {
        consoleDiv.innerHTML = "";
    }
    localStorage.removeItem(`consoleLogs_${serverName}`);
}

function loadLogsFromServer() {
    fetch(`/logs/${serverName}`)
        .then(response => response.json())
        .then(data => {
            // Hapus semua pesan "Menunggu output dari server..."
            const logs = Array.from(consoleDiv.children);
            logs.forEach(log => {
                if (log.textContent === "Menunggu output dari server...") {
                    consoleDiv.removeChild(log);
                }
            });

            // Cek apakah ada log baru
            if (data.logs && data.logs.length > 0) {
                // Hapus pesan lama jika ada log baru
                clearConsole(false); // Jangan hapus storage, hanya hapus tampilan
                data.logs.forEach(log => addConsoleLog(log));
            } else {
                // Tambahkan hanya satu pesan jika belum ada log
                if (!consoleDiv.querySelector(".waiting-message")) {
                    const waitingMessage = document.createElement("div");
                    waitingMessage.textContent = "Menunggu output dari server...";
                    waitingMessage.classList.add("waiting-message");
                    consoleDiv.appendChild(waitingMessage);
                }
            }
        })
        .catch(error => console.error("Gagal memuat log dari server:", error));
}

function clearConsole(preserveStorage = true) {
    consoleDiv.innerHTML = "";
    if (!preserveStorage) {
        localStorage.removeItem(`consoleLogs_${serverName}`);
    }
}

// Tambahkan JavaScript dari console.ejs
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const updateConsole = debounce((message) => {
    requestAnimationFrame(() => {
        const consoleElement = document.getElementById('console');
        const newMessage = document.createElement('div');
        newMessage.textContent = message;
        consoleElement.appendChild(newMessage);
        consoleElement.scrollTop = consoleElement.scrollHeight;
    });
}, 100);