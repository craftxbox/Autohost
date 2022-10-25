const {APM_LIMIT_EXEMPTIONS} = require("../data/enums");

module.exports = [
    {
        id: "rank_cap_ss",
        name: "RANK SS AND BELOW ONLY [CRAFTXBOT]",
        code: (process.env.NODE_ENV || "").toLowerCase() === "production" ? "AUTOHOSTSS" : "AHDEVSS",
        config: [{
            index: "meta.bgm",
            value: "RANDOMbattle"
        },{
            index: "meta.userRankLimit",
            value: "SS"
        }, {
            index: "meta.allowUnranked",
            value: false
        }],
        options: {
            rules: {
                anons_allowed: false,
                unrated_allowed: false,
                rankless_allowed: false,
                max_rank: "ss"
            },
            smurfProtection: true,
            motdID: "persist",
            apmLimitExemption: APM_LIMIT_EXEMPTIONS.RANKED,
            autostart: 10
        }
    },
    {
        id: "rank_cap_s",
        name: "RANK S AND BELOW ONLY [CRAFTXBOT]",
        code: (process.env.NODE_ENV || "").toLowerCase() === "production" ? "AUTOHOSTS" : "AHDEVS",
        config: [{
            index: "meta.bgm",
            value: "RANDOMbattle"
        },{
            index: "meta.userRankLimit",
            value: "S"
        }, {
            index: "meta.allowUnranked",
            value: false
        }],
        options: {
            rules: {
                anons_allowed: false,
                unrated_allowed: false,
                rankless_allowed: false,
                max_rank: "s",
            },
            smurfProtection: true,
            motdID: "persist",
            apmLimitExemption: APM_LIMIT_EXEMPTIONS.RANKED,
            autostart: 10
        }
    },
    {
        id: "rank_cap_bplus",
        name: "NOOB ROOM [CRAFTXBOT]",
        code: (process.env.NODE_ENV || "").toLowerCase() === "production" ? "AUTOHOSTBPLUS" : "AHDEVBPLUS",
        config: [{
            index: "meta.bgm",
            value: "RANDOMbattle"
        },{
            index: "meta.userRankLimit",
            value: "b+"
        }, {
            index: "meta.allowUnranked",
            value: false
        }],
        options: {
            rules: {
                anons_allowed: false,
                unrated_allowed: false,
                rankless_allowed: false,
                max_rank: "b+",
            },
            smurfProtection: true,
            motdID: "persist",
            apmLimitExemption: APM_LIMIT_EXEMPTIONS.RANKED,
            autostart: 10
        }
    }
];
