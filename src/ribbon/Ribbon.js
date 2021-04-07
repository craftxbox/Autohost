const WebSocket = require("ws");
const msgpack = require("msgpack-lite");
const EventEmitter = require("events");
const Room = require("./Room");
const api = require("../gameapi/api");

const CLIENT_VERSION = {"id": "2d05c95", "time": 1617227309000};

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

        this.lastEndpoint = RIBBON_ENDPOINT;

        this.token = token;
        this.dead = false;
        this.open = false;
        this.authed = false;

        this.room = undefined;

        this.migrating = false;

        this.sendHistory = [];
        this.sendQueue = [];
        this.lastSent = 0;
        this.lastReceived = -99;

        api.getRibbonEndpoint().then(endpoint => {
            this.lastEndpoint = endpoint;
            this.connect(endpoint);
        }).catch(() => {
            this.log("Failed to get the ribbon endpoint, using the default instead");
            this.connect(RIBBON_ENDPOINT);
        });
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
                if (this.ws.readyState !== 1) return;
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
                    this.connect(this.lastEndpoint);
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
                    this.connect(this.lastEndpoint);
                }, 5000);
            }
        });
    }

    log(message) {
        console.log(`[${this.socket_id || "new ribbon"}/${this.room ? this.room.id : "no room"}] ${message}`);
    }

    sendMessageImmediate(message) {
        if (process.env.DUMP_RIBBON) {
            this.log("OUT " + JSON.stringify(message));
        }
        this.ws.send(ribbonEncode(message));
    }

    flushQueue() {
        if (!this.open) return;
        const messageCount = this.sendQueue.length;
        for (let i = 0; i < messageCount; i++) {
            const message = this.sendQueue.shift();
            this.sendMessageImmediate(message);
        }
    }

    die() {
        if (this.dead) return;

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
        if (process.env.DUMP_RIBBON) {
            this.log("PUSH " + message.command);
        }
        this.lastSent++;
        message.id = this.lastSent;
        this.sendQueue.push(message);
        this.sendHistory.push(message);
        if (this.sendQueue.length >= 500) {
            this.sendHistory.shift();
        }
        this.flushQueue();
    }

    handleMessageInternal(message) {
        if (message.command !== "pong" && process.env.DUMP_RIBBON) {
            this.log("IN " + JSON.stringify(message));
        }

        if (message.type === "Buffer") {
            this.log("Encountered a Buffer message");
            const packet = Buffer.from(message.data);
            const message = ribbonDecode(packet);
            this.handleMessageInternal(message);
        }

        if (message.command !== "hello" && message.id) {
            if (message.id > this.lastReceived) {
                this.lastReceived = message.id;
            } else {
                return;
            }
        }

        switch (message.command) {
            case "kick":
                this.log("Ribbon kicked! " + JSON.stringify(message));
                this.emit("kick", message.data);
                this.die();
                break;
            case "nope":
                this.log("Ribbon noped out! " + JSON.stringify(message));
                this.emit("nope", message.data);
                this.die();
                break;
            case "hello":
                this.socket_id = message.id;
                this.resume_token = message.resume;

                if (!this.authed) {
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
                }

                message.packets.forEach(p => this.handleMessageInternal(p)); // handle any dropped messages
                break;
            case "authorize":
                if (message.data.success) {
                    this.authed = true;
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
        switch (message.command) {
            case "joinroom":
                this.log("Joined room " + message.data);
                this.room = new Room(this, {id: message.data});
                break;
            case "chat":
                const username = message.data.user.username;
                const text = message.data.content;
                this.log(`${username} says: ${text}`);
                break;
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

    ackDM(recipient) {
        this.sendMessage({command: "social.relationships.ack", data: recipient});
    }

    sendChatMessage(message) {
        this.sendMessage({command: "chat", data: message});
    }
}

module.exports = Ribbon;
