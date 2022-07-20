const {APM_LIMIT_EXEMPTIONS} = require("../data/enums");

module.exports = [
    {
        id: "rank_cap_ss",
        name: "SS AND BELOW ONLY [CRAFTXBOT]",
        code: process.env.NODE_ENV === "production" ? "CRXBHOSTSS" : "AHDEVSS",
        config: [{
            index: "meta.bgm",
            value: "RANDOMbattle"
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
        name: "S AND BELOW ONLY [CRAFTXBOT]",
        code: process.env.NODE_ENV === "production" ? "CRXBHOSTS" : "AHDEVS",
        config: [{
            index: "meta.bgm",
            value: "RANDOMbattle"
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
        name: "B+ AND BELOW ONLY [CRAFTXBOT]",
        code: process.env.NODE_ENV === "production" ? "CRXBHOSTBPLUS" : "AHDEVBPLUS",
        config: [{
            index: "meta.bgm",
            value: "RANDOMbattle"
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
