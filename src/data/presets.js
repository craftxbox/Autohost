const PRESET_STRINGS = {
    "default": "meta.userlimit=0;meta.allowAnonymous=1;meta.bgm=RANDOM;meta.match.type=versus;meta.match.ft=1;meta.match.wb=1;game.options.stock=0;game.options.bagtype=7-bag;game.options.spinbonuses=T-spins;game.options.allow180=1;game.options.kickset=SRS+;game.options.allow_harddrop=1;game.options.display_next=1;game.options.display_hold=1;game.options.nextcount=5;game.options.display_shadow=1;game.options.are=0;game.options.lineclear_are=0;game.options.room_handling=0;game.options.room_handling_arr=2;game.options.room_handling_das=10;game.options.room_handling_sdf=6;game.options.g=0.02;game.options.gincrease=0.0025;game.options.gmargin=3600;game.options.garbagemultiplier=1;game.options.garbagemargin=10800;game.options.garbageincrease=0.008;game.options.locktime=30;game.options.garbagespeed=20;game.options.garbagecap=8;game.options.garbagecapincrease=0;game.options.garbagecapmax=40;game.options.manual_allowed=0;game.options.b2bchaining=1;game.options.clutch=1",
    "nes": "game.options.bagtype=classic;game.options.spinbonuses=none;game.options.allow180=0;game.options.kickset=NRS;game.options.allow_harddrop=0;game.options.display_hold=0;game.options.nextcount=1;game.options.display_shadow=0;game.options.are=8;game.options.lineclear_are=18;game.options.room_handling=1;game.options.room_handling_arr=5;game.options.room_handling_das=16;game.options.room_handling_sdf=6;game.options.gincrease=0.0005;game.options.locktime=8;game.options.clutch=0"
};

/*
retrieve CONFIG_TYPES with:

document.querySelectorAll("#room_content_container .room_config_item").forEach(el => {
    CONFIG_TYPES[el.dataset.index] = el.getAttribute("type");
});
 */

const CONFIG_TYPES = {
    "meta.name": null,
    "meta.userlimit": "number",
    "meta.allowAnonymous": "checkbox",
    "meta.bgm": null,
    "meta.match.type": null,
    "meta.match.ft": "number",
    "meta.match.wb": "number",
    "game.options.stock": "number",
    "game.options.bagtype": null,
    "game.options.spinbonuses": null,
    "game.options.allow180": "checkbox",
    "game.options.kickset": null,
    "game.options.allow_harddrop": "checkbox",
    "game.options.display_next": "checkbox",
    "game.options.display_hold": "checkbox",
    "game.options.nextcount": "number",
    "game.options.display_shadow": "checkbox",
    "game.options.are": "number",
    "game.options.lineclear_are": "number",
    "game.options.room_handling": "checkbox",
    "game.options.room_handling_arr": "number",
    "game.options.room_handling_das": "number",
    "game.options.room_handling_sdf": "number",
    "game.options.g": "number",
    "game.options.gincrease": "number",
    "game.options.gmargin": "number",
    "game.options.garbagemultiplier": "number",
    "game.options.garbagemargin": "number",
    "game.options.garbageincrease": "number",
    "game.options.locktime": "number",
    "game.options.garbagespeed": "number",
    "game.options.garbagecap": "number",
    "game.options.garbagecapincrease": "number",
    "game.options.garbagecapmax": "number",
    "game.options.manual_allowed": "checkbox",
    "game.options.b2bchaining": "checkbox",
    "game.options.clutch": "checkbox"
};

const presets = {};

Object.keys(PRESET_STRINGS).forEach(preset => {
    const presetSettings = PRESET_STRINGS[preset].split(";");

    const settings = [];

    presetSettings.forEach(setting => {
        let [index, value] = setting.trim().split("=");

        if (CONFIG_TYPES[index] === "checkbox") {
            value = !(value === "false" || value === "0");
        }

        settings.push({
            index, value
        });
    });

    presets[preset] = settings;
});

module.exports = presets;