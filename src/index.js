const path = require("path");
const SessionManager = require("./sessionmanager/SessionManager");
const api = require("./gameapi/api");
const persistlobbies = require("./autohost/persistlobbies");
const chalk = require("chalk");

require("dotenv").config({path: path.join(__dirname, "../.env")});

function log(message) {
    console.log(chalk.redBright(`[Main] [${new Date().toLocaleString()}] ${message}`));
}

if (!process.env.TOKEN) {
    log("Please specify a TETR.IO bot token in the TOKEN environment variable. See https://kagar.in/bots for information.");
    process.exit(1);
}

let sm;

api.getMe().then(user => {
    if (!user) {
        log("Your bot token is invalid. You may need to grab a new one if you logged out everywhere.");
        process.exit(1);
    }

    global.botUserID = user._id;

    if (user.role !== "bot") {
        log("You are attempting to run Autohost on a non-bot account. STOP NOW, and read the information at https://kagar.in/bots before trying again.");
        process.exit(1);
    }

    sm = new SessionManager();

    sm.restoreAllLobbies().then(() => {
        if (process.env.PERSIST_ROOMS_DISABLED) return;
        Object.keys(persistlobbies).forEach(lobby => {
            if (sm.getSessionByPersistKey(lobby)) {
                log(lobby + " was restored, not creating it again.");
                return;
            }

            sm.createLobby(user._id, false).then(id => {
                const session = sm.getSession(id);

                session.persistKey = lobby;

                persistlobbies[lobby](session);

                log(`Persist lobby ${lobby} was created, code is ${session.roomID}`);

                session.saveConfig();
            });
        });
    });
});

process.on("SIGINT", () => {
   sm.shutdown();
});
