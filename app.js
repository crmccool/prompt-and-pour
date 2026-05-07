console.log("Prompt & Pour app.js loaded");

function renderFatalError(error) {
  const message = error instanceof Error ? error.message : String(error || "Unknown runtime error");
  const detail = error instanceof Error && error.stack ? error.stack : "No stack trace available.";
  const panel = `<section class="panel login-card deco-border runtime-error" role="alert"><h1>Prompt &amp; Pour hit an error</h1><p class="muted">${message}</p><pre>${detail}</pre><p class="muted">Fallback mode is active. Refresh to retry.</p></section>`;
  const mount = document.getElementById("app");
  if (mount) mount.innerHTML = panel;
}
window.onerror = (_m, _s, _l, _c, error) => renderFatalError(error || _m);
window.addEventListener("unhandledrejection", (event) => renderFatalError(event.reason || "Unhandled promise rejection"));

const categories = ["Workflow & Admin", "Writing & Communication", "Data & Research", "Learning & Training", "Coding & Prototypes", "Creative & Visual", "Other / Not sure"];
const stages = ["Idea", "In Progress", "Prototype", "In Use"];
const ADMIN_FUNCTION_NAME = "prompt-pour-admin";
const AUTH_FUNCTION_NAME = "prompt-pour-auth";
const MEMBER_FUNCTION_NAME = "prompt-pour-member";
const MAX_SCREENSHOT_BYTES = 3 * 1024 * 1024;
const ALLOWED_SCREENSHOT_TYPES = ["image/png", "image/jpeg", "image/webp"];

const mockProjects = [
  { id: "p1", title: "Meeting Note Distiller", summary: "Turns rough meeting notes into concise action summaries.", creatorName: "Avery Chen", contactEmail: "avery@example.com", categories: ["Workflow & Admin", "Writing & Communication"], status: "In Use", toolsUsed: "ChatGPT, Docs, Zapier", problemSolved: "Busy teams struggled to convert notes into follow-ups.", howAiHelped: "AI generated draft summaries and owner/action checklists.", lessonsLearned: "Template quality matters more than model complexity.", helpWanted: "Looking for better quality checks before sending.", reusableBits: "Prompt skeleton for action-item extraction.", links: ["https://example.com/demo-1"], screenshotPlaceholder: "Screenshot placeholder", reusePermission: "Yes, adapt with credit.", createdDate: "2026-04-02", updatedDate: "2026-04-29", approved: true, featured: true, archived: false },
];

const state = { loggedIn: false, role: "member", route: "login", selectedCategory: "All", selectedStatus: "All", selectedProjectId: null, projects: [...mockProjects], dataSource: "mock", dataStatusReason: "Supabase not checked yet.", notice: "", dashboardNotice: "", loginError: "", adminToken: sessionStorage.getItem("promptPourAdminToken") || "", memberToken: sessionStorage.getItem("promptPourMemberToken") || "", adminPending: [], adminApproved: [], adminArchived: [], adminNotice: "", adminError: "", adminLoading: false, adminView: "pending", adminEditingId: "", adminEditDraft: {}, adminEditError: "", adminEditSuccess: "" };

async function waitForSupabaseLibrary(maxWaitMs = 4000) {
  if (window.supabase?.createClient) return true;
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (window.supabase?.createClient) return true;
  }
  return false;
}


async function getSupabaseClient() {
  const c = window.PROMPT_POUR_SUPABASE_CONFIG;
  if (!c?.url || !c?.anonKey) {
    state.dataStatusReason = "Supabase config missing.";
    console.warn("[Prompt & Pour] Falling back to mock data: missing Supabase config.");
    return null;
  }
  if (!window.supabase?.createClient) {
    const available = await waitForSupabaseLibrary();
    if (!available) {
      state.dataStatusReason = "Supabase client library missing.";
      console.warn("[Prompt & Pour] Falling back to mock data: Supabase client library is unavailable.");
      return null;
    }
  }
  try { return window.supabase.createClient(c.url, c.anonKey); } catch (error) { state.dataStatusReason = "Supabase client failed to initialize."; console.error("[Prompt & Pour] Failed to initialize Supabase client.", error); return null; }
}
function getAdminFunctionUrl() { const c = window.PROMPT_POUR_SUPABASE_CONFIG; return c?.url ? `${c.url}/functions/v1/${ADMIN_FUNCTION_NAME}` : ""; }
function getAuthFunctionUrl() { const c = window.PROMPT_POUR_SUPABASE_CONFIG; return c?.url ? `${c.url}/functions/v1/${AUTH_FUNCTION_NAME}` : ""; }
function getMemberFunctionUrl() { const c = window.PROMPT_POUR_SUPABASE_CONFIG; return c?.url ? `${c.url}/functions/v1/${MEMBER_FUNCTION_NAME}` : ""; }

