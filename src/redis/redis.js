const redis = require("redis");

const client = redis.createClient();

function getLobby(user) {
    return new Promise((resolve, reject) => {
        client.hget("lobbysettings", user, (err, res) => {
            if (err) return reject(err);

            if (res) {
                resolve(JSON.parse(res));
            } else {
                resolve(null);
            }
        });
    });
}

function setLobby(user, settings) {
    return new Promise((resolve, reject) => {
        client.hset("lobbysettings", user, JSON.stringify(settings), err => {
            if (err) return reject(err);
            resolve();
        });
    });
}

function deleteLobby(user) {
    return new Promise((resolve, reject) => {
        client.hdel("lobbysettings", user, err => {
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
                resolve(Object.values(res).map(item => JSON.parse(item)));
            } else {
                resolve([]);
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