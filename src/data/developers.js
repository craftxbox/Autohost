const DEVELOPERS = [
    "5e4979d4fad3ca55f6512458" // zudo
];

function isDeveloper(user) {
    return DEVELOPERS.indexOf(user) !== -1;
}

module.exports = {isDeveloper};