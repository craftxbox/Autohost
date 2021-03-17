const Ribbon = require("./ribbon/Ribbon");
const Autohost = require("./autohost/Autohost");

if (!process.env.TOKEN) {
    console.log("Please specify a TETR.IO bot token in the TOKEN environment variable.");
    console.log("Don't have one? Ask osk.");
    process.exit(1);
}

const botMain = new Ribbon(process.env.TOKEN);

const sessions = new Map();

botMain.on("ready", () => {
    console.log("Logged in.");
    botMain.sendMessage({
        command: "social.presence",
        data: {
            status: "online"
        }
    });
});

botMain.on("social.dm", message => {
    const msg = message.data.content.trim();
    const user = message.data.user;

    if (msg === "private" || msg === "public") {
        if (sessions.has(user)) {
            botMain.sendDM(user, "You already have a room open.");
            return;
        }

        const ribbon = new Ribbon(process.env.TOKEN);
        const ah = new Autohost(ribbon, user, msg === "private");

        ah.on("created", room => {
            botMain.sendDM(user, `Room created! Join room #${room}`);
            ah.ribbon.socialInvite(user);
        });

        sessions.set(user, ah);
    }
});

process.on("SIGINT", () => {
    console.log("Shutting down!");

    botMain.disconnectGracefully();
    sessions.forEach(session => {
        if (session.ribbon) {
            session.ribbon.disconnectGracefully();
        }
    });

    process.exit(0);
});