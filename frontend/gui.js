const startButton = document.getElementById('startServer');
const stopButton = document.getElementById('stopServer');
const hackNameInput = document.getElementById('hackName');
const authorInput = document.getElementById('author');

function checkInputs() {
    // Disable the start button if either input is empty
    startButton.disabled = !(hackNameInput.value && authorInput.value);
}

// Add event listeners to the input fields
hackNameInput.addEventListener('input', checkInputs);
authorInput.addEventListener('input', checkInputs);

// Call checkInputs to set the initial state of the start button
checkInputs();

window.electronAPI.onServerStatus((event, isRunning) => {
    const inputs = document.querySelectorAll('#configForm input');

    // Disable inputs and start button, enable stop button when server is running
    inputs.forEach(input => {
        input.disabled = isRunning;
    });
    startButton.disabled = isRunning;
    stopButton.disabled = !isRunning;

    // Optionally, update server status text
    document.getElementById('serverStatus').textContent = isRunning ? 'Server is running' : 'Server is stopped';
});

startButton.addEventListener('click', function () {
    const hackName = hackNameInput.value;
    const author = authorInput.value;
    window.electronAPI.startServer({ hackName, author });
});

stopButton.addEventListener('click', function () {
    window.electronAPI.stopServer();
});