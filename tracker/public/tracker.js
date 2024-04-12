const socket = new WebSocket('ws://localhost:3000');

socket.onopen = function (event) {
    console.log('Connection established');
};

socket.onmessage = function (event) {
    if (event.data === 'WebSocket connection established') {
        console.log('Initial WebSocket handshake message received.');
    } else { 
        try {
            const data = JSON.parse(event.data);
            console.log('Parsed JSON from server:', data);
            updateUI(data.type, data.message);
        } catch (error) {
            console.error('Error parsing message data:', error);
            console.error('Raw data:', event.data);
            // Optionally handle non-JSON messages or ignore them
        }
    }
};

socket.onerror = function (error) {
    console.log('WebSocket error: ' + error);
};

function updateUI(type, message) {
    if (type === 'death') {
        // Handle test message type
        // For instance, updating the UI with the message
        document.getElementById('totalDeaths').textContent = `Deaths: ${message}`;
    } else if (type === 'exit') {
        document.getElementById('totalExits').textContent = `Exits: ${message}`;
    } else if (type === 'timer') {
        document.getElementById('totalTime').textContent = message;
    } else {
        console.error('Unknown message type:', type);
    }
}

function sendMessageToServer(msg) {
    socket.send(msg);
}