function mapRowToProject(row) { return { id: row.id, title: row.title || "Untitled Pour", summary: row.summary || "", creatorName: row.creator_name || "Anonymous", contactEmail: row.creator_email || row.contact_email || "", categories: Array.isArray(row.categories) && row.categories.length ? row.categories : ["Other / Not sure"], status: row.status || "Idea", toolsUsed: Array.isArray(row.tools_used) ? row.tools_used.join(", ") : row.tools_used || "", problemSolved: row.problem_statement || "", howAiHelped: row.ai_use || "", lessonsLearned: row.lessons_learned || "", helpWanted: row.help_wanted || "", reusableBits: row.reusable_bits || "", links: Array.isArray(row.links) ? row.links : [], screenshotPath: row.screenshot_url || "", screenshotSignedUrl: row.screenshot_signed_url || "", screenshotUrl: row.screenshot_signed_url || row.screenshot_url || "", screenshotPlaceholder: "Screenshot placeholder", reusePermission: row.reuse_permission || "", createdDate: (row.created_at || "").slice(0, 10), updatedDate: (row.updated_at || row.created_at || "").slice(0, 10), approved: !!row.approved, featured: !!row.featured, archived: !!row.archived }; }

async function loadProjects() { const s = await getSupabaseClient(); if (!s) return render(); try { const { data, error } = await s.from("prompt_pour_pours").select("*").eq("approved", true).eq("archived", false).order("created_at", { ascending: false }); if (error) { state.dataStatusReason = `Supabase query failed: ${error.message}`; console.error("[Prompt & Pour] Failed to load approved pours from Supabase.", error); render(); return; } state.projects = data.map(mapRowToProject); await signMemberScreenshotUrls(state.projects); state.dataSource = "supabase"; state.dataStatusReason = "Supabase connected."; } catch (error) { state.dataStatusReason = "Supabase request failed."; console.error("[Prompt & Pour] Unexpected error while loading projects.", error); } render(); }

