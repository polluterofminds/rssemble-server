"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeedDetails = exports.fetchAllFeeds = exports.validateFeed = void 0;
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const abi_1 = require("./abi");
const Parser = require("rss-parser");
const parser = new Parser({
    customFields: {
        item: [
            ["content:encoded", "fullContent"],
            ["dc:creator", "author"],
            ["content:encodedSnippet", "fullContentSnippet"],
        ],
    },
});
const CONTRACT_ADDRESS = "0xb8B66933f14c1087046d0b6Ff83Db5495eFD1454";
const publicClient = (0, viem_1.createPublicClient)({
    chain: chains_1.baseSepolia,
    transport: (0, viem_1.http)(process.env.ALCHEMY_URL),
});
const contract = (0, viem_1.getContract)({
    address: CONTRACT_ADDRESS,
    abi: abi_1.abi,
    client: publicClient,
});
// Function to standardize a parsed feed item
const standardizeFeedItem = (item, feedTitle = "") => {
    return {
        title: item.title || "",
        link: item.link || item.guid || "",
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        content: item.content || item.fullContent || item.description || "",
        contentSnippet: item.contentSnippet || item.fullContentSnippet || "",
        guid: item.guid || item.link || "",
        isoDate: item.isoDate || new Date(item.pubDate || "").toISOString(),
        author: item.author || item.creator || feedTitle,
        categories: item.categories || [],
    };
};
const validateFeed = async (url) => {
    try {
        const feed = await parser.parseURL(url);
        if (feed && (feed.items || feed.entries)) {
            return {
                isValid: true,
                feedData: {
                    title: feed.title,
                    description: feed.description,
                    link: feed.link,
                    itemCount: feed.items?.length || 0,
                },
            };
        }
        else {
            return {
                isValid: false,
                error: "URL parsed but no feed items found",
            };
        }
    }
    catch (error) {
        console.log(error);
        return {
            isValid: false,
            error: "Error parsing feed",
        };
    }
};
exports.validateFeed = validateFeed;
const parseFeed = async (url) => {
    try {
        const feed = await parser.parseURL(url);
        const standardizedItems = feed.items.map((item) => standardizeFeedItem(item, feed.title || ""));
        return {
            title: feed.title || "",
            description: feed.description || "",
            link: feed.link || url,
            items: standardizedItems,
        };
    }
    catch (error) {
        console.error(`Error parsing feed ${url}:`, error);
        throw error;
    }
};
const fetchAllFeeds = async () => {
    try {
        console.log("Fetching feeds from contract...");
        const [fids, allFeedUrls] = await contract.read.getAllFeeds();
        console.log({ fids });
        const feedsData = fids.map((fid, index) => ({
            fid: Number(fid),
            feedUrls: allFeedUrls[index],
        }));
        const feedsWithContent = await Promise.all(feedsData.map(async (feed) => {
            try {
                const parsedFeeds = await Promise.all(feed.feedUrls.map(async (url) => {
                    try {
                        console.log(`Parsing feed: ${url}`);
                        return await parseFeed(url);
                    }
                    catch (err) {
                        console.error(`Failed to parse ${url}:`, err);
                        return null;
                    }
                }));
                const validFeeds = parsedFeeds.filter((feed) => feed !== null);
                return {
                    ...feed,
                    feedContents: validFeeds,
                };
            }
            catch (err) {
                console.error(`Error processing feeds for FID ${feed.fid}:`, err);
                return {
                    ...feed,
                    feedContents: [],
                };
            }
        }));
        console.log("Feeds with content:", feedsWithContent);
        return feedsWithContent;
    }
    catch (error) {
        console.error("Error fetching all feeds:", error);
        throw error;
    }
};
exports.fetchAllFeeds = fetchAllFeeds;
const getFeedDetails = async (url) => {
    const feedInfo = await parseFeed(url);
    return feedInfo;
};
exports.getFeedDetails = getFeedDetails;
