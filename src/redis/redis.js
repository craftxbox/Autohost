const redis = require("redis");

const client = redis.createClient({host:"192.168.0.8",password:"whileseventeenthirtysevencanbeprettyfunnythefunnynumberisarguablysixtynine"});

function getLobby(id) {
    return new Promise((resolve, reject) => {
        client.hget("lobbysettings", id, (err, res) => {
            if (err) return reject(err);

            if (res) {
                resolve(JSON.parse(res));
            } else {
                resolve(null);
            }
        });
    });
}

function setLobby(id, settings) {
    return new Promise((resolve, reject) => {
        client.hset("lobbysettings", id, JSON.stringify(settings), err => {
            if (err) return reject(err);
            resolve();
        });
    });
}

function deleteLobby(id) {
    return new Promise((resolve, reject) => {
        client.hdel("lobbysettings", id, err => {
            if (err) return reject(err);
            resolve();
        });
    });
}

function getAllLobbies() {
    return new Promise((resolve, reject) => {
        client.hkeys("lobbysettings", (err, res) => {
            if (err) return reject(err);

            if (res) {
                resolve(res);
            } else {
                resolve(new Map());
            }
        });
    });
}

function getMOTD() {
    return new Promise(resolve => {
        client.get("motd", (err, res) => {
            if (err) {
                resolve(undefined);
            } else {
                resolve(res);
            }
        })
    });
}

function setMOTD(motd) {
    return new Promise((resolve, reject) => {
        client.set("motd", motd, err => {
            if (err) return reject(err);
            resolve();
        })
    });
}

function getForcedPlayCount() {
    return new Promise(resolve => {
        client.get("forced_play_count", (err, res) => {
            if (err) {
                resolve(0);
            } else {
                resolve(res);
            }
        })
    });
}

function incrementForcedPlayCount() {
    return new Promise((resolve, reject) => {
        client.incr("forced_play_count", err => {
            if (err) return reject(err);
            resolve();
        })
    });
}

module.exports = {getLobby, setLobby, deleteLobby, getAllLobbies, getMOTD, setMOTD, getForcedPlayCount, incrementForcedPlayCount};
