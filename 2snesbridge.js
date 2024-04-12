const WebSocket = require('ws');

class QUSB2SNESConnection {
    constructor(url, eventCallbacks) {
        this.url = url;
        this.connection = null;
        this.answers = [];
        this.lastValue = {}; // Store last values for monitored addresses
        this.eventCallbacks = eventCallbacks; // Object containing various event callbacks

        this.monitorConfig = {
            'F50071': {
                condition: value => value === 9,
                action: () => this.triggerEvent('death')
            },
            'F50100': {
                condition: value => value === 11,
                action: () => this.triggerEvent('timerStart')
            },
            'F51F2E': {
                condition: value => value,
                action: value => this.triggerEvent('exitUpdate', value)
            }
        };
    }

    triggerEvent(eventName, value) {
        if (this.eventCallbacks && typeof this.eventCallbacks[eventName] === 'function') {
            this.eventCallbacks[eventName](value); // Call the callback, passing value if provided
        }
    }

    connect() {
        console.log('Connecting...');
        this.connection = new WebSocket(this.url);
        this.connection.on('open', () => this.onOpen());
        this.connection.on('error', error => this.onError(error));
        this.connection.on('close', () => this.onClose());
        this.connection.on('message', message => this.onMessage(message));
    }

    onOpen() {
        console.log('Connected.');
        this.requestDeviceList();
    }

    onError(error) {
        console.error('WebSocket Error:', error);
    }

    onClose() {
        console.log('Connection closed.');
    }

    onMessage(message) {
        if (this.answers.length) {
            const callback = this.answers.shift();
            callback(message);
        }
    }

    send(data) {
        this.connection.send(JSON.stringify(data));
    }

    ask(question, answer) {
        if (answer) {
            this.answers.push(answer);
        }
        this.send(question);
    }

    requestDeviceList() {
        this.ask({ Opcode: 'DeviceList', Space: 'SNES' }, response => {
            const devices = JSON.parse(response.toString()).Results;
            if (devices.length) {
                this.attachToDevice(devices[0]);
            } else {
                console.log('No SNES found. Connect SNES and reload page.');
            }
        });
    }

    attachToDevice(device) {
        this.ask({ Opcode: 'Attach', Space: 'SNES', Operands: [device] });
        this.ask({ Opcode: 'Name', Space: "SNES", Operands: ['SMW Tracker'] });
        this.monitorAddress('F50071');
        this.monitorAddress('F50100');
        this.monitorAddress('F51F2E');
    }

    monitorAddress(address) {
        const checkAddress = () => {
            this.ask({
                Opcode: 'GetAddress',
                Space: 'SNES',
                Flags: null,
                Operands: [address, '1']
            }, messageData => {
                const value = messageData[0];  // Assuming messageData is already a buffer
                if (value !== this.lastValue[address] && this.monitorConfig[address]) {
                    console.log(`Address ${address} changed to ${value}`);
                    this.lastValue[address] = value;
                    const config = this.monitorConfig[address];
                    if (config.condition(value)) {
                        config.action(value);
                    }
                }
                setTimeout(checkAddress, 10); // Check again after a delay
            });
        };
        checkAddress();
    }
}

module.exports = QUSB2SNESConnection;