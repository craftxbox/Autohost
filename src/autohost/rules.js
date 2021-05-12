const RANK_HIERARCHY = ["d", "d+", "c-", "c", "c+", "b-", "b", "b+", "a-", "a", "a+", "s-", "s", "s+", "ss", "u", "x"];

function xpToLevel(xp) {
    return Math.pow(xp / 500, 0.6) + (xp / (5000 + Math.max(0, xp - 4000000) / 5000)) + 1;
}

const RULES = {
    anons_allowed: {
        type: Boolean,
        default: true,
        check(value, user) {
            // check: option set AND user is anon
            return !value && user.role === "anon";
        },
        message() {
            return "Unregistered (anonymous / guest) players cannot play in this room";
        },
        description(value) {
            return `Anonymous players allowed: ${value ? ":checked:" : ":crossed:"}`;
        }
    },
    unrated_allowed: {
        type: Boolean,
        default: true,
        check(value, user) {
            // check: unrated NOT allowed AND *percentile* rank is unranked
            return !value && user.league.percentile_rank === "z"
        },
        message() {
            return "Players who have not completed their Tetra League rating games cannot play in this room";
        },
        description(value) {
            return `Unrated players allowed: ${value ? ":checked:" : ":crossed:"}`;
        }
    },
    rankless_allowed: {
        type: Boolean,
        default: true,
        check(value, user) {
            // check: rankless NOT allowed AND rank is unranked
            return !value && user.league.rank === "z"
        },
        message() {
            return "Players without a rank letter cannot play in this room";
        },
        description(value) {
            return `Rankless players allowed: ${value ? ":checked:" : ":crossed:"}`;
        }
    },
    max_rank: {
        type: RANK_HIERARCHY,
        default: "z",
        check(value, user) {
            // check: option set AND user has a TR AND percentile rank > max
            return value !== "z" && user.league.percentile_rank !== "z" && RANK_HIERARCHY.indexOf(user.league.percentile_rank) > RANK_HIERARCHY.indexOf(value)
        },
        message(value) {
            return `Your TR is too high for this room (maximum is around :rank${value.replace("+", "plus").replace("-", "minus")}:)`
        },
        description(value) {
            if (value === "z") {
                return "Maximum rank: none";
            } else {
                return `Maximum rank: :rank${value.replace("+", "plus").replace("-", "minus")}:`;
            }
        }
    },
    min_rank: {
        type: RANK_HIERARCHY,
        default: "z",
        check(value, user) {
            // check: option set AND user has a TR AND percentile rank < min
            return value !== "z" && user.league.percentile_rank !== "z" && RANK_HIERARCHY.indexOf(user.league.percentile_rank) < RANK_HIERARCHY.indexOf(value)
        },
        message(value) {
            return `Your TR is too low for this room (minimum is around :rank${value.replace("+", "plus").replace("-", "minus")}:)`
        },
        description(value) {
            if (value === "z") {
                return "Minimum rank: none";
            } else {
                return `Minimum rank: :rank${value.replace("+", "plus").replace("-", "minus")}:`;
            }
        }
    },
    min_level: {
        type: Number,
        default: 0,
        check(value, user) {
            // check: option set AND level < min
            return value !== 0 && xpToLevel(user.xp) < value;
        },
        message(value) {
            return `Your level is too low for this room (minimum is ${value})`
        },
        description(value) {
            return `Minimum level: ${value}`;
        }
    },
    max_apm: {
        type: Number,
        default: 0,
        check(value, user, autohost) {
            return autohost.apmCalculator.banned.has(user._id);
        },
        message() {
            return `You cannot play as you have been consistently exceeding the room's APM limit`;
        },
        description(value) {
            return `Maximum APM: ${value !== 0 ? value : "no limit"}`;
        }
    }
};

function checkAll(ruleset, user, autohost) {
    for (const rule in RULES) {
        if (RULES.hasOwnProperty(rule)) {
            // default is a reserved keyword lol
            const {check, message, default: defaultValue} = RULES[rule];

            let value;

            if (ruleset.hasOwnProperty(rule)) {
                value = ruleset[rule];
            } else {
                value = defaultValue;
            }

            if (check(value, user, autohost)) {
                return message(value, user);
            }
        }
    }

    return undefined;
}

module.exports = {checkAll, RULES};