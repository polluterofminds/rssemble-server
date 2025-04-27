"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserNotificationDetails = exports.setUserNotificationDetails = exports.getNotifcationDetailsForAllPlayers = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
const getNotifcationDetailsForAllPlayers = async () => {
    let { data: notification_details, error } = await supabase
        .from("notification_details")
        .select("*");
    if (error) {
        console.log(`Supabase error: ${error}`);
        throw error;
    }
    return notification_details;
};
exports.getNotifcationDetailsForAllPlayers = getNotifcationDetailsForAllPlayers;
const setUserNotificationDetails = async (fid, details) => {
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
exports.setUserNotificationDetails = setUserNotificationDetails;
const deleteUserNotificationDetails = async (fid) => {
    const { error } = await supabase
        .from("notification_details")
        .delete()
        .eq("fid", fid);
    if (error) {
        console.log(`Supabase error: `, error);
        throw error;
    }
};
exports.deleteUserNotificationDetails = deleteUserNotificationDetails;
