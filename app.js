
console.log("Prompt & Pour app.js loaded");

function renderFatalError(error) {
  const message = error instanceof Error ? error.message : String(error || "Unknown runtime error");
  const detail = error instanceof Error && error.stack ? error.stack : "No stack trace available.";
  const panel = `
    <section class="panel login-card deco-border runtime-error" role="alert">
      <h1>Prompt &amp; Pour hit an error</h1>
      <p class="muted">${message}</p>
      <pre>${detail}</pre>
      <p class="muted">Fallback mode is active. Refresh to retry.</p>
    </section>
  `;
  const mount = document.getElementById("app");
  if (mount) {
    mount.innerHTML = panel;
  } else {
    document.body.innerHTML = `<div id="app">${panel}</div>`;
  }
}

window.onerror = function onWindowError(_message, _source, _lineno, _colno, error) {
  renderFatalError(error || _message);
};

window.addEventListener("unhandledrejection", (event) => {
  renderFatalError(event.reason || "Unhandled promise rejection");
});

const categories = [
  "Workflow & Admin",
  "Writing & Communication",
  "Data & Research",
  "Learning & Training",
  "Coding & Prototypes",
  "Creative & Visual",
  "Other / Not sure",
];

const statuses = ["Idea", "In Progress", "In Use", "Needs Help"];

const mockProjects = [
  { id: "p1", title: "Meeting Note Distiller", summary: "Turns rough meeting notes into concise action summaries.", creatorName: "Avery Chen", contactEmail: "avery@example.com", categories: ["Workflow & Admin", "Writing & Communication"], status: "In Use", toolsUsed: "ChatGPT, Docs, Zapier", problemSolved: "Busy teams struggled to convert notes into follow-ups.", howAiHelped: "AI generated draft summaries and owner/action checklists.", lessonsLearned: "Template quality matters more than model complexity.", helpWanted: "Looking for better quality checks before sending.", reusableBits: "Prompt skeleton for action-item extraction.", links: ["https://example.com/demo-1"], screenshotPlaceholder: "Screenshot placeholder", reusePermission: "Yes, adapt with credit.", createdDate: "2026-04-02", updatedDate: "2026-04-29", approved: true, featured: true, archived: false },
  { id: "p2", title: "Syllabus-to-Quiz Mixer", summary: "Generates draft quiz banks from course objectives.", creatorName: "Jordan Patel", contactEmail: "", categories: ["Learning & Training", "Data & Research"], status: "In Progress", toolsUsed: "GPT-4.1, Sheets", problemSolved: "Creating varied practice questions took too long.", howAiHelped: "Suggested question stems across difficulty tiers.", lessonsLearned: "Human review catches ambiguity quickly.", helpWanted: "Need help with rubric alignment.", reusableBits: "Difficulty balancing prompt and review checklist.", links: [], screenshotPlaceholder: "Screenshot placeholder", reusePermission: "Share internally.", createdDate: "2026-03-15", updatedDate: "2026-04-30", approved: true, featured: false, archived: false },
];

const state = {
  loggedIn: false,
  role: "member",
  route: "login",
  selectedCategory: "All",
  selectedStatus: "All",
  selectedProjectId: null,
  projects: [...mockProjects],
  dataSource: "mock",
  dataStatusReason: "Supabase not checked yet.",
  notice: "",
  dashboardNotice: "",
};

