// noinspection DuplicatedCode

const FIELDS = ["host", "bannedUsers", "moderatorUsers", "allowedUsers", "twoPlayerMode", "twoPlayerChallenger", "twoPlayerOpponent", "twoPlayerQueue", "rules", "roomID", "isPrivate", "persist", "autostart", "persist", "motdID", "someoneDidJoin", "welcomedUsers", "creationTime"];

function serialise(autohost) {
    const data = {};

    FIELDS.forEach(field => {
        if (autohost[field] instanceof Map || autohost[field] instanceof Set) {
            data[field] = [...autohost[field]];
        } else {
            data[field] = autohost[field];
        }
    });


    return data;
}

function deserialise(data, target) {
    FIELDS.forEach(field => {
        if (target[field] instanceof Map) {
            target[field] = new Map(data[field]);
        } else if (target[field] instanceof Set) {
            target[field] = new Set(data[field]);
        } else {
            target[field] = data[field];
        }
    })
}

module.exports = {serialise, deserialise};
