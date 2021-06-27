const {APM_LIMIT_EXEMPTIONS} = require("../data/enums");

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

    ah.apmLimitExemption = APM_LIMIT_EXEMPTIONS.RANKED;

    ah.autostart = 10;
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

    ah.apmLimitExemption = APM_LIMIT_EXEMPTIONS.RANKED;

    ah.autostart = 10;
}

function persistLobby_Bplus(ah) {
    ah.persist = true;

    ah.ribbon.room.setName("B+ AND BELOW ONLY");
    ah.ribbon.room.setRoomID("AUTOHOSTBPLUS");

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
    ah.rules.max_rank = "b+";
    ah.rules.max_apm = 30;

    ah.apmLimitExemption = APM_LIMIT_EXEMPTIONS.RANKED;

    ah.autostart = 10;
}

module.exports = {persistLobby_Bplus, persistLobby_S, persistLobby_SS};