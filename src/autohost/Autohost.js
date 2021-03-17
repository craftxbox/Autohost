const EventEmitter = require("events");
const api = require("../gameapi/api");

const commands = require("./commands");
const {checkAll} = require("./rules");

class Autohost extends EventEmitter {

    constructor(ribbon, host, isPrivateOrRoomCode) {
        super();

        this.ribbon = ribbon;
        this.host = host;
        this.isPrivate = !!isPrivateOrRoomCode;

        this.playerData = new Map();
        this.usernamesToIds = new Map();
        this.bannedUsers = new Map();

        this.warnings = {};

        this.rules = {
            anons_allowed: true,
            unranked_allowed: true,
            min_level: 0,
            min_rank: "z",
            max_rank: "z"
        };

        this.autostart = 0;

        this.hostDidJoin = false;
        this.didLoadUsers = false;

        this.ribbon.on("ready", () => {
            if (typeof isPrivateOrRoomCode === "boolean") {
                this.ribbon.createRoom(isPrivateOrRoomCode).then(room => {
                    this.room = room;
                    return api.getUser(host);
                }).then(user => {
                    if (user) {
                        return this.room.setName(`${user.username.toUpperCase()}'s ${this.isPrivate ? "private " : ""}room`);
                    } else {
                        return this.room.setName("Custom room");
                    }
                }).then(() => {
                    this.didLoadUsers = true;
                    this.emit("created", this.room.id);

                    this.room.on("playersupdate", () => {
                        if (this.someoneDidJoin && this.room.players.length === 0 && this.room.spectators.length === 1) {
                            this.emit("end");
                        } else {
                            this.checkAutostart();
                        }
                    });
                });
            } else {
                this.ribbon.joinRoom(isPrivateOrRoomCode).then(room => {
                    this.room = room;
                    this.emit("created", room.id);

                    room.takeOwnership();

                    room.on("playersupdate", () => {
                        if (this.someoneDidJoin && this.room.players.length === 0 && this.room.spectators.length === 1) {
                            this.emit("end");
                        } else {
                            this.checkAutostart();
                        }
                    });
                });
            }
        });

        this.ribbon.on("gmupdate", update => {
            if (this.didLoadUsers) return;

            update.players.forEach(player => {
                api.getUser(player._id).then(user => {
                    this.playerData.set(player._id, user);
                    this.usernamesToIds.set(user.username.toLowerCase(), player._id);
                });
            });

            this.didLoadUsers = true;
        });

        this.ribbon.on("gmupdate.join", join => {
            if ([...this.bannedUsers.values()].indexOf(join._id) !== -1) {
                if (!this.room.isHost) {
                    this.room.takeOwnership();
                    this.room.kickPlayer(join._id);
                    this.room.transferOwnership(this.host);
                    this.ribbon.sendChatMessage("Took host temporarily to remove a banned player.");
                } else {
                    this.room.kickPlayer(join._id);
                }
                return;
            }

            this.someoneDidJoin = true;

            api.getUser(join._id).then(user => {
                this.playerData.set(user._id, user);
                this.usernamesToIds.set(user.username.toLowerCase(), user._id);

                if (join._id === this.host) {
                    this.ribbon.sendChatMessage(`Welcome to your room, ${join.username.toUpperCase()}!
                    
- Use !setrule to change the rules for this room.
- Use !preset to enable special rulesets.
- Use !autostart to allow the room to start automatically.
- Use !hostmode to become the host, to adjust room settings.
- Need more? Use !help for a full list of commands. 

When you're ready to start, type !start.`);
                } else {
                    const ineligibleMessage = checkAll(this.rules, user);

                    if (ineligibleMessage) {
                        this.ribbon.sendChatMessage(`Welcome, ${join.username.toUpperCase()}. ${ineligibleMessage} - however, feel free to spectate.`);
                    } else {
                        this.ribbon.sendChatMessage(`Welcome, ${join.username.toUpperCase()}.`);
                        return;
                    }

                    if (this.room.isHost) {
                        this.room.switchPlayerBracket(user._id, "spectator");
                    }
                }
            });
        });

        this.ribbon.on("gmupdate.leave", leave => {
            const profile = this.playerData.get(leave);

            this.warnings[leave] = 0;

            if (profile) {
                this.usernamesToIds.delete(profile.username.toLowerCase());
            }
        });

        this.ribbon.on("gmupdate.bracket", update => {
            if (!this.room.isHost || this.host === update.uid || update.bracket === "spectator") return;

            const playerData = this.getPlayerData(update.uid);
            const ineligibleMessage = checkAll(this.rules, playerData);

            if (ineligibleMessage) {
                const warnings = this.warnings.hasOwnProperty(update.uid) ? this.warnings[update.uid] + 1 : 1;
                this.warnings[update.uid] = warnings;
                if (warnings === 1) {
                    this.sendMessage(playerData.username, `${ineligibleMessage}. Please don't try to switch to players.`);
                } else if (warnings === 2) {
                    this.sendMessage(playerData.username, "Please don't try to switch to players, or you will be kicked from the lobby.");
                } else if (warnings === 3) {
                    this.sendMessage(playerData.username, "Final warning: you will be kicked if you try to switch to players again.");
                } else if (warnings === 4) {
                    this.room.kickPlayer(update.uid);
                    return;
                }

                this.room.switchPlayerBracket(update.uid, "spectator");
            }
        });

        this.ribbon.on("chat", chat => {
            if (chat.user.role === "bot") return; // ignore other bots

            const username = chat.user.username;
            const user = chat.user._id;
            const message = chat.content;
            const host = user === this.host;

            if (!message.startsWith("!")) return; // ignore not commands

            const args = message.substring(1).split(" ");
            const command = args.shift().toLowerCase();

            if (commands.hasOwnProperty(command)) {
                const commandObj = commands[command];

                if (!host && commandObj.hostonly && user !== "5e4979d4fad3ca55f6512458") { // todo: hard coded id
                    this.sendMessage(username, "Only the lobby host can use this command.");
                    return;
                }

                commandObj.handler(user, username, args, this);
            }
        });

        this.ribbon.on("endmulti", () => {
            this.gameEndedAt = Date.now();
            setTimeout(() => {
                this.checkAutostart();
            }, 10000);
        });
    }