function setRoute(route, projectId = null) { state.route = route === "admin" && state.role !== "admin" && !state.adminToken ? "dashboard" : route; state.selectedProjectId = projectId; render(); }
const navButton = (label, route) => `<button class="${state.route === route ? "active" : ""}" onclick="setRoute('${route}')">${label}</button>`;
function topNav() {
  if (!state.loggedIn) return "";
  return `<header class="topbar"><div class="topbar-brand-row"><div class="brand-copy"><p class="brand-line"><span class="brand-primary">Prompt & Pour:</span><span class="brand-secondary">A Private Exchange</span></p><p class="brand-subhead">A back room for colleagues exploring A.I. before the playbook exists.</p></div><img class="brand-mascot" src="deco-bartender.png" alt="Art Deco robot bartender mascot" loading="lazy" decoding="async" /></div><div class="topbar-nav-row"><nav class="nav">${navButton("Home", "dashboard")}${navButton("House Pours", "gallery")}${navButton("Share a Build", "share")}${state.role === "admin" || state.adminToken ? navButton("Admin", "admin") : ""}${navButton("House Rules", "rules")}<button onclick="logout()">Exit</button></nav></div></header>`;
}
function dataStatusPill() { return `<aside class="data-status ${state.dataSource === "supabase" ? "ok" : "warn"}"><strong>Data mode:</strong> ${state.dataSource === "supabase" ? "Supabase connected" : "Mock fallback"}</aside>`; }
function filterControls() { return `<div class="filters"><label>Category<select onchange="setCategoryFilter(this.value)"><option>All</option>${categories.map((c) => `<option ${c === state.selectedCategory ? "selected" : ""}>${c}</option>`).join("")}</select></label><label>Stage<select onchange="setStatusFilter(this.value)"><option>All</option>${stages.map((s) => `<option ${s === state.selectedStatus ? "selected" : ""}>${s}</option>`).join("")}</select></label></div>`; }
const matchesFilters = (p) => (state.selectedCategory === "All" || p.categories.includes(state.selectedCategory)) && (state.selectedStatus === "All" || p.status === state.selectedStatus);
function escapeHtml(value) { return `${value || ""}`.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
function memberField(label, value) { return value ? `<section class="member-detail-field"><h4>${label}</h4><p>${escapeHtml(value)}</p></section>` : ""; }
function memberListField(label, values) { return Array.isArray(values) && values.length ? memberField(label, values.join(", ")) : ""; }
function memberLinksField(links) { return Array.isArray(links) && links.length ? `<section class="member-detail-field"><h4>Links</h4><ul class="member-links">${links.map((link) => `<li><a href="${escapeHtml(link)}" target="_blank" rel="noreferrer noopener">${escapeHtml(link)}</a></li>`).join("")}</ul></section>` : ""; }
function memberScreenshotField(project) { const screenshotUrl = getProjectScreenshotUrl(project); return screenshotUrl ? `<section class="member-detail-field"><h4>Screenshot</h4><a href="${escapeHtml(screenshotUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open full screenshot in new tab"><img class="member-screenshot" src="${escapeHtml(screenshotUrl)}" alt="Submitted build screenshot" loading="lazy" decoding="async" /></a></section>` : ""; }
function isAbsoluteHttpUrl(value) { return /^https?:\/\//i.test(String(value || "").trim()); }
function getProjectScreenshotUrl(project) {
  if (!project) return "";
  if (isAbsoluteHttpUrl(project.screenshotSignedUrl)) return project.screenshotSignedUrl;
  if (isAbsoluteHttpUrl(project.screenshotUrl)) return project.screenshotUrl;
  if (isAbsoluteHttpUrl(project.screenshotPath)) return project.screenshotPath;
  return "";
}
function memberCardScreenshot(project) {
  const thumbnailUrl = getProjectScreenshotUrl(project);
  return thumbnailUrl
    ? `<a class="member-card-screenshot-link" href="${escapeHtml(thumbnailUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open full screenshot in new tab"><img class="member-card-screenshot" src="${escapeHtml(thumbnailUrl)}" alt="Submitted build screenshot" loading="lazy" decoding="async" /></a>`
    : "";
}
function memberDetailPanel(p) {
  const detailFields = [
    memberField("Tools Used", p.toolsUsed),
    memberField("Problem Being Solved", p.problemSolved),
    memberField("Lessons Learned", p.lessonsLearned),
    memberLinksField(p.links),
    memberScreenshotField(p),
    memberField("Reuse Permission", p.reusePermission),
    memberField("Created", p.createdDate),
    memberField("Updated", p.updatedDate),
  ].filter(Boolean);
  return detailFields.length
    ? `<div class="member-detail-panel"><p class="member-detail-intro">Inside the pour</p>${detailFields.join("")}</div>`
    : `<div class="member-detail-panel"><p class="member-detail-empty">No additional project details were shared for this pour yet.</p></div>`;
}
function projectCard(p) { return `<article class="card"><h3>${p.title}</h3><div class="title-rule"></div>${memberCardScreenshot(p)}<p>${p.summary}</p><p class="muted"><strong>Creator:</strong> ${p.creatorName}</p><div class="badges">${p.categories.map((c) => `<span class="badge">${c}</span>`).join("")}<span class="badge status">Stage: ${escapeHtml(p.status || "Idea")}</span>${p.featured ? '<span class="badge">House Favorite</span>' : ""}</div><details class="member-pour-details"><summary>View details</summary>${memberDetailPanel(p)}<button class="button" type="button" onclick="this.closest('details').open=false">Close details</button></details></article>`; }
function loginPage() { return `<div class="login-wrap"><section class="panel login-card deco-border"><h1>Prompt &amp; Pour</h1><p class="muted">Speak the passphrase to open the door.</p><form onsubmit="event.preventDefault(); login();"><label>Passphrase<input id="access-passphrase-input" type="password" required /></label><button class="button" type="submit">Enter</button>${state.loginError ? `<p class="muted"><strong>${state.loginError}</strong></p>` : ""}</form></section></div>`; }
function dashboardPage() { const approved = state.projects.filter((p) => p.approved && !p.archived); const fresh = approved.slice(0, 3); const favorites = approved.filter((p) => p.featured); return `<section class="panel section-featured"><h2 class="section-title">House Favorites</h2><div class="grid">${favorites.map(projectCard).join("") || "<p>No featured cards yet.</p>"}</div></section><section class="panel" style="margin-top:1rem;"><h2 class="section-title">Fresh Pours</h2><div class="grid">${fresh.map(projectCard).join("") || "<p>No approved pours yet.</p>"}</div></section>`; }
function galleryPage() { const visible = state.projects.filter((p) => p.approved && !p.archived && matchesFilters(p)); return `<section class="panel hero"><h1 class="section-title">House Pours</h1>${filterControls()}<div class="grid">${visible.map(projectCard).join("") || "<p>No matching pours yet.</p>"}</div></section>`; }
function normalizeListField(v) { if (Array.isArray(v)) return v; if (!v) return []; return v.toString().split(",").map((x) => x.trim()).filter(Boolean); }
async function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));reader.onerror=()=>reject(new Error("Unable to read screenshot file."));reader.readAsDataURL(file);});}
async function signMemberScreenshotUrls(projects){const paths=[...new Set(projects.map((p)=>String(p.screenshotPath||"").trim()).filter((path)=>path&&!isAbsoluteHttpUrl(path)))];if(!paths.length||!state.memberToken)return;const u=getMemberFunctionUrl();if(!u)return;const r=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json","x-prompt-pour-member-token":state.memberToken},body:JSON.stringify({action:"sign_member_screenshots",paths})});if(!r.ok){console.warn("[Prompt & Pour] Unable to sign screenshot URLs for member view.",r.status);return;}const b=await r.json();for(const project of projects){if(project.screenshotPath&&isAbsoluteHttpUrl(b?.signed?.[project.screenshotPath])){project.screenshotSignedUrl=b.signed[project.screenshotPath];project.screenshotUrl=project.screenshotSignedUrl;}}}
async function submitPour(e) { const f = new FormData(e.target); const screenshotFile = f.get("screenshot"); const payload = { title: `${f.get("title") || ""}`.trim(), creator_name: `${f.get("creatorName") || ""}`.trim(), summary: `${f.get("summary") || ""}`.trim(), categories: normalizeListField(f.get("category")), status: `${f.get("status") || "Idea"}`, tools_used: normalizeListField(f.get("toolsUsed")), problem_statement: `${f.get("problemSolved") || ""}`.trim(), lessons_learned: `${f.get("lessonsLearned") || ""}`.trim(), links: `${f.get("links") || ""}`.trim() ? [`${f.get("links")}`.trim()] : [], approved: false, featured: false, archived: false };
  if (screenshotFile instanceof File && screenshotFile.size > 0) {
    if (!ALLOWED_SCREENSHOT_TYPES.includes(screenshotFile.type)) { alert("Screenshot must be PNG, JPG/JPEG, or WebP."); return; }
    if (screenshotFile.size > MAX_SCREENSHOT_BYTES) { alert("Screenshot must be 3 MB or smaller."); return; }
    if (!state.memberToken) { alert("Please sign in again before uploading a screenshot."); return; }
    const uploadUrl = getMemberFunctionUrl();
    if (!uploadUrl) { alert("Screenshot upload is temporarily unavailable."); return; }
    const dataUrl = await fileToDataUrl(screenshotFile);
    const uploadResponse = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "application/json", "x-prompt-pour-member-token": state.memberToken }, body: JSON.stringify({ action: "upload_screenshot", fileName: screenshotFile.name, contentType: screenshotFile.type, dataUrl }) });
    const uploadBody = await uploadResponse.json();
    if (!uploadResponse.ok || !uploadBody?.path) { alert(uploadBody?.error || "Screenshot upload failed."); return; }
    payload.screenshot_url = uploadBody.path;
  }
  const s = await getSupabaseClient(); if (s) { const { error } = await s.from("prompt_pour_pours").insert(payload); if (!error) { e.target.reset(); state.dashboardNotice = "Your build was submitted for review. It will appear in House Pours once approved."; setRoute("dashboard"); return; } }
}
function sharePage() { return `<section class="panel hero"><h1 class="section-title">Share a Build</h1><form onsubmit="event.preventDefault(); submitPour(event);"><div class="two-col"><label>Title<input name="title" required /></label><label>Creator Name<input name="creatorName" required /></label></div><label>Summary<textarea name="summary"></textarea></label><div class="two-col"><label>Category<select name="category">${categories.map((c) => `<option>${c}</option>`).join("")}</select></label><label>Stage<select name="status">${stages.map((s) => `<option>${s}</option>`).join("")}</select></label></div><label>Tools Used<input name="toolsUsed" /></label><label>Problem Being Solved<textarea name="problemSolved"></textarea></label><label>Lessons Learned<textarea name="lessonsLearned"></textarea></label><label>Links<input name="links" /></label><label>Screenshot (optional)<input name="screenshot" type="file" accept="image/png,image/jpeg,image/webp" /></label><p class="muted">Optional screenshot. Please avoid uploading confidential, patient, student, proprietary, or otherwise sensitive information.</p><button class="button" type="submit">Submit</button></form></section>`; }
function projectDetailPage() { const p = state.projects.find((x) => String(x.id) === String(state.selectedProjectId)); return p ? `<section class="panel"><h1 class="section-title">${p.title}</h1>${memberDetailPanel(p)}</section>` : `<section class="panel"><p>Project not found.</p></section>`; }

