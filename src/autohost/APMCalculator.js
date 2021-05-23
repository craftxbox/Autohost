const {pushMessage} = require("../pushover/pushover");

class APMCalculator {

    constructor(autohost) {
        this.ready = false;
        this.autohost = autohost;

        this.apmMap = new Map();

        this.listenIDToUsernameMap = new Map();
        this.usernameToListenIDMap = new Map();

        this.banned = new Set();
    }

    clearListenIDs() {
        this.listenIDToUsernameMap.clear();
        this.usernameToListenIDMap.clear();
    }

    addListenID(listenID, username) {
        this.listenIDToUsernameMap.set(listenID, username);
        this.usernameToListenIDMap.set(username, listenID);
    }

    start() {
        if (!this.autohost.rules.max_apm) return;

        console.log("Starting APM calculator");

        this.ready = true;

        this.multiplier = this.autohost.ribbon.room.settings.game.options.garbagemultiplier;
        this.max = this.autohost.rules.max_apm; // the max apm
        this.startTime = Date.now();

        this.apmMap.clear();
    }

    addGarbageIGE(sender, attack) {
        if (!this.ready) return;

        const listenID = this.usernameToListenIDMap.get(sender);

        let apm = this.apmMap.has(listenID) ? this.apmMap.get(listenID) : 0;
        apm += attack;
        this.apmMap.set(listenID, apm);
    }

    die(listenID) {
        if (!this.ready) return;

        const duration = Date.now() - this.startTime;

        // don't punish players for short games
        if (duration < 15000) return;

        const attack = this.apmMap.get(listenID);
        const normalisedAPM = Math.floor(((attack/duration) * 1000 * 60) / this.multiplier * 10) / 10;

        const username = this.listenIDToUsernameMap.get(listenID);

        if (normalisedAPM > this.max) {
            this.banned.add(username);
            this.autohost.sendMessage(username, `You exceeded this room's APM limit throughout the game, and as such can no longer play in this room.`);
            if (this.autohost.persist) {
                pushMessage("User " + username + " exceeded the APM limit in a persist lobby. Room: " + this.autohost.ribbon.room.id + ", APM: " + normalisedAPM + ", limit: " + this.max);
            }
        }
    }

    stop() {
        this.ready = false;
    }
}

module.exports = APMCalculator;