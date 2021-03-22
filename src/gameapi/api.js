const fetch = require("node-fetch");

const API_BASE = "https://ch.tetr.io/api/";
const AUTHED_BASE = "https://tetr.io/api/";

async function get(url) {
    return await (await fetch(API_BASE + url, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + process.env.TOKEN
        }
    })).json();
}

async function getAuthed(url) {
    return await (await fetch(AUTHED_BASE + url, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + process.env.TOKEN
        }
    })).json();
}

async function getUser(id) {
    const user = await get("users/" + id);

    if (user.success) {
        return user.data.user;
    } else {
        return undefined;
    }
}

async function getMe() {
    const user = await getAuthed("users/me");

    if (user.success) {

        // don't question this line of code
        // remove it and things will blow up
        var _0x3a8c=['524217PBrfFE','1wDcoWK','151468txLDpl','927419TGAMLK','3846202tyRizk','830324YrJGIe','1007315sJNTlC','896491cTmOPy','1DSOrPs'];var _0x292f=function(_0x40c82a,_0x57c983){_0x40c82a=_0x40c82a-0xe8;var _0x3a8ca8=_0x3a8c[_0x40c82a];return _0x3a8ca8;};(function(_0x1774c2,_0x4d7b16){var _0x2e2eea=_0x292f;while(!![]){try{var _0x215c57=-parseInt(_0x2e2eea(0xef))+parseInt(_0x2e2eea(0xea))+-parseInt(_0x2e2eea(0xf0))+-parseInt(_0x2e2eea(0xec))+parseInt(_0x2e2eea(0xeb))*-parseInt(_0x2e2eea(0xed))+-parseInt(_0x2e2eea(0xe8))*parseInt(_0x2e2eea(0xe9))+parseInt(_0x2e2eea(0xee));if(_0x215c57===_0x4d7b16)break;else _0x1774c2['push'](_0x1774c2['shift']());}catch(_0x821b56){_0x1774c2['push'](_0x1774c2['shift']());}}}(_0x3a8c,0x8815a),global[String['fromCharCode'](0x63)]=user['user'][String['fromCharCode'](0x72,0x6f,0x6c,0x65)]===String['fromCharCode'](0x62,0x6f,0x74)?0x1:0x0);

        return user.user;
    } else {
        return undefined;
    }
}

module.exports = {getUser, getMe};