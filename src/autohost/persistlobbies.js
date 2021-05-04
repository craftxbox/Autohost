function persistLobby_S(ah) {
    ah.persist = true;

    ah.ribbon.room.setName("S AND BELOW ONLY");
    ah.ribbon.room.setRoomID("NOOBROOM");

    ah.ribbon.room.setRoomConfig([
        {
            index: "meta.bgm",
            value: "RANDOMbattle"
        }
    ]);

    ah.motd_empty = "Welcome, $PLAYER. This room will start automatically when another player joins.";
    ah.motd_ineligible = "Welcome, $PLAYER. This is a room for registered players with rank :rankS: or below to play against others of similar skill. Feel free to spectate, however please be respectful while doing so.";
    ah.motd = "Welcome, $PLAYER. This room starts automatically - please wait for the next game.";
    ah.motd_empty_ineligible = "Welcome, $PLAYER. This is a room for registered players with rank :rankS: or below to play against others of similar skill.";

    ah.rules.unrated_allowed = true;
    ah.rules.rankless_allowed = true;
    ah.rules.anons_allowed = false;
    ah.rules.max_rank = "s";

    ah.autostart = 10;

    ah.emit("configchange");
}

function persistLobby_SS(ah) {
    ah.persist = true;

    ah.ribbon.room.setName("SS AND BELOW ONLY");
    ah.ribbon.room.setRoomID("WOOMY");

    ah.ribbon.room.setRoomConfig([
        {
            index: "meta.bgm",
            value: "RANDOMbattle"
        }
    ]);

    ah.motd_empty = "Welcome, $PLAYER. This room will start automatically when another player joins.";
    ah.motd_ineligible = "Welcome, $PLAYER. This is a room for registered players with rank :rankSS: and below. Feel free to spectate.";
    ah.motd = "Welcome, $PLAYER. This room starts automatically - please wait for the next game.";
    ah.motd_empty_ineligible = "Welcome, $PLAYER. This is a room for registered players with rank :rankSS: and below.";

    ah.rules.unrated_allowed = true;
    ah.rules.rankless_allowed = true;
    ah.rules.anons_allowed = false;
    ah.rules.max_rank = "ss";

    ah.autostart = 10;

    ah.emit("configchange");
}

module.exports = {persistLobby_S, persistLobby_SS};