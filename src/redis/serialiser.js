function serialise(autohost) {
    const data = {};

    data.host = autohost.host;
    data.bannedUsers = [...autohost.bannedUsers];
    data.rules = autohost.rules;
    data.roomID = autohost.roomID;
    data.isPrivate = autohost.isPrivate;

    return data;
}

function deserialise(data, target) {
    target.host = data.host;
    target.bannedUsers = new Map(data.bannedUsers);
    target.rules = data.rules;
    target.roomID = data.roomID;
    target.isPrivate = data.isPrivate;
}

module.exports = {serialise, deserialise};