function getSupabaseClient() {
  const supabaseConfig = window.PROMPT_POUR_SUPABASE_CONFIG;
  console.info("[Prompt & Pour] Supabase config object exists:", Boolean(supabaseConfig));
  console.info("[Prompt & Pour] Supabase URL present:", Boolean(supabaseConfig && supabaseConfig.url));
  console.info("[Prompt & Pour] Supabase anon key present:", Boolean(supabaseConfig && supabaseConfig.anonKey));
  console.info("[Prompt & Pour] Supabase SDK window.supabase exists:", Boolean(window.supabase));
  const hasConfig = Boolean(supabaseConfig && supabaseConfig.url && supabaseConfig.anonKey);
  const hasFactory = Boolean(window.supabase && typeof window.supabase.createClient === "function");

  if (!hasConfig) {
    state.dataStatusReason = "Missing Supabase config URL or anon key.";
    console.warn("[Prompt & Pour] Supabase config missing; using mock data fallback.");
    return null;
  }

  if (!hasFactory) {
    state.dataStatusReason = "Supabase SDK missing on window.supabase.";
    console.warn("[Prompt & Pour] Supabase SDK unavailable; using mock data fallback.");
    return null;
  }

  try {
    const client = window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
    console.info("[Prompt & Pour] Supabase createClient succeeded.");
    return client;
  } catch (error) {
    state.dataStatusReason = `Supabase client init failed: ${error instanceof Error ? error.message : String(error)}`;
    console.error("[Prompt & Pour] Supabase client initialization failed; using mock fallback.", error);
    return null;
  }
}

function mapRowToProject(row) {
  return {
    id: row.id,
    title: row.title || "Untitled Pour",
    summary: row.summary || "",
    creatorName: row.creator_name || "Anonymous",
    contactEmail: row.contact_email || "",
    categories: Array.isArray(row.categories) && row.categories.length ? row.categories : ["Other / Not sure"],
    status: row.status || "Idea",
    toolsUsed: row.tools_used || "",
    problemSolved: row.problem_statement || "",
    howAiHelped: row.ai_use || "",
    lessonsLearned: row.lessons_learned || "",
    helpWanted: row.help_wanted || "",
    reusableBits: row.reusable_bits || "",
    links: Array.isArray(row.links) ? row.links : [],
    screenshotPlaceholder: "Screenshot placeholder",
    reusePermission: row.reuse_permission || "",
    createdDate: (row.created_at || "").slice(0, 10),
    updatedDate: (row.updated_at || row.created_at || "").slice(0, 10),
    approved: Boolean(row.approved),
    featured: Boolean(row.featured),
    archived: Boolean(row.archived),
  };
}

async function loadProjects() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    state.projects = [...mockProjects];
    state.dataSource = "mock";
    render();
    return;
  }

  try {
    const { data, error } = await supabase
      .from("prompt_pour_pours")
      .select("*")
      .eq("approved", true)
      .eq("archived", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Prompt & Pour] Supabase initial select failed; using mock fallback:", error);
      state.projects = [...mockProjects];
      state.dataSource = "mock";
      state.dataStatusReason = `Initial read failed: ${error.message || "Unknown Supabase read error."}`;
    } else {
      console.info("[Prompt & Pour] Supabase initial select succeeded.");
      state.projects = data.map(mapRowToProject);
      state.dataSource = "supabase";
      state.dataStatusReason = "Connected to Supabase.";
    }
  } catch (error) {
    console.error("[Prompt & Pour] Unexpected load failure; using mock fallback:", error);
    state.projects = [...mockProjects];
    state.dataSource = "mock";
    state.dataStatusReason = `Unexpected read failure: ${error instanceof Error ? error.message : String(error)}`;
  }

  render();
}

