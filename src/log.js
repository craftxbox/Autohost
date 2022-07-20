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

function logMessage(level, component, message, meta) {
    const time = new Date();
    const wn = global?.workerName || chalk.redBright("?unkn?");
    console.log(`[${wn}] [${_LEVEL_COLORS[level](component)}] [${_LEVEL_COLORS[level](time.toLocaleString())}] ${_LEVEL_COLORS[level](message)}`);
    DBLog.create({
        level, time, component, message, meta,
        worker: wn
    }).catch(e => {
        console.warn("Failed to log message", e);
    });
}

module.exports = {logMessage, LOG_LEVELS};
