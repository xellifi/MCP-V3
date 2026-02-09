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

// api/admin.ts
var admin_exports = {};
__export(admin_exports, {
  default: () => handler
});
module.exports = __toCommonJS(admin_exports);
var import_supabase_js = require("@supabase/supabase-js");
var supabaseAdmin = (0, import_supabase_js.createClient)(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
async function handler(req, res) {
  const action = req.query.action;
  console.log(`[Admin API] Action: ${action}, Method: ${req.method}`);
  switch (action) {
    case "create-user":
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }
      return handleCreateUser(req, res);
    case "delete-user":
      if (req.method !== "DELETE") {
        return res.status(405).json({ error: "Method not allowed" });
      }
      return handleDeleteUser(req, res);
    case "impersonate":
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }
      return handleImpersonateUser(req, res);
    case "global-stats":
      if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
      }
      return handleGetGlobalStats(req, res);
    default:
      return res.status(400).json({
        error: "Invalid action parameter",
        validActions: ["create-user", "delete-user", "impersonate", "global-stats"],
        usage: "/api/admin?action=create-user (POST) | /api/admin?action=delete-user (DELETE) | /api/admin?action=impersonate (POST) | /api/admin?action=global-stats (GET)"
      });
  }
}
async function handleCreateUser(req, res) {
  try {
    const { email, password, name, packageId } = req.body;
    if (!email || !password || !name || !packageId) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name
      }
    });
    if (authError) {
      console.error("Auth error:", authError);
      if (authError.code === "email_exists" || authError.message?.includes("already registered") || authError.message?.includes("already been registered")) {
        const { data: existingProfile } = await supabaseAdmin.from("profiles").select("id, email, name").eq("email", email).maybeSingle();
        if (existingProfile) {
          return res.status(400).json({
            error: `A user with email "${email}" already exists in the system.`
          });
        } else {
          return res.status(400).json({
            error: `This email is registered in authentication but the profile is missing. Please delete the user from Supabase Auth Dashboard first (Authentication > Users), then try again.`
          });
        }
      }
      if (authError.message?.includes("invalid email")) {
        return res.status(400).json({
          error: "Invalid email address format. Please check and try again."
        });
      }
      if (authError.message?.includes("password")) {
        return res.status(400).json({
          error: "Password does not meet requirements. Please use a stronger password."
        });
      }
      return res.status(400).json({
        error: authError.message || "Failed to create user account"
      });
    }
    if (!authData.user) {
      return res.status(500).json({ error: "Failed to create user" });
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    await supabaseAdmin.from("profiles").update({ name }).eq("id", authData.user.id);
    const { data: packageData, error: packageError } = await supabaseAdmin.from("packages").select("*").eq("id", packageId).single();
    if (packageError || !packageData) {
      return res.status(400).json({ error: "Package not found" });
    }
    const { error: subscriptionError } = await supabaseAdmin.from("user_subscriptions").insert({
      user_id: authData.user.id,
      package_id: packageId,
      status: "Active",
      billing_cycle: "monthly",
      amount: packageData.price_monthly,
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString(),
      payment_method: "manual"
    });
    if (subscriptionError) {
      console.error("Subscription error:", subscriptionError);
      return res.status(500).json({ error: "User created but subscription failed" });
    }
    return res.status(200).json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
async function handleDeleteUser(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    console.log("[Delete User] Starting deletion for user:", userId);
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("[Delete User] Auth deletion error:", authError);
      return res.status(500).json({
        error: "Failed to delete user from authentication",
        details: authError.message
      });
    }
    console.log("[Delete User] \u2713 Deleted from auth.users");
    const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
    if (profileError) {
      console.error("[Delete User] Profile deletion error:", profileError);
      console.log("[Delete User] \u26A0 Profile deletion failed but auth user is deleted");
    } else {
      console.log("[Delete User] \u2713 Deleted from profiles");
    }
    return res.status(200).json({
      success: true,
      message: "User deleted successfully from both authentication and database"
    });
  } catch (error) {
    console.error("[Delete User] Server error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
}
async function handleImpersonateUser(req, res) {
  try {
    const { userId, adminId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing user ID" });
    }
    if (!adminId) {
      return res.status(400).json({ error: "Missing admin ID" });
    }
    const { data: adminProfile, error: adminError } = await supabaseAdmin.from("profiles").select("role").eq("id", adminId).single();
    console.log("Admin check:", { adminId, adminProfile, adminError });
    if (adminError || !adminProfile) {
      console.error("Admin profile lookup failed:", adminError);
      return res.status(403).json({ error: "Unauthorized - could not verify admin status" });
    }
    const role = (adminProfile.role || "").toLowerCase();
    if (role !== "admin" && role !== "owner") {
      console.log("Role check failed:", { role, expected: ["admin", "owner"] });
      return res.status(403).json({ error: `Only admins can impersonate users (your role: ${adminProfile.role})` });
    }
    const { data: targetUser, error: userError } = await supabaseAdmin.from("profiles").select("email, name").eq("id", userId).single();
    if (userError || !targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const siteUrl = req.headers.origin || process.env.VITE_APP_URL || "http://localhost:5173";
    const redirectUrl = `${siteUrl}/dashboard`;
    console.log("Using redirect URL:", redirectUrl);
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: targetUser.email,
      options: {
        redirectTo: redirectUrl
      }
    });
    if (linkError) {
      console.error("Generate link error:", linkError);
      return res.status(500).json({ error: "Failed to generate impersonation link" });
    }
    return res.status(200).json({
      success: true,
      token: linkData.properties?.hashed_token,
      email: targetUser.email,
      userName: targetUser.name,
      actionLink: linkData.properties?.action_link
    });
  } catch (error) {
    console.error("Impersonation error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
async function handleGetGlobalStats(req, res) {
  try {
    const [
      { count: totalUsers },
      { count: verifiedUsers },
      { data: pagesData, count: totalPages },
      { data: flowsData, count: totalFlows },
      { data: storesData, count: totalStores },
      { data: subscribersData, count: totalSubscribers }
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).eq("email_verified", true),
      supabaseAdmin.from("connected_pages").select("id, name, page_id, page_image_url, workspace_id", { count: "exact" }),
      supabaseAdmin.from("flows").select("id, name, workspace_id", { count: "exact" }),
      supabaseAdmin.from("stores").select("id, name, slug, workspace_id, created_at", { count: "exact" }),
      supabaseAdmin.from("subscribers").select("platform", { count: "exact" })
    ]);
    const subscriberTotal = totalSubscribers || 1;
    const facebookCount = (subscribersData || []).filter((s) => s.platform === "FACEBOOK").length;
    const instagramCount = (subscribersData || []).filter((s) => s.platform === "INSTAGRAM").length;
    const otherCount = (subscribersData || []).filter((s) => s.platform && s.platform !== "FACEBOOK" && s.platform !== "INSTAGRAM").length;
    const subscriberSources = [
      { name: "TikTok", count: 0, percentage: 0 },
      { name: "Instagram", count: instagramCount, percentage: Math.round(instagramCount / subscriberTotal * 100) },
      { name: "Facebook", count: facebookCount, percentage: Math.round(facebookCount / subscriberTotal * 100) },
      { name: "Website", count: otherCount, percentage: Math.round(otherCount / subscriberTotal * 100) }
    ];
    const workspaceIds = [
      ...(pagesData || []).map((p) => p.workspace_id),
      ...(flowsData || []).map((f) => f.workspace_id),
      ...(storesData || []).map((s) => s.workspace_id)
    ].filter(Boolean);
    const uniqueWorkspaceIds = [...new Set(workspaceIds)];
    let workspaceMap = {};
    if (uniqueWorkspaceIds.length > 0) {
      const { data: workspaces } = await supabaseAdmin.from("workspaces").select("id, name").in("id", uniqueWorkspaceIds);
      workspaces?.forEach((w) => {
        workspaceMap[w.id] = w.name;
      });
    }
    return res.status(200).json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        verifiedUsers: verifiedUsers || 0,
        unverifiedUsers: (totalUsers || 0) - (verifiedUsers || 0),
        totalPages: totalPages || 0,
        totalFlows: totalFlows || 0,
        totalStores: totalStores || 0,
        totalSubscribers: totalSubscribers || 0,
        subscriberSources
      },
      lists: {
        pages: (pagesData || []).map((p) => ({
          id: p.id,
          name: p.name,
          pageId: p.page_id,
          imageUrl: p.page_image_url,
          workspaceName: workspaceMap[p.workspace_id] || "Unknown"
        })),
        flows: (flowsData || []).map((f) => ({
          id: f.id,
          name: f.name || "Untitled Flow",
          workspaceName: workspaceMap[f.workspace_id] || "Unknown"
        })),
        stores: (storesData || []).map((s) => ({
          id: s.id,
          name: s.name || "Untitled Store",
          slug: s.slug,
          workspaceName: workspaceMap[s.workspace_id] || "Unknown",
          createdAt: s.created_at
        }))
      }
    });
  } catch (error) {
    console.error("[Global Stats] Error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch global stats" });
  }
}