async function callAdminAction(action, id, updates) { const u = getAdminFunctionUrl(); const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json", "x-prompt-pour-admin-token": state.adminToken }, body: JSON.stringify({ action, id, updates }) }); const b = await r.json(); if (!r.ok) throw new Error(b.error || "Action failed"); return b; }
async function refreshAdminLists() { state.adminLoading = true; render(); try { const p = await callAdminAction("list_pending"); const a = await callAdminAction("list_approved"); const ar = await callAdminAction("list_archived"); state.adminPending = (p.rows || []).map(mapRowToProject); state.adminApproved = (a.rows || []).map(mapRowToProject); state.adminArchived = (ar.rows || []).map(mapRowToProject); state.adminError = ""; } catch (e) { state.adminError = e.message; } state.adminLoading = false; render(); }
async function adminLogin() { const passphrase = document.getElementById("admin-secret-input")?.value?.trim(); if (!passphrase) return; const authUrl = getAuthFunctionUrl(); if (!authUrl) return; try { const response = await fetch(authUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passphrase }) }); const body = await response.json(); if (!response.ok || body?.role !== "admin" || !body?.adminToken) throw new Error(body?.error || "Unauthorized"); state.adminToken = body.adminToken; sessionStorage.setItem("promptPourAdminToken", state.adminToken); state.adminError = ""; await refreshAdminLists(); } catch (error) { state.adminToken = ""; sessionStorage.removeItem("promptPourAdminToken"); state.adminPending = []; state.adminApproved = []; state.adminArchived = []; state.adminError = error.message || "That passphrase did not open the door."; render(); } }
function clearAdminSession() { state.adminToken = ""; sessionStorage.removeItem("promptPourAdminToken"); state.adminPending = []; state.adminApproved = []; state.adminArchived = []; render(); }
async function moderatePour(action, id) { await callAdminAction(action, id); await refreshAdminLists(); await loadProjects(); }
function startAdminEdit(projectId) {
  const all = [...state.adminPending, ...state.adminApproved, ...state.adminArchived];
  const project = all.find((entry) => String(entry.id) === String(projectId));
  if (!project) return;
  state.adminEditingId = String(projectId);
  state.adminEditError = "";
  state.adminEditSuccess = "";
  state.adminEditDraft = { title: project.title || "", creatorName: project.creatorName || "", contactEmail: project.contactEmail || "", summary: project.summary || "", categories: (project.categories || []).join(", "), toolsUsed: project.toolsUsed || "", problemSolved: project.problemSolved || "", howAiHelped: project.howAiHelped || "", lessonsLearned: project.lessonsLearned || "", helpWanted: project.helpWanted || "", reusableBits: project.reusableBits || "", links: (project.links || []).join(", "), reusePermission: project.reusePermission || "" };
  render();
}
function updateAdminEditField(field, value) { state.adminEditDraft[field] = value; }
function cancelAdminEdit() { state.adminEditingId = ""; state.adminEditDraft = {}; state.adminEditError = ""; render(); }
async function saveAdminEdit(id) {
  const d = state.adminEditDraft;
  const updates = { title: `${d.title || ""}`.trim(), creator_name: `${d.creatorName || ""}`.trim(), creator_email: `${d.contactEmail || ""}`.trim(), summary: `${d.summary || ""}`.trim(), categories: normalizeListField(d.categories), tools_used: normalizeListField(d.toolsUsed), problem_statement: `${d.problemSolved || ""}`.trim(), ai_use: `${d.howAiHelped || ""}`.trim(), lessons_learned: `${d.lessonsLearned || ""}`.trim(), help_wanted: `${d.helpWanted || ""}`.trim(), reusable_bits: `${d.reusableBits || ""}`.trim(), links: normalizeListField(d.links), reuse_permission: `${d.reusePermission || ""}`.trim() };
  state.adminEditError = "";
  try { await callAdminAction("edit_pour", id, updates); state.adminEditSuccess = "Saved."; state.adminEditingId = ""; state.adminEditDraft = {}; await refreshAdminLists(); await loadProjects(); } catch (e) { state.adminEditError = e.message || "Unable to save edits."; render(); }
}
function adminField(label, value) { return value ? `<p><strong>${label}:</strong> ${value}</p>` : ""; }
function adminListField(label, values) { return Array.isArray(values) && values.length ? adminField(label, values.join(", ")) : ""; }
function adminLinksField(links) { return Array.isArray(links) && links.length ? `<p><strong>Links:</strong> ${links.map((link) => `<a href="${link}" target="_blank" rel="noreferrer">${link}</a>`).join("<br/>")}</p>` : ""; }
function adminScreenshotField(url) { return url ? `<p><strong>Screenshot:</strong></p><img class="member-screenshot" src="${escapeHtml(url)}" alt="Submitted screenshot preview" loading="lazy" decoding="async" />` : ""; }
function adminCard(p, buttons, showExpandedDetails = false) {
  const fullDetails = [
    adminField("Problem Solved", p.problemSolved),
    adminField("How it Helped", p.howAiHelped),
    adminField("Lessons Learned", p.lessonsLearned),
    adminField("Reusable Bits", p.reusableBits),
    adminLinksField(p.links),
    adminScreenshotField(p.screenshotUrl),
  ].join("");
  if (state.adminEditingId === String(p.id)) {
    return `<article class="card"><h3>Edit Pour</h3><div class="admin-edit-form"><label>Title<input value="${state.adminEditDraft.title || ""}" oninput="updateAdminEditField('title', this.value)" /></label><div class="two-col"><label>Creator<input value="${state.adminEditDraft.creatorName || ""}" oninput="updateAdminEditField('creatorName', this.value)" /></label><label>Contact Email<input value="${state.adminEditDraft.contactEmail || ""}" oninput="updateAdminEditField('contactEmail', this.value)" /></label></div><label>Categories (comma-separated)<input value="${state.adminEditDraft.categories || ""}" oninput="updateAdminEditField('categories', this.value)" /></label><label>Summary<textarea oninput="updateAdminEditField('summary', this.value)">${state.adminEditDraft.summary || ""}</textarea></label><label>Tools Used (comma-separated)<input value="${state.adminEditDraft.toolsUsed || ""}" oninput="updateAdminEditField('toolsUsed', this.value)" /></label><label>Problem Being Solved<textarea oninput="updateAdminEditField('problemSolved', this.value)">${state.adminEditDraft.problemSolved || ""}</textarea></label><label>How AI Helped<textarea oninput="updateAdminEditField('howAiHelped', this.value)">${state.adminEditDraft.howAiHelped || ""}</textarea></label><label>Lessons Learned<textarea oninput="updateAdminEditField('lessonsLearned', this.value)">${state.adminEditDraft.lessonsLearned || ""}</textarea></label><label>Help Wanted<textarea oninput="updateAdminEditField('helpWanted', this.value)">${state.adminEditDraft.helpWanted || ""}</textarea></label><label>Reusable Bits<textarea oninput="updateAdminEditField('reusableBits', this.value)">${state.adminEditDraft.reusableBits || ""}</textarea></label><label>Links (comma-separated)<input value="${state.adminEditDraft.links || ""}" oninput="updateAdminEditField('links', this.value)" /></label><label>Reuse Permission<input value="${state.adminEditDraft.reusePermission || ""}" oninput="updateAdminEditField('reusePermission', this.value)" /></label>${state.adminEditError ? `<p class="muted"><strong>${state.adminEditError}</strong></p>` : ""}<div class="admin-actions"><button class="button" onclick="saveAdminEdit('${p.id}')">Save</button><button class="button" onclick="cancelAdminEdit()">Cancel</button></div></div></article>`;
  }
  return `<article class="card"><h3>${p.title}</h3>${adminField("Creator", p.creatorName)}${adminField("Contact Email", p.contactEmail)}${adminListField("Categories", p.categories)}${adminField("Stage", p.status)}${adminField("Summary", p.summary)}${adminField("Created Date", p.createdDate)}${showExpandedDetails && fullDetails ? `<details><summary>View full submission</summary>${fullDetails}</details>` : fullDetails}<div class="admin-actions">${buttons}<button class='button' onclick="startAdminEdit('${p.id}')">Edit</button></div></article>`;
}