function setRoute(route, projectId = null) { state.route = route === "admin" && state.role !== "admin" ? "dashboard" : route; state.selectedProjectId = projectId; render(); }
const navButton = (label, route) => `<button class="${state.route === route ? "active" : ""}" onclick="setRoute('${route}')">${label}</button>`;
function topNav() { if (!state.loggedIn) return ""; return `<header class="topbar"><div class="topbar-row"><div class="brand">Prompt & Pour <small>Private Exchange</small></div><nav class="nav">${navButton("Home", "dashboard")}${navButton("House Pours", "gallery")}${navButton("Share a Build", "share")}${state.role === "admin" ? navButton("Admin", "admin") : ""}${navButton("House Rules", "rules")}<button onclick="logout()">Exit</button></nav></div></header>`; }
function dataStatusPill() { const connected = state.dataSource === "supabase"; const label = connected ? "Supabase connected" : `Mock fallback: ${state.dataStatusReason}`; return `<aside class="data-status ${connected ? "ok" : "warn"}" role="status" aria-live="polite"><strong>Data mode:</strong> ${label}</aside>`; }
function filterControls() { return `<div class="filters"><label>Category<select onchange="setCategoryFilter(this.value)"><option>All</option>${categories.map((c) => `<option ${c === state.selectedCategory ? "selected" : ""}>${c}</option>`).join("")}</select></label><label>Status<select onchange="setStatusFilter(this.value)"><option>All</option>${statuses.map((s) => `<option ${s === state.selectedStatus ? "selected" : ""}>${s}</option>`).join("")}</select></label></div>`; }
const matchesFilters = (project) => (state.selectedCategory === "All" || project.categories.includes(state.selectedCategory)) && (state.selectedStatus === "All" || project.status === state.selectedStatus);
function projectCard(project, showFlags = false) { return `<article class="card"><h3>${project.title}</h3><div class="title-rule"></div><p>${project.summary}</p><p class="muted"><strong>Creator:</strong> ${project.creatorName}${project.contactEmail ? ` • ${project.contactEmail}` : ""}</p><p class="muted"><strong>Tools:</strong> ${project.toolsUsed}</p><div class="badges">${project.categories.map((c) => `<span class="badge">${c}</span>`).join("")}<span class="badge status">${project.status}</span>${project.featured ? '<span class="badge">House Favorite</span>' : ""}${showFlags ? `<span class="badge">${project.approved ? "approved" : "pending"}</span><span class="badge">${project.archived ? "archived" : "active"}</span>` : ""}</div>${project.helpWanted ? `<p class="meta-line"><strong>Help wanted:</strong> ${project.helpWanted}</p>` : ""}${project.reusePermission ? `<p class="meta-line"><strong>Reuse:</strong> ${project.reusePermission}</p>` : ""}<button class="button" onclick="setRoute('project', '${project.id}')">View Pour</button></article>`; }
function loginPage() { return `<div class="login-wrap"><section class="panel login-card deco-border"><h1>Prompt & Pour</h1><p class="muted">A private backroom for practical AI experiments, shared by peers.</p><p>Enter the house passphrase and choose your mock role.</p><form onsubmit="event.preventDefault(); login();"><label>Passphrase<input type="password" required placeholder="••••••••" /></label><label>Mock role<select id="mock-role"><option value="member">member</option><option value="admin">admin</option></select></label><button class="button" type="submit">Enter the Room</button></form><p class="muted">Mock gate only for scaffold (no real authentication yet).</p></section></div>`; }
function dashboardPage() { const approved = state.projects.filter((p) => p.approved && !p.archived); const fresh = [...approved].sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1)).slice(0, 3); const favorites = approved.filter((p) => p.featured); const sourceNote = state.dataSource === "supabase" ? "Live pours loaded from Supabase." : "Using mock pours (Supabase not configured)."; const notice = state.dashboardNotice ? `<section class="panel deco-border success-notice" role="status" aria-live="polite"><p><strong>${state.dashboardNotice}</strong></p></section>` : ""; return `${notice}<section class="panel hero deco-border"><div class="hero-layout"><div class="hero-copy"><h1>A quiet room for people figuring out AI before the playbook exists.</h1><p class="muted">Prompt & Pour is a private, unofficial peer space for sharing practical AI experiments: rough builds, prompts, workflows, lessons learned, and calls for help.</p><p class="muted">Bring what works, bring what broke, bring what you're still mixing. The point is momentum, not polish.</p><p class="muted">${sourceNote}</p><button class="button" onclick="setRoute('gallery')">Browse House Pours</button></div><figure class="hero-figure" aria-hidden="true"><div class="hero-figure-frame"><img src="deco-bartender.png" alt="" loading="lazy" /></div></figure></div></section><section class="panel section-featured"><h2 class="section-title">House Favorites</h2><div class="grid">${favorites.map((p) => projectCard(p)).join("") || "<p>No featured cards yet.</p>"}</div></section><section class="panel" style="margin-top:1rem;"><h2 class="section-title">Fresh Pours</h2><div class="grid">${fresh.map((p) => projectCard(p)).join("") || "<p>No approved pours yet.</p>"}</div></section>`; }
function galleryPage() { const visible = state.projects.filter((p) => p.approved && !p.archived && matchesFilters(p)); return `<section class="panel hero"><h1 class="section-title">House Pours</h1><p class="muted">Browse approved builds from around the room.</p>${filterControls()}<div class="grid">${visible.map((p) => projectCard(p)).join("") || "<p>No matching pours yet.</p>"}</div></section>`; }
function sharePage() { const modeNote = state.dataSource === "supabase" ? "Submissions are reviewed before they are poured publicly." : "Supabase is not configured here, so this submit stays in local mock mode."; return `<section class="panel hero"><h1 class="section-title">Share a Build</h1><p class="muted">Rough drafts welcome — usefulness beats polish.</p><p class="muted">${modeNote}</p>${state.notice ? `<p class='muted'><strong>${state.notice}</strong></p>` : ""}<form onsubmit="event.preventDefault(); submitPour(event);"><div class="two-col"><label>Title<input name="title" required placeholder="What are you building?" /></label><label>Creator Name<input name="creatorName" required placeholder="Your name" /></label></div><label>Summary<textarea name="summary" placeholder="Quick description"></textarea></label><div class="two-col"><label>Category<select name="category">${categories.map((c) => `<option>${c}</option>`).join("")}</select></label><label>Status<select name="status">${statuses.map((s) => `<option>${s}</option>`).join("")}</select></label></div><label>Tools Used<input name="toolsUsed" placeholder="e.g., ChatGPT, Python" /></label><label>Problem Being Solved<textarea name="problemSolved"></textarea></label><label>How AI Helped<textarea name="howAiHelped"></textarea></label><label>Lessons Learned<textarea name="lessonsLearned"></textarea></label><label>Help Wanted<textarea name="helpWanted"></textarea></label><label>Reusable Bits / Prompt / Code Notes<textarea name="reusableBits"></textarea></label><label>Links<input name="links" placeholder="https://..." /></label><button class="button" type="submit">Submit</button></form></section>`; }
function normalizeListField(value) { if (Array.isArray(value)) return value.map((item) => item?.toString().trim()).filter(Boolean); if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean); if (value == null) return []; return [value.toString().trim()].filter(Boolean); }
async function submitPour(event) { const form = event.target; const formData = new FormData(form); const payload = { title: formData.get("title")?.toString().trim(), creator_name: formData.get("creatorName")?.toString().trim(), summary: formData.get("summary")?.toString().trim(), categories: normalizeListField(formData.get("category")), status: formData.get("status")?.toString() || "Idea", tools_used: normalizeListField(formData.get("toolsUsed")), problem_statement: formData.get("problemSolved")?.toString().trim(), ai_use: formData.get("howAiHelped")?.toString().trim(), lessons_learned: formData.get("lessonsLearned")?.toString().trim(), help_wanted: formData.get("helpWanted")?.toString().trim(), reusable_bits: formData.get("reusableBits")?.toString().trim(), links: (formData.get("links")?.toString().trim() ? [formData.get("links").toString().trim()] : []), approved: false, featured: false, archived: false };
if (!statuses.includes(payload.status)) payload.status = "Idea";
const supabase = getSupabaseClient();
if (supabase) { const { error } = await supabase.from("prompt_pour_pours").insert(payload); if (error) { console.error("[Prompt & Pour] Supabase insert failed:", error); state.notice = `Supabase insert failed: ${error.message || "Unknown error"}`; state.dashboardNotice = ""; state.dataSource = "mock"; state.dataStatusReason = `Insert failed: ${error.message || "Unknown Supabase insert error."}`; render(); return; } state.notice = ""; state.dashboardNotice = "Your build was submitted for review. It will appear in House Pours once approved."; state.dataSource = "supabase"; state.dataStatusReason = "Connected to Supabase."; form.reset(); setRoute("dashboard"); return; }
state.notice = ""; state.dashboardNotice = "Your build was submitted for review. It will appear in House Pours once approved."; form.reset(); setRoute("dashboard"); }
function projectDetailPage() { const project = state.projects.find((p) => String(p.id) === String(state.selectedProjectId)); if (!project) return `<section class="panel"><p>Project not found.</p></section>`; return `<section class="panel deco-border"><h1 class="section-title">${project.title}</h1><p class="muted">By ${project.creatorName} • Updated ${project.updatedDate}</p><div class="split"><div><p><strong>Summary:</strong> ${project.summary}</p><p><strong>Problem being solved:</strong> ${project.problemSolved}</p><p><strong>How AI helped:</strong> ${project.howAiHelped}</p><p><strong>Lessons learned:</strong> ${project.lessonsLearned}</p><p><strong>Help wanted:</strong> ${project.helpWanted}</p><p><strong>Reusable bits:</strong> ${project.reusableBits}</p><p><strong>Tools:</strong> ${project.toolsUsed}</p><p><strong>Reuse permission:</strong> ${project.reusePermission}</p></div><aside><div class="screenshot-placeholder">${project.screenshotPlaceholder}</div><p><strong>Links</strong><br/>${project.links.length ? project.links.map((l) => `<a href="${l}">${l}</a>`).join("<br/>") : "None yet"}</p><div class="badges">${project.categories.map((c) => `<span class='badge'>${c}</span>`).join("")}<span class='badge status'>${project.status}</span></div></aside></div></section>`; }
function adminPage() { const filtered = state.projects.filter(matchesFilters); const pending = filtered.filter((p) => !p.approved && !p.archived); const approved = filtered.filter((p) => p.approved && !p.archived); const featured = filtered.filter((p) => p.featured && !p.archived); const archived = filtered.filter((p) => p.archived); return `<section class="panel hero"><h1 class="section-title">Admin Dashboard</h1><p class="muted">Mock moderation views only (no live approve/update/delete wiring yet).</p>${filterControls()}<h2 class="section-title">Pending</h2><div class="grid">${pending.map((p) => projectCard(p, true)).join("") || "<p>None</p>"}</div><h2 class="section-title">Approved</h2><div class="grid">${approved.map((p) => projectCard(p, true)).join("") || "<p>None</p>"}</div><h2 class="section-title">Featured</h2><div class="grid">${featured.map((p) => projectCard(p, true)).join("") || "<p>None</p>"}</div><h2 class="section-title">Archived</h2><div class="grid">${archived.map((p) => projectCard(p, true)).join("") || "<p>None</p>"}</div></section>`; }
function rulesPage() { return `<section class="panel"><h1>House Rules</h1><p class="rule-quote">No empty glasses.</p></section>`; }
function login() { state.role = document.getElementById("mock-role")?.value === "admin" ? "admin" : "member"; state.loggedIn = true; setRoute("dashboard"); }
function logout() { state.loggedIn = false; state.role = "member"; state.notice = ""; setRoute("login"); }
function setCategoryFilter(value) { state.selectedCategory = value; render(); }
function setStatusFilter(value) { state.selectedStatus = value; render(); }
function render() { const app = document.getElementById("app"); if (!app) { console.error("#app container not found; cannot render Prompt & Pour."); return; } let content = ""; if (!state.loggedIn) content = loginPage(); else { const pages = { dashboard: dashboardPage, gallery: galleryPage, share: sharePage, admin: adminPage, rules: rulesPage, project: projectDetailPage }; const safeRoute = state.route === "admin" && state.role !== "admin" ? "dashboard" : state.route; content = `<div class="layout">${topNav()}<main class="main">${(pages[safeRoute] || dashboardPage)()}</main>${dataStatusPill()}</div>`; } app.innerHTML = content; }
Object.assign(window, { setRoute, login, logout, setCategoryFilter, setStatusFilter, submitPour });

function startApp() {
  try {
    console.log("Prompt & Pour startApp running");
    render();
    console.log("Prompt & Pour first render complete");
    void loadProjects();
  } catch (error) {
    renderFatalError(error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp, { once: true });
} else {
  startApp();
}
