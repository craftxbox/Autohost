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
    const msg = message.data.content.trim().toLowerCase();
    const user = message.data.user;

    if (msg === "!private" || msg === "!public") {
        if (sessions.has(user)) {
            const ah = sessions.get(user);
            botMain.sendDM(user, `You already have a room open. Join room #${ah.room.id}`);
            ah.ribbon.socialInvite(user);
        } else {
            const ribbon = new Ribbon(process.env.TOKEN);
            const ah = new Autohost(ribbon, user, msg === "!private");

            ah.on("created", room => {
                botMain.sendDM(user, `Room created! Join room #${room}`);
                ah.ribbon.socialInvite(user);
            });

            ah.on("end", () => {
                botMain.sendDM(user, `Your room has been closed because everyone left. Type !private or !public to start a new one.`);
                ah.ribbon.disconnectGracefully();
                sessions.delete(user);
            });

            sessions.set(user, ah);
        }
    } else if (msg.startsWith("!rejoin ") && user === "5e4979d4fad3ca55f6512458") {
        const code = msg.split(" ")[1].trim().toUpperCase();

        console.log(code);

        if (!sessions.has(user)) {
            const ribbon = new Ribbon(process.env.TOKEN);
            const ah = new Autohost(ribbon, user, code);

            ah.on("end", () => {
                botMain.sendDM(user, `Your room has been closed because everyone left. Type !private or !public to start a new one.`);
                ah.ribbon.disconnectGracefully();
                sessions.delete(user);
            });

            sessions.set(user, ah);
        }
    } else {
        botMain.sendDM(user, "Hi there! Type !private to create a private lobby, or !public to create a public lobby.");
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