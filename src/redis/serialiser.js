const FIELDS = ["host", "bannedUsers", "moderatorUsers", "allowedUsers", "twoPlayerMode", "twoPlayerChallenger", "twoPlayerOpponent", "twoPlayerQueue", "rules", "roomID", "isPrivate", "persist", "autostart", "persist", "motdID", "someoneDidJoin", "welcomedUsers", "creationTime", "persistKey", "apmLimitExemption"];

/**
 * Takes an Autohost instance and converts it to JSON that's safe for sticking in Redis.
 * @param {Autohost} autohost The Autohost instance.
 * @returns {Object} A JSON object.
 */
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

/**
 * Takes a JSON object returned by {@link serialise} and applies the contained settings to an Autohost instance.
 * @param {Object} data The serialised data.
 * @param {Autohost} target The target Autohost instance.
 */
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
