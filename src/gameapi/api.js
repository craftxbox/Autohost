const fetch = require("node-fetch");
const { logMessage, LOG_LEVELS } = require("../log");
const { getCachedAPIResponse, storeCachedAPIResponse } = require("../redis/redis");

const API_BASE = "https://ch.tetr.io/api/";
const AUTHED_BASE = "https://tetr.io/api/";
const UA = "Autohost/" + require("../../package.json").version + " (zudo@kagar.in)";

function log(message) {
    logMessage(LOG_LEVELS.FINE, "GameAPI", message);
}

async function get(url) {
    return await (await fetch(encodeURI(API_BASE + url), {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + process.env.TOKEN,
            "User-Agent": UA,
            "Accept": "application/json"
        }
    })).json();
}

async function getSpool(spool, url) {
    let response = await (await fetch(encodeURI("https://" + spool + "/spool"), {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + process.env.TOKEN,
            "User-Agent": UA,
            "Accept": "application/json"
        }
    })).arrayBuffer()
    response = new Uint8Array(response)
    let despool = {
        version: response[0],
        load1: response[2],
        load5: response[3],
        load15: response[4],
        isOnline: ((response[1] & 0b10000000) >> 7) == 1,
        avoidDueToHighLoad: ((response[1] & 0b01000000) >> 6) == 1,
        recentlyRestarted: ((response[1] & 0b00100000) >> 5) == 1,
        reserved1: ((response[1] & 0b00010000) >> 4) == 1,
        reserved2: ((response[1] & 0b00001000) >> 3) == 1,
        reserved3: ((response[1] & 0b00000100) >> 2) == 1,
        reserved4: ((response[1] & 0b00000010) >> 1) == 1,
        reserved5: ((response[1] & 0b00000001) >> 0) == 1,
    };
    return despool;
}

async function getAuthed(url) {
    let resp;
    try {
        resp = await fetch(encodeURI(AUTHED_BASE + url), {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + process.env.TOKEN,
                "User-Agent": UA,
                "Accept": "application/json"
            }
        })
        resp = await resp.text()
        return JSON.parse(resp);
    } catch (e) {
        logMessage(LOG_LEVELS.ERROR, "GameAPI", "Failed to get authed API response", {
            url,
            error: e.message,
            response: resp ? JSON.stringify(resp) : undefined
        });
        console.error(resp?.substring(0,100));
        throw e;
        return null;
    }
}

async function postAuthed(url, body) {
    return await (await fetch(encodeURI(AUTHED_BASE + url), {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + process.env.TOKEN,
            "Content-Type": "application/json",
            "User-Agent": UA
        },
        body: JSON.stringify(body)
    })).json();
}

async function getSpoolToken() {
    log("Retrieving spool token");
    let resp = await getAuthed("server/ribbon")
    if(!resp.spools || !resp.spools.token){
        logMessage(LOG_LEVELS.ERROR, "GameAPI", "Failed to retrieve spool token", resp);
        return null;
    }
    return resp.spools.token;
}

async function getUser(id) {
    if (!id || id.length === 0) return undefined;

    const cachedResponse = await getCachedAPIResponse("users/" + id);

    if (cachedResponse) {
        //log(`Retrieved CACHED user info for ${id}`); 
        return cachedResponse;
    };

    const result = await get("users/" + id);

    if (result.success) {
        log(`Retrieved user info for ${id}`);
        await storeCachedAPIResponse("users/" + id, result.data.user, 600);
        return result.data.user;
    } else {
        return undefined;
    }
}

async function getNews(id) {
    if (!id || id.length === 0) return undefined;

    const cachedResponse = await getCachedAPIResponse("news/user_" + id);

    if (cachedResponse) {
        //log(`Retrieved CACHED news info for ${id}`);
        return cachedResponse;
    };

    const result = await get("news/user_" + id);

    if (result.success) {
        log(`Retrieved news info for ${id}`);
        await storeCachedAPIResponse("news/user_" + id, result.data.news, 600);
        return result.data.news;
    } else {
        return undefined;
    }
}

async function getTLStream(id) {
    if (!id || id.length === 0) return undefined;

    const cachedResponse = await getCachedAPIResponse("streams/league_userrecent_" + id);

    if (cachedResponse) {
        //log(`Retrieved CACHED league stream for ${id}`);
        return cachedResponse;
    };

    const result = await get("streams/league_userrecent_" + id);

    if (result.success) {
        log(`Retrieved league stream for ${id}`);
        await storeCachedAPIResponse("streams/league_userrecent_" + id, result.data.records, 600);
        return result.data.records;
    } else {
        return undefined;
    }
}

async function getMe() {
    const result = await getAuthed("users/me");

    if (result && result.success) {
        log(`Retrieved personal information`);
        return result.user;
    } else {
        return undefined;
    }
}

async function getRibbonVersion() {
    const result = await getAuthed("server/environment");

    if (result.success) {
        log(`Retrieved Ribbon version ${result.signature.commit.id}`);
        return result.signature.commit;
    } else {
        return undefined;
    }
}

async function getRibbonEndpoint() {
    const result = await getAuthed("server/ribbon");

    if (result && result.success) {
        let despool;
        for (var i of result.spools.spools) {
            let spool = await getSpool(i.host)
            if (spool.isOnline && !spool.avoidDueToHighLoad) {
                despool = i;
                break;
            }
        }
        log(`Retrieved recommended ribbon endpoint: ${despool.host + result.endpoint}`);
        return despool.host + result.endpoint;
    } else {
        throw new Error("Unable to find ribbon endpoint");
    }
}

async function friendUser(user) {
    log(`Friending user ${user}`);
    return await postAuthed("relationships/friend", { user });
}

async function unfriendUser(user) {
    log(`Unfriending user ${user}`);
    return await postAuthed("relationships/remove", { user });
}

async function getLeaderboardSnapshot() {
    return get("users/lists/league/all");
}

module.exports = { getUser, getMe, getRibbonVersion, getRibbonEndpoint, friendUser, unfriendUser, getLeaderboardSnapshot, getNews, getTLStream, getSpoolToken };
