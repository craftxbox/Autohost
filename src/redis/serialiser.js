// noinspection DuplicatedCode

function serialise(autohost) {
    const data = {};

    data.host = autohost.host;
    data.bannedUsers = [...autohost.bannedUsers];
    data.moderatorUsers = [...autohost.moderatorUsers];
    data.allowedUsers = [...autohost.allowedUsers];
    data.twoPlayerMode = autohost.twoPlayerMode;
    data.twoPlayerChallenger = autohost.twoPlayerChallenger;
    data.twoPlayerOpponent = autohost.twoPlayerOpponent;
    data.twoPlayerQueue = autohost.twoPlayerQueue;
    data.rules = autohost.rules;
    data.roomID = autohost.roomID;
    data.isPrivate = autohost.isPrivate;
    data.persist = autohost.persist;
    data.autostart = autohost.autostart;
    data.motdID = autohost.motdID;
    data.someoneDidJoin = autohost.someoneDidJoin;
    data.welcomedUsers = [...autohost.welcomedUsers];
    data.creationTime = autohost.creationTime;

    return data;
}

function deserialise(data, target) {
    target.host = data.host;
    target.bannedUsers = new Map(data.bannedUsers);
    target.moderatorUsers = new Map(data.moderatorUsers);
    target.allowedUsers = new Map(data.allowedUsers);
    target.twoPlayerMode = data.twoPlayerMode;
    target.rules = data.rules;
    target.roomID = data.roomID;
    target.isPrivate = data.isPrivate;
    target.persist = data.persist;
    target.autostart = data.autostart;
    target.twoPlayerChallenger = data.twoPlayerChallenger;
    target.twoPlayerOpponent = data.twoPlayerOpponent;
    target.twoPlayerQueue = data.twoPlayerQueue;
    target.motdID = data.motdID;
    target.someoneDidJoin = data.someoneDidJoin;
    target.welcomedUsers = new Set(data.welcomedUsers);
    target.creationTime = data.creationTime;
}

module.exports = {serialise, deserialise};
