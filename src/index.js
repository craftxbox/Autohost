const config = require("../config.json");

const Ribbon = require("./ribbon/Ribbon");
const Autohost = require("./autohost/Autohost");

const path = require("path");
const api = require("./gameapi/api");
const redis = require("./redis/redis");
const {serialise, deserialise} = require("./redis/serialiser");

require("dotenv").config({path: path.join(__dirname, "../.env")});

if (!process.env.TOKEN) {
    console.log("Please specify a TETR.IO bot token in the TOKEN environment variable.");
    console.log("Don't have one? Ask osk.");
    process.exit(1);
}

const botMain = new Ribbon(process.env.TOKEN);

const sessions = new Map();

botMain.on("ready", () => {
    console.log("Logged in.");
    botMain.sendMessage({
        command: "social.presence",
        data: {
            status: "online"
        }
    });
});

function applyRoomEvents(ah, ribbon, user) {
    ah.on("end", () => {
        botMain.sendDM(user, `Your room has been closed because everyone left. Type !private or !public to start a new one.`);
        ribbon.disconnectGracefully();
        sessions.delete(user);
        redis.deleteLobby(user).then(() => {
            console.log("Deleted lobby settings for " + user);
        });
    });

    ah.on("stop", () => {
        botMain.sendDM(user, `I've left your room.`);
        ribbon.disconnectGracefully();
        sessions.delete(user);
        redis.deleteLobby(user).then(() => {
            console.log("Deleted lobby settings for " + user);
        });
    });

    ah.on("configchange", () => {
        const config = serialise(ah);
        redis.setLobby(user, config).then(() => {
            console.log("Saved lobby settings for " + user);
        });
    });

    ribbon.on("die", () => {
        // todo: recover from ribbon failure
    });

    ribbon.on("kick", () => {
        botMain.sendDM(user, `I was kicked from the room.`);
        ribbon.disconnectGracefully();
        sessions.delete(user);
        redis.deleteLobby(user).then(() => {
            console.log("Deleted lobby settings for " + user);
        });
    });
}

function createLobby(user, isPrivate) {
    if (sessions.has(user)) {
        const ah = sessions.get(user);
        botMain.sendDM(user, `You already have a room open. Join room #${ah.roomID}`);
        ah.ribbon.socialInvite(user);
    } else {
        const ribbon = new Ribbon(process.env.TOKEN);

        ribbon.once("joinroom", () => {
            const ah = new Autohost(ribbon, user, isPrivate);

            applyRoomEvents(ah, ribbon, user);

            sessions.set(user, ah);

            const config = serialise(ah);
            redis.setLobby(user, config).then(() => {
                console.log("Saved inital lobby settings for " + user);
            });

            api.getUser(user).then(host => {
                if (host) {
                    ah.ribbon.room.setName(`${host.username.toUpperCase()}'s ${isPrivate ? "private " : ""}room`);
                } else {
                    ah.ribbon.room.setName("Custom room");
                }

                ribbon.once("gmupdate", () => {
                    botMain.sendDM(user, `Room created! Join room #${ribbon.room.id}`);
                    ribbon.socialInvite(user);
                });
            });
        });

        ribbon.once("ready", () => {
            ribbon.createRoom(isPrivate);
        });
    }
}

botMain.on("social.dm", message => {
    const msg = message.data.content.trim().toLowerCase();
    const user = message.data.user;

    if (message.data.userdata.role === "bot") return;

    if (config.motd) {
        botMain.sendDM(user, "MOTD: " + config.motd);
    }

    if (msg === "!private") {
        createLobby(user, true);
    } else if (msg === "!public") {
        createLobby(user, false);
    } else {
        botMain.sendDM(user, "Hi there! Type !private to create a private lobby, or !public to create a public lobby.");
    }

});

redis.getAllLobbies().then(lobbies => {
    console.log("Restoring " + lobbies.length + " lobbies.");

    lobbies.forEach(lobby => {
        console.log(lobby);
        if (!lobby.roomID || !lobby.host) {
            console.log("Lobby skipped - missing critical data");
            return;
        }

        const ribbon = new Ribbon(process.env.TOKEN);

        ribbon.on("err", error => {
            if (error === "no such room") {
                redis.deleteLobby(lobby.host).finally(() => {
                    console.log("Room no longer exists, deleting.");
                });
                ribbon.disconnectGracefully();
            }
        })

        ribbon.once("joinroom", () => {
            ribbon.room.takeOwnership();

            const ah = new Autohost(ribbon, undefined, lobby.isPrivate);

            ribbon.sendChatMessage("Room settings have been restored.");

            applyRoomEvents(ah, ribbon, lobby.host);
            deserialise(lobby, ah);

            sessions.set(lobby.host, ah);
        });

        ribbon.once("ready", () => {
            ribbon.joinRoom(lobby.roomID);
        });
    });
});

process.on("SIGINT", () => {
    console.log("Shutting down!");

    botMain.disconnectGracefully();
    sessions.forEach(session => {
        if (session.ribbon) {
            session.ribbon.disconnectGracefully();
        }
    });

    process.exit(0);
});