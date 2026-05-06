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

const state = {
  loggedIn: false,
  route: "login",
  selectedCategory: "All",
  selectedStatus: "All",
  selectedProjectId: null,
};

const mockProjects = [
  {
    id: "p1",
    title: "Meeting Note Distiller",
    summary: "Turns rough meeting notes into concise action summaries.",
    creatorName: "Avery Chen",
    contactEmail: "avery@example.com",
    categories: ["Workflow & Admin", "Writing & Communication"],
    status: "In Use",
    toolsUsed: "ChatGPT, Docs, Zapier",
    problemSolved: "Busy teams struggled to convert notes into follow-ups.",
    howAiHelped: "AI generated draft summaries and owner/action checklists.",
    lessonsLearned: "Template quality matters more than model complexity.",
    helpWanted: "Looking for better quality checks before sending.",
    reusableBits: "Prompt skeleton for action-item extraction.",
    links: ["https://example.com/demo-1"],
    screenshotPlaceholder: "Screenshot placeholder",
    reusePermission: "Yes, adapt with credit.",
    createdDate: "2026-04-02",
    updatedDate: "2026-04-29",
    approved: true,
    featured: true,
    archived: false,
  },
  {
    id: "p2",
    title: "Syllabus-to-Quiz Mixer",
    summary: "Generates draft quiz banks from course objectives.",
    creatorName: "Jordan Patel",
    contactEmail: "",
    categories: ["Learning & Training", "Data & Research"],
    status: "In Progress",
    toolsUsed: "GPT-4.1, Sheets",
    problemSolved: "Creating varied practice questions took too long.",
    howAiHelped: "Suggested question stems across difficulty tiers.",
    lessonsLearned: "Human review catches ambiguity quickly.",
    helpWanted: "Need help with rubric alignment.",
    reusableBits: "Difficulty balancing prompt and review checklist.",
    links: [],
    screenshotPlaceholder: "Screenshot placeholder",
    reusePermission: "Share internally.",
    createdDate: "2026-03-15",
    updatedDate: "2026-04-30",
    approved: true,
    featured: false,
    archived: false,
  },
  {
    id: "p3",
    title: "Grant Draft Companion",
    summary: "Assists in drafting repetitive grant narrative sections.",
    creatorName: "Maya Brooks",
    contactEmail: "maya@example.com",
    categories: ["Writing & Communication"],
    status: "Needs Help",
    toolsUsed: "Claude, Notion",
    problemSolved: "Repeated rewrites across grant templates.",
    howAiHelped: "Built reusable prompt sets for tone and structure.",
    lessonsLearned: "Needs stronger fact consistency checks.",
    helpWanted: "Seeking collaborators for validation workflow.",
    reusableBits: "Template library with prompt variants.",
    links: ["https://example.com/demo-2"],
    screenshotPlaceholder: "Screenshot placeholder",
    reusePermission: "Ask before external sharing.",
    createdDate: "2026-02-20",
    updatedDate: "2026-05-01",
    approved: false,
    featured: false,
    archived: false,
  },
  {
    id: "p4",
    title: "Policy Plain-Language Rewriter",
    summary: "Converts dense policy docs into plain-language summaries.",
    creatorName: "Sam Rivera",
    contactEmail: "sam@example.com",
    categories: ["Workflow & Admin", "Other / Not sure"],
    status: "Idea",
    toolsUsed: "Gemini, Word",
    problemSolved: "Team confusion over long policy text.",
    howAiHelped: "Prototyped summary style with reading level checks.",
    lessonsLearned: "Needs fact tracing and citations.",
    helpWanted: "Need reviewer group to test clarity.",
    reusableBits: "Before/after rewrite framework.",
    links: [],
    screenshotPlaceholder: "Screenshot placeholder",
    reusePermission: "Yes with attribution.",
    createdDate: "2026-01-18",
    updatedDate: "2026-03-01",
    approved: true,
    featured: false,
    archived: true,
  },
];

function setRoute(route, projectId = null) {
  state.route = route;
  state.selectedProjectId = projectId;
  render();
}

function navButton(label, route) {
  return `<button class="${state.route === route ? "active" : ""}" onclick="setRoute('${route}')">${label}</button>`;
}

function topNav() {
  if (!state.loggedIn) return "";
  return `
    <header class="topbar">
      <div class="topbar-row">
        <div class="brand">Prompt & Pour</div>
        <nav class="nav">
          ${navButton("Home", "dashboard")}
          ${navButton("House Pours", "gallery")}
          ${navButton("Share a Build", "share")}
          ${navButton("Admin", "admin")}
          ${navButton("House Rules", "rules")}
          <button onclick="logout()">Exit</button>
        </nav>
      </div>
    </header>
  `;
}

