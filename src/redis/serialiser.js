function serialise(autohost) {
    const data = {};

    data.host = autohost.host;
    data.bannedUsers = [...autohost.bannedUsers];
    data.moderatorUsers = [...autohost.moderatorUsers];
    data.twoPlayerChallenger = autohost.twoPlayerChallenger;
    data.twoPlayerOpponent = autohost.twoPlayerOpponent;
    data.twoPlayerQueue = autohost.twoPlayerQueue;
    data.rules = autohost.rules;
    data.roomID = autohost.roomID;
    data.isPrivate = autohost.isPrivate;
    data.persist = autohost.persist;
    data.autostart = autohost.autostart;

    return data;
}

function deserialise(data, target) {
    target.host = data.host;
    target.bannedUsers = new Map(data.bannedUsers);
    target.moderatorUsers = new Map(data.moderatorUsers);
    target.rules = data.rules;
    target.roomID = data.roomID;
    target.isPrivate = data.isPrivate;
    target.persist = data.persist;
    target.autostart = data.autostart;
    target.twoPlayerChallenger = data.twoPlayerChallenger;
    target.twoPlayerOpponent = data.twoPlayerOpponent;
    target.twoPlayerQueue = data.twoPlayerQueue;
}

module.exports = {serialise, deserialise};