import { Hono } from 'hono'
import { fetchAllFeeds, getFeedDetails, validateFeed } from './utils/feed'
import { CronJob } from 'cron';
import { sendNotifications } from './utils/notifications';
import { createAppClient, viemConnector } from "@farcaster/auth-client";
import {
  createVerifyAppKeyWithHub,
  ParseWebhookEvent,
  parseWebhookEvent,
} from "@farcaster/frame-node";
import { deleteUserNotificationDetails, setUserNotificationDetails } from './utils/db';
import { Feed } from './utils/types';
import { cors } from 'hono/cors';

const app = new Hono()

app.use(cors());

// const appClient = createAppClient({
//   relay: "https://relay.farcaster.xyz",
//   ethereum: viemConnector(),
// });

app.post("/webhooks", async (c) => {
  try {
    const requestJson = await c.req.json();
    console.log(requestJson);
    const verifier = createVerifyAppKeyWithHub(
      "https://hub.farcaster.standardcrypto.vc:2281"
    );
    const data = await parseWebhookEvent(requestJson, verifier);
    const fid = data.fid;
    const event = data.event;
    switch (event.event) {
      case "frame_added":
        if (event.notificationDetails) {
          await setUserNotificationDetails(fid, event.notificationDetails);
        }
        break;
      case "frame_removed":
        await deleteUserNotificationDetails(fid);

        break;
      case "notifications_enabled":
        await setUserNotificationDetails(fid, event.notificationDetails);

        break;
      case "notifications_disabled":
        await deleteUserNotificationDetails(fid);

        break;
    }

    return c.json({ message: "Success" }, 200);
  } catch (e: unknown) {
    const error = e as ParseWebhookEvent.ErrorType;

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
    const feeds = await fetchAllFeeds();
    return c.json({ data: feeds });
  } catch (error) {
    console.log(error);
    return c.json({ message: "Server error" }, 500);
  }
});

app.post('feeds/validate', async (c) => {
  try {
    const { feedUrl } = await c.req.json();

    if(!feedUrl) {
      return c.json({ message: "feedUrl is required" }, 400);      
    }

    const result = await validateFeed(feedUrl);
    return c.json({ data: result }, 200);
  } catch (error) {
    console.log(error);
    return c.json({ message: "Server error" }, 500);
  }
})

async function checkRecentFeedUpdates(): Promise<void> {
  try {
    const allFeeds: Feed[] = await fetchAllFeeds();
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentUpdates: Array<{
      fid: number,
      feedUrl: string,
      title: string,
      author: string,
      published: Date,
      link: string
    }> = [];

    allFeeds.forEach(feed => {
      feed.feedContents.forEach((content: any) => {
        const sortedItems = [...content.items].sort((a, b) => 
          new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime()
        );
        
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
        await sendNotifications(
          "New post!",
          `New post from ${update.author}: "${update.title}"`
        );
        
        console.log(`Notification sent for feed ID ${update.fid}: ${update.title}`);
      }
    } else {
      console.log('No recent feed updates found');
    }
  } catch (error) {
    console.error('Error checking feed updates:', error);
  }
}

const feedCheckJob = new CronJob(
  '0 * * * *', 
  checkRecentFeedUpdates,
  null, 
  false,
  'UTC'
);

feedCheckJob.start();

console.log('Feed update checker initialized and running...');

export default app
