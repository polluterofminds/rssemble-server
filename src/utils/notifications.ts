import { getNotifcationDetailsForAllPlayers } from "./db";
import { SendFrameNotificationResult } from "./types";
import FarmaSDK from './farma-sdk';
import dotenv from 'dotenv';
dotenv.config();

const farma = new FarmaSDK({
  hostname: "https://farma.pingem.xyz:443",
  port: 8080,           
  frameId: "6ssaw",     
  privateKey: process.env.FARMA_PRIVATE_KEY
});

const appUrl = "";

function splitArrayIntoChunks(tokenArray: string[], maxChunkSize = 100) {
  const result = [];

  for (let i = 0; i < tokenArray.length; i += maxChunkSize) {
    const chunk = tokenArray.slice(i, i + maxChunkSize);
    result.push(chunk);
  }

  return result;
}

export async function bulkSendFrameNotification({
  url,
  tokens,
  title,
  body,
  postUrl
}: {
  url: string;
  tokens: any;
  title: string;
  body: string;
  postUrl?: string
}) {
  // const response = await fetch(url, {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     notificationId: crypto.randomUUID(),
  //     title,
  //     body,
  //     targetUrl: appUrl,
  //     tokens: tokens,
  //   }),
  // });

  // const responseJson = await response.json();

  // if (response.status === 200) {
  //   return { state: "success" };
  // } else {
  //   return { state: "error", error: responseJson };
  // }

  await farma.sendNotification(
    "6ssaw",
    title,
    body,
    postUrl,
    tokens
);

}

export const sendNotifications = async (title: string, body: string, url?: string) => {
  try {
    const notifDetails = await getNotifcationDetailsForAllPlayers();
    const urlToUse: string =
      "https://farma.pingem.xyz:443/api/v2/notification/6ssaw"; //notifDetails && notifDetails[0] ? notifDetails[0].notification_url : "";
    const notificationTokens = notifDetails
      ? notifDetails.map((n: any) => n.fid)
      : [];
    if (notificationTokens.length > 100) {
      const notifChunks = splitArrayIntoChunks(notificationTokens);
      for (const chunk of notifChunks) {
        //  Send notifications to all
        console.log("Chunk of users")
        console.log(chunk);
        await bulkSendFrameNotification({
          url: urlToUse,
          tokens: chunk,
          title: title,
          body: body,
          postUrl: url
        });
      }
    } else {
      console.log("Fewer than 100 users")
      console.log(notificationTokens);
      await bulkSendFrameNotification({
        url: urlToUse,
        tokens: notificationTokens,
        title: title,
        body: body,
        postUrl: url
      });
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};
