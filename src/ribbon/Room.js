const EventEmitter = require("events");

class Room extends EventEmitter {

    constructor(ribbon, settings) {
        super();

        this.ribbon = ribbon;
        this.settings = settings;

        this.ingame = false;
        this.isHost = true;

        this.playerBrackets = new Map();

        this.ribbon.on("gmupdate", settings => {
            this.settings = settings;

            this.playerBrackets.clear();

            settings.players.forEach(player => {
                this.playerBrackets.set(player._id, player.bracket);
            });
        });

        this.ribbon.on("gmupdate.join", join => {
            this.playerBrackets.set(join._id, join.bracket);
            this.emit("playersupdate");
        });

        this.ribbon.on("gmupdate.bracket", bracket => {
            this.playerBrackets.set(bracket.uid, bracket.bracket);
            this.emit("playersupdate");
        });

        this.ribbon.on("gmupdate.host", host => {
            this.isHost = host === "6050cb9c39e123c9aebdf320"; // todo: pull from api
        });

        this.ribbon.on("gmupdate.leave", id => {
            this.playerBrackets.delete(id);
            this.emit("playersupdate");
        });


        this.ribbon.on("startmulti", () => {
            this.ingame = true;
        });

        this.ribbon.on("endmulti", () => {
            this.ingame = false;
        });
    }

    get id() {
        return this.settings.id;
    }

    get players() {
        return [...this.playerBrackets].filter(bracket => bracket[1] === "player").map(bracket => bracket[0]);
    }

    get spectators() {
        return [...this.playerBrackets].filter(bracket => bracket[1] === "spectator").map(bracket => bracket[0]);
    }

    setRoomConfig(data) {
        return new Promise((resolve, reject) => {
            this.ribbon.once("gmupdate", update => {
                resolve(update);
            });

            this.ribbon.sendMessage({
                command: "updateconfig",
                data
            });
        });
    }

    setName(name) {
        return this.setRoomConfig([
            {
                index: "meta.name",
                value: name
            }
        ]);
    }

    switchPlayerBracket(player, bracket) {
        this.ribbon.sendMessage({
            command: "switchbrackethost",
            data: {
                uid: player,
                bracket
            }
        });
    }

    kickPlayer(player) {
        this.ribbon.sendMessage({command: "kick", data: player});
    }

    transferOwnership(player) {
        this.isHost = false;
        this.ribbon.sendMessage({command: "transferownership", data: player});
    }

    takeOwnership() {
        return new Promise((resolve, reject) => {
            this.ribbon.once("joinroom", settings => {
                resolve();
            });
            setTimeout(() => {
                reject();
            }, 5000);
            this.ribbon.sendMessage({command: "takeownership"});
        });
    }

    start() {
        this.ribbon.sendMessage({command: "startroom"});
    }
}

module.exports = Room;