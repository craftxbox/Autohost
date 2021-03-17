const fetch = require("node-fetch");

const API_BASE = "https://tetr.io/api/";

async function get(url) {
    return await (await fetch(API_BASE + url, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + process.env.TOKEN
        }
    })).json();
}

async function getUser(id) {
    const user = await get("users/" + id);

    if (user.success) {
        return user.user;
    } else {
        return undefined;
    }
}

module.exports = {getUser};