function setAdminView(view) {
  const allowed = ["pending", "approved", "archived"];
  if (!allowed.includes(view)) return;
  state.adminView = view;
  render();
}
function adminViewTab(view, label, count) {
  const isActive = state.adminView === view;
  return `<button class="button ${isActive ? "active" : ""}" onclick="setAdminView('${view}')">${label} (${count})</button>`;
}
function adminSectionForView() {
  if (state.adminView === "approved") {
    return `<h2 class="section-title">Approved Pours</h2><div class="grid">${state.adminApproved.map((p) => adminCard(p, `${p.featured ? `<button class='button' onclick="moderatePour('unfeature','${p.id}')">Unfeature</button>` : `<button class='button' onclick="moderatePour('feature','${p.id}')">Feature</button>`}<button class='button' onclick="moderatePour('archive','${p.id}')">Archive</button>`, true)).join("") || "<p>No approved pours found.</p>"}</div>`;
  }
  if (state.adminView === "archived") {
    return `<h2 class="section-title">Archived Pours</h2><div class="grid">${state.adminArchived.map((p) => adminCard(p, `<button class='button' onclick="moderatePour('restore','${p.id}')">Restore</button>`, true)).join("") || "<p>No archived pours found.</p>"}</div>`;
  }
  return `<h2 class="section-title">Pending Pours</h2><div class="grid">${state.adminPending.map((p) => adminCard(p, `<button class='button' onclick="moderatePour('approve','${p.id}')">Approve</button><button class='button' onclick="moderatePour('archive','${p.id}')">Archive</button>`, true)).join("") || "<p>No pending pours.</p>"}</div>`;
}
function adminPage() {
  if (!state.adminToken) return `<section class="panel hero"><h1 class="section-title">Admin Dashboard</h1><label>Admin Passphrase<input id="admin-secret-input" type="password" /></label><button class="button" onclick="adminLogin()">Unlock Moderation</button>${state.adminError ? `<p class="muted"><strong>${state.adminError}</strong></p>` : ""}</section>`;
  return `<section class="panel hero"><h1 class="section-title">Admin Dashboard</h1><div class="admin-toolbar"><button class="button" onclick="refreshAdminLists()">Refresh</button><button class="button" onclick="clearAdminSession()">Lock</button></div><div class="admin-toolbar admin-tabs">${adminViewTab("pending", "Pending Pours", state.adminPending.length)}${adminViewTab("approved", "Approved Pours", state.adminApproved.length)}${adminViewTab("archived", "Archived Pours", state.adminArchived.length)}</div>${state.adminEditSuccess ? `<p class="muted"><strong>${state.adminEditSuccess}</strong></p>` : ""}${state.adminLoading ? "<p class='muted'>Loading moderation lists...</p>" : ""}${adminSectionForView()}</section>`;
}

