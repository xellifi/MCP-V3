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

// api/cron/execute-step.ts
var execute_step_exports = {};
__export(execute_step_exports, {
  default: () => handler
});
module.exports = __toCommonJS(execute_step_exports);

// api/cron/shared.ts
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

// api/cron/execute-step.ts
async function handler(req, res) {
  const step = req.query.step;
  if (step === "full") {
    return handleExecuteFullWorkflow(req, res);
  }
  console.log(`[Execute Step] Starting step: ${step}`);
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { workspaceId, configurations, previousResults } = body;
    const { data: settings } = await supabase.from("workspace_settings").select("openai_api_key, gemini_api_key").eq("workspace_id", workspaceId).single();
    const openaiKey = settings?.openai_api_key;
    const geminiKey = settings?.gemini_api_key;
    if (!openaiKey && !geminiKey) {
      return res.status(400).json({ error: "No API keys configured" });
    }
    const provider = openaiKey ? "openai" : "gemini";
    const apiKey = openaiKey || geminiKey;
    switch (step) {
      case "topic-1": {
        const topicConfig = configurations?.["topic-1"] || {};
        const topic = await generateTopic(topicConfig, apiKey, provider, []);
        console.log(`[Execute Step] Generated topic: ${topic}`);
        return res.json({ success: true, step, result: { topic } });
      }
      case "image-1": {
        const imageConfig = configurations?.["image-1"] || {};
        const topic = previousResults?.["topic-1"]?.result?.topic || "Social media post";
        const imageUrl = await generateImage(topic, imageConfig, openaiKey || "");
        console.log(`[Execute Step] Generated image`);
        return res.json({ success: true, step, result: { imageUrl } });
      }
      case "caption-1": {
        const captionConfig = configurations?.["caption-1"] || {};
        const topic = previousResults?.["topic-1"]?.result?.topic || "Social media post";
        const caption = await generateCaption(topic, captionConfig, apiKey, provider);
        console.log(`[Execute Step] Generated caption`);
        return res.json({ success: true, step, result: { caption } });
      }
      case "facebook-1": {
        const fbConfig = configurations?.["facebook-1"] || {};
        const caption = previousResults?.["caption-1"]?.result?.caption || "";
        const imageUrl = previousResults?.["image-1"]?.result?.imageUrl || "";
        const topic = previousResults?.["topic-1"]?.result?.topic || "";
        let page = null;
        if (fbConfig.pageId) {
          const { data: configuredPage } = await supabase.from("connected_pages").select("page_id, page_access_token").eq("page_id", fbConfig.pageId).single();
          if (configuredPage)
            page = configuredPage;
        }
        if (!page) {
          const { data: automatedPages } = await supabase.from("connected_pages").select("page_id, page_access_token").eq("workspace_id", workspaceId).eq("automation_enabled", true).limit(1);
          if (automatedPages?.length)
            page = automatedPages[0];
        }
        if (!page) {
          const { data: anyPages } = await supabase.from("connected_pages").select("page_id, page_access_token").eq("workspace_id", workspaceId).limit(1);
          if (anyPages?.length)
            page = anyPages[0];
        }
        if (!page) {
          return res.status(400).json({ error: "No connected Facebook pages. Please connect a page first." });
        }
        console.log(`[Execute Step] Posting to page: ${page.page_id}`);
        const postId = await postToFacebook(page.page_access_token, page.page_id, caption, imageUrl);
        console.log(`[Execute Step] Posted to Facebook: ${postId}`);
        return res.json({ success: true, step, result: { postId, topic, imageUrl, caption } });
      }
      default:
        return res.status(400).json({ error: `Unknown step: ${step}` });
    }
  } catch (error) {
    console.error(`[Execute Step] Error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
async function handleExecuteFullWorkflow(req, res) {
  console.log(`[Execute Full] Starting full workflow execution`);
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { workspaceId, configurations } = body;
    console.log(`[Execute Full] WorkspaceId: ${workspaceId}`);
    const { data: settings } = await supabase.from("workspace_settings").select("openai_api_key, gemini_api_key").eq("workspace_id", workspaceId).single();
    const openaiKey = settings?.openai_api_key;
    const geminiKey = settings?.gemini_api_key;
    if (!openaiKey && !geminiKey) {
      return res.status(400).json({
        error: "No API keys configured",
        failedStep: "topic-1"
      });
    }
    const topicConfig = configurations?.["topic-1"] || configurations?.["topicGenerator-1"] || {};
    const imageConfig = configurations?.["image-1"] || configurations?.["imageGenerator-1"] || {};
    const captionConfig = configurations?.["caption-1"] || configurations?.["captionWriter-1"] || {};
    const facebookConfig = configurations?.["facebook-1"] || configurations?.["facebookPost-1"] || {};
    const results = {};
    console.log(`[Execute Full] Step 1: Generating topic...`);
    const provider = topicConfig?.provider || (openaiKey ? "openai" : "gemini");
    const apiKey = provider === "openai" ? openaiKey : geminiKey;
    if (!apiKey) {
      return res.status(400).json({
        error: `${provider} API key not configured`,
        failedStep: "topic-1"
      });
    }
    let topic = "";
    try {
      topic = await generateTopic(topicConfig || {}, apiKey, provider, []);
      console.log(`[Execute Full] Generated topic: "${topic}"`);
      results["topic-1"] = { success: true, result: { topic } };
    } catch (err) {
      return res.status(400).json({
        error: `Topic generation failed: ${err.message}`,
        failedStep: "topic-1",
        results
      });
    }
    console.log(`[Execute Full] Step 2: Generating image...`);
    let imageUrl = "";
    if (openaiKey) {
      try {
        imageUrl = await generateImage(topic, imageConfig || {}, openaiKey);
        console.log(`[Execute Full] Generated image URL: ${imageUrl?.substring(0, 60)}...`);
        results["image-1"] = { success: true, result: { imageUrl } };
      } catch (err) {
        return res.status(400).json({
          error: `Image generation failed: ${err.message}`,
          failedStep: "image-1",
          results
        });
      }
    } else {
      results["image-1"] = { success: true, result: { imageUrl: "" }, skipped: true };
    }
    console.log(`[Execute Full] Step 3: Generating caption...`);
    let caption = "";
    try {
      const captionProvider = captionConfig?.provider || provider;
      const captionApiKey = captionProvider === "openai" ? openaiKey : geminiKey;
      if (!captionApiKey) {
        throw new Error(`${captionProvider} API key not available for caption`);
      }
      caption = await generateCaption(topic, captionConfig || {}, captionApiKey, captionProvider);
      results["caption-1"] = { success: true, result: { caption } };
    } catch (err) {
      return res.status(400).json({
        error: `Caption generation failed: ${err.message}`,
        failedStep: "caption-1",
        results
      });
    }
    console.log(`[Execute Full] Step 4: Posting to Facebook...`);
    if (!caption) {
      return res.status(400).json({
        error: "Cannot post to Facebook - no caption generated",
        failedStep: "facebook-1",
        results
      });
    }
    let page = null;
    if (facebookConfig?.pageId) {
      const { data: configuredPage } = await supabase.from("connected_pages").select("page_id, page_access_token").eq("page_id", facebookConfig.pageId).single();
      if (configuredPage)
        page = configuredPage;
    }
    if (!page) {
      const { data: workspacePages } = await supabase.from("connected_pages").select("page_id, page_access_token").eq("workspace_id", workspaceId).eq("automation_enabled", true).limit(1);
      if (workspacePages?.length)
        page = workspacePages[0];
    }
    if (!page) {
      const { data: anyPages } = await supabase.from("connected_pages").select("page_id, page_access_token").eq("workspace_id", workspaceId).limit(1);
      if (anyPages?.length)
        page = anyPages[0];
    }
    if (!page?.page_access_token) {
      return res.status(400).json({
        error: "No connected Facebook pages found. Please connect a page first.",
        failedStep: "facebook-1",
        results
      });
    }
    try {
      const postId = await postToFacebook(page.page_access_token, page.page_id, caption, imageUrl);
      console.log(`[Execute Full] Posted to Facebook! Post ID: ${postId}`);
      results["facebook-1"] = { success: true, result: { postId, topic, imageUrl, caption } };
    } catch (err) {
      return res.status(400).json({
        error: `Facebook posting failed: ${err.message}`,
        failedStep: "facebook-1",
        results
      });
    }
    console.log(`[Execute Full] Workflow completed successfully!`);
    return res.json({
      success: true,
      results,
      summary: {
        topic,
        imageUrl,
        caption,
        postId: results["facebook-1"]?.result?.postId
      }
    });
  } catch (error) {
    console.error(`[Execute Full] Unexpected error:`, error.message);
    return res.status(500).json({ error: error.message });
  }
}
