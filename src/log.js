const {DBLog} = require("./db/models");
const chalk = require("chalk");


const LOG_LEVELS = {
    ULTRAFINE: 10,
    FINE: 20,
    INFO: 30,
    WARNING: 40,
    ERROR: 50,
    CRITICAL: 60
};

const _LEVEL_COLORS = {
    [LOG_LEVELS.ULTRAFINE]: chalk.cyan,
    [LOG_LEVELS.FINE]: chalk.green,
    [LOG_LEVELS.INFO]: chalk.white,
    [LOG_LEVELS.WARNING]: chalk.yellow,
    [LOG_LEVELS.ERROR]: chalk.red,
    [LOG_LEVELS.CRITICAL]: chalk.redBright.bold
};

const _WORKER_NAMES_FRIENDLY = {
    "w1": chalk.red("w1"),
    "w2": chalk.green("w2"),
    "w3": chalk.blue("w3"),
    "w4": chalk.yellow("w4"),
    "w5": chalk.magenta("w5"),
    "w6": chalk.cyan("w6"),
    "w7": chalk.cyanBright("w7"),
    "w8": chalk.magentaBright("w8"),
    "?unkn?": chalk.bold.redBright("?unkn?"),
    "primary": chalk.bold.greenBright("primary")
}



function logMessage(level, component, message, meta) {
    const time = new Date();
    const wn = global?.workerName || "?unkn?";
    console.log(`[${_WORKER_NAMES_FRIENDLY[wn]}] [${_LEVEL_COLORS[level](component)}] [${_LEVEL_COLORS[level](time.toLocaleString())}] ${message}`);
    DBLog.create({
        level, time, component, message, meta,
        worker: wn
    }).catch(e => {
        console.warn("Failed to log message", e);
    });
}

module.exports = {logMessage, LOG_LEVELS};