function rulesPage() { return `<section class="panel"><h1>House Rules</h1><p class="rule-quote">No empty glasses.</p></section>`; }
async function login() {
  const passphrase = document.getElementById("access-passphrase-input")?.value?.trim();
  if (!passphrase) return;

  state.loginError = "";
  state.adminError = "";

  const authUrl = getAuthFunctionUrl();
  if (!authUrl) {
    state.loginError = "That passphrase did not open the door.";
    render();
    return;
  }

  try {
    const response = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passphrase }),
    });
    const body = await response.json();

    if (!response.ok || !body?.role) {
      throw new Error(body?.error || "Unauthorized");
    }

    if (body.role === "admin") {
      if (!body?.adminToken) {
        throw new Error("Missing admin session token");
      }
      state.adminToken = body.adminToken;
      sessionStorage.setItem("promptPourAdminToken", body.adminToken);
      state.role = "admin";
      state.loggedIn = true;
      await refreshAdminLists();
      setRoute("admin");
      return;
    }

    if (!body?.memberToken) {
      throw new Error("Missing member session token");
    }
    state.adminToken = "";
    state.memberToken = body.memberToken;
    sessionStorage.setItem("promptPourMemberToken", state.memberToken);
    
    sessionStorage.removeItem("promptPourAdminToken");
    state.adminPending = [];
    state.adminApproved = [];
    state.adminArchived = [];
    state.role = "member";
    state.loggedIn = true;
    await loadProjects();
    setRoute("dashboard");
  } catch (error) {
    state.adminToken = "";
    state.memberToken = "";
    sessionStorage.removeItem("promptPourMemberToken");
    sessionStorage.removeItem("promptPourAdminToken");
    state.adminPending = [];
    state.adminApproved = [];
    state.adminArchived = [];
    state.loginError = "That passphrase did not open the door.";
    console.error("[Prompt & Pour] Login failed.", error);
    render();
  }
}
function logout() { state.loggedIn = false; state.role = "member"; state.loginError = ""; state.memberToken = ""; state.adminToken = ""; sessionStorage.removeItem("promptPourMemberToken"); sessionStorage.removeItem("promptPourAdminToken"); setRoute("login"); }
function restoreSessionState() {
  const storedAdminToken = sessionStorage.getItem("promptPourAdminToken") || "";
  const storedMemberToken = sessionStorage.getItem("promptPourMemberToken") || "";
  state.adminToken = storedAdminToken;
  state.memberToken = storedMemberToken;
  

  if (storedAdminToken) {
    state.role = "admin";
    state.loggedIn = true;
    state.route = "admin";
    return;
  }

  if (storedMemberToken) {
    state.role = "member";
    state.loggedIn = true;
    state.route = "dashboard";
    return;
  }

  if (state.loggedIn && state.role === "member" && !state.memberToken) {
    console.warn("[Prompt & Pour] Member marked as logged in without member token; resetting to login state.");
    state.loggedIn = false;
    state.route = "login";
  }
}
function setCategoryFilter(v) { state.selectedCategory = v; render(); }
function setStatusFilter(v) { state.selectedStatus = v; render(); }
function render() { const app = document.getElementById("app"); if (!app) return; if (!state.loggedIn) app.innerHTML = loginPage(); else { const pages = { dashboard: dashboardPage, gallery: galleryPage, share: sharePage, admin: adminPage, rules: rulesPage, project: projectDetailPage }; app.innerHTML = `<div class="layout">${topNav()}<main class="main">${(pages[state.route] || dashboardPage)()}</main>${dataStatusPill()}</div>`; } }
Object.assign(window, { setRoute, login, logout, setCategoryFilter, setStatusFilter, submitPour, adminLogin, clearAdminSession, refreshAdminLists, moderatePour, setAdminView, startAdminEdit, updateAdminEditField, cancelAdminEdit, saveAdminEdit });

function startApp() { restoreSessionState(); render(); void loadProjects(); if (state.adminToken) void refreshAdminLists(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp, { once: true }); else startApp();
