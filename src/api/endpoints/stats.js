const {Router} = require("express");

module.exports = function (sessionmanager) {
    const app = Router();

    app.get("/", (req, res) => {
        res.json(sessionmanager.getStats());
    });

    return app;
}
