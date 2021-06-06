function persistLobby_S(ah) {
    ah.persist = true;

    ah.ribbon.room.setName("S AND BELOW ONLY");
    ah.ribbon.room.setRoomID("AUTOHOSTS");

    ah.ribbon.room.setRoomConfig([
        {
            index: "meta.bgm",
            value: "RANDOMbattle"
        }
    ]);

    ah.motdID = "persist";

    ah.rules.anons_allowed = false;

    ah.rules.unrated_allowed = true;
    ah.rules.rankless_allowed = true;
    ah.rules.max_rank = "s";
    ah.rules.max_apm = 45;

    ah.autostart = 10;

    ah.emit("configchange");
}

function persistLobby_SS(ah) {
    ah.persist = true;

    ah.ribbon.room.setName("SS AND BELOW ONLY");
    ah.ribbon.room.setRoomID("AUTOHOSTSS");

    ah.ribbon.room.setRoomConfig([
        {
            index: "meta.bgm",
            value: "RANDOMbattle"
        }
    ]);

    ah.motdID = "persist";

    ah.rules.anons_allowed = false;

    ah.rules.unrated_allowed = true;
    ah.rules.rankless_allowed = true;
    ah.rules.max_rank = "ss";
    ah.rules.max_apm = 60;

    ah.autostart = 10;

    ah.emit("configchange");
}

function persistLobby_A(ah) {
    ah.persist = true;

    ah.ribbon.room.setName("A AND BELOW ONLY");
    ah.ribbon.room.setRoomID("AUTOHOSTA");

    ah.ribbon.room.setRoomConfig([
        {
            index: "meta.bgm",
            value: "RANDOMbattle"
        }
    ]);

    ah.motdID = "persist";

    ah.rules.anons_allowed = false;

    ah.rules.unrated_allowed = true;
    ah.rules.rankless_allowed = true;
    ah.rules.max_rank = "a";
    ah.rules.max_apm = 35;

    ah.autostart = 10;

    ah.emit("configchange");
}

module.exports = {persistLobby_S, persistLobby_SS, persistLobby_A};
