const Ribbon = require("./ribbon/Ribbon");
const Autohost = require("./autohost/Autohost");

const path = require("path");
const api = require("./gameapi/api");
const redis = require("./redis/redis");
const {isDeveloper} = require("./data/developers");
const {serialise, deserialise} = require("./redis/serialiser");
const {randomBytes} = require("crypto");

const persistLobbies = require("./autohost/persistlobbies");

require("dotenv").config({path: path.join(__dirname, "../.env")});

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

            ribbon.on("err", error => {
                if (error === "no such room") {
                    redis.deleteLobby(key).finally(() => {
                        console.log(`Room ${key} no longer exists, deleting.`);
                    });
                    ribbon.disconnectGracefully();
                } else if (error === "you are already in this room") {
                    console.log("Server thinks we're still in the lobby, trying again in 5...");
                    setTimeout(() => {
                        ribbon.joinRoom(lobby.roomID);
                    }, 5000);
                }
            })

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
    }).then(() => {
        if (process.env.PERSIST_ROOMS_DISABLED) return;

        Object.keys(persistLobbies).forEach(lobby => {
            if (sessions.has(lobby)) return;

            createPersistLobby(lobby);
        });
    });
}

function applyRoomEvents(ah, ribbon, host, id) {
    ah.on("end", () => {
        if (host === "5eeaa5535b5c156c224f5265") { // you saw nothing, do not say anything
            botMain.sendDM(host, `I finished up aww the wowk in youw wobby, senpai! I wuv you >w<`);
        } else {
            botMain.sendDM(host, `Your lobby has been closed because everyone left. Type !private or !public to start a new one.`);
        }
        ribbon.disconnectGracefully();
        sessions.delete(id);
        redis.deleteLobby(id).then(() => {
            console.log("Deleted lobby settings for " + id);
        });
    });

    ah.on("stop", () => {
        botMain.sendDM(host, `I've left your lobby.`);
        ribbon.disconnectGracefully();
        sessions.delete(id);
        redis.deleteLobby(id).then(() => {
            console.log("Deleted lobby settings for " + id);
        });
    });

    ah.on("configchange", () => {
        const config = serialise(ah);
        redis.setLobby(id, config).then(() => {
            console.log("Saved lobby settings for " + id);
        });
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
                console.log("Saved initial lobby settings for " + host);
            });

            api.getUser(host).then(user => {
                ah.ribbon.once("gmupdate", () => {
                    botMain.sendDM(host, `Lobby created! Join #${ribbon.room.id}`);
                    ribbon.socialInvite(host);
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

        redis.getMOTD().then(motd => {
            if (motd) {
                botMain.sendDM(user, "MOTD: " + motd);
            }
        })

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
        } else if (msg.startsWith("!motd") && isDeveloper(user)) {
            const args = msg.split(" ");
            args.shift();
            if (args.length === 0) {
                redis.setMOTD("");
            } else {
                redis.setMOTD(args.join(" "));
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

    restoreLobbies();
});
