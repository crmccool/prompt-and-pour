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
const statuses = ["Idea", "In Progress", "In Use", "Needs Help"];
const ADMIN_FUNCTION_NAME = "prompt-pour-admin";
const MEMBER_PASSPHRASE = window.PROMPT_POUR_MEMBER_PASSPHRASE || "";

const mockProjects = [
  { id: "p1", title: "Meeting Note Distiller", summary: "Turns rough meeting notes into concise action summaries.", creatorName: "Avery Chen", contactEmail: "avery@example.com", categories: ["Workflow & Admin", "Writing & Communication"], status: "In Use", toolsUsed: "ChatGPT, Docs, Zapier", problemSolved: "Busy teams struggled to convert notes into follow-ups.", howAiHelped: "AI generated draft summaries and owner/action checklists.", lessonsLearned: "Template quality matters more than model complexity.", helpWanted: "Looking for better quality checks before sending.", reusableBits: "Prompt skeleton for action-item extraction.", links: ["https://example.com/demo-1"], screenshotPlaceholder: "Screenshot placeholder", reusePermission: "Yes, adapt with credit.", createdDate: "2026-04-02", updatedDate: "2026-04-29", approved: true, featured: true, archived: false },
];

const state = { loggedIn: false, role: "member", route: "login", selectedCategory: "All", selectedStatus: "All", selectedProjectId: null, projects: [...mockProjects], dataSource: "mock", dataStatusReason: "Supabase not checked yet.", notice: "", dashboardNotice: "", loginError: "", adminSecret: sessionStorage.getItem("promptPourAdminSecret") || "", adminPending: [], adminApproved: [], adminNotice: "", adminError: "", adminLoading: false };

function getSupabaseClient() {
  const c = window.PROMPT_POUR_SUPABASE_CONFIG;
  if (!(c && c.url && c.anonKey && window.supabase?.createClient)) { state.dataStatusReason = "Supabase config missing."; return null; }
  try { return window.supabase.createClient(c.url, c.anonKey); } catch { return null; }
}
function getAdminFunctionUrl() { const c = window.PROMPT_POUR_SUPABASE_CONFIG; return c?.url ? `${c.url}/functions/v1/${ADMIN_FUNCTION_NAME}` : ""; }

function mapRowToProject(row) { return { id: row.id, title: row.title || "Untitled Pour", summary: row.summary || "", creatorName: row.creator_name || "Anonymous", contactEmail: row.contact_email || "", categories: Array.isArray(row.categories) && row.categories.length ? row.categories : ["Other / Not sure"], status: row.status || "Idea", toolsUsed: Array.isArray(row.tools_used) ? row.tools_used.join(", ") : row.tools_used || "", problemSolved: row.problem_statement || "", howAiHelped: row.ai_use || "", lessonsLearned: row.lessons_learned || "", helpWanted: row.help_wanted || "", reusableBits: row.reusable_bits || "", links: Array.isArray(row.links) ? row.links : [], screenshotPlaceholder: "Screenshot placeholder", reusePermission: row.reuse_permission || "", createdDate: (row.created_at || "").slice(0, 10), updatedDate: (row.updated_at || row.created_at || "").slice(0, 10), approved: !!row.approved, featured: !!row.featured, archived: !!row.archived }; }

async function loadProjects() { const s = getSupabaseClient(); if (!s) return render(); const { data, error } = await s.from("prompt_pour_pours").select("*").eq("approved", true).eq("archived", false).order("created_at", { ascending: false }); if (!error) { state.projects = data.map(mapRowToProject); state.dataSource = "supabase"; } render(); }

