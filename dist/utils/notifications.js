"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotifications = void 0;
exports.bulkSendFrameNotification = bulkSendFrameNotification;
const db_1 = require("./db");
function splitArrayIntoChunks(tokenArray, maxChunkSize = 100) {
    const result = [];
    for (let i = 0; i < tokenArray.length; i += maxChunkSize) {
        const chunk = tokenArray.slice(i, i + maxChunkSize);
        result.push(chunk);
    }
    return result;
}
async function bulkSendFrameNotification({ url, tokens, title, body, postUrl }) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            notificationId: crypto.randomUUID(),
            title,
            body,
            targetUrl: postUrl,
            tokens: tokens,
        }),
    });
    const responseJson = await response.json();
    if (response.status === 200) {
        return { state: "success" };
    }
    else {
        return { state: "error", error: responseJson };
    }
}
const sendNotifications = async (title, body, url) => {
    try {
        const notifDetails = await (0, db_1.getNotifcationDetailsForAllPlayers)();
        const urlToUse = "https://farma.pingem.xyz:443/api/v2/notification/6ssaw"; //notifDetails && notifDetails[0] ? notifDetails[0].notification_url : "";
        const notificationTokens = notifDetails
            ? notifDetails.map((n) => n.fid)
            : [];
        if (notificationTokens.length > 100) {
            const notifChunks = splitArrayIntoChunks(notificationTokens);
            for (const chunk of notifChunks) {
                //  Send notifications to all
                console.log("Chunk of users");
                console.log(chunk);
                await bulkSendFrameNotification({
                    url: urlToUse,
                    tokens: chunk,
                    title: title,
                    body: body,
                    postUrl: url
                });
            }
        }
        else {
            console.log("Fewer than 100 users");
            console.log(notificationTokens);
            await bulkSendFrameNotification({
                url: urlToUse,
                tokens: notificationTokens,
                title: title,
                body: body,
                postUrl: url
            });
        }
    }
    catch (error) {
        console.log(error);
        throw error;
    }
};
exports.sendNotifications = sendNotifications;
