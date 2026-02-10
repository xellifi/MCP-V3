// Transpiled from TypeScript by esbuild
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

// api/cron/shared.ts
var shared_exports = {};
__export(shared_exports, {
  calculateNextRun: () => calculateNextRun,
  executeWorkflow: () => executeWorkflow,
  generateCaption: () => generateCaption,
  generateImage: () => generateImage,
  generateTopic: () => generateTopic,
  postToFacebook: () => postToFacebook,
  sendFollowupMessage: () => sendFollowupMessage,
  supabase: () => supabase
});
module.exports = __toCommonJS(shared_exports);
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.VITE_SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
async function generateTopic(config, apiKey, provider, usedTopics) {
  const seedTopics = config.seedTopics || ["general interest", "trending topics"];
  const tone = config.tone || "professional";
  const niche = config.niche || "general";
  const prompt = `You are a social media content strategist. Generate ONE unique, engaging topic idea for a Facebook post.

Industry/Niche: ${niche}
Tone: ${tone}
Seed topic ideas to draw inspiration from: ${seedTopics.join(", ")}

${usedTopics.length > 0 ? `
AVOID these previously used topics:
${usedTopics.slice(0, 20).join("\n")}` : ""}

Requirements:
- Make it specific and actionable
- Should be engaging for social media
- Return ONLY the topic, no explanations or additional text
- Keep it under 100 characters`;
  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.9
      })
    });
    const data = await response.json();
    if (data.error)
      throw new Error(data.error.message);
    return data.choices[0]?.message?.content?.trim() || "Engaging content for today";
  } else {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0.9 }
        })
      }
    );
    const data = await response.json();
    if (data.error)
      throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Engaging content for today";
  }
}
async function generateImage(topic, config, openaiKey) {
  const style = config.style || "realistic";
  const size = config.size || "1024x1024";
  const sizeMap = {
    "1080x1080": "1024x1024",
    "1200x628": "1792x1024",
    "1080x1920": "1024x1792",
    "1024x1024": "1024x1024"
  };
  const dalleSize = sizeMap[size] || "1024x1024";
  const prompt = `Create a ${style} image for a social media post about: ${topic}. 
The image should be eye-catching, professional, and suitable for Facebook.
Style: ${style}
No text or watermarks in the image.`;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: dalleSize,
      quality: "standard"
    })
  });
  const data = await response.json();
  if (data.error)
    throw new Error(data.error.message);
  return data.data?.[0]?.url || "";
}
async function generateCaption(topic, config, apiKey, provider) {
  const tone = config.tone || "friendly";
  const includeHashtags = config.includeHashtags !== false;
  const includeEmojis = config.includeEmojis !== false;
  const includeCta = config.includeCta !== false;
  const ctaType = config.ctaType || "engage";
  const maxLength = config.maxLength || 300;
  const prompt = `Write a beautifully formatted Facebook post caption about: ${topic}

FORMATTING RULES (VERY IMPORTANT):
- Use proper line breaks for readability
- Structure the caption in clear paragraphs separated by blank lines
- Follow this exact layout format:

[Opening hook with emoji] First sentence that grabs attention.
Second sentence expanding on the hook.

[Body paragraph] Main message or story.
Keep this engaging and relatable.

[Call to action or closing thought] ${includeCta ? `Type: ${ctaType}` : "End with an inspiring thought"}

${includeHashtags ? "[Hashtags on their own line] #Hashtag1 #Hashtag2 #Hashtag3 #Hashtag4 #Hashtag5" : ""}

STYLE REQUIREMENTS:
- Tone: ${tone}
- Maximum length: ${maxLength} characters
${includeEmojis ? "- Start key sentences with relevant emojis (\u{1F3B6}\u2728\u{1F31F}\u{1F3A4}\u{1F4A1}\u2764\uFE0F\u{1F525}\u{1F4AA}\u{1F64C} etc.)" : "- No emojis"}
${includeHashtags ? "- Include 3-5 relevant hashtags as the LAST line, all on one line" : "- No hashtags"}
${includeCta ? `- Include a compelling call-to-action (${ctaType === "engage" ? "ask a question or invite comments" : ctaType === "share" ? "encourage sharing" : ctaType === "visit" ? "direct to take action" : "encourage engagement"})` : ""}

Return ONLY the formatted caption text, ready to post. Make sure there are proper line breaks between paragraphs.`;
  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.8
      })
    });
    const data = await response.json();
    if (data.error)
      throw new Error(data.error.message);
    return data.choices[0]?.message?.content?.trim() || topic;
  } else {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.8 }
        })
      }
    );
    const data = await response.json();
    if (data.error)
      throw new Error(data.error.message);
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || topic;
  }
}
async function postToFacebook(pageAccessToken, pageId, caption, imageUrl) {
  let postId = "";
  if (imageUrl) {
    const photoResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/photos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: imageUrl,
          caption,
          access_token: pageAccessToken
        })
      }
    );
    const photoData = await photoResponse.json();
    if (photoData.error) {
      throw new Error(photoData.error.message);
    }
    postId = photoData.post_id || photoData.id;
  } else {
    const postResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: caption,
          access_token: pageAccessToken
        })
      }
    );
    const postData = await postResponse.json();
    if (postData.error) {
      throw new Error(postData.error.message);
    }
    postId = postData.id;
  }
  return postId;
}
async function sendFollowupMessage(userId, text, pageAccessToken, messageTag, button) {
  try {
    let messagePayload = { text };
    if (button && button.url && button.url.includes("http")) {
      messagePayload = {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text,
            buttons: [
              {
                type: "web_url",
                url: button.url,
                title: button.text,
                webview_height_ratio: "full"
              }
            ]
          }
        }
      };
    }
    const body = {
      recipient: { id: userId },
      message: messagePayload,
      access_token: pageAccessToken
    };
    if (messageTag) {
      body.messaging_type = "MESSAGE_TAG";
      body.tag = messageTag;
    }
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );
    const result = await response.json();
    if (result.error) {
      console.error("[Followup] Message error:", result.error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Followup] Send exception:", error.message);
    return false;
  }
}
function calculateNextRun(workflow) {
  const now = /* @__PURE__ */ new Date();
  const scheduleType = workflow.schedule_type || "daily";
  const scheduleTime = workflow.schedule_time || "09:00";
  const scheduleDays = workflow.schedule_days || [];
  const scheduleTimezone = workflow.schedule_timezone || "Asia/Manila";
  let times = workflow.schedule_times && workflow.schedule_times.length > 0 ? workflow.schedule_times : [scheduleTime];
  const timezoneOffsets = {
    "Asia/Manila": 8,
    "Asia/Singapore": 8,
    "Asia/Tokyo": 9,
    "America/New_York": -5,
    "America/Los_Angeles": -8,
    "Europe/London": 0,
    "Europe/Paris": 1,
    "Australia/Sydney": 11,
    "UTC": 0
  };
  const tzOffset = timezoneOffsets[scheduleTimezone] ?? 8;
  switch (scheduleType) {
    case "daily": {
      const currentTime = /* @__PURE__ */ new Date();
      currentTime.setSeconds(currentTime.getSeconds() + 60);
      const currentUtcHours = currentTime.getUTCHours();
      const currentUtcMinutes = currentTime.getUTCMinutes();
      const currentLocalHours = currentUtcHours + tzOffset;
      let localDateOffset = 0;
      let adjustedLocalHours = currentLocalHours;
      if (currentLocalHours >= 24) {
        localDateOffset = 1;
        adjustedLocalHours = currentLocalHours - 24;
      } else if (currentLocalHours < 0) {
        localDateOffset = -1;
        adjustedLocalHours = currentLocalHours + 24;
      }
      const localDate = new Date(currentTime);
      localDate.setUTCDate(localDate.getUTCDate() + localDateOffset);
      const candidates = [];
      for (const timeStr of times) {
        const [schedHours, schedMinutes] = timeStr.split(":").map(Number);
        if (isNaN(schedHours) || isNaN(schedMinutes))
          continue;
        let targetUtcHours = schedHours - tzOffset;
        let targetDayOffset = localDateOffset;
        if (targetUtcHours < 0) {
          targetUtcHours += 24;
          targetDayOffset -= 1;
        } else if (targetUtcHours >= 24) {
          targetUtcHours -= 24;
          targetDayOffset += 1;
        }
        const runTime = new Date(currentTime);
        runTime.setUTCDate(currentTime.getUTCDate() + targetDayOffset);
        runTime.setUTCHours(targetUtcHours, schedMinutes, 0, 0);
        if (runTime > currentTime) {
          candidates.push(runTime);
        } else {
          const tomorrowRun = new Date(runTime);
          tomorrowRun.setUTCDate(tomorrowRun.getUTCDate() + 1);
          candidates.push(tomorrowRun);
        }
      }
      if (candidates.length === 0)
        return null;
      const futureCandidates = candidates.filter((c) => c > currentTime);
      if (futureCandidates.length === 0)
        return null;
      futureCandidates.sort((a, b) => a.getTime() - b.getTime());
      return futureCandidates[0];
    }
    case "weekly": {
      const targetDays = scheduleDays.map(Number);
      if (targetDays.length === 0)
        return null;
      const candidates = [];
      for (const timeStr of times) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        for (let i = 0; i < 8; i++) {
          const checkDate = new Date(now);
          checkDate.setDate(checkDate.getDate() + i);
          checkDate.setHours(hours, minutes, 0, 0);
          if (targetDays.includes(checkDate.getDay()) && checkDate > now) {
            candidates.push(checkDate);
            break;
          }
        }
      }
      candidates.sort((a, b) => a.getTime() - b.getTime());
      return candidates[0] || null;
    }
    case "monthly": {
      const dayOfMonth = scheduleDays[0] || 1;
      const candidates = [];
      for (const timeStr of times) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hours, minutes, 0, 0);
        if (thisMonth > now) {
          candidates.push(thisMonth);
        }
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth, hours, minutes, 0, 0);
        candidates.push(nextMonth);
      }
      candidates.sort((a, b) => a.getTime() - b.getTime());
      return candidates[0] || null;
    }
    default:
      return null;
  }
}
async function executeWorkflow(workflow) {
  const configurations = workflow.configurations || {};
  const { data: settings } = await supabase.from("workspace_settings").select("*").eq("workspace_id", workflow.workspace_id).single();
  const openaiKey = settings?.openai_api_key;
  const geminiKey = settings?.gemini_api_key;
  if (!openaiKey && !geminiKey) {
    return {
      success: false,
      error: "No AI API keys configured. Please add OpenAI or Gemini API key in Settings."
    };
  }
  let topicConfig = null;
  let imageConfig = null;
  let captionConfig = null;
  let facebookConfig = null;
  for (const [nodeId, config] of Object.entries(configurations)) {
    const node = workflow.nodes?.find((n) => n.id === nodeId);
    if (!node)
      continue;
    switch (node.type) {
      case "topicGenerator":
        topicConfig = config;
        break;
      case "imageGenerator":
        imageConfig = config;
        break;
      case "captionWriter":
        captionConfig = config;
        break;
      case "facebookPost":
        facebookConfig = config;
        break;
    }
  }
  const { data: topicHistory } = await supabase.from("scheduler_topic_history").select("topic").eq("workflow_id", workflow.id).order("created_at", { ascending: false }).limit(50);
  const usedTopics = topicHistory?.map((t) => t.topic) || [];
  let topic = "";
  if (topicConfig) {
    const provider = topicConfig.provider || (openaiKey ? "openai" : "gemini");
    const apiKey = provider === "openai" ? openaiKey : geminiKey;
    if (!apiKey) {
      return { success: false, error: `${provider} API key not configured` };
    }
    try {
      topic = await generateTopic(topicConfig, apiKey, provider, usedTopics);
    } catch (err) {
      return { success: false, error: `Topic generation failed: ${err.message}` };
    }
  }
  let imageUrl = "";
  if (imageConfig && openaiKey) {
    try {
      imageUrl = await generateImage(topic, imageConfig, openaiKey);
    } catch (err) {
      console.error("[Workflow] Image generation failed:", err.message);
    }
  }
  let caption = "";
  if (captionConfig) {
    const provider = captionConfig.provider || (openaiKey ? "openai" : "gemini");
    const apiKey = provider === "openai" ? openaiKey : geminiKey;
    if (apiKey) {
      try {
        caption = await generateCaption(topic, captionConfig, apiKey, provider);
      } catch (err) {
        caption = `${topic}

#content #daily`;
      }
    }
  }
  let postId = "";
  if (facebookConfig?.pageId) {
    const { data: page } = await supabase.from("connected_pages").select("page_access_token").eq("page_id", facebookConfig.pageId).single();
    if (!page?.page_access_token) {
      return { success: false, error: "Page access token not found" };
    }
    try {
      postId = await postToFacebook(page.page_access_token, facebookConfig.pageId, caption, imageUrl);
    } catch (err) {
      return { success: false, error: `Facebook posting failed: ${err.message}` };
    }
  }
  if (topic) {
    await supabase.from("scheduler_topic_history").insert({ workflow_id: workflow.id, topic });
  }
  return {
    success: true,
    topic,
    imageUrl,
    caption,
    postId
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateNextRun,
  executeWorkflow,
  generateCaption,
  generateImage,
  generateTopic,
  postToFacebook,
  sendFollowupMessage,
  supabase
});