function setRoute(route, projectId = null) { state.route = route === "admin" && state.role !== "admin" && !state.adminSecret ? "dashboard" : route; state.selectedProjectId = projectId; render(); }
const navButton = (label, route) => `<button class="${state.route === route ? "active" : ""}" onclick="setRoute('${route}')">${label}</button>`;
function topNav() { if (!state.loggedIn) return ""; return `<header class="topbar"><div class="topbar-row"><div class="brand">Prompt & Pour <small>Private Exchange</small></div><nav class="nav">${navButton("Home", "dashboard")}${navButton("House Pours", "gallery")}${navButton("Share a Build", "share")}${state.role === "admin" || state.adminSecret ? navButton("Admin", "admin") : ""}${navButton("House Rules", "rules")}<button onclick="logout()">Exit</button></nav></div></header>`; }
function dataStatusPill() { return `<aside class="data-status ${state.dataSource === "supabase" ? "ok" : "warn"}"><strong>Data mode:</strong> ${state.dataSource === "supabase" ? "Supabase connected" : "Mock fallback"}</aside>`; }
function filterControls() { return `<div class="filters"><label>Category<select onchange="setCategoryFilter(this.value)"><option>All</option>${categories.map((c) => `<option ${c === state.selectedCategory ? "selected" : ""}>${c}</option>`).join("")}</select></label><label>Status<select onchange="setStatusFilter(this.value)"><option>All</option>${statuses.map((s) => `<option ${s === state.selectedStatus ? "selected" : ""}>${s}</option>`).join("")}</select></label></div>`; }
const matchesFilters = (p) => (state.selectedCategory === "All" || p.categories.includes(state.selectedCategory)) && (state.selectedStatus === "All" || p.status === state.selectedStatus);
function projectCard(p) { return `<article class="card"><h3>${p.title}</h3><div class="title-rule"></div><p>${p.summary}</p><p class="muted"><strong>Creator:</strong> ${p.creatorName}</p><div class="badges">${p.categories.map((c) => `<span class="badge">${c}</span>`).join("")}${p.featured ? '<span class="badge">House Favorite</span>' : ""}</div><button class="button" onclick="setRoute('project', '${p.id}')">View Pour</button></article>`; }
function loginPage() { return `<div class="login-wrap"><section class="panel login-card deco-border"><h1>Prompt &amp; Pour</h1><p class="muted">Speak the passphrase to open the door.</p><form onsubmit="event.preventDefault(); login();"><label>Passphrase<input id="access-passphrase-input" type="password" required /></label><button class="button" type="submit">Enter</button>${state.loginError ? `<p class="muted"><strong>${state.loginError}</strong></p>` : ""}</form></section></div>`; }
function dashboardPage() { const approved = state.projects.filter((p) => p.approved && !p.archived); const fresh = approved.slice(0, 3); const favorites = approved.filter((p) => p.featured); return `<section class="panel section-featured"><h2 class="section-title">House Favorites</h2><div class="grid">${favorites.map(projectCard).join("") || "<p>No featured cards yet.</p>"}</div></section><section class="panel" style="margin-top:1rem;"><h2 class="section-title">Fresh Pours</h2><div class="grid">${fresh.map(projectCard).join("") || "<p>No approved pours yet.</p>"}</div></section>`; }
function galleryPage() { const visible = state.projects.filter((p) => p.approved && !p.archived && matchesFilters(p)); return `<section class="panel hero"><h1 class="section-title">House Pours</h1>${filterControls()}<div class="grid">${visible.map(projectCard).join("") || "<p>No matching pours yet.</p>"}</div></section>`; }
function normalizeListField(v) { if (Array.isArray(v)) return v; if (!v) return []; return v.toString().split(",").map((x) => x.trim()).filter(Boolean); }
async function submitPour(e) { const f = new FormData(e.target); const payload = { title: `${f.get("title") || ""}`.trim(), creator_name: `${f.get("creatorName") || ""}`.trim(), summary: `${f.get("summary") || ""}`.trim(), categories: normalizeListField(f.get("category")), status: `${f.get("status") || "Idea"}`, tools_used: normalizeListField(f.get("toolsUsed")), problem_statement: `${f.get("problemSolved") || ""}`.trim(), ai_use: `${f.get("howAiHelped") || ""}`.trim(), lessons_learned: `${f.get("lessonsLearned") || ""}`.trim(), help_wanted: `${f.get("helpWanted") || ""}`.trim(), reusable_bits: `${f.get("reusableBits") || ""}`.trim(), links: `${f.get("links") || ""}`.trim() ? [`${f.get("links")}`.trim()] : [], approved: false, featured: false, archived: false };
  const s = getSupabaseClient(); if (s) { const { error } = await s.from("prompt_pour_pours").insert(payload); if (!error) { e.target.reset(); state.dashboardNotice = "Your build was submitted for review. It will appear in House Pours once approved."; setRoute("dashboard"); return; } }
}
function sharePage() { return `<section class="panel hero"><h1 class="section-title">Share a Build</h1><form onsubmit="event.preventDefault(); submitPour(event);"><div class="two-col"><label>Title<input name="title" required /></label><label>Creator Name<input name="creatorName" required /></label></div><label>Summary<textarea name="summary"></textarea></label><div class="two-col"><label>Category<select name="category">${categories.map((c) => `<option>${c}</option>`).join("")}</select></label><label>Status<select name="status">${statuses.map((s) => `<option>${s}</option>`).join("")}</select></label></div><label>Tools Used<input name="toolsUsed" /></label><label>Problem Being Solved<textarea name="problemSolved"></textarea></label><label>How AI Helped<textarea name="howAiHelped"></textarea></label><label>Lessons Learned<textarea name="lessonsLearned"></textarea></label><label>Help Wanted<textarea name="helpWanted"></textarea></label><label>Reusable Bits<textarea name="reusableBits"></textarea></label><label>Links<input name="links" /></label><button class="button" type="submit">Submit</button></form></section>`; }
function projectDetailPage() { const p = state.projects.find((x) => String(x.id) === String(state.selectedProjectId)); return p ? `<section class="panel"><h1 class="section-title">${p.title}</h1><p>${p.summary}</p></section>` : `<section class="panel"><p>Project not found.</p></section>`; }

