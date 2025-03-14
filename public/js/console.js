const serverName = "<%= serverName %>";
const consoleDiv = document.getElementById("console");

let ws;

function connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";
    ws = new WebSocket(`${protocol}${window.location.host}?server=${serverName}`);

    ws.onopen = () => console.log("WebSocket connected!");
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
    }

    ws.send(JSON.stringify({ action, serverName, command }));
    addConsoleLog(`> ${command || action}`); // Tambahkan log perintah yang dikirim
}

function addConsoleLog(message) {
    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    consoleDiv.appendChild(messageElement);
    consoleDiv.scrollTop = consoleDiv.scrollHeight;

    saveLogToStorage(message);
}

function saveLogToStorage(message) {
    let logs = JSON.parse(localStorage.getItem("consoleLogs")) || [];
    logs.push(message);
    localStorage.setItem("consoleLogs", JSON.stringify(logs));
}

function loadLogsFromStorage() {
    let logs = JSON.parse(localStorage.getItem("consoleLogs")) || [];
    logs.forEach(log => addConsoleLog(log));
}

function handleEnter(event) {
    if (event.key === "Enter") {
        sendCommand("command");
    }
}

function clearConsole() {
    consoleDiv.innerHTML = "Menunggu output dari server...";
    localStorage.removeItem("consoleLogs");
}

function loadLogsFromServer() {
    fetch(`/logs/${serverName}`)
        .then(response => response.json())
        .then(data => {
            if (data.logs) {
                data.logs.forEach(log => addConsoleLog(log));
            }
        })
        .catch(error => console.error("Gagal memuat log dari server:", error));
}

// Muat ulang log saat halaman dimuat
loadLogsFromServer();
connectWebSocket();