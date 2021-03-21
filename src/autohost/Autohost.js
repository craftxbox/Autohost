const EventEmitter = require("events");
const api = require("../gameapi/api");

const commands = require("./commands");
const {checkAll} = require("./rules");

class Autohost extends EventEmitter {

    constructor(ribbon, host, isPrivate) {
        super();

        if (!ribbon.room) {
            throw new Error("Ribbon should be connected to a lobby!");
        }

        this.isPrivate = isPrivate;

        this.host = host;

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

        this.ribbon = ribbon;

        this.roomID = ribbon.room.id;

        this.ribbon.room.on("playersupdate", () => {
            if (this.someoneDidJoin && this.ribbon.room.players.length === 0 && this.ribbon.room.spectators.length === 1) {
                this.emit("end");
            } else {
                this.checkAutostart();
            }
        });


        this.ribbon.on("gmupdate.leave", leave => {
            const profile = this.playerData.get(leave);

            this.warnings[leave] = 0;

            if (profile) {
                this.usernamesToIds.delete(profile.username.toLowerCase());
            }
        });

        this.ribbon.on("gmupdate.bracket", async update => {
            if (!this.ribbon.room.isHost || this.host === update.uid || update.bracket === "spectator") return;

            const playerData = await this.getPlayerData(update.uid);
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
                    this.ribbon.room.kickPlayer(update.uid);
                    return;
                }

                this.ribbon.room.switchPlayerBracket(update.uid, "spectator");
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

        this.ribbon.on("gmupdate.join", join => {
            if ([...this.bannedUsers.values()].indexOf(join._id) !== -1) {
                if (!this.ribbon.room.isHost) {
                    this.ribbon.room.takeOwnership();
                    this.ribbon.room.kickPlayer(join._id);
                    this.ribbon.room.transferOwnership(this.host);
                    this.ribbon.sendChatMessage("Took host temporarily to remove a banned player.");
                } else {
                    this.ribbon.room.kickPlayer(join._id);
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

                    if (this.ribbon.room.isHost) {
                        this.ribbon.room.switchPlayerBracket(user._id, "spectator");
                    }
                }
            });
        });
    }

    sendMessage(username, message) {
        this.ribbon.sendChatMessage(`[${username.toUpperCase()}] -> ${message}`);
    }

    async getUserID(username) {
        if (this.usernamesToIds.has(username.toLowerCase())) {
            return this.usernamesToIds.get(username.toLowerCase());
        } else {
            return undefined; // we can't get this yet
        }
    }

    async getPlayerData(player) {
        if (this.playerData.has(player)) {
            return this.playerData.get(player);
        } else {
            const data = await api.getUser(player);
            if (data) {
                this.playerData.set(player, data);
                this.usernamesToIds.set(data.username.toLowerCase(), player);
            }
            return data;
        }
    }

    banPlayer(user, username) {
        this.bannedUsers.set(username.toLowerCase(), user);
    }

    unbanPlayer(username) {
        this.bannedUsers.delete(username.toLowerCase());
    }

    recheckPlayers() {
        this.ribbon.room.players.forEach(async player => {
            const playerData = await this.getPlayerData(player);
            if (checkAll(this.rules, playerData)) {
                if (this.ribbon.room.ingame) {
                    this.ribbon.room.kickPlayer(player);
                } else {
                    this.ribbon.room.switchPlayerBracket(player, "spectator");
                }
            }
        });
    }

    checkAutostart() {
        if (Date.now() - this.gameEndedAt < 5000 || this.ribbon.room.ingame) return;

        if (this.autostart === 0) {
            if (this.autostartTimer) {
                clearTimeout(this.autostartTimer);
                this.autostartTimer = undefined;
            }

            return;
        }

        if (this.ingame) return;

        if (this.ribbon.room.players.length < 2 && this.autostartTimer) {
            this.ribbon.sendChatMessage("Start cancelled - waiting for players...");
            clearTimeout(this.autostartTimer);
            this.autostartTimer = undefined;
        } else if (this.ribbon.room.players.length >= 2 && !this.autostartTimer) {
            this.ribbon.sendChatMessage("Game starting in " + this.autostart + " seconds!");
            this.autostartTimer = setTimeout(() => {
                this.recheckPlayers();
                this.ribbon.room.start();
                this.autostartTimer = undefined;
            }, this.autostart * 1000);
        }
    }
}

module.exports = Autohost;