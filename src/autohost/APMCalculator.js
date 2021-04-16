// how often APM should be checked
// set to 5 seconds
const {isDeveloper} = require("../data/developers");
const APM_INTERVAL = 5000;

class APMCalculator {

    constructor(autohost) {
        this.ready = false;
        this.autohost = autohost;

        this.apmMap = new Map();
        this.infractionsMap = new Map();

        this.banned = new Set();
    }

    start() {
        if (!this.autohost.rules.max_apm) return;

        console.log("Starting APM calculator");

        this.ready = true;

        this.multiplier = this.autohost.ribbon.room.settings.game.options.garbagemultiplier;
        this.max = this.autohost.rules.max_apm; // the max apm

        this.apmMap.clear();
        this.infractionsMap.clear();

        this.checkTimer = setInterval(() => {

            this.apmMap.forEach((attack, sender) => {

                const normalisedAPM = Math.floor(((attack / APM_INTERVAL) * 1000 * 60) / this.multiplier * 10) / 10;

                console.log(`${sender}'s APM over the last interval = ${normalisedAPM}`);

                if (normalisedAPM > this.max) {
                    let infractions = this.infractionsMap.has(sender) ? this.infractionsMap.get(sender) : 0;
                    infractions++;

                    if (infractions === 2) {
                        this.autohost.sendMessage(sender, `You are exceeding this room's APM limit (${this.max} APM) - please respect the lobby rules.`);
                    } else if (infractions === 4) {
                        this.autohost.sendMessage(sender, `Warning: You will be removed if you continue to exceed this room's APM limit (${this.max} APM)`);
                    } else if (infractions === 6) {
                        this.autohost.getPlayerData(sender).then(player => {
                           if (player.role === "administrator" || player.role === "moderator" || isDeveloper(player._id)) {
                               this.autohost.sendMessage(sender, "If you were a regular player, you would have just been kicked for exceeding the APM limit.");
                           } else {
                               this.autohost.ribbon.sendChatMessage(`Kicked ${sender.toUpperCase()} for exceeding the APM limit.`);
                               this.autohost.ribbon.room.kickPlayer(player._id);
                           }
                           this.banned.add(player._id);
                        });
                    }

                    this.infractionsMap.set(sender, infractions);
                }
            });

            this.apmMap.clear();
        }, APM_INTERVAL);
    }

    addGarbageIGE(sender, attack) {
        if (!this.ready) return;

        let apm = this.apmMap.has(sender) ? this.apmMap.get(sender) : 0;
        apm += attack;
        this.apmMap.set(sender, apm);
    }

    stop() {
        this.ready = false;

        clearInterval(this.checkTimer);
    }
}

module.exports = APMCalculator;