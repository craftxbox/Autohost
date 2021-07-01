const challonge = require("../../tournaments/challonge");
const {getUser} = require("../../gameapi/api");
const {Router, json} = require("express");
const {body, validationResult} = require("express-validator");
const {TOURNAMENT_TYPES} = require("../../data/enums");
const auth = require("../auth");

module.exports = function (sessionmanager) {
    const app = Router();

    app.get("/", (req, res) => {
        res.json({"woomy": true});
    });

    app.post("/",
        auth,
        json(),
        body("shortname").isLength({min: 3, max: 16}),
        body("name").isLength({min: 3, max: 60}),
        body("type").isIn(Object.keys(TOURNAMENT_TYPES)),
        body("ft").isInt({min: 1, max: 99}),
        body("wb").isInt({min: 1, max: 99}),
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({errors: errors.array()});
            }

            try {
                const tournament = await challonge.createTournament(req.tetrioID, req.body.name, req.body.shortname, TOURNAMENT_TYPES[req.body.type], req.body.ft, req.body.wb);
                res.json(tournament);
            } catch (e) {
                res.status(500).json({error: e.message});
            }
        });

    app.post("/:tournament/participant", auth, async (req, res) => {
        // todo: seed!
        const user = await getUser(req.tetrioID);

        try {
            const participant = await challonge.createParticipant(req.params.tournament, user.username, user._id, user.league?.rating || 0, 1);
            res.json(participant);
        } catch (e) {
            res.status(500).json({error: e.message});
        }
    });

    // app.get("/:tournament/match", auth, async (req, res) => {
    //
    // });

    app.post("/:tournament/match/:match/lobby", auth, async (req, res) => {
        const match = await challonge.getMatch(req.params.tournament, req.params.match);

        // todo: check participants to ensure we should allow this

        if (!match) {
            res.status(404).json({error: "Match not found, contact staff."});
            return;
        }

        if (match.state !== "open") {
            res.status(403).json({error: "Match pending or already finished, contact staff."});

            return;
        }

        if (match.underway_at) {
            const session = sessionmanager.getSessionByTournamentMatch(req.params.tournament, req.params.match);

            if (session) {
                res.json({code: session.roomID, created: false});
            } else {
                res.status(403).json({error: "Match unavailable, contact staff."});
            }

            return;
        }

        const player1 = await challonge.getParticipant(req.params.tournament, match.player1_id);
        const player2 = await challonge.getParticipant(req.params.tournament, match.player2_id);

        const sessionID = await sessionmanager.createMatchLobby({
            tournamentID: req.params.tournament,
            matchID: req.params.match,
            player1,
            player2,
            round: match.round,
            tournamentShortname: "Test Tournament",
            tournamentName: "Zudo's Test Tournament #1",
            ft: 7,
            wb: 0,
            restoring: false
        });

        const session = sessionmanager.getSession(sessionID);

        await challonge.markUnderway(req.params.tournament, req.params.match);

        res.json({code: session.roomID, created: true});
    });

    return app;
}
