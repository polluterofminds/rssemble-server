"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const node_server_1 = require("@hono/node-server");
const cors_1 = require("hono/cors");
const dotenv_1 = __importDefault(require("dotenv"));
const auth_client_1 = require("@farcaster/auth-client");
const frame_node_1 = require("@farcaster/frame-node");
//  @ts-expect-error no types needed
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("./utils/db");
const feed_1 = require("./utils/feed");
const notifications_1 = require("./utils/notifications");
const bypassRoutes = ["/webhooks", "/rss-webhooks", "/feeds", "/feeds/validate"];
const appClient = (0, auth_client_1.createAppClient)({
    relay: "https://relay.farcaster.xyz",
    ethereum: (0, auth_client_1.viemConnector)(),
});
// Load environment variables
dotenv_1.default.config();
// Get environment variables
const env = {
    ALCHEMY_URL: process.env.ALCHEMY_URL || "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    SUPABASE_URL: process.env.SUPABASE_URL || "",
};
const app = new hono_1.Hono();
app.use((0, cors_1.cors)());
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
                    console.log("Adding mini app!");
                    await (0, db_1.setUserNotificationDetails)(fid, event.notificationDetails);
                }
                break;
            case "frame_removed":
                console.log("Removing mini app");
                await (0, db_1.deleteUserNotificationDetails)(fid);
                break;
            case "notifications_enabled":
                console.log("Notifications enabled");
                await (0, db_1.setUserNotificationDetails)(fid, event.notificationDetails);
                break;
            case "notifications_disabled":
                console.log("Notifications disabled");
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
                await (0, notifications_1.sendNotifications)("New post!", `New post from ${update.author}: "${update.title}"`, update.link);
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
// Start the server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on port ${port}`);
node_cron_1.default.schedule('0 * * * *', async () => {
    try {
        console.log("Checking for feed updates");
        await checkRecentFeedUpdates();
    }
    catch (error) {
        console.log("Cron error");
        console.log(error);
    }
});
(0, node_server_1.serve)({
    fetch: app.fetch,
    port: port,
});
