const fetch = require("node-fetch");

function pushMessage(message) {
    const params = new URLSearchParams();
    params.set("token", process.env.PUSHOVER_API_KEY);
    params.set("user", process.env.PUSHOVER_USER_KEY);
    params.set("message", message);
    return fetch("https://api.pushover.net/1/messages.json", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
    });
}

module.exports = {pushMessage};