async function callAdminAction(action, id) { const u = getAdminFunctionUrl(); const r = await fetch(u, { method: "POST", headers: { "Content-Type": "application/json", "x-prompt-pour-admin-secret": state.adminSecret }, body: JSON.stringify({ action, id }) }); const b = await r.json(); if (!r.ok) throw new Error(b.error || "Action failed"); return b; }
async function refreshAdminLists() { state.adminLoading = true; render(); try { const p = await callAdminAction("list_pending"); const a = await callAdminAction("list_approved"); state.adminPending = (p.rows || []).map(mapRowToProject); state.adminApproved = (a.rows || []).map(mapRowToProject); state.adminError = ""; } catch (e) { state.adminError = e.message; } state.adminLoading = false; render(); }
async function adminLogin() { const secret = document.getElementById("admin-secret-input")?.value?.trim(); if (!secret) return; state.adminSecret = secret; sessionStorage.setItem("promptPourAdminSecret", secret); await refreshAdminLists(); }
function clearAdminSession() { state.adminSecret = ""; sessionStorage.removeItem("promptPourAdminSecret"); state.adminPending = []; state.adminApproved = []; render(); }
async function moderatePour(action, id) { await callAdminAction(action, id); await refreshAdminLists(); await loadProjects(); }
function adminField(label, value) { return value ? `<p><strong>${label}:</strong> ${value}</p>` : ""; }
function adminListField(label, values) { return Array.isArray(values) && values.length ? adminField(label, values.join(", ")) : ""; }
function adminLinksField(links) { return Array.isArray(links) && links.length ? `<p><strong>Links:</strong> ${links.map((link) => `<a href="${link}" target="_blank" rel="noreferrer">${link}</a>`).join("<br/>")}</p>` : ""; }
function adminCard(p, buttons, showExpandedDetails = false) {
  const fullDetails = [
    adminField("Problem Solved", p.problemSolved),
    adminField("How it Helped", p.howAiHelped),
    adminField("Lessons Learned", p.lessonsLearned),
    adminField("Reusable Bits", p.reusableBits),
    adminLinksField(p.links),
  ].join("");
  return `<article class="card"><h3>${p.title}</h3>${adminField("Creator", p.creatorName)}${adminField("Contact Email", p.contactEmail)}${adminListField("Categories", p.categories)}${adminField("Status", p.status)}${adminField("Summary", p.summary)}${adminField("Created Date", p.createdDate)}${showExpandedDetails && fullDetails ? `<details><summary>View full submission</summary>${fullDetails}</details>` : fullDetails}<div class="admin-actions">${buttons}</div></article>`;
}
function adminPage() { if (!state.adminSecret) return `<section class="panel hero"><h1 class="section-title">Admin Dashboard</h1><label>Admin Passphrase<input id="admin-secret-input" type="password" /></label><button class="button" onclick="adminLogin()">Unlock Moderation</button>${state.adminError ? `<p class="muted"><strong>${state.adminError}</strong></p>` : ""}</section>`; return `<section class="panel hero"><h1 class="section-title">Admin Dashboard</h1><div class="admin-toolbar"><button class="button" onclick="refreshAdminLists()">Refresh</button><button class="button" onclick="clearAdminSession()">Lock</button></div>${state.adminLoading ? "<p class='muted'>Loading moderation lists...</p>" : ""}<h2 class="section-title">Pending</h2><div class="grid">${state.adminPending.map((p) => adminCard(p, `<button class='button' onclick=\"moderatePour('approve','${p.id}')\">Approve</button><button class='button' onclick=\"moderatePour('archive','${p.id}')\">Archive</button>`, true)).join("") || "<p>No pending pours.</p>"}</div><h2 class="section-title">Approved</h2><div class="grid">${state.adminApproved.map((p) => adminCard(p, `${p.featured ? `<button class='button' onclick=\"moderatePour('unfeature','${p.id}')\">Unfeature</button>` : `<button class='button' onclick=\"moderatePour('feature','${p.id}')\">Feature</button>`}<button class='button' onclick=\"moderatePour('archive','${p.id}')\">Archive</button>`)).join("") || "<p>No approved pours found.</p>"}</div></section>`; }
function rulesPage() { return `<section class="panel"><h1>House Rules</h1><p class="rule-quote">No empty glasses.</p></section>`; }
async function login() {
  const passphrase = document.getElementById("access-passphrase-input")?.value?.trim();
  if (!passphrase) return;

  state.loginError = "";
  state.adminError = "";

  try {
    state.adminSecret = passphrase;
    const pending = await callAdminAction("list_pending");
    const approved = await callAdminAction("list_approved");
    state.role = "admin";
    state.loggedIn = true;
    sessionStorage.setItem("promptPourAdminSecret", passphrase);
    state.adminPending = (pending.rows || []).map(mapRowToProject);
    state.adminApproved = (approved.rows || []).map(mapRowToProject);
    setRoute("admin");
    return;
  } catch (_error) {
    state.adminSecret = "";
    sessionStorage.removeItem("promptPourAdminSecret");
    state.adminPending = [];
    state.adminApproved = [];
  }

  const memberMatch = !MEMBER_PASSPHRASE || passphrase === MEMBER_PASSPHRASE;
  if (!memberMatch) {
    state.loginError = "That passphrase did not open the door.";
    render();
    return;
  }

  state.role = "member";
  state.loggedIn = true;
  setRoute("dashboard");
}
function logout() { state.loggedIn = false; state.role = "member"; state.loginError = ""; setRoute("login"); }
function setCategoryFilter(v) { state.selectedCategory = v; render(); }
function setStatusFilter(v) { state.selectedStatus = v; render(); }
function render() { const app = document.getElementById("app"); if (!app) return; if (!state.loggedIn) app.innerHTML = loginPage(); else { const pages = { dashboard: dashboardPage, gallery: galleryPage, share: sharePage, admin: adminPage, rules: rulesPage, project: projectDetailPage }; app.innerHTML = `<div class="layout">${topNav()}<main class="main">${(pages[state.route] || dashboardPage)()}</main>${dataStatusPill()}</div>`; } }
Object.assign(window, { setRoute, login, logout, setCategoryFilter, setStatusFilter, submitPour, adminLogin, clearAdminSession, refreshAdminLists, moderatePour });

function startApp() { render(); void loadProjects(); if (state.adminSecret) void refreshAdminLists(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp, { once: true }); else startApp();
