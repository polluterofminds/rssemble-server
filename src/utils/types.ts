export type Bindings = {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  ALCHEMY_URL: string;
};

export type FeedData = {
  fid: number;
  feedUrls: string[];
};

export type FeedItem = {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  isoDate: string;
  author: string;
  categories: string[];
};

export type FeedContent = {
  title: string;
  description: string;
  link: string;
  items: FeedItem[];
};

export type Feed = {
  fid: number;
  feedUrls: string[];
  feedContents: FeedContent[];
};

export type FeedRecord = {
  fid: number;
  feed_url: string;
  title?: string;
  description?: string;
  site_url?: string;
};

export type FeedContentRecord = {
  id?: number;
  fid: number;
  guid: string;
  feed_url: string;
  title: string;
  link: string;
  pub_date: string;
  iso_date: string;
  author: string;
  content_snippet: string;
  categories: string[];
  created_at?: string;
};

export type SendFrameNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

export type FrameNotificationDetails = {
  url: string;
  token: string;
};
