const { cpus } = require("os");
const cluster = require("cluster");
const { getMe } = require("./gameapi/api");
const { logMessage, LOG_LEVELS } = require("./log");

if (!process.env.TOKEN) {
    console.error("Please specify a TETR.IO bot token in the TOKEN environment variable.");
    process.exit(1);
}

// janky hack!
Error.prototype.getStatusCode = function () {
    return 500;
}

Error.prototype.getUserFacingMessage = function () {
    console.warn(this.stack);
    return "Something went wrong, please try again later.";
}

if (cluster.isPrimary) {
    getMe().then(user => {
        if (user.role !== "bot") {
            console.error("Please specify a TETR.IO bot token in the TOKEN environment variable.");
            return process.exit(1);
        }
    });
}

const chalk = require("chalk");

if (cluster.isPrimary) {
    // spin up workers

    global.workerName = chalk.greenBright("primary")

    const workers = [];

    for (let i = 0; i < Math.min(cpus().length, 8); i++) {
        const child_proc = cluster.fork();
        child_proc.process.on("error", e => console.warn("Worker error", e));
        workers.push(child_proc);
    }

    logMessage(LOG_LEVELS.INFO, "Process", "Autohost primary process started at " + new Date().toISOString());

    require("./ipc")(workers);
    require("./primary");
} else {
    require("./ipc")();
    require("./worker");
}

process.on("uncaughtException", e => {
    logMessage(LOG_LEVELS.CRITICAL, "Process", "Uncaught exception! " + e.message);
    console.log(e)
});
