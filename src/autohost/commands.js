const presets = require("../data/presets.js");
const {isDeveloper} = require("../data/developers");
const {RULES} = require("./rules");

const commands = {
    sip: {
        hostonly: false,
        modonly: false,
        devonly: false,
        handler: function (user, username, args, autohost) {
            autohost.ribbon.sendChatMessage(":serikasip:");
        }
    },
    help: {
        hostonly: false,
        modonly: false,
        devonly: false,
        handler: function (user, username, args, autohost) {
            autohost.ribbon.sendChatMessage("Visit the GitHub page for detailed help, or if you wish to report an issue: https://git.io/JmqEY\n\nWant to add me to your own room? Add me as a friend and send a DM.\n\nPlease note that this bot is still under development and may contain bugs.");
        }
    },
    kick: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !kick <username>");
                return;
            }

            if (!autohost.ribbon.room.isHost) {
                autohost.sendMessage(username, "Use !hostmode before attempting to kick players.")
                return;
            }

            const kickRecipient = await autohost.getUserID(args[0]);

            if (!kickRecipient) {
                autohost.sendMessage(username, "That player is not in this lobby.");
                return;
            }

            if (isDeveloper(kickRecipient)) {
                autohost.sendMessage(username, "Please don't kick the developer! They'll leave if you ask nicely...");
                return;
            }

            if (kickRecipient === autohost.host) {
                autohost.sendMessage(username, "You can't kick the room host.");
                return;
            }

            if ([...autohost.moderatorUsers.values()].indexOf(kickRecipient) !== -1 && user !== autohost.host && !isDeveloper(user)) {
                autohost.sendMessage(username, "Only the room host can kick moderators.");
                return;
            }

            if (kickRecipient !== user) {
                autohost.ribbon.room.kickPlayer(kickRecipient);
                autohost.sendMessage(username, `Kicked ${args[0].toUpperCase()}.`);
            } else {
                autohost.sendMessage(username, "Why would you want to kick yourself?");
            }
        }
    },
    ban: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !ban <username>");
                return;
            }

            if (!autohost.ribbon.room.isHost) {
                autohost.sendMessage(username, "Use !hostmode before attempting to ban players.")
                return;
            }

            const banRecipient = await autohost.getUserID(args[0]);

            if (!banRecipient) {
                autohost.sendMessage(username, "That player is not in this lobby.");
                return;
            }

            if (isDeveloper(banRecipient)) {
                autohost.sendMessage(username, "Please don't ban the developer! They'll leave if you ask nicely...");
                return;
            }

            if (banRecipient === autohost.host) {
                autohost.sendMessage(username, "You can't ban the room host.");
                return;
            }

            if ([...autohost.moderatorUsers.values()].indexOf(banRecipient) !== -1 && user !== autohost.host && !isDeveloper(user)) {
                autohost.sendMessage(username, "Only the room host can ban moderators.");
                return;
            }

            if (banRecipient !== user) {
                autohost.banPlayer(banRecipient, args[0]);
                autohost.ribbon.room.kickPlayer(banRecipient);
                autohost.sendMessage(username, `Banned ${args[0].toUpperCase()}.`);
            } else {
                autohost.sendMessage(username, "Why would you want to ban yourself?");
            }

            autohost.emit("configchange");
        }
    },
    start: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: function (user, username, args, autohost) {
            if (autohost.ribbon.room.players.length < 2) {
                autohost.sendMessage(username, "Not enough players to start.");
                return;
            }
            autohost.recheckPlayers();
            autohost.ribbon.room.start();
        }
    },
    preset: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1 || !presets.hasOwnProperty(args[0].toLowerCase())) {
                autohost.sendMessage(username, `Usage: !preset <${Object.keys(presets).join("|")}>`);
                return;
            }

            autohost.ribbon.room.setRoomConfig(presets[args[0].toLowerCase()]);
            autohost.sendMessage(username, `Switched to ${args[0].toUpperCase()} preset.`);
        }
    },
    rules: {
        hostonly: false,
        modonly: false,
        devonly: false,
        handler: function (user, username, args, autohost) {
            autohost.sendMessage(username, "Current rules:\n\n" + Object.keys(autohost.rules).map(rule => {
                return RULES[rule].description(autohost.rules[rule])
            }).join("\n"));
        }
    },
    setrule: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: function (user, username, args, autohost) {
            if (args.length !== 2 || !RULES.hasOwnProperty(args[0].toLowerCase())) {
                autohost.sendMessage(username, `Usage:\n\n!setrule <rule> <value>\n\nWhere <rule> is one of:\n${Object.keys(RULES).join(", ")}`);
                return;
            }

            const rule = RULES[args[0].toLowerCase()];

            let newvalue = args[1].toLowerCase();

            if (rule.type instanceof Array && rule.type.indexOf(newvalue) === -1) {
                autohost.sendMessage(username, `${args[0].toLowerCase()} should be one of: ${rule.type.join(", ")}`);
                return;
            } else if (rule.type === Number) {
                newvalue = parseInt(newvalue);

                if (isNaN(newvalue)) {
                    autohost.sendMessage(username, `${args[0].toLowerCase()} should be an integer.`);
                    return;
                }
            } else if (rule.type === Boolean) {
                newvalue = ["yes", "y", "true", "1"].indexOf(newvalue.toLowerCase()) !== -1;
            }

            autohost.rules[args[0].toLowerCase()] = newvalue;

            autohost.sendMessage(username, `Rule updated:\n\n${rule.description(newvalue)}`);
            autohost.recheckPlayers();

            autohost.emit("configchange");
        }
    },
    unset: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1 || !RULES.hasOwnProperty(args[0].toLowerCase())) {
                autohost.sendMessage(username, `Usage: !unset <rule>\n\nWhere <rule> is one of:\n\n${Object.keys(RULES).join(", ")}`);
                return;
            }

            const rule = RULES[args[0].toLowerCase()];

            autohost.rules[args[0].toLowerCase()] = rule.default;

            autohost.sendMessage(username, `Rule unset:\n\n${rule.description(rule.default)}`);

            autohost.emit("configchange");
        }
    },
    hostmode: {
        hostonly: true,
        modonly: false,
        devonly: false,
        handler: function (user, username, args, autohost) {
            if (autohost.ribbon.room.isHost) {
                autohost.ribbon.room.transferOwnership(user);
                autohost.sendMessage(username, "You are now the room host. Change any settings you want, then do !hostmode again when you're done.");
            } else {
                autohost.ribbon.room.takeOwnership();
                autohost.sendMessage(username, "OK, I'm the host again.");
            }
        }
    },
    sethost: {
        hostonly: true,
        modonly: false,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !sethost <username>");
                return;
            }

            const newHost = await autohost.getUserID(args[0]);

            if (!newHost) {
                autohost.sendMessage(username, "That player is not in this lobby.");
                return;
            }

            if (!autohost.ribbon.room.isHost) {
                autohost.ribbon.room.takeOwnership()
            }

            autohost.host = newHost;
            autohost.sendMessage(username, `${args[0].toUpperCase()} is now the lobby host.`);

            autohost.emit("configchange");
        }
    },
    autostart: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1 || isNaN(parseInt(args[0]))) {
                autohost.sendMessage(username, "Usage: !autostart <time in seconds>");
                return;
            }

            const timer = parseInt(args[0]);

            if (timer > 600) {
                autohost.sendMessage(username, `Autostart timer cannot be longer than 10 minutes.`);
            } else if (timer < 5) {
                autohost.sendMessage(username, `Autostart timer cannot be shorter than 5 seconds.`);
            } else {
                autohost.sendMessage(username, `Autostart timer set to ${timer} seconds.`);
                autohost.autostart = timer;
            }
            autohost.checkAutostart();

            autohost.emit("configchange");
        }
    },
    cancelstart: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: function (user, username, args, autohost) {
            autohost.autostart = 0;
            autohost.checkAutostart();
            autohost.sendMessage(username, `Autostart cancelled.`);

            autohost.emit("configchange");
        }
    },
    shutdown: {
        hostonly: true,
        modonly: false,
        devonly: false,
        handler: function (user, username, args, autohost) {
            autohost.ribbon.room.transferOwnership(user);
            autohost.emit("stop");
        }
    },
    persist: {
        hostonly: false,
        modonly: false,
        devonly: true,
        handler: function (user, username, args, autohost) {
            if (autohost.persist) {
                autohost.persist = false;
                autohost.sendMessage(username, "Lobby will no longer persist.");
            } else {
                autohost.persist = true;
                autohost.sendMessage(username, "Lobby will persist even if all players leave.");
            }
        }
    },
    unban: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !unban <username>");
                return;
            }

            autohost.unbanPlayer(args[0]);

            autohost.sendMessage(username, `Unbanned player ${args[0].toUpperCase()}.`);

            autohost.emit("configchange");
        }
    },
    mod: {
        hostonly: true,
        modonly: false,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !mod <username>");
                return;
            }

            const modRecipient = await autohost.getUserID(args[0]);

            if (!modRecipient) {
                autohost.sendMessage(username, "That player is not in this lobby.");
                return;
            }

            if (modRecipient !== user) {
                autohost.modPlayer(modRecipient, args[0]);
                autohost.sendMessage(username, `${args[0].toUpperCase()} is now a moderator.`);
            }

            autohost.emit("configchange");
        }
    },
    unmod: {
        hostonly: true,
        modonly: false,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !unmod <username>");
                return;
            }

            autohost.unmodPlayer(args[0]);

            autohost.sendMessage(username, `${args[0].toUpperCase()} is no longer a moderator.`);

            autohost.emit("configchange");
        }
    }
};

module.exports = commands;