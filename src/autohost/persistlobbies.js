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
    ah.motd_ineligible = "Welcome, $PLAYER. $REASON. Feel free to spectate, however please be respectful while doing so.";
    ah.motd = "Welcome, $PLAYER. This room starts automatically - please wait for the next game.";
    ah.motd_empty_ineligible = "Welcome, $PLAYER. $REASON.";

    ah.rules.unrated_allowed = true;
    ah.rules.rankless_allowed = true;
    ah.rules.anons_allowed = false;
    ah.rules.max_rank = "s";
    ah.rules.max_apm = 55;

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
    ah.motd_ineligible = "Welcome, $PLAYER. $REASON. Feel free to spectate, however please be respectful while doing so.";
    ah.motd = "Welcome, $PLAYER. This room starts automatically - please wait for the next game.";
    ah.motd_empty_ineligible = "Welcome, $PLAYER. $REASON.";

    ah.rules.unrated_allowed = true;
    ah.rules.rankless_allowed = true;
    ah.rules.anons_allowed = false;
    ah.rules.max_rank = "ss";
    ah.rules.max_apm = 70;

    ah.autostart = 10;

    ah.emit("configchange");
}

module.exports = {persistLobby_S, persistLobby_SS};