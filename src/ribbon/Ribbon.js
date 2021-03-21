const WebSocket = require("ws");
const msgpack = require("msgpack-lite");
const EventEmitter = require("events");
const Room = require("./Room");

const CLIENT_VERSION = {"id": "d16ac3c", "time": 1615923726000};
const RIBBON_ENDPOINT = "wss://tetr.io/ribbon";

const RIBBON_PREFIXES = {
    STANDARD: 0x45,
    EXTRACTED_ID: 0xAE,
    BATCH: 0x58,
    PING_PONG: 0xB0
};

const PING_PONG = {
    PING: 0x0B,
    PONG: 0x0C
};

function ribbonDecode(packet) {
    switch (packet[0]) {
        case RIBBON_PREFIXES.STANDARD:
            return [msgpack.decode(packet.slice(1))];
        case RIBBON_PREFIXES.EXTRACTED_ID:
            const message = msgpack.decode(packet.slice(5));
            const view = new DataView(packet.buffer);
            message.id = view.getUint32(1, false); // shove it back in
            return [message];
        case RIBBON_PREFIXES.BATCH:
            const items = [];
            const lengths = [];
            const batchView = new DataView(packet.buffer);

            // Get the lengths
            for (let i = 0; true; i++) {
                const length = batchView.getUint32(1 + (i * 4), false);
                if (length === 0) {
                    // We've hit the end of the batch
                    break;
                }
                lengths.push(length);
            }

            // Get the items at those lengths
            let pointer = 0;
            for (let i = 0; i < lengths.length; i++) {
                items.push(packet.slice(1 + (lengths.length * 4) + 4 + pointer, 1 + (lengths.length * 4) + 4 + pointer + lengths[i]));
                pointer += lengths[i];
            }

            return [].concat(...items.map(item => ribbonDecode(item)));
        case RIBBON_PREFIXES.PING_PONG:
            if (packet[1] === PING_PONG.PONG) {
                return [{command: "pong"}];
            } else {
                return [];
            }
        default: // wtf?
            return [msgpack.decode(packet)]; // osk does this so i will too :woomy:
    }
}

function ribbonEncode(message) { // todo: perhaps we should actually follow tetrio.js implementation here?
    const msgpacked = msgpack.encode(message);
    const packet = new Uint8Array(msgpacked.length + 1);
    packet.set([RIBBON_PREFIXES.STANDARD], 0);
    packet.set(msgpacked, 1);

    return packet;
}

class Ribbon extends EventEmitter {

    constructor(token) {
        super();

        this.token = token;
        this.dead = false;
        this.open = false;

        this.room = undefined;

        this.migrating = false;

        this.sendHistory = [];

        this.sendQueue = [];
        this.lastSent = 0;

        this.connect(RIBBON_ENDPOINT);
    }

    connect(endpoint) {
        if (this.ws) { // switching endpoints?
            this.migrating = true;
            this.ws.close();
        }

        this.log("Connecting to " + endpoint);

        this.ws = new WebSocket(endpoint);

        this.ws.on("message", data => {
            const messages = ribbonDecode(new Uint8Array(data));
            messages.forEach(msg => this.handleMessageInternal(msg));
        });

        this.ws.on("open", () => {
            this.log("WebSocket open");

            this.open = true;
            if (this.resume_token) {
                this.sendMessageImmediate({
                    command: "resume",
                    socketid: this.socket_id,
                    resumetoken: this.resume_token
                });
                this.sendMessageImmediate({command: "hello", packets: this.sendHistory});
                this.migrating = false;
            } else {
                this.sendMessageImmediate({command: "new"});
            }

            this.pingInterval = setInterval(() => {
                this.ws.send(new Uint8Array([RIBBON_PREFIXES.PING_PONG, PING_PONG.PING]));
            }, 5000);
        });

        this.ws.on("close", () => {
            if (this.migrating) {
                return;
            }

            this.log("WebSocket closed");
            this.ws.removeAllListeners();
            this.open = false;
            clearInterval(this.pingInterval);

            if (!this.dead) {
                setTimeout(() => {
                    this.connect(RIBBON_ENDPOINT);
                }, 5000);
            }
        });

        this.ws.on("error", () => {
            this.log("WebSocket errored");
            this.ws.removeAllListeners();
            this.open = false;
            this.ws.close();

            if (!this.dead) {
                setTimeout(() => {
                    this.connect(RIBBON_ENDPOINT);
                }, 5000);
            }
        });
    }

    log(message) {
        console.log(`[${this.socket_id || "new ribbon"}] ${message}`);
    }

    sendMessageImmediate(message) {
        this.log("OUT " + message.command);
        this.ws.send(ribbonEncode(message));
        this.sendHistory.push(message);

        if (this.sendHistory.length > 500) {
            this.sendHistory.splice(0, this.sendHistory.length - 500);
        }
    }

    flushQueue() {
        if (!this.open) return;
        const messageCount = this.sendQueue.length;
        for (let i = 0; i < messageCount; i++) {
            const message = this.sendQueue.shift();
            this.lastSent++;
            message.id = this.lastSent;
            this.sendMessageImmediate(message);
        }
    }

    die() {
        this.dead = true;

        if (this.ws) {
            this.ws.close();
        }

        this.emit("dead");
    }

    disconnectGracefully() {
        this.sendMessageImmediate({command: "die"});
        this.die();
    }

    sendMessage(message) {
        this.log("PUSH " + message.command);
        this.sendQueue.push(message);
        this.flushQueue();
    }

    handleMessageInternal(message) {
        if (message.command !== "pong") {
            this.log("IN " + message.command);
        }

        switch (message.command) {
            case "kick":
                this.log("Ribbon kicked! " + JSON.stringify(message));
                this.ws.close();
                break;
            case "nope":
                this.log("Ribbon noped out! " + JSON.stringify(message));
                this.die();
                break;
            case "hello":
                this.socket_id = message.id;
                this.resume_token = message.resume;

                this.sendMessageImmediate({ // auth the client
                    command: "authorize",
                    id: this.lastSent,
                    data: {
                        token: this.token,
                        handling: {
                            arr: 0,
                            das: 0,
                            sdf: 0,
                            safelock: false
                        },
                        signature: {
                            commit: CLIENT_VERSION
                        }
                    }
                });

                message.packets.forEach(p => this.handleMessage(p)); // handle any dropped clients
                break;
            case "authorize":
                if (message.data.success) {
                    this.emit("ready");
                } else {
                    this.die();
                    this.emit("error", "failed to authorise");
                }
                break;
            case "migrate":
                this.connect(message.data.endpoint);
                this.emit("migrate", message.data);
                break;
            case "pong":
                break; // todo: we should do something with this eventually.
            default:
                this.handleMessage(message);
        }
    }

    handleMessage(message) {
        if (message.command === "joinroom") {
            this.room = new Room(this, {id: message.data});
        }

        this.emit(message.command, message.data);
    }

    createRoom(isPrivate) {
        this.sendMessage({command: "createroom", data: isPrivate ? "private" : "public"});
    }

    joinRoom(code) {
        this.sendMessage({command: "joinroom", data: code});
    }

    socialInvite(player) {
        this.sendMessage({command: "social.invite", data: player});
    }

    sendDM(recipient, message) {
        this.sendMessage({command: "social.dm", data: {recipient, msg: message}});
    }

    sendChatMessage(message) {
        this.sendMessage({command: "chat", data: message});
    }
}

module.exports = Ribbon;