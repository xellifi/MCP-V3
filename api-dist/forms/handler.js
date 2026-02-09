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

// api/forms/handler.ts
var handler_exports = {};
__export(handler_exports, {
  default: () => handler
});
module.exports = __toCommonJS(handler_exports);
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey);
function generateFormHtml(form, subscriberId, subscriberName) {
  const borderRadius = form.border_radius === "full" ? "9999px" : form.border_radius === "round" ? "16px" : "8px";
  const inputRadius = form.border_radius === "full" ? "24px" : form.border_radius === "round" ? "12px" : "8px";
  const fieldsHtml = (form.fields || []).map((field) => {
    const requiredAttr = field.required ? "required" : "";
    const requiredStar = field.required ? '<span style="color: #ef4444;">*</span>' : "";
    let inputHtml = "";
    switch (field.type) {
      case "textarea":
        inputHtml = `
          <textarea 
            name="${field.id}" 
            placeholder="${field.placeholder || ""}" 
            ${requiredAttr}
            rows="4"
            style="
              width: 100%;
              padding: 14px 18px;
              border: 2px solid #e2e8f0;
              border-radius: ${inputRadius};
              font-size: 16px;
              background: #fff;
              transition: all 0.2s;
              resize: vertical;
              font-family: inherit;
            "
            onfocus="this.style.borderColor='${form.submit_button_color}'; this.style.boxShadow='0 0 0 3px ${form.submit_button_color}22'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'"
          ></textarea>
        `;
        break;
      case "select":
        const optionsHtml = (field.options || []).map(
          (opt) => `<option value="${opt}">${opt}</option>`
        ).join("");
        inputHtml = `
          <select 
            name="${field.id}" 
            ${requiredAttr}
            style="
              width: 100%;
              padding: 14px 18px;
              border: 2px solid #e2e8f0;
              border-radius: ${inputRadius};
              font-size: 16px;
              background: #fff;
              transition: all 0.2s;
              font-family: inherit;
              cursor: pointer;
            "
            onfocus="this.style.borderColor='${form.submit_button_color}'"
            onblur="this.style.borderColor='#e2e8f0'"
          >
            <option value="">Select...</option>
            ${optionsHtml}
          </select>
        `;
        break;
      case "radio":
        const radioHtml = (field.options || []).map((opt, i) => `
          <label style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #f8fafc; border-radius: ${inputRadius}; cursor: pointer; transition: all 0.2s;" 
                 onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
            <input type="radio" name="${field.id}" value="${opt}" ${requiredAttr && i === 0 ? "required" : ""} 
                   style="width: 20px; height: 20px; accent-color: ${form.submit_button_color};">
            <span style="font-size: 15px; color: #334155;">${opt}</span>
          </label>
        `).join("");
        inputHtml = `<div style="display: flex; flex-direction: column; gap: 8px;">${radioHtml}</div>`;
        break;
      case "checkbox":
        inputHtml = `
          <label style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #f8fafc; border-radius: ${inputRadius}; cursor: pointer;">
            <input type="checkbox" name="${field.id}" value="true" ${requiredAttr}
                   style="width: 20px; height: 20px; accent-color: ${form.submit_button_color};">
            <span style="font-size: 15px; color: #334155;">${field.label}</span>
          </label>
        `;
        break;
      default:
        const inputType = field.type === "phone" ? "tel" : field.type;
        inputHtml = `
          <input 
            type="${inputType}" 
            name="${field.id}" 
            placeholder="${field.placeholder || ""}" 
            ${requiredAttr}
            style="
              width: 100%;
              padding: 14px 18px;
              border: 2px solid #e2e8f0;
              border-radius: ${inputRadius};
              font-size: 16px;
              background: #fff;
              transition: all 0.2s;
              font-family: inherit;
            "
            onfocus="this.style.borderColor='${form.submit_button_color}'; this.style.boxShadow='0 0 0 3px ${form.submit_button_color}22'"
            onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'"
          />
        `;
    }
    const labelHtml = field.type !== "checkbox" ? `
      <label style="display: block; font-weight: 600; color: #1e293b; margin-bottom: 8px; font-size: 14px;">
        ${field.label} ${requiredStar}
      </label>
    ` : "";
    return `
      <div style="margin-bottom: 20px;">
        ${labelHtml}
        ${inputHtml}
      </div>
    `;
  }).join("");
  const headerImageHtml = form.header_image_url ? `
    <div style="margin: -24px -24px 24px -24px; border-radius: ${borderRadius} ${borderRadius} 0 0; overflow: hidden;">
      <img src="${form.header_image_url}" alt="" style="width: 100%; height: 180px; object-fit: cover;">
    </div>
  ` : "";
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${form.name || "Form"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    .form-container {
      width: 100%;
      max-width: 480px;
      background: white;
      border-radius: ${borderRadius};
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      padding: 24px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 24px;
      text-align: center;
    }
    .submit-btn {
      width: 100%;
      padding: 16px 24px;
      background: ${form.submit_button_color};
      color: white;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: ${borderRadius};
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 8px;
    }
    .submit-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
    .submit-btn:active {
      transform: translateY(0);
    }
    .submit-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .success-message {
      text-align: center;
      padding: 40px 20px;
    }
    .success-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .success-text {
      font-size: 18px;
      color: #1e293b;
      line-height: 1.6;
    }
    @media (max-width: 480px) {
      .form-container { padding: 20px; }
      h1 { font-size: 20px; }
    }
  </style>
</head>
<body>
  <div class="form-container" id="formContainer">
    ${headerImageHtml}
    <h1>${form.name || "Form"}</h1>
    <form id="mainForm" onsubmit="handleSubmit(event)">
      <input type="hidden" name="formId" value="${form.id}">
      <input type="hidden" name="subscriberId" value="${subscriberId || ""}">
      <input type="hidden" name="subscriberName" value="${subscriberName || ""}">
      ${fieldsHtml}
      <button type="submit" class="submit-btn" id="submitBtn">
        ${form.submit_button_text || "Submit"}
      </button>
    </form>
    <div id="successMessage" style="display: none;" class="success-message">
      <div class="success-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <p class="success-text">${form.success_message || "Thank you for your submission!"}</p>
    </div>
  </div>
  
  <script>
    async function handleSubmit(e) {
      e.preventDefault();
      const form = e.target;
      const btn = document.getElementById('submitBtn');
      const formData = new FormData(form);
      const data = {};
      
      for (let [key, value] of formData.entries()) {
        data[key] = value;
      }
      
      btn.disabled = true;
      btn.textContent = 'Submitting...';
      
      try {
        const response = await fetch('/api/forms/handler?action=submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (response.ok) {
          form.style.display = 'none';
          document.getElementById('successMessage').style.display = 'block';
          
          // Close webview if in Messenger
          if (window.MessengerExtensions) {
            setTimeout(() => {
              MessengerExtensions.requestCloseBrowser(function success() {}, function error() {});
            }, 2000);
          }
        } else {
          throw new Error('Submission failed');
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '${form.submit_button_text || "Submit"}';
        alert('Something went wrong. Please try again.');
      }
    }
  </script>
</body>
</html>
  `;
}
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const action = req.query.action || "render";
  try {
    switch (action) {
      case "render":
        return handleRender(req, res);
      case "view":
        return handleView(req, res);
      case "submit":
        return handleSubmit(req, res);
      case "mark-submitted":
        return handleMarkSubmitted(req, res);
      case "update":
        return handleUpdate(req, res);
      case "delete":
        return handleDelete(req, res);
      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("[Forms Handler] Exception:", error);
    return res.status(500).json({ error: error.message });
  }
}
async function handleRender(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { id } = req.query;
  const { sid, sname } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Form ID is required" });
  }
  try {
    const { data: form, error } = await supabase.from("forms").select("*").eq("id", id).single();
    if (error || !form) {
      return res.status(404).send(`
        <html>
          <body style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <div style="text-align: center;">
              <h1 style="color: #ef4444;">Form Not Found</h1>
              <p style="color: #64748b;">This form may have been deleted or the link is invalid.</p>
            </div>
          </body>
        </html>
      `);
    }
    const html = generateFormHtml(form, sid, sname);
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  } catch (err) {
    console.error("Form render error:", err);
    res.status(500).send("Internal server error");
  }
}
async function handleView(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const formId = req.query.id;
  const subscriberId = req.query.sid;
  const subscriberName = req.query.sname;
  if (!formId) {
    return res.status(400).send(`
        <html>
          <body style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <div style="text-align: center;">
              <h1 style="color: #ef4444;">Missing Form ID</h1>
              <p style="color: #64748b;">Please provide a form ID in the URL.</p>
            </div>
          </body>
        </html>
      `);
  }
  try {
    const { data: form, error } = await supabase.from("forms").select("*").eq("id", formId).single();
    if (error || !form) {
      console.error("Form fetch error:", error);
      return res.status(404).send(`
        <html>
          <body style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
            <div style="text-align: center;">
              <h1 style="color: #ef4444;">Form Not Found</h1>
              <p style="color: #64748b;">This form may have been deleted or the link is invalid.</p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">Form ID: ${formId}</p>
            </div>
          </body>
        </html>
      `);
    }
    const html = generateFormHtml(form, subscriberId, subscriberName);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(200).send(html);
  } catch (err) {
    console.error("Form render error:", err);
    return res.status(500).send(`
      <html>
        <body style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif;">
          <div style="text-align: center;">
            <h1 style="color: #ef4444;">Server Error</h1>
            <p style="color: #64748b;">Something went wrong. Please try again later.</p>
          </div>
        </body>
      </html>
    `);
  }
}
async function handleSubmit(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { formId, subscriberId, subscriberName, submissionData } = req.body;
  console.log("[Submit Form] Creating submission for form:", formId);
  if (!formId) {
    return res.status(400).json({ error: "Missing formId" });
  }
  const { data: submission, error: insertError } = await supabase.from("form_submissions").insert({
    form_id: formId,
    subscriber_external_id: subscriberId || null,
    subscriber_name: subscriberName || "Guest",
    data: submissionData || {},
    synced_to_sheets: false
  }).select("id").single();
  if (insertError) {
    console.error("[Submit Form] Insert error:", insertError);
    return res.status(500).json({
      error: "Failed to save submission",
      details: insertError.message
    });
  }
  console.log("[Submit Form] \u2713 Submission created with ID:", submission.id);
  return res.status(200).json({
    success: true,
    submissionId: submission.id
  });
}
async function handleMarkSubmitted(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { formId, subscriberId } = req.body;
  console.log("[Mark Submitted] Form:", formId, "Subscriber:", subscriberId);
  if (!subscriberId) {
    return res.status(400).json({ error: "Missing subscriberId" });
  }
  const { error } = await supabase.from("form_opens").update({
    submitted_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("subscriber_id", subscriberId).is("submitted_at", null).order("opened_at", { ascending: false }).limit(1);
  if (error) {
    console.error("[Mark Submitted] Error:", error);
  } else {
    console.log("[Mark Submitted] \u2713 Marked as submitted");
  }
  return res.status(200).json({ success: true });
}
async function handleUpdate(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { submissionId, status } = req.body;
  if (!submissionId || !status) {
    return res.status(400).json({ error: "Missing submissionId or status" });
  }
  console.log("[Update Status] Updating:", submissionId, "to status:", status);
  try {
    const { data: submission, error: fetchError } = await supabase.from("form_submissions").select("data, form_id, forms(google_webhook_url, google_sheet_name)").eq("id", submissionId).single();
    if (fetchError || !submission) {
      console.error("[Update Status] Fetch error:", fetchError);
      return res.status(404).json({ error: "Submission not found" });
    }
    const updatedData = {
      ...submission.data || {},
      order_status: status
    };
    const updatePayload = { data: updatedData };
    if (status === "processing") {
      updatePayload.synced_to_sheets = true;
    }
    const { error: updateError } = await supabase.from("form_submissions").update(updatePayload).eq("id", submissionId);
    if (updateError) {
      console.error("[Update Status] Update error:", updateError);
      return res.status(500).json({ error: "Failed to update status" });
    }
    console.log("[Update Status] \u2713 Status saved successfully", status === "processing" ? "(marked as synced)" : "");
    const form = submission?.forms;
    return res.status(200).json({
      success: true,
      webhookUrl: form?.google_webhook_url,
      sheetName: form?.google_sheet_name,
      updatedData
    });
  } catch (err) {
    console.error("[Update Status] Exception:", err);
    return res.status(500).json({ error: err.message });
  }
}
async function handleDelete(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { submissionId } = req.body;
  if (!submissionId) {
    return res.status(400).json({ error: "Missing submissionId" });
  }
  console.log("[Delete Submission]", submissionId);
  try {
    const { error } = await supabase.from("form_submissions").delete().eq("id", submissionId);
    if (error) {
      console.error("[Delete Submission] Error:", error);
      return res.status(500).json({ error: "Failed to delete submission" });
    }
    console.log("[Delete Submission] \u2713 Deleted successfully");
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[Delete Submission] Exception:", err);
    return res.status(500).json({ error: err.message });
  }
}
