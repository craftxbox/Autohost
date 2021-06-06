const {isDeveloper} = require("../data/developers");

async function defaultMOTD(autohost, userID, username, ruleID, ineligibleMessage) {
    let message;

    if (userID === autohost.host) {
        message = `Welcome to your room, ${username.toUpperCase()}!
                    
- Use !setrule to change the rules for this room.
- Use !preset to enable special rulesets.
- Use !autostart to allow the room to start automatically.
- Use !hostmode to become the host, to adjust room settings.
- Need more? Use !commands for a full list of commands. 

When you're ready to start, type !start.`
    } else {
        if (ineligibleMessage) {
            message = `Welcome, ${username.toUpperCase()}. ${ineligibleMessage} - however, feel free to spectate.`;
        } else {
            if (autohost.twoPlayerOpponent) {
                const opponent = await autohost.getPlayerData(autohost.twoPlayerOpponent);
                message = `Welcome, ${username.toUpperCase()}. Type !queue to join the 1v1 queue against ${opponent.username.toUpperCase()}`;
            } else {
                if (autohost.ribbon.room.ingame) {
                    message = `Welcome, ${username.toUpperCase()}. There is currently a game in progress - please wait for the next game to start.`;
                } else {
                    message = `Welcome, ${username.toUpperCase()}.`;
                }
            }
        }
    }

    if (isDeveloper(userID)) {
        message += " :serikasip:";
    }

    return message;
}

async function persist(autohost, userID, username, ruleID, ineligibleMessage) {
    let message;

    if (ruleID) {
        if (ruleID === "anons_allowed") {
            message = `Welcome, ${username.toUpperCase()}. If you wish to play in this lobby, please join again on a registered TETR.IO account - this helps us stop smurfs from ruining the game. Thanks for understanding!`;
        } else {
            message = `Welcome, ${username.toUpperCase()}. ${ineligibleMessage}.`
        }
    } else {
        if (autohost.ribbon.room.ingame) {
            message = `Welcome, ${username.toUpperCase()}. This room starts automatically - please wait for the next game!`;
        } else {
            message = `Welcome, ${username.toUpperCase()}. The game is about to start, good luck!`;
        }
    }

    if (isDeveloper(userID)) {
        message += " :serikasip:";
    }

    return message;
}

module.exports = {defaultMOTD, persist};