function filterControls() {
  return `
    <div class="filters">
      <label>Category
        <select onchange="setCategoryFilter(this.value)">
          <option>All</option>
          ${categories.map((c) => `<option ${c === state.selectedCategory ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </label>
      <label>Status
        <select onchange="setStatusFilter(this.value)">
          <option>All</option>
          ${statuses.map((s) => `<option ${s === state.selectedStatus ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </label>
    </div>
  `;
}

function matchesFilters(project) {
  const categoryOk = state.selectedCategory === "All" || project.categories.includes(state.selectedCategory);
  const statusOk = state.selectedStatus === "All" || project.status === state.selectedStatus;
  return categoryOk && statusOk;
}

function projectCard(project, showFlags = false) {
  return `
    <article class="card">
      <h3>${project.title}</h3>
      <p>${project.summary}</p>
      <p class="muted">By ${project.creatorName}${project.contactEmail ? ` • ${project.contactEmail}` : ""}</p>
      <div class="badges">
        ${project.categories.map((c) => `<span class="badge">${c}</span>`).join("")}
        <span class="badge status">${project.status}</span>
        ${project.featured ? '<span class="badge">House Favorite</span>' : ""}
        ${showFlags ? `<span class="badge">${project.approved ? "approved" : "pending"}</span><span class="badge">${project.archived ? "archived" : "active"}</span>` : ""}
      </div>
      <button class="button" onclick="setRoute('project', '${project.id}')">View Project</button>
    </article>
  `;
}

function loginPage() {
  return `
    <div class="login-wrap">
      <section class="panel login-card">
        <h1>Prompt & Pour</h1>
        <p class="muted">A private backroom for practical AI experiments, shared by peers.</p>
        <p>Enter the house passphrase to step inside.</p>
        <form onsubmit="event.preventDefault(); login();">
          <label>Passphrase
            <input type="password" required placeholder="••••••••" />
          </label>
          <button class="button" type="submit">Enter the Room</button>
        </form>
        <p class="muted">Mock gate only for scaffold (no real authentication yet).</p>
      </section>
    </div>
  `;
}

function dashboardPage() {
  const approved = mockProjects.filter((p) => p.approved && !p.archived);
  const fresh = [...approved].sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1)).slice(0, 3);
  const favorites = approved.filter((p) => p.featured);

  return `
    <section class="panel hero">
      <h1>Welcome to Prompt & Pour</h1>
      <p class="muted">Private, practical, and peer-powered. Pull up a chair and swap what works.</p>
    </section>

    <section class="panel">
      <h2>Fresh Pours</h2>
      <div class="grid">${fresh.map((p) => projectCard(p)).join("")}</div>
    </section>

    <section class="panel" style="margin-top:1rem;">
      <h2>House Favorites</h2>
      <div class="grid">${favorites.map((p) => projectCard(p)).join("") || "<p>No featured cards yet.</p>"}</div>
    </section>
  `;
}

function galleryPage() {
  const visible = mockProjects.filter((p) => p.approved && !p.archived && matchesFilters(p));
  return `
    <section class="panel hero">
      <h1>House Pours</h1>
      <p class="muted">Browse approved builds from around the room.</p>
      ${filterControls()}
      <div class="grid">${visible.map((p) => projectCard(p)).join("") || "<p>No matching pours yet.</p>"}</div>
    </section>
  `;
}

function sharePage() {
  return `
    <section class="panel hero">
      <h1>Share a Build</h1>
      <p class="muted">Rough drafts welcome — usefulness beats polish.</p>
      <form>
        <div class="two-col">
          <label>Title<input placeholder="What are you building?" /></label>
          <label>Creator Name<input placeholder="Your name" /></label>
        </div>
        <label>Summary<textarea placeholder="Quick description"></textarea></label>
        <div class="two-col">
          <label>Category
            <select>${categories.map((c) => `<option>${c}</option>`).join("")}</select>
          </label>
          <label>Status
            <select>${statuses.map((s) => `<option>${s}</option>`).join("")}</select>
          </label>
        </div>
        <label>Tools Used<input placeholder="e.g., ChatGPT, Python" /></label>
        <label>Problem Being Solved<textarea></textarea></label>
        <label>How AI Helped<textarea></textarea></label>
        <label>Lessons Learned<textarea></textarea></label>
        <label>Help Wanted<textarea></textarea></label>
        <label>Reusable Bits / Prompt / Code Notes<textarea></textarea></label>
        <label>Links<input placeholder="https://..." /></label>
        <div class="screenshot-placeholder">Screenshot/file upload placeholder (mock only)</div>
        <button class="button" type="button">Share a Build</button>
      </form>
    </section>
  `;
}

function projectDetailPage() {
  const project = mockProjects.find((p) => p.id === state.selectedProjectId);
  if (!project) return `<section class="panel"><p>Project not found.</p></section>`;

  return `
    <section class="panel">
      <h1>${project.title}</h1>
      <p class="muted">By ${project.creatorName} • Updated ${project.updatedDate}</p>
      <div class="split">
        <div>
          <p><strong>Summary:</strong> ${project.summary}</p>
          <p><strong>Problem being solved:</strong> ${project.problemSolved}</p>
          <p><strong>How AI helped:</strong> ${project.howAiHelped}</p>
          <p><strong>Lessons learned:</strong> ${project.lessonsLearned}</p>
          <p><strong>Help wanted:</strong> ${project.helpWanted}</p>
          <p><strong>Reusable bits:</strong> ${project.reusableBits}</p>
          <p><strong>Tools:</strong> ${project.toolsUsed}</p>
          <p><strong>Reuse permission:</strong> ${project.reusePermission}</p>
        </div>
        <aside>
          <div class="screenshot-placeholder">${project.screenshotPlaceholder}</div>
          <p><strong>Links</strong><br/>${project.links.length ? project.links.map((l) => `<a href="${l}">${l}</a>`).join("<br/>") : "None yet"}</p>
          <div class="badges">${project.categories.map((c) => `<span class='badge'>${c}</span>`).join("")}<span class='badge status'>${project.status}</span></div>
        </aside>
      </div>
    </section>
  `;
}

function adminPage() {
  const filtered = mockProjects.filter(matchesFilters);
  const pending = filtered.filter((p) => !p.approved && !p.archived);
  const approved = filtered.filter((p) => p.approved && !p.archived);
  const featured = filtered.filter((p) => p.featured && !p.archived);
  const archived = filtered.filter((p) => p.archived);

  return `
    <section class="panel hero">
      <h1>Admin Dashboard</h1>
      <p class="muted">Mock moderation views (no backend wiring yet).</p>
      ${filterControls()}
      <h2>Pending</h2><div class="grid">${pending.map((p) => projectCard(p, true)).join("") || "<p>None</p>"}</div>
      <h2>Approved</h2><div class="grid">${approved.map((p) => projectCard(p, true)).join("") || "<p>None</p>"}</div>
      <h2>Featured</h2><div class="grid">${featured.map((p) => projectCard(p, true)).join("") || "<p>None</p>"}</div>
      <h2>Archived</h2><div class="grid">${archived.map((p) => projectCard(p, true)).join("") || "<p>None</p>"}</div>
    </section>
  `;
}

function rulesPage() {
  return `
    <section class="panel">
      <h1>House Rules</h1>
      <p class="rule-quote">“No empty glasses.
The passphrase should travel by trust, not broadcast. Share it with people who are ready to pour something into the room — a build, a prompt, a workflow, a rough mix, a useful question, a lesson learned, or a helping hand. Prompt & Pour works best when everyone adds something to the house menu.”</p>
      <ul>
        <li>Prompt & Pour is an informal peer space, not an official help desk, policy source, approval pathway, or endorsement channel.</li>
        <li>Do not post confidential, regulated, patient, student, personnel, proprietary, or otherwise sensitive information.</li>
        <li>Keep examples de-identified.</li>
        <li>Credit people when borrowing or adapting their prompts, workflows, code, or ideas.</li>
        <li>Rough work is welcome. Nothing needs to be polished to be useful.</li>
      </ul>
    </section>
  `;
}

function login() { state.loggedIn = true; setRoute("dashboard"); }
function logout() { state.loggedIn = false; setRoute("login"); }
function setCategoryFilter(value) { state.selectedCategory = value; render(); }
function setStatusFilter(value) { state.selectedStatus = value; render(); }

function render() {
  const app = document.getElementById("app");
  let content = "";

  if (!state.loggedIn) {
    content = loginPage();
  } else {
    const pages = {
      dashboard: dashboardPage,
      gallery: galleryPage,
      share: sharePage,
      admin: adminPage,
      rules: rulesPage,
      project: projectDetailPage,
    };
    const page = pages[state.route] || dashboardPage;
    content = `<div class="layout">${topNav()}<main class="main">${page()}</main></div>`;
  }

  app.innerHTML = content;
}

Object.assign(window, { setRoute, login, logout, setCategoryFilter, setStatusFilter });
render();
