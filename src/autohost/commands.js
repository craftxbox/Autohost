const presets = require("../data/presets.js");
const {RULES} = require("./rules");

const commands = {
    sip: {
        hostonly: false,
        handler: function (user, username, args, autohost) {
            autohost.ribbon.sendChatMessage(":serikasip:");
        }
    },
    help: {
        hostonly: false,
        handler: function (user, username, args, autohost) {
            autohost.ribbon.sendChatMessage("The list of commands is available at https://git.io/JmqEY\n\nHave feedback? Message ZUDO in game or Zudo#0800 on Discord.\n\nWant to add me to your own room? Add me as a friend and send a DM.\n\nPlease note that this bot is still under development and may contain bugs.");
        }
    },
    kick: {
        hostonly: true,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !kick <username>");
                return;
            }

            if (!autohost.room.isHost) {
                autohost.sendMessage(username, "Use !hostmode before attempting to kick players.")
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
        hostonly: true,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !ban <username>");
                return;
            }

            if (!autohost.room.isHost) {
                autohost.sendMessage(username, "Use !hostmode before attempting to ban players.")
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
        hostonly: true,
        handler: function (user, username, args, autohost) {
            if (autohost.room.players.length < 2) {
                autohost.sendMessage(username, "Not enough players to start.");
                return;
            }
            autohost.recheckPlayers();
            autohost.room.start();
        }
    },
    preset: {
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
        hostonly: false,
        handler: function (user, username, args, autohost) {
            autohost.sendMessage(username, "Current rules:\n\n" + Object.keys(autohost.rules).map(rule => {
                return RULES[rule].description(autohost.rules[rule])
            }).join("\n"));
        }
    },
    setrule: {
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
            autohost.recheckPlayers();
        }
    },
    unset: {
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
    hostmode: {
        hostonly: true,
        handler: function (user, username, args, autohost) {
            if (autohost.room.isHost) {
                autohost.room.transferOwnership(user).then(() => {
                    autohost.sendMessage(username, "You are now the room host. Change any settings you want, then do !hostmode again when you're done.");
                });
            } else {
                autohost.room.takeOwnership().then(() => {
                    autohost.sendMessage(username, "OK, I'm the host again.");
                });
            }
        }
    },
    sethost: {
        hostonly: true,
        handler: function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !sethost <username>");
                return;
            }

            const newHost = autohost.getUserID(args[0]);

            if (!newHost) {
                autohost.sendMessage(username, "That player is not in this lobby.");
                return;
            }

            if (!autohost.room.isHost) {
                autohost.room.takeOwnership()
            }

            autohost.host = newHost;
            autohost.sendMessage(username, `${args[0].toUpperCase()} is now the lobby host.`);
        }
    },
    autostart: {
        hostonly: true,
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
        }
    },
    cancelstart: {
        hostonly: true,
        handler: function (user, username, args, autohost) {
            autohost.autostart = 0;
            autohost.checkAutostart();
            autohost.sendMessage(username, `Autostart cancelled.`);
        }
    }
};

module.exports = commands;