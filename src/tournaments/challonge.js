const fetch = require("node-fetch");

function parseDescriptionMeta(description) {
    const startPos = description.indexOf("{");
    const endPos = description.lastIndexOf("}");
    const json = description.substring(startPos, endPos);
    return JSON.parse(json);
}

async function createTournament(host, name, shortname, description, type, ft, wb) {
    const params = new URLSearchParams();

    const descriptionMeta = JSON.stringify({host, name, shortname, description, ft, wb});

    params.set("api_key", process.env.CHALLONGE_KEY);
    params.set("tournament[name]", name);
    params.set("tournament[description]", "DO NOT MODIFY THIS DESCRIPTION DIRECTLY! " + descriptionMeta);
    params.set("tournament[type]", type);
    params.set("tournament[open_signup]", "false");

    const response = await fetch(`https://api.challonge.com/v1/tournaments.json`, {
        method: "POST",
        body: params
    });

    const tournament = (await response.json()).tournament;

    if (!tournament) {
        throw new Error("could not create tournament, contact the developer");
    }

    return {
        id: tournament.id,
        name,
        shortname,
        description,
        ft,
        wb
    };
}

async function createParticipant(tournament, name, id, tr, seed) {
    const params = new URLSearchParams();
    params.set("api_key", process.env.CHALLONGE_KEY);
    params.set("participant[name]", name);
    params.set("participant[seed]", seed);
    params.set("participant[misc]", JSON.stringify({id, tr}));


    const response = await fetch(`https://api.challonge.com/v1/tournaments/${tournament}/participants.json`, {
        method: "POST",
        body: params
    });

    const participant = (await response.json()).participant;

    if (!participant) {
        throw new Error("could not create participant, contact staff");
    }

    return {
        id: participant.id,
        name: name,
        user_id: id,
        tr: tr,
        seed: participant.seed
    };
}

async function getMatchesForParticipant(tournament, participant) {
    const response = await fetch(`https://api.challonge.com/v1/tournaments/${tournament}/matches.json?api_key=${process.env.CHALLONGE_KEY}&participant_id=${participant}`);

    return (await response.json()).map(match => match.match);
}

async function getMatch(tournament, match) {
    const response = await fetch(`https://api.challonge.com/v1/tournaments/${tournament}/matches/${match}.json?api_key=${process.env.CHALLONGE_KEY}`);

    return (await response.json()).match;
}

async function getParticipantIDByTetrioID(tournament, uid) {
    const response = await fetch(`https://api.challonge.com/v1/tournaments/${tournament}/participants.json`);

    const participants = await response.json();

    return participants.find(participant => {
       const misc = JSON.parse(participant.misc);
       return misc.id === uid;
    });
}

async function getParticipant(tournament, id) {
    const response = await fetch(`https://api.challonge.com/v1/tournaments/${tournament}/participants/${id}.json?api_key=${process.env.CHALLONGE_KEY}`);

    const participant = (await response.json()).participant;

    if (!participant) {
        throw new Error("could not find participant, contact staff");
    }

    const misc = JSON.parse(participant.misc);

    return {
        id: participant.id,
        name: participant.name,
        user_id: misc.id,
        tr: misc.tr,
        seed: participant.seed
    };
}

async function reportScores(tournament, match, player1score, player2score, winnerID) {
    const params = new URLSearchParams();
    params.set("api_key", process.env.CHALLONGE_KEY);
    params.set("match[scores_csv]", player1score + "-" + player2score);
    params.set("match[winner_id", winnerID);


    const response = await fetch(`https://api.challonge.com/v1/tournaments/${tournament}/matches/${match}.json`, {
        method: "PUT",
        body: params
    });

    return await response.json();
}

async function markUnderway(tournament, match) {
    const response = await fetch(`https://api.challonge.com/v1/tournaments/${tournament}/matches/${match}/mark_as_underway.json?api_key=${process.env.CHALLONGE_KEY}`, {
        method: "POST"
    });

    return await response.json();
}

module.exports = {
    createTournament,
    createParticipant,
    getMatchesForParticipant,
    getParticipantIDByTetrioID,
    getMatch,
    getParticipant,
    reportScores,
    markUnderway,
    parseDescriptionMeta
};
