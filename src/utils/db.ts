import { createClient } from "@supabase/supabase-js";
import { FrameNotificationDetails } from "./types";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl: string = process.env.SUPABASE_URL!;
const supabaseKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const getNotifcationDetailsForAllPlayers = async () => {
  let { data: notification_details, error } = await supabase
    .from("notification_details")
    .select("*");

  if (error) {
    console.log(`Supabase error: ${error}`);
    throw error;
  }

  return notification_details;
};

export const setUserNotificationDetails = async (
  fid: number,
  details: FrameNotificationDetails
) => {
  const { data, error } = await supabase
    .from("notification_details")
    .insert([
      {
        notification_url: details.url,
        notification_token: details.token,
        frame_added: true,
        fid: fid,
      },
    ])
    .select();

  if (error) {
    console.log(`Supabase error: `, error);
    throw error;
  }
};

export const deleteUserNotificationDetails = async (
  fid: number
) => {

  const { error } = await supabase
    .from("notification_details")
    .delete()
    .eq("fid", fid);

  if (error) {
    console.log(`Supabase error: `, error);
    throw error;
  }
};
