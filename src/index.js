const path = require("path");

require("dotenv").config({path: path.join(__dirname, "../.env")});

const Ribbon = require("./ribbon/Ribbon");
const Autohost = require("./autohost/Autohost");

const api = require("./gameapi/api");
const redis = require("./redis/redis");
const {isDeveloper} = require("./data/developers");
const {serialise, deserialise} = require("./redis/serialiser");
const {randomBytes} = require("crypto");

const persistLobbies = require("./autohost/persistlobbies");
const chalk = require("chalk");
const {getBan} = require("./data/globalbans");
const {pushMessage} = require("./pushover/pushover");

if (!process.env.TOKEN) {
    console.log("Please specify a TETR.IO bot token in the TOKEN environment variable.");
    console.log("Don't have one? Ask osk. Remember, you almost certainly don't need to run this bot yourself!");
    process.exit(1);
}

let botMain;
const sessions = new Map();

function generateSessionID() {
    let id = undefined;
    do {
        id = randomBytes(32).toString("hex")
    } while (sessions.has(id));

    return id;
}

function getHostLobby(host) {
    return [...sessions.values()].find(ah => {
        return ah.host === host && !ah.persist;
    });
}

function createPersistLobbies() {
    if (process.env.PERSIST_ROOMS_DISABLED) return;
    console.log("Creating persist lobbies...");

    Object.keys(persistLobbies).forEach(lobby => {
        if (sessions.has(lobby)) return;

        console.log("Creating lobby " + lobby);
        createPersistLobby(lobby);
    });
}

function restoreLobbies() {
    return redis.getAllLobbies().then(lobbies => {
        console.log("Restoring " + lobbies.size + " lobbies.");

        lobbies.forEach((lobby, key) => {
            if (sessions.has(key)) {
                console.log(`Lobby ${key} skipped - still live`);
                return;
            }

            if (!lobby.roomID || !lobby.host) {
                console.log(`Lobby ${key} skipped - missing critical data`);
                return;
            }

            // don't allow a new lobby to be created
            sessions.set(key, true);

            const ribbon = new Ribbon(process.env.TOKEN);

            let joinAttempts = 0;

            ribbon.on("err", error => {
                if (error === "no such room") {
                    redis.deleteLobby(key).finally(() => {
                        console.log(`Room ${key} no longer exists, deleting.`);
                        ribbon.disconnectGracefully();
                        sessions.delete(key);
                        createPersistLobbies();
                    });
                } else if (error === "you are already in this room") {
                    joinAttempts++;
                    console.log("Server thinks we're still in the lobby, trying again in 5...");
                    if (joinAttempts < 5) {
                        setTimeout(() => {
                            ribbon.joinRoom(lobby.roomID);
                        }, 5000);
                    } else {
                        console.log("Something's gone horribly wrong!");
                    }
                }
            });

            ribbon.once("joinroom", () => {
                ribbon.room.takeOwnership();

                const ah = new Autohost(ribbon, undefined, lobby.isPrivate);

                ribbon.sendChatMessage("The bot was disconnected from TETR.IO, or was rebooted. The room settings have been restored.");

                applyRoomEvents(ah, ribbon, lobby.host, key);
                deserialise(lobby, ah);

                sessions.set(key, ah);
            });

            ribbon.once("ready", () => {
                ribbon.joinRoom(lobby.roomID);
            });
        });
    });
}

function applyRoomEvents(ah, ribbon, host, id) {
    ah.on("end", () => {
        botMain.sendDM(host, `Your lobby has been closed because everyone left. Type !private or !public to start a new one.`);
        ribbon.disconnectGracefully();
        sessions.delete(id);
        redis.deleteLobby(id).then(() => {
            console.log("Deleted lobby settings for session " + id);
        });
    });

    ah.on("stop", () => {
        ribbon.disconnectGracefully();
        sessions.delete(id);
        redis.deleteLobby(id).then(() => {
            console.log("Deleted lobby settings for " + ribbon.room.id);
        });
    });

    ah.on("configchange", () => {
        const config = serialise(ah);
        redis.setLobby(id, config).then(() => {
            console.log("Saved lobby settings for " + ribbon.room.id);
        });
    });

    ribbon.on("kick", kick => {
        if (kick.reason === "this room was disbanded") {
            pushMessage(`An Autohost room was disbanded by staff. Room ID: ${ribbon.room.id}, AH host: ${ah.host}`);
        }
    });

    ribbon.on("dead", () => {
        console.log("Ribbon died! Attempting restore.");
        ribbon.disconnectGracefully();
        sessions.delete(id);

        setTimeout(() => {
            restoreLobbies();
        }, 5000);
    });
}

