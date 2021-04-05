const fetch = require("node-fetch");

const API_BASE = "https://ch.tetr.io/api/";
const AUTHED_BASE = "https://tetr.io/api/";

async function get(url) {
    return await (await fetch(API_BASE + url, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + process.env.TOKEN
        }
    })).json();
}

async function getAuthed(url) {
    return await (await fetch(AUTHED_BASE + url, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + process.env.TOKEN
        }
    })).json();
}

async function getUser(id) {
    const result = await get("users/" + id);

    if (result.success) {
        return result.data.user;
    } else {
        return undefined;
    }
}

async function getMe() {
    const result = await getAuthed("users/me");

    if (result && result.success) {
        return result.user;
    } else {
        return undefined;
    }
}

async function getRibbonEndpoint() {
    const result = await getAuthed("server/ribbon");

    if (result && result.success) {
        return result.endpoint;
    } else {
        throw new Error("Unable to find ribbon endpoint");
    }
}

module.exports = {getUser, getMe, getRibbonEndpoint};