const express = require("express");
const chalk = require("chalk");

class APIServer {

    constructor(port, sessionmanager) {
        this.app = express();

        this.app.disable("x-powered-by");

        this.app.use((req, res, next) => {
            res.set("Access-Control-Allow-Origin", "*"); // todo: only allow localhost and the live domain
            next();
        });

        this.app.use("/stats", require("./endpoints/stats")(sessionmanager));
        this.app.use("/tournament", require("./endpoints/tournament")(sessionmanager));

        this.app.listen(port, () => {
            this.log(`Now listening on port ${port}`);
        });
    }

    log(message) {
        console.log(chalk.cyanBright(`[APIServer] [${new Date().toLocaleString()}] ${message}`));
    }
}

module.exports = APIServer;
