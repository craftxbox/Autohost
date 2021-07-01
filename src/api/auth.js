module.exports = function (req, res, next) {
    const id = req.get("dev-tetrio-id"); // todo: this is not security! remove it for prod!
    if (id) {
        req.tetrioID = id;
    } else {
        req.tetrioID = "5e4979d4fad3ca55f6512458"; // zudo
    }

    next();
}
