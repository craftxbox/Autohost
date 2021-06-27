const path = require("path");
const SessionManager = require("./sessionmanager/SessionManager");
const api = require("./gameapi/api");

require("dotenv").config({path: path.join(__dirname, "../.env")});

if (!process.env.TOKEN) {
    console.error("Please specify a TETR.IO bot token in the TOKEN environment variable. See https://kagar.in/bots for information.");
    process.exit(1);
}

let sm;

api.getMe().then(user => {
    if (!user) {
        console.error("Your bot token is invalid. You may need to grab a new one if you logged out everywhere.");
        process.exit(1);
    }

    global.botUserID = user._id;

    if (user.role !== "bot") {
        console.error("You are attempting to run Autohost on a non-bot account. STOP NOW, and read the information at https://kagar.in/bots before trying again.");
        process.exit(1);
    }

    sm = new SessionManager();

    sm.restoreAllLobbies();
});

process.on("SIGINT", () => {
   sm.shutdown();
});
