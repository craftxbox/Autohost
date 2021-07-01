const EventEmitter = require("events");
const chalk = require("chalk");
const {reportScores} = require("./challonge");
const {markUnderway} = require("./challonge");

class TournamentAutohost extends EventEmitter {

    constructor({ribbon, tournamentID, matchID, player1, player2, tournamentShortname, tournamentName, ft, wb, round, restoring}) {
        super();

        if (!ribbon.room) {
            throw new Error("Ribbon should be connected to a lobby!");
        }

        this.ribbon = ribbon;

        if (!restoring) {
            this.ribbon.room.setRoomConfig([
                {
                    index: "meta.userlimit",
                    value: "2"
                },
                {
                    index: "meta.name",
                    value: `${tournamentShortname} ROUND ${round} - ${player1.name} VS ${player2.name}`.toUpperCase()
                },
                {
                    index: "meta.match.ft",
                    value: ft.toString()
                },
                {
                    index: "meta.match.wb",
                    value: wb.toString()
                }
            ]);

            this.player1id = player1.user_id;
            this.player2id = player2.user_id;
            this.player1challonge = player1.id;
            this.player2challonge = player2.id;
            this.tournamentID = tournamentID;
            this.matchID = matchID;

            markUnderway(tournamentID, matchID).catch(e => {
                console.warn("failed to mark match as underway", e);
            });
        }

        this.ribbon.on("ah-log", message => {
            this.log("[RIBBON] " + message);
        });

        this.ribbon.on("gmupdate.join", join => {
            if (join._id === this.player1id || join._id === this.player2id) {
                if (this.player1isPresent && this.player2isPresent) {
                    this.ribbon.sendChatMessage(`Welcome to your match lobby, ${join.username.toUpperCase()}. Both players are here - type !ready to ready up, or !warmup if you want to request a one round warmup.`);
                } else {
                    this.ribbon.sendChatMessage(`Welcome to your match lobby, ${join.username.toUpperCase()}. Please wait for your opponent to arrive.`);
                }
                this.ribbon.room.switchPlayerBracket(join._id, "player");
            } else {
                this.ribbon.sendChatMessage(`Welcome, ${join.username.toUpperCase()}. This is a match lobby for ${tournamentName}. Spectators are allowed, however please be respectful.`);
                this.ribbon.room.switchPlayerBracket(join._id, "spectator");
            }
        });

        this.ribbon.on("gmupdate.bracket", update => {
            if (!this.ribbon.room.isHost || update.bracket === "spectator") return;

            if (update.uid !== this.player1id && update.uid !== this.player2id) {
                this.ribbon.room.switchPlayerBracket(update.uid, "spectator");
            }
        });

        this.ribbon.on("endmulti", endstate => {
            const p1score = endstate.leaderboard.find(entry => entry.user._id === this.player1id)?.wins || 0;
            const p2score = endstate.leaderboard.find(entry => entry.user._id === this.player2id)?.wins || 0;

            // todo: check if it's a dc cannon and don't submit otherwise

            let winnerID;
            if (p1score > p2score) {
                winnerID = this.player1challonge;
            } else if (p2score > p1score) {
                winnerID = this.player2challonge;
            } else {
                // cry about it
                throw new Error("what the fuck?");
            }

            reportScores(this.tournamentID, this.matchID, p1score, p2score, winnerID).then(() => {
                this.ribbon.sendChatMessage(`The score has been reported as ${p1score}-${p2score}! :ggs:`);
            });
        });

        this.saveConfig();
    }

    log(message) {
        console.log(chalk.whiteBright(`[TournamentAutohost] [${new Date().toLocaleString()} ${this.roomID} ${this.tournamentID} ${this.matchID}] ${message.replace(/\n/g, "<line break>")}`));
    }

    get player1isPresent() {
        return !!this.ribbon.room.settings.players.find(player => player._id === this.player1id);
    }

    get player2isPresent() {
        return !!this.ribbon.room.settings.players.find(player => player._id === this.player2id);
    }

    get roomID() {
        return this.ribbon.room.settings.id;
    }

    saveConfig() {
        this.emit("configchange");
    }
}

module.exports = TournamentAutohost;