    sendMessage(username, message) {
        this.ribbon.sendChatMessage(`[${username.toUpperCase()}] -> ${message}`);
    }

    getUserID(username) {
        return this.usernamesToIds.get(username.toLowerCase());
    }

    getPlayerData(player) {
        return this.playerData.get(player);
    }

    banPlayer(user, username) {
        this.bannedUsers.set(username.toLowerCase(), user);
    }

    unbanPlayer(username) {
        this.bannedUsers.delete(username.toLowerCase());
    }

    recheckPlayers() {
        this.room.players.forEach(player => {
            const playerData = this.getPlayerData(player);
            if (checkAll(this.rules, playerData)) {
                if (this.room.ingame) {
                    this.room.kickPlayer(player);
                } else {
                    this.room.switchPlayerBracket(player, "spectator");
                }
            }
        });
    }

    checkAutostart() {
        if (Date.now() - this.gameEndedAt < 5000 || this.room.ingame) return;

        if (this.autostart === 0) {
            if (this.autostartTimer) {
                clearTimeout(this.autostartTimer);
                this.autostartTimer = undefined;
            }

            return;
        }

        if (this.ingame) return;

        if (this.room.players.length < 2 && this.autostartTimer) {
            this.ribbon.sendChatMessage("Start cancelled - waiting for players...");
            clearTimeout(this.autostartTimer);
            this.autostartTimer = undefined;
        } else if (this.room.players.length >= 2 && !this.autostartTimer) {
            this.ribbon.sendChatMessage("Game starting in " + this.autostart + " seconds!");
            this.autostartTimer = setTimeout(() => {
                this.recheckPlayers();
                this.room.start();
                this.autostartTimer = undefined;
            }, this.autostart * 1000);
        }
    }
}

module.exports = Autohost;