var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api/video-thumbnail.ts
var video_thumbnail_exports = {};
__export(video_thumbnail_exports, {
  default: () => handler
});
module.exports = __toCommonJS(video_thumbnail_exports);
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey);
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { videoId, pageId } = req.method === "GET" ? req.query : req.body;
    if (!videoId) {
      return res.status(400).json({ error: "videoId is required" });
    }
    let pageAccessToken = "";
    if (pageId) {
      const { data: pageData, error: pageError } = await supabase.from("connected_pages").select("access_token").eq("page_id", pageId).single();
      if (pageData?.access_token) {
        pageAccessToken = pageData.access_token;
      }
    }
    if (!pageAccessToken) {
      const { data: pagesData } = await supabase.from("connected_pages").select("access_token").limit(1);
      if (pagesData && pagesData.length > 0) {
        pageAccessToken = pagesData[0].access_token;
      }
    }
    if (!pageAccessToken) {
      return res.status(400).json({ error: "No page access token available" });
    }
    const graphUrl = `https://graph.facebook.com/v21.0/${videoId}?fields=thumbnails,picture&access_token=${pageAccessToken}`;
    const fbResponse = await fetch(graphUrl);
    const fbData = await fbResponse.json();
    if (fbData.error) {
      console.error("Facebook API error:", fbData.error);
      return res.status(400).json({
        error: fbData.error.message,
        thumbnailUrl: null
      });
    }
    let thumbnailUrl = null;
    if (fbData.thumbnails?.data && fbData.thumbnails.data.length > 0) {
      const thumbnails = fbData.thumbnails.data;
      thumbnailUrl = thumbnails[thumbnails.length - 1]?.uri || thumbnails[0]?.uri;
    }
    if (!thumbnailUrl && fbData.picture) {
      thumbnailUrl = fbData.picture;
    }
    return res.status(200).json({
      success: true,
      videoId,
      thumbnailUrl,
      data: fbData
    });
  } catch (error) {
    console.error("Error fetching video thumbnail:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch video thumbnail",
      thumbnailUrl: null
    });
  }
}
