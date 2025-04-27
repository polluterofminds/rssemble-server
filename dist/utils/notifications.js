"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotifications = void 0;
exports.bulkSendFrameNotification = bulkSendFrameNotification;
const db_1 = require("./db");
const appUrl = "";
function splitArrayIntoChunks(tokenArray, maxChunkSize = 100) {
    const result = [];
    for (let i = 0; i < tokenArray.length; i += maxChunkSize) {
        const chunk = tokenArray.slice(i, i + maxChunkSize);
        result.push(chunk);
    }
    return result;
}
async function bulkSendFrameNotification({ url, tokens, title, body, }) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            notificationId: crypto.randomUUID(),
            title,
            body,
            targetUrl: appUrl,
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
const sendNotifications = async (title, body) => {
    try {
        const notifDetails = await (0, db_1.getNotifcationDetailsForAllPlayers)();
        const urlToUse = notifDetails && notifDetails[0] ? notifDetails[0].notification_url : "";
        const notificationTokens = notifDetails
            ? notifDetails.map((n) => n.notification_token)
            : [];
        if (notificationTokens.length > 100) {
            const notifChunks = splitArrayIntoChunks(notificationTokens);
            for (const chunk of notifChunks) {
                //  Send notifications to all
                await bulkSendFrameNotification({
                    url: urlToUse,
                    tokens: chunk,
                    title: title,
                    body: body,
                });
            }
        }
        else {
            await bulkSendFrameNotification({
                url: urlToUse,
                tokens: notificationTokens,
                title: title,
                body: body,
            });
        }
    }
    catch (error) {
        console.log(error);
        throw error;
    }
};
exports.sendNotifications = sendNotifications;
