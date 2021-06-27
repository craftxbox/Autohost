const Ribbon = require("../ribbon/Ribbon");
const Autohost = require("../autohost/Autohost");
const crypto = require("crypto");
const chalk = require("chalk");
const {getUser} = require("../gameapi/api");
const {setLobby, deleteLobby, getLobby, getAllLobbies} = require("../redis/redis");
const {serialise, deserialise} = require("../redis/serialiser");

function sendAutohostWelcome(ribbon, user) {
    ribbon.sendDM(user, "Hi there! Autohost is a bot for TETR.IO that allows for additional host features in custom games. \n\nType !public to create a public lobby. \nType !private to create a private lobby. \n\nIf you're new to Autohost, visit https://kagar.in/autohost to learn more.");
}

function lobbyCreationCommandHandler(isPrivate, sessionmanager, user) {
    sessionmanager.createLobby(user, isPrivate).then(id => {
        const session = sessionmanager.getSession(id);
        sessionmanager.ribbon.sendDM(user, `Your ${isPrivate ? "private" : "public"} lobby has been created! \n\nI've tried to invite you, but in case that doesn't work, the room code is ${session.roomID} - join from the Multiplayer menu.`);
        session.ribbon.socialInvite(user);
    });
}

const COMMANDS = {
    public(sessionmanager, user) {
        return lobbyCreationCommandHandler(false, sessionmanager, user);
    },
    private(sessionmanager, user) {
        return lobbyCreationCommandHandler(true, sessionmanager, user);
    },
    sip(sessionmanager, user) {
        sessionmanager.ribbon.sendDM(user, ":serikasip:");
    }
};

class SessionManager {

    constructor() {
        this.sessions = new Map();

        this.connect();
    }

    log(message) {
        console.log(chalk.yellowBright(`[SessionManager] [${new Date().toLocaleString()}] ${message}`));
    }

    connect() {
        if (this.ribbon) {
            this.ribbon.disconnectGracefully();
        }

        this.ribbon = new Ribbon(process.env.TOKEN);

        this.ribbon.on("dead", () => {
            this.log("Ribbon died, connecting again...");
            this.connect();
        });

        this.ribbon.once("ready", () => {
            this.ribbon.sendMessage({
                command: "social.presence",
                data: {
                    status: "online",
                    detail: "zen"
                }
            });
        });

        this.ribbon.on("ah-log", msg => {
            this.log("[RIBBON] " + msg);
        });

        this.ribbon.on("social.notification", notif => {
            if (notif.type === "friend") {
                setTimeout(() => {
                    sendAutohostWelcome(this.ribbon, notif.data.relationship.from._id);
                });
            }
        });

        this.ribbon.on("social.dm", message => {
            if (message.data.userdata.role === "bot") return;

            this.log(`DM (${message.data.user}): ${message.data.content}`);

            if (message.data.content.startsWith("!")) {
                const args = message.data.content.substring(1).trim().split(" ");
                const command = args.shift().toLowerCase();

                if (COMMANDS.hasOwnProperty(command)) {
                    COMMANDS[command](this, message.data.user, args);
                } else {
                    this.ribbon.sendDM(message.data.user, "Sorry, that is not a valid command here. Most Autohost commands should be used in game chat, rather than DMs with me.");
                }
            } else {
                sendAutohostWelcome(this.ribbon, message.data.user);
            }
        });
    }

    applyRoomEvents(autohost, id) {
        autohost.ribbon.once("dead", () => {
            if (autohost.closing) return;

            this.log(`Ribbon died for session ID ${id}, restoring...`);
            this.deleteSession(id);
            this.restoreLobby(id);
        });

        autohost.on("stop", message => {
            this.ribbon.sendDM(autohost.host, message);
            this.deleteSession(id);
            deleteLobby(id).then(() => {
                this.log(`Deleted AH config from Redis for session ID ${id}`);
            });
        });

        autohost.on("configchange", () => {
            const settings = serialise(autohost);
            setLobby(id, settings).then(() => {
                this.log(`Saved AH config to Redis for session ID ${id}`);
            });
        });
    }

    restoreLobby(id) {
        if (this.sessions.has(id)) {
            this.log("Tried to restore a lobby that's still up.");
            return;
        }

        getLobby(id).then(lobby => {
            const ribbon = new Ribbon(process.env.TOKEN);

            this.log(`Restoring lobby ID ${id}`);

            let joinAttempts = 0;

            ribbon.once("joinroom", () => {
                ribbon.room.takeOwnership();

                ribbon.sendChatMessage("Autohost was kicked, rebooted, or otherwise disconnected from TETR.IO. Your room settings have been restored!");

                const autohost = new Autohost(ribbon, lobby.host, lobby.isPrivate);

                deserialise(lobby, autohost);
                this.applyRoomEvents(autohost, id);
                this.sessions.set(id, autohost);
            });

            ribbon.on("err", error => {
                if (error === "no such room") {
                    ribbon.disconnectGracefully();
                    this.deleteSession(id);
                    deleteLobby(id).then(() => {
                        this.log(`Room restoration failed because the room no longer exists. Session ${id} was removed from Redis.`);
                    });
                } else if (error === "you are already in this room") {
                    joinAttempts++;
                    if (joinAttempts > 4) {
                        this.deleteSession(id);
                        deleteLobby(id).then(() => {
                            this.log(`We're apparently still in the room even after waiting. Killing session ${id}.`);
                        });
                    } else {
                        this.log(`Attempt ${joinAttempts} at restoring ${id} failed (server hasn't caught on yet)`);
                        setTimeout(() => {
                            ribbon.joinRoom(lobby.roomID);
                        }, 5000);
                    }
                }
            });

            ribbon.once("ready", () => {
                ribbon.joinRoom(lobby.roomID);
            });
        });
    }

    restoreAllLobbies() {
        this.log("Full restore starting!");

        getAllLobbies().then(lobbies => {
            lobbies.forEach(lobby => {
                this.restoreLobby(lobby);
            });
        });
    }

    createLobby(host, isPrivate) {
        return new Promise(resolve => {
            const ribbon = new Ribbon(process.env.TOKEN);

            this.log(`Creating new lobby (host = ${host}, private = ${isPrivate}}`);

            ribbon.once("joinroom", () => {
                const autohost = new Autohost(ribbon, host, isPrivate);

                getUser(host).then(user => {
                    const id = Date.now() + "-" + crypto.randomBytes(8).toString("hex");

                    ribbon.room.setName(user.username.toUpperCase() + "'S AUTOHOST ROOM");

                    this.applyRoomEvents(autohost, id);

                    this.sessions.set(id, autohost);
                    resolve(id);
                });
            });

            ribbon.once("ready", () => {
                ribbon.createRoom(isPrivate);
            });
        });
    }

    getSession(id) {
        return this.sessions.get(id);
    }

    deleteSession(id) {
        this.log("Deleted session ID " + id);
        this.sessions.delete(id);
    }

    shutdown() {
        this.sessions.forEach(session => {
            session.ribbon.disconnectGracefully();
        });
    }
}

module.exports = SessionManager;
