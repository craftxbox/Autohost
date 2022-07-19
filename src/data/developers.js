const DEVELOPERS = [
    "5e4979d4fad3ca55f6512458", // zudo
    "5f765df3197fd83c0768c1a3"  // craftxbox
];

function isDeveloper(user) {
    return DEVELOPERS.indexOf(user) !== -1;
}

module.exports = {isDeveloper};