function createLobby(host, isPrivate, fixedID) {
    return new Promise(resolve => {
        const ribbon = new Ribbon(process.env.TOKEN);

        ribbon.once("joinroom", () => {
            const id = fixedID ? fixedID : generateSessionID();

            const ah = new Autohost(ribbon, host, isPrivate);

            applyRoomEvents(ah, ribbon, host, id);

            sessions.set(id, ah);

            const config = serialise(ah);

            redis.setLobby(id, config).then(() => {
                console.log("Saved initial lobby settings for " + ribbon.room.id);
            });

            api.getUser(host).then(user => {
                ah.ribbon.once("gmupdate", () => {
                    botMain.sendDM(host, `Lobby created! Join #${ribbon.room.id}`);
                    ribbon.socialInvite(host);
                    setTimeout(() => {
                        if (!ah.someoneDidJoin) {
                            ah.emit("stop");
                            botMain.sendDM(host, "Your lobby timed out because you didn't join in time. Create another one to continue.");
                        }
                    }, 25000);
                    resolve(ah);
                });

                if (host) {
                    ah.ribbon.room.setName(`${user.username.toUpperCase()}'s ${isPrivate ? "private " : ""}room`);
                } else {
                    ah.ribbon.room.setName("Custom room");
                }
            });
        });

        ribbon.once("ready", () => {
            ribbon.createRoom(isPrivate);
        });
    });
}

function createPersistLobby(name) {
    if (!persistLobbies.hasOwnProperty(name)) return;

    createLobby(botUserID, false, name).then(ah => {
        persistLobbies[name](ah);
    });
}

api.getMe().then(user => {
    if (!user) {
        console.log("Your bot token is invalid.");
        process.exit(1);
    }

    global.botUserID = user._id; // thanks i also hate it

    if (user.role !== "bot") {
        console.log("ERROR: This is NOT a bot account.\n\nDo NOT attempt to run bot code on a regular user account, or you WILL be PERMANENTLY BANNED from the game..");
        process.exit(1);
    }

    botMain = new Ribbon(process.env.TOKEN);

    botMain.on("dead", () => {
        console.log("Main ribbon died! Rebooting...");
        process.kill(process.pid, "SIGINT");
    });

    botMain.on("ready", () => {
        console.log("Bot main (social) logged in.");
        botMain.sendMessage({
            command: "social.presence",
            data: {
                status: "online"
            }
        });
    });


    botMain.on("social.dm", message => {
        const msg = message.data.content.trim().toLowerCase();
        const user = message.data.user;

        if (message.data.userdata.role === "bot") return;

        console.log(chalk.whiteBright(`[DM] ${user}: ${message.data.content}`));

        const ban = getBan(user, ["host"]);

        if (ban) {
            botMain.sendDM(user, "You have been banned from hosting Autohost lobbies until " + new Date(ban.expires).toDateString() + " for the following reason: " + ban.reason);
            return;
        }

        const lobby = getHostLobby(user);

        if (msg === "!private" || msg === "!public") {
            if (process.env.DEV_ONLY && !isDeveloper(user)) {
                botMain.sendDM(user, "Room creation is restricted.");
                return;
            }

            if (lobby) {
                botMain.sendDM(user, "You already have a lobby open. Join #" + lobby.ribbon.room.id);
            } else {
                createLobby(user, msg === "!private");
            }
        } else {
            botMain.sendDM(user, "Hi there! Type !private to create a private lobby, or !public to create a public lobby.");
        }

        // clear notification panel spam
        botMain.ackDM(user);
    });

    process.on("SIGINT", () => {
        console.log("Shutting down!");
        sessions.forEach(session => {
            if (session.ribbon) {
                session.ribbon.disconnectGracefully();
            }
        });

        botMain.disconnectGracefully();

        process.exit(0);
    });

    restoreLobbies().then(() => {
        createPersistLobbies();
    });
});
