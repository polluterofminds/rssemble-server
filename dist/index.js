"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const feed_1 = require("./utils/feed");
const cron_1 = require("cron");
const notifications_1 = require("./utils/notifications");
const frame_node_1 = require("@farcaster/frame-node");
const db_1 = require("./utils/db");
const cors_1 = require("hono/cors");
const app = new hono_1.Hono();
app.use((0, cors_1.cors)());
// const appClient = createAppClient({
//   relay: "https://relay.farcaster.xyz",
//   ethereum: viemConnector(),
// });
app.post("/webhooks", async (c) => {
    try {
        const requestJson = await c.req.json();
        console.log(requestJson);
        const verifier = (0, frame_node_1.createVerifyAppKeyWithHub)("https://hub.farcaster.standardcrypto.vc:2281");
        const data = await (0, frame_node_1.parseWebhookEvent)(requestJson, verifier);
        const fid = data.fid;
        const event = data.event;
        switch (event.event) {
            case "frame_added":
                if (event.notificationDetails) {
                    await (0, db_1.setUserNotificationDetails)(fid, event.notificationDetails);
                }
                break;
            case "frame_removed":
                await (0, db_1.deleteUserNotificationDetails)(fid);
                break;
            case "notifications_enabled":
                await (0, db_1.setUserNotificationDetails)(fid, event.notificationDetails);
                break;
            case "notifications_disabled":
                await (0, db_1.deleteUserNotificationDetails)(fid);
                break;
        }
        return c.json({ message: "Success" }, 200);
    }
    catch (e) {
        const error = e;
        switch (error.name) {
            default:
            case "VerifyJsonFarcasterSignature.InvalidDataError":
            case "VerifyJsonFarcasterSignature.InvalidEventDataError":
                // The request data is invalid
                return c.json({ message: "Request data is invalid" }, 400);
            case "VerifyJsonFarcasterSignature.InvalidAppKeyError":
                // The app key is invalid
                return c.json({ message: "Invalid API key" }, 401);
            case "VerifyJsonFarcasterSignature.VerifyAppKeyError":
                // Internal error verifying the app key (caller may want to try again)
                return c.json({ message: "Internal error" }, 400);
        }
    }
});
app.get('/feeds', async (c) => {
    try {
        const feeds = await (0, feed_1.fetchAllFeeds)();
        return c.json({ data: feeds });
    }
    catch (error) {
        console.log(error);
        return c.json({ message: "Server error" }, 500);
    }
});
app.post('feeds/validate', async (c) => {
    try {
        const { feedUrl } = await c.req.json();
        if (!feedUrl) {
            return c.json({ message: "feedUrl is required" }, 400);
        }
        const result = await (0, feed_1.validateFeed)(feedUrl);
        return c.json({ data: result }, 200);
    }
    catch (error) {
        console.log(error);
        return c.json({ message: "Server error" }, 500);
    }
});
async function checkRecentFeedUpdates() {
    try {
        const allFeeds = await (0, feed_1.fetchAllFeeds)();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentUpdates = [];
        allFeeds.forEach(feed => {
            feed.feedContents.forEach((content) => {
                const sortedItems = [...content.items].sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());
                if (sortedItems.length > 0) {
                    const latestItem = sortedItems[0];
                    const publishDate = new Date(latestItem.isoDate);
                    if (publishDate > oneHourAgo) {
                        recentUpdates.push({
                            fid: feed.fid,
                            feedUrl: feed.feedUrls[0],
                            title: latestItem.title,
                            author: latestItem.author,
                            published: publishDate,
                            link: latestItem.link
                        });
                    }
                }
            });
        });
        if (recentUpdates.length > 0) {
            console.log(`Found ${recentUpdates.length} feeds with recent updates`);
            for (const update of recentUpdates) {
                await (0, notifications_1.sendNotifications)("New post!", `New post from ${update.author}: "${update.title}"`);
                console.log(`Notification sent for feed ID ${update.fid}: ${update.title}`);
            }
        }
        else {
            console.log('No recent feed updates found');
        }
    }
    catch (error) {
        console.error('Error checking feed updates:', error);
    }
}
const feedCheckJob = new cron_1.CronJob('0 * * * *', checkRecentFeedUpdates, null, false, 'UTC');
feedCheckJob.start();
console.log('Feed update checker initialized and running...');
exports.default = app;
