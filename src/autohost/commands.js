const presets = require("../data/presets.js");
const {RULES} = require("./rules");

const commands = {
    sip: {
        description: "Sip.",
        hostonly: false,
        handler: function (user, username, args, autohost) {
            autohost.ribbon.sendChatMessage(":serikasip:");
        }
    },
    help: {
        description: "Shows this help message.",
        hostonly: false,
        handler: function (user, username, args, autohost) {
            const cmdList = Object.keys(commands);
            cmdList.sort();

            autohost.ribbon.sendChatMessage("Available commands:");

            let message = "";

            cmdList.forEach(cmd => {
                if (!commands[cmd].hostonly || user === autohost.host) {
                    message += `!${cmd} - ${commands[cmd].description}\n`;
                }
            });

            autohost.ribbon.sendChatMessage(message);

            autohost.ribbon.sendChatMessage("Have feedback? Message ZUDO in game or Zudo#0800 on Discord. Please note that this bot is still under development and may contain bugs.");
        }
    },
    kick: {
        description: "Kicks a player from the lobby.",
        hostonly: true,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !kick <username>");
                return;
            }

            if (!autohost.room.isHost) {
                autohost.sendMessage(username, "Use !givehost before attempting to kick players.")
                return;
            }

            const kickRecipient = autohost.getUserID(args[0]);

            if (!kickRecipient) {
                autohost.sendMessage(username, "That player is not in this lobby.");
                return;
            }

            if (kickRecipient !== user) {
                autohost.room.kickPlayer(kickRecipient);
                autohost.sendMessage(username, `Kicked ${args[0].toUpperCase()}.`);
            } else {
                autohost.sendMessage(username, "Why would you want to kick yourself?");
            }
        }
    },
    ban: {
        description: "Bans a player from the lobby.",
        hostonly: true,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !ban <username>");
                return;
            }

            if (!autohost.room.isHost) {
                autohost.sendMessage(username, "Use !givehost before attempting to ban players.")
                return;
            }

            const banRecipient = autohost.getUserID(args[0]);

            if (!banRecipient) {
                autohost.sendMessage(username, "That player is not in this lobby.");
                return;
            }

            if (banRecipient !== user) {
                autohost.banPlayer(banRecipient, args[0]);
                autohost.room.kickPlayer(banRecipient);
                autohost.sendMessage(username, `Banned ${args[0].toUpperCase()}.`);
            } else {
                autohost.sendMessage(username, "Why would you want to ban yourself?");
            }
        }
    },
    start: {
        description: "Starts the game.",
        hostonly: true,
        handler: function (user, username, args, autohost) {
            if (autohost.room.players.length < 2) {
                autohost.sendMessage(username, "Not enough players to start.");
                return;
            }
            autohost.room.start();
        }
    },
    preset: {
        description: "Selects a game preset.",
        hostonly: true,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1 || !presets.hasOwnProperty(args[0].toLowerCase())) {
                autohost.sendMessage(username, `Usage: !preset <${Object.keys(presets).join("|")}>`);
                return;
            }

            autohost.room.setRoomConfig(presets[args[0].toLowerCase()]).then(update => {
                autohost.sendMessage(username, `Switched to ${args[0].toUpperCase()} preset.`);
                console.log(update.game.options, update.game.match);
            });
        }
    },
    rules: {
        description: "Shows the current game rules.",
        hostonly: false,
        handler: function (user, username, args, autohost) {
            autohost.sendMessage(username, "Current rules:\n\n" + Object.keys(autohost.rules).map(rule => {
                return RULES[rule].description(autohost.rules[rule])
            }).join("\n"));
        }
    },
    setrule: {
        description: "Sets a game rule.",
        hostonly: true,
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
        }
    },
    unset: {
        description: "Unsets a game rule.",
        hostonly: true,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1 || !RULES.hasOwnProperty(args[0].toLowerCase())) {
                autohost.sendMessage(username, `Usage: !unset <rule>\n\nWhere <rule> is one of:\n\n${Object.keys(RULES).join(", ")}`);
                return;
            }

            const rule = RULES[args[0].toLowerCase()];

            autohost.rules[args[0].toLowerCase()] = rule.default;

            autohost.sendMessage(username, `Rule unset:\n\n${rule.description(rule.default)}`);
        }
    },
    takehost: {
        description: "Take host of the room.",
        hostonly: true,
        handler: function (user, username, args, autohost) {
            autohost.room.transferOwnership(user);
            autohost.sendMessage(username, "You are now the room host. Change any settings you want, then do !givehost when you're done.");
        }
    },
    givehost: {
        description: "Return host to the bot.",
        hostonly: true,
        handler: function (user, username, args, autohost) {
            autohost.room.takeOwnership();
            autohost.sendMessage(username, "OK, I'm the host again.");
        }
    },
    autostart: {
        description: "Set the autostart timer.",
        hostonly: true,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1 || isNaN(parseInt(args[0]))) {
                autohost.sendMessage(username, "Usage: !autostart <time in seconds> (0 to disable)");
                return;
            }

            autohost.autostart = parseInt(args[0]);
            autohost.sendMessage(username, `Autostart timer set to ${autohost.autostart} seconds.`);
            autohost.checkAutostart();
        }
    }
};

module.exports = commands;