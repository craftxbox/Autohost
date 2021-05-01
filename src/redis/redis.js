const redis = require("redis");

const client = redis.createClient();

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
        client.hgetall("lobbysettings", (err, res) => {
            if (err) return reject(err);

            if (res) {
                resolve(new Map(Object.entries(res).map(entry => [entry[0], JSON.parse(entry[1])])));
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

module.exports = {getLobby, setLobby, deleteLobby, getAllLobbies, getMOTD, setMOTD};