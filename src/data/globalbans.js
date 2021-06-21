const fetch = require("node-fetch");

let bans = [];

function loadBans() {
    fetch(process.env.BANS_URL).then(res => res.text()).then(data => {
        bans = [];
        data.split("\n").forEach(line => {
            const [id, type, expires, reason] = line.split("#");

            if (id && type && expires && reason && Date.now() < expires) {
                bans.push({
                    id, type, reason, expires: parseInt(expires)
                });
            }
        });
        console.log("Loaded " + bans.length + " bans.")
    });
}

function getBan(id, types) {
    return bans.find(ban => ban.id === id && types.indexOf(ban.type) !== -1);
}

if (process.env.BANS_URL) {
    loadBans();
    setInterval(() => loadBans(), 60000);
}

module.exports = {getBan};
