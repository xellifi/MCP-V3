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

// api/auth/facebook-callback.ts
var facebook_callback_exports = {};
__export(facebook_callback_exports, {
  default: () => handler
});
module.exports = __toCommonJS(facebook_callback_exports);
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
var supabaseAdmin = (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
var FACEBOOK_APP_ID = process.env.VITE_FACEBOOK_APP_ID || "";
var FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
async function handler(req, res) {
  const { code, state, error, error_description } = req.query;
  console.log("Facebook OAuth callback received");
  console.log("Code present:", !!code);
  if (error) {
    console.error("Facebook OAuth error:", error, error_description);
    return res.redirect(`/login?error=${encodeURIComponent(error_description || error)}`);
  }
  if (!code) {
    console.error("No authorization code received");
    return res.redirect("/login?error=No%20authorization%20code%20received");
  }
  if (!FACEBOOK_APP_SECRET) {
    console.error("FACEBOOK_APP_SECRET not configured");
    return res.redirect("/login?error=Server%20configuration%20error");
  }
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const redirectUri = `${protocol}://${host}/api/auth/facebook-callback`;
    console.log("Redirect URI for token exchange:", redirectUri);
    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", FACEBOOK_APP_ID);
    tokenUrl.searchParams.set("client_secret", FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set("code", code);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return res.redirect(`/login?error=${encodeURIComponent(tokenData.error?.message || "Token exchange failed")}`);
    }
    console.log("Token exchange successful, fetching user info...");
    const userUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture.width(200).height(200)&access_token=${tokenData.access_token}`;
    const userResponse = await fetch(userUrl);
    const userData = await userResponse.json();
    if (!userResponse.ok || !userData.id) {
      console.error("Failed to fetch user info:", userData);
      return res.redirect("/login?error=Failed%20to%20fetch%20user%20info");
    }
    console.log("User info fetched:", userData.name, userData.email);
    const fbPassword = `FB_AUTH_${userData.id}_SECURE`;
    const email = userData.email || `fb_${userData.id}@facebook.placeholder`;
    const { data: existingProfile } = await supabaseAdmin.from("profiles").select("id, email").or(`facebook_id.eq.${userData.id},email.eq.${email}`).maybeSingle();
    let userId;
    let isNewUser = false;
    if (existingProfile) {
      console.log("Existing user found:", existingProfile.id);
      userId = existingProfile.id;
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: fbPassword }
      );
      if (updateError) {
        console.error("Failed to update user password:", updateError);
      } else {
        console.log("Updated user password to consistent pattern");
      }
      await supabaseAdmin.from("profiles").update({
        facebook_id: userData.id,
        facebook_access_token: tokenData.access_token,
        avatar_url: userData.picture?.data?.url,
        email_verified: true
      }).eq("id", userId);
    } else {
      console.log("Creating new user...");
      isNewUser = true;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: fbPassword,
        email_confirm: true,
        // Auto-confirm email for Facebook users
        user_metadata: {
          name: userData.name,
          avatar_url: userData.picture?.data?.url,
          facebook_id: userData.id
        }
      });
      if (createError || !newUser.user) {
        console.error("Failed to create user:", createError);
        return res.redirect(`/login?error=${encodeURIComponent(createError?.message || "Failed to create account")}`);
      }
      userId = newUser.user.id;
      console.log("Created new user:", userId);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await supabaseAdmin.from("profiles").update({
        facebook_id: userData.id,
        facebook_access_token: tokenData.access_token,
        avatar_url: userData.picture?.data?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&background=random`,
        email_verified: true,
        name: userData.name,
        auth_provider: "facebook"
      }).eq("id", userId);
      console.log("[Facebook Callback] Creating FREE subscription for new user:", userId);
      try {
        const { data: subResult, error: subError } = await supabaseAdmin.rpc("ensure_user_free_subscription", { p_user_id: userId });
        if (subError) {
          console.error("[Facebook Callback] RPC error creating subscription:", subError);
        } else if (subResult?.success) {
          console.log("[Facebook Callback] Successfully created FREE subscription:", subResult);
        } else {
          console.error("[Facebook Callback] Subscription creation returned error:", subResult?.error || subResult);
        }
      } catch (e) {
        console.error("[Facebook Callback] Exception creating subscription:", e.message);
      }
      try {
        await supabaseAdmin.rpc("ensure_user_workspace", {
          p_user_id: userId,
          p_user_name: userData.name
        });
      } catch (e) {
        console.error("Workspace error:", e);
      }
    }
    const loginData = {
      facebookId: userData.id,
      name: userData.name,
      email,
      picture: userData.picture?.data?.url,
      accessToken: tokenData.access_token,
      userId,
      isNewUser
    };
    const encodedData = Buffer.from(JSON.stringify(loginData)).toString("base64");
    return res.redirect(`/auth/facebook-complete?data=${encodeURIComponent(encodedData)}`);
  } catch (error2) {
    console.error("Facebook callback error:", error2);
    return res.redirect(`/login?error=${encodeURIComponent(error2.message || "Unknown error")}`);
  }
}
