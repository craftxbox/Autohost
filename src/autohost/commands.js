const presets = require("../data/presets");
const parse = require("../ribbon/configparser");
const {checkAll} = require("./rules");
const {getUser} = require("../gameapi/api");
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
            autohost.ribbon.sendChatMessage("For a list of commands, type !commands. For detailed help, to contribute code or to create a bug report, visit the project homepage:\n\nhttps://kagar.in/autohost\n\nAutohost is developed by Zudo (Zudo#0800 on Discord) - feel free to send me any feedback!");
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

            const playerData = await autohost.getPlayerData(args[0]);
            const kickRecipient = playerData && playerData._id;

            const staff = ["admin", "mod"].indexOf(playerData.role) !== -1;

            if (staff) {
                autohost.sendMessage(username, "You cannot kick TETR.IO staff.");
                return;
            }

            if (kickRecipient === global.botUserID) {
                autohost.sendMessage(username, "Hey, don't kick me!");
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

            if (!autohost.ribbon.room.settings.players.find(player => player._id === kickRecipient)) {
                autohost.sendMessage(username, "That player is not in the lobby.");
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

            const playerData = await autohost.getPlayerData(args[0]);
            const banRecipient = playerData && playerData._id;

            const staff = ["admin", "mod"].indexOf(playerData.role) !== -1;

            if (staff) {
                autohost.sendMessage(username, "You cannot ban TETR.IO staff.");
                return;
            }

            if (banRecipient === global.botUserID) {
                autohost.sendMessage(username, "Hey, don't ban me!");
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
                if (autohost.ribbon.room.settings.meta.allowAnonymous) {
                    autohost.sendMessage(username, `Banned ${args[0].toUpperCase()}. Note that banned players can rejoin with anonymous accounts.`);
                } else {
                    autohost.sendMessage(username, `Banned ${args[0].toUpperCase()}.`);
                }
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
            autohost.start();
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
            autohost.sendMessage(username, "Current rules:\n\n" + Object.keys(RULES).map(rule => {
                return RULES[rule].description(autohost.rules.hasOwnProperty(rule) ? autohost.rules[rule] : RULES[rule].default);
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
                autohost.sendMessage(username, "You are now the room host. Change any settings you want, then do !hostmode again before starting the game.");
            } else {
                autohost.ribbon.room.takeOwnership();
                autohost.sendMessage(username, "OK, I'm the host again. Type !start when you're ready.");
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

            if (autohost.ribbon.room.players.indexOf(newHost) === -1 && autohost.ribbon.room.spectators.indexOf(newHost) === -1) {
                autohost.sendMessage(username, "That player is not in this lobby.");
                return;
            }

            if (newHost === global.botUserID) {
                autohost.sendMessage(username, "I'm always the host, no need to give it to me. :woke:");
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

            autohost.emit("configchange");
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

            if (autohost.unbanPlayer(args[0])) {
                autohost.sendMessage(username, `Unbanned player ${args[0].toUpperCase()}.`);
            } else {
                autohost.sendMessage(username, `That player is not banned, check the spelling and try again.`);
            }

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

            if (autohost.ribbon.room.players.indexOf(modRecipient) === -1 && autohost.ribbon.room.spectators.indexOf(modRecipient) === -1) {
                autohost.sendMessage(username, "That player is not in this lobby.");
                return;
            }

            if (modRecipient === global.botUserID) {
                autohost.sendMessage(username, "No need to mod me!");
                return;
            }

            if (isDeveloper(modRecipient)) {
                autohost.sendMessage(username, "This player is the developer of Autohost, no need to mod them.")
                return;
            }

            if (modRecipient !== user) {
                autohost.modPlayer(modRecipient, args[0]);
                autohost.sendMessage(username, `${args[0].toUpperCase()} is now a moderator.`);
            } else {
                autohost.sendMessage(username, `${args[0].toUpperCase()} You're the room host already. Why would you need to mod yourself?`);
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

            if (autohost.unmodPlayer(args[0])) {
                autohost.sendMessage(username, `${args[0].toUpperCase()} is no longer a moderator.`);
            } else {
                autohost.sendMessage(username, `That player is not a moderator, check the spelling and try again.`);
            }

            autohost.emit("configchange");
        }
    },
    host: {
        hostonly: false,
        modonly: false,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            const host = await getUser(autohost.host);

            if (host) {
                autohost.sendMessage(username, `The host of the room is ${host.username.toUpperCase()}.`);
            } else {
                autohost.sendMessage(username, "Sorry, I don't know who the host is.");
            }
        }
    },
    opponent: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !opponent <username>");
                return;
            }

            const oldOpponent = autohost.twoPlayerOpponent;

            const opponent = await autohost.getUserID(args[0]);

            if (autohost.ribbon.room.players.indexOf(opponent) !== -1 || autohost.ribbon.room.spectators.indexOf(opponent) !== -1) {
                if (opponent === global.botUserID) {
                    autohost.sendMessage(username, "I don't know how to play the game! Don't try to 1v1 me please :crying:");
                    return;
                }

                autohost.twoPlayerOpponent = opponent;
                autohost.twoPlayerChallenger = undefined;
                autohost.twoPlayerQueue = autohost.twoPlayerQueue.filter(player => player !== opponent); // remove the new opponent if they're in the queue
                autohost.sendMessage(username, `1v1 matchups are now against ${args[0].toUpperCase()}. Type !queue to join.`);
                if (oldOpponent) {
                    autohost.ribbon.room.switchPlayerBracket(oldOpponent, "spectator");
                }
                autohost.ribbon.room.switchPlayerBracket(opponent, "players");
            } else {
                autohost.sendMessage(username, "That player is not in this lobby.");
            }

            autohost.emit("configchange");
        }
    },
    queue: {
        hostonly: false,
        modonly: false,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            if (!autohost.twoPlayerOpponent) {
                autohost.sendMessage(username, "The 1v1 queue is currently turned off. Lobby moderators can use !opponent to turn it on.");
                return;
            } else if (autohost.twoPlayerOpponent === user) {
                autohost.sendMessage(username, "You can't queue against yourself in a 1v1.");
                return;
            }
          
            const rulesMessage = checkAll(autohost.rules, await getUser(user), autohost);

            if (rulesMessage) {
                autohost.sendMessage(username, rulesMessage + ".");
                return;
            }

            if (autohost.twoPlayerChallenger === user) {
                autohost.sendMessage(username, "You're up next!");
                return;
            }

            const queuePos = autohost.twoPlayerQueue.indexOf(user);

            if (queuePos === -1) {
                autohost.twoPlayerQueue.push(user);
                if (!autohost.twoPlayerChallenger) {
                    autohost.nextChallenger();
                } else {
                    autohost.sendMessage(username, `You're now in the queue at position ${autohost.twoPlayerQueue.length}`);
                }
            } else {
                autohost.sendMessage(username, `You're #${queuePos + 1} in the queue.`);
            }

            autohost.emit("configchange");
        }
    },
    queueoff: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            if (autohost.twoPlayerOpponent) {
                autohost.disableQueue();
                autohost.sendMessage(username, "The 1v1 queue was disabled.");
            } else {
                autohost.sendMessage(username, "The 1v1 queue is not turned on.");
            }
        }
    },
    commands: {
        hostonly: false,
        modonly: false,
        devonly: false,
        handler: function (user, username, args, autohost) {
            autohost.sendMessage(username, "Go to https://kagar.in/autohost/commands for a list of commands.");
        }
    },
    set: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: function (user, username, args, autohost) {
            if (args.length === 0) {
                autohost.sendMessage(username, "Usage: !set <settings>");
                autohost.sendMessage(username, "Example: !set meta.match.ft=7;game.options.gmargin=7200");
                return;
            }
            const config = parse(args.join(" "));
            autohost.ribbon.room.setRoomConfig(config);
            autohost.sendMessage(username, "Room configuration updated.");
        }
    },
    name: {
        hostonly: true,
        modonly: false,
        devonly: false,
        handler: function (user, username, args, autohost) {
            if (args.length === 0) {
                autohost.sendMessage(username, "Usage: !name <room name>");
                return;
            }
            const name = args.join(" ");
            autohost.ribbon.room.setName(name);
            autohost.sendMessage(username, "Room name updated.");
        }
    },
    clearqueue: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: function (user, username, args, autohost) {
            autohost.twoPlayerQueue = [];
            autohost.twoPlayerChallenger = undefined;
            autohost.sendMessage(username, "Cleared the queue. Type !queue to join.");
        }
    },
    allow: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !allow <username>");
                return;
            }

            const allowRecipient = await autohost.getUserID(args[0]);

            if (autohost.ribbon.room.players.indexOf(allowRecipient) === -1 && autohost.ribbon.room.spectators.indexOf(allowRecipient) === -1) {
                autohost.sendMessage(username, "That player is not in this lobby.");
                return;
            }

            autohost.allowPlayer(allowRecipient, args[0]);

            autohost.sendMessage(username, `${args[0].toUpperCase()} can now play in this lobby, regardless of any restrictions.`);

            autohost.emit("configchange");
        }
    },
    unallow: {
        hostonly: false,
        modonly: true,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            if (args.length !== 1) {
                autohost.sendMessage(username, "Usage: !unallow <username>");
                return;
            }

            if (autohost.unallowPlayer(args[0])) {
                autohost.sendMessage(username, `${args[0].toUpperCase()} is now subject to the room rules.`);
            } else {
                autohost.sendMessage(username, `That player is not on the allowed player list, check the spelling and try again.`);
            }

            autohost.emit("configchange");
        }
    },
    queuelist: {
        hostonly: false,
        modonly: false,
        devonly: false,
        handler: async function (user, username, args, autohost) {
            if (autohost.twoPlayerOpponent) {
                const usernames = [];

                for (const i in autohost.twoPlayerQueue) {
                    if (autohost.twoPlayerQueue.hasOwnProperty(i)) {
                        usernames.push("#" + (parseInt(i)+1) + ": " + (await autohost.getPlayerData(autohost.twoPlayerQueue[i])).username.toUpperCase());
                    }
                }

                const challenger = autohost.twoPlayerChallenger ? (await autohost.getPlayerData(autohost.twoPlayerChallenger)).username.toUpperCase() : "(challenger)";
                const opponent = (await autohost.getPlayerData(autohost.twoPlayerOpponent)).username.toUpperCase();

                autohost.sendMessage(username, `${opponent} vs ${challenger}\n\n${usernames.length > 0 ? usernames.join("\n"): "Queue is empty."}`);
            } else {
                autohost.sendMessage(username, "The queue is off.");
            }
        }
    },
    eval: {
        hostonly: false,
        modonly: false,
        devonly: true,
        handler: function (user, username, args, autohost) {
            try {
                autohost.sendMessage(username, "Eval done: " + JSON.stringify(eval(args.join(" "))));
            } catch (e) {
                autohost.sendMessage(username, "Eval failed: " + e.toString());
            }
        }
    }
};

module.exports = commands;