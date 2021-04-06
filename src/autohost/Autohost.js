const EventEmitter = require("events");
const api = require("../gameapi/api");

const commands = require("./commands");
const {isDeveloper} = require("../data/developers");
const {checkAll} = require("./rules");

class Autohost extends EventEmitter {

    constructor(ribbon, host, isPrivate) {
        super();

        if (!ribbon.room) {
            throw new Error("Ribbon should be connected to a lobby!");
        }

        this.persist = false;
        this.isPrivate = isPrivate;
        this.host = host;

        this.motd = undefined;

        this.playerData = new Map();
        this.usernamesToIds = new Map();
        this.bannedUsers = new Map();
        this.moderatorUsers = new Map();

        this.twoPlayerOpponent = undefined;
        this.twoPlayerChallenger = undefined;
        this.twoPlayerQueue = [];

        this.bracketSwapWarnedPlayers = {};

        this.rules = {};

        this.autostart = 0;

        this.ribbon = ribbon;

        this.ribbon.room.on("playersupdate", () => {
            console.log(this.ribbon.room.memberCount);
            if (this.ribbon.room.memberCount === 1 && !this.persist && this.someoneDidJoin) {
                this.emit("end");
            } else {
                this.checkAutostart();
            }
        });

        this.ribbon.on("gmupdate", () => {
            this.emit("configchange");
        });

        this.ribbon.on("gmupdate.leave", leave => {
            const profile = this.playerData.get(leave);

            this.bracketSwapWarnedPlayers[leave] = 0;

            if (profile) {
                this.usernamesToIds.delete(profile.username.toLowerCase());
            }

            if (this.twoPlayerChallenger === leave) {
                this.twoPlayerChallenger = undefined;
                this.nextChallenger();
                return;
            }

            if (this.twoPlayerOpponent === leave) {
                this.disableQueue();
                this.ribbon.sendChatMessage("The 1v1 queue was disabled because the opponent left.");
            }

            const queueIndex = this.twoPlayerQueue.indexOf(leave);
            if (queueIndex !== -1) {
                this.twoPlayerQueue.splice(queueIndex, 1);
            }
        });

        this.ribbon.on("gmupdate.bracket", async update => {
            if (!this.ribbon.room.isHost || update.bracket === "spectator") return;

            const playerData = await this.getPlayerData(update.uid);
            const ineligibleMessage = this.twoPlayerOpponent ? this.check2pEligibility(update.uid) : checkAll(this.rules, playerData);

            if (ineligibleMessage) {
                this.ribbon.room.switchPlayerBracket(update.uid, "spectator");

                if (this.bracketSwapWarnedPlayers[update.uid]) return;

                this.bracketSwapWarnedPlayers[update.uid] = true;

                setTimeout(() => {
                    this.bracketSwapWarnedPlayers[update.uid] = false;
                }, 10000);

                this.sendMessage(playerData.username, `${ineligibleMessage}.`);
            }
        });

        this.ribbon.on("chat", chat => {
            if (chat.user.role === "bot") return; // ignore other bots

            const username = chat.user.username;
            const user = chat.user._id;
            const message = chat.content.trim();
            const host = user === this.host;
            const mod = [...this.moderatorUsers.values()].indexOf(user) !== -1;
            const dev = isDeveloper(user)

            if (!message.startsWith("!")) return; // ignore not commands

            const args = message.substring(1).split(" ");
            const command = args.shift().toLowerCase();

            if (commands.hasOwnProperty(command)) {
                const commandObj = commands[command];

                if (!dev && commandObj.devonly) {
                    this.sendMessage(username, "This command is only available for developers.");
                    return;
                }

                if (!host && !dev && commandObj.hostonly) {
                    this.sendMessage(username, "Only the lobby host can use this command.");
                    return;
                }

                if (!host && !mod && !dev && commandObj.modonly) {
                    this.sendMessage(username, "Only lobby moderators can use this command.");
                    return;
                }

                commandObj.handler(user, username, args, this);
            }
        });

        this.ribbon.on("endmulti", () => {
            this.gameEndedAt = Date.now();
            setTimeout(() => {
                this.nextChallenger();
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
- Need more? Use !commands for a full list of commands. 

When you're ready to start, type !start.`);
                } else {
                    const ineligibleMessage = checkAll(this.rules, user);

                    if (ineligibleMessage) {
                        this.ribbon.sendChatMessage(this.motd_ineligible ? this.motd_ineligible.replace(/\$PLAYER/g, user.username.toUpperCase()) : `Welcome, ${join.username.toUpperCase()}. ${ineligibleMessage} - however, feel free to spectate.${isDeveloper(join._id) ? " :serikasip:" : ""}`);
                    } else {
                        if (this.twoPlayerOpponent) {
                            this.getPlayerData(this.twoPlayerOpponent).then(opponent => {
                                this.ribbon.sendChatMessage(`Welcome, ${user.username.toUpperCase()}. Type !queue to join the 1v1 queue against ${opponent.username.toUpperCase()}.${isDeveloper(join._id) ? " :serikasip:" : ""}`);
                            });
                        } else {
                            this.ribbon.sendChatMessage(this.motd ? this.motd.replace(/\$PLAYER/g, user.username.toUpperCase()) : `Welcome, ${user.username.toUpperCase()}.${isDeveloper(join._id) ? " :serikasip:" : ""}`);
                        }
                        return;
                    }

                    if (this.ribbon.room.isHost) {
                        this.ribbon.room.switchPlayerBracket(user._id, "spectator");
                    }
                }
            });
        });
    }

    get roomID() {
        return this.ribbon.room.settings.id;
    }

    sendMessage(username, message) {
        this.ribbon.sendChatMessage(`[${username.toUpperCase()}] -> ${message}`);
    }

    async getUserID(username) {
        if (this.usernamesToIds.has(username.toLowerCase())) {
            return this.usernamesToIds.get(username.toLowerCase());
        } else {
            const data = (await this.getPlayerData(username.toLowerCase()));
            return data ? data._id : undefined;
        }
    }

    async getPlayerData(player) {
        if (this.playerData.has(player)) {
            return this.playerData.get(player);
        } else {
            console.log("Loading player data for " + player);
            const data = await api.getUser(player);
            if (data) {
                this.playerData.set(data._id, data);
                this.usernamesToIds.set(data.username.toLowerCase(), data._id);
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

    modPlayer(user, username) {
        this.moderatorUsers.set(username.toLowerCase(), user);
    }

    unmodPlayer(username) {
        this.moderatorUsers.delete(username.toLowerCase());
    }

    recheckPlayers() {
        return Promise.all(this.ribbon.room.players.map(async player => {
            const playerData = await this.getPlayerData(player);
            if (this.twoPlayerOpponent ? this.check2pEligibility(player) : checkAll(this.rules, playerData)) {
                if (!this.ribbon.room.ingame) {
                    this.ribbon.room.switchPlayerBracket(player, "spectator");
                }
            }
        }));
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
            if (!this.twoPlayerOpponent) {
                this.ribbon.sendChatMessage("Start cancelled - waiting for players...");
            }
            clearTimeout(this.autostartTimer);
            this.autostartTimer = undefined;
        } else if (this.ribbon.room.players.length >= 2 && !this.autostartTimer) {
            if (!this.twoPlayerOpponent) {
                this.ribbon.sendChatMessage("Game starting in " + this.autostart + " seconds!");
            }
            this.autostartTimer = setTimeout(() => {
                this.recheckPlayers().then(() => {
                    this.ribbon.room.start();
                    this.autostartTimer = undefined;
                });
            }, this.autostart * 1000);
        }
    }

    check2pEligibility(user) {
        if (this.twoPlayerChallenger !== user && this.twoPlayerOpponent !== user) {
            if (this.twoPlayerQueue.indexOf(user) === -1) {
                return "There is currently a queue for 1v1s in this room - type !queue to join";
            } else {
                return "Please wait to play";
            }
        }
    }

    nextChallenger() {
        if (!this.twoPlayerOpponent || this.ingame) {
            return;
        }

        this.twoPlayerChallenger = this.twoPlayerQueue.shift();

        this.ribbon.room.players.forEach(player => {
            this.ribbon.room.switchPlayerBracket(player, "spectator");
        });

        if (!this.twoPlayerChallenger) {
            this.ribbon.sendChatMessage("The 1v1 queue is empty! Type !queue to join.");
            return;
        }

        this.ribbon.room.switchPlayerBracket(this.twoPlayerOpponent, "player");
        this.ribbon.room.switchPlayerBracket(this.twoPlayerChallenger, "player");

        this.getPlayerData(this.twoPlayerChallenger).then(playerData => {
            this.ribbon.sendChatMessage(`${playerData.username.toUpperCase()} is up next!`);
        });
    }

    disableQueue() {
        this.twoPlayerOpponent = undefined;
        this.twoPlayerQueue = [];
        this.autostart = 0
        if (this.autostartTimer) {
            clearTimeout(this.autostartTimer);
            this.autostartTimer = undefined;
        }
        this.emit("configchange");
    }
}

module.exports = Autohost;