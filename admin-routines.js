// ===============================================================
// admin-routines.js -- Routine Manager for K Beauty Premium admin
// Self-contained: injects its own UI into #tab-routines when opened.
// Depends on globals from admin.html: token, GITHUB_OWNER, GITHUB_REPO,
// GITHUB_BRANCH, showToast()
// ===============================================================

var kbRoutines = [];
var kbRoutinesSHA = null;
var kbEditingRoutineIndex = -1;
var kbRoutinesUIBuilt = false;

async function loadRoutines() {
  if (!kbRoutinesUIBuilt) buildRoutinesUI();
  if (!window.token) return;
  try {
    var listResp = await fetch("https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/data?ref=" + GITHUB_BRANCH, { headers: { "Authorization": "token " + token } });
    if (!listResp.ok) { kbRoutines = []; renderRoutinesList(); return; }
    var files = await listResp.json();
    var rFile = files.find(function(f) { return f.name === "routines.json"; });
    if (!rFile) { kbRoutines = []; kbRoutinesSHA = null; renderRoutinesList(); return; }
    kbRoutinesSHA = rFile.sha;
    var rawResp = await fetch(rFile.download_url, { cache: "no-cache" });
    if (rawResp.ok) kbRoutines = await rawResp.json();
    else kbRoutines = [];
  } catch(e) { console.error("Load routines error:", e); kbRoutines = []; }
  renderRoutinesList();
}

function buildRoutinesUI() {
  var panel = document.getElementById("tab-routines");
  if (!panel) return;
  kbRoutinesUIBuilt = true;

  // Inject CSS
  var style = document.createElement("style");
  style.textContent = ''
    + '.kbr-layout { display: grid; grid-template-columns: 1fr 400px; gap: 20px; }'
    + '@media (max-width: 1024px) { .kbr-layout { grid-template-columns: 1fr; } }'
    + '.kbr-form-section { background: var(--card, #fff); border: 1px solid #e5e5e5; border-radius: 10px; padding: 20px; margin-bottom: 16px; }'
    + '.kbr-form-section h3 { font-size: 0.95rem; font-weight: 600; margin-bottom: 14px; color: #333; }'
    + '.kbr-row { margin-bottom: 12px; }'
    + '.kbr-row label { display: block; font-size: 0.78rem; font-weight: 600; color: #555; margin-bottom: 6px; }'
    + '.kbr-row input, .kbr-row textarea, .kbr-row select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 0.88rem; }'
    + '.kbr-row textarea { min-height: 70px; resize: vertical; }'
    + '.kbr-row-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }'
    + '.kbr-row-3col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }'
    + '.kbr-step-card { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px; margin-bottom: 12px; position: relative; }'
    + '.kbr-step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }'
    + '.kbr-step-num { font-weight: 700; color: var(--accent, #C4956A); font-size: 0.9rem; }'
    + '.kbr-step-remove { background: #FEE2E2; color: #991B1B; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.72rem; cursor: pointer; font-weight: 600; }'
    + '.kbr-step-remove:hover { background: #FECACA; }'
    + '.kbr-add-step-btn { width: 100%; padding: 12px; background: #F0FDF4; color: #166534; border: 1px dashed #22C55E; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }'
    + '.kbr-add-step-btn:hover { background: #DCFCE7; }'
    + '.kbr-actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }'
    + '.kbr-btn { padding: 9px 16px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.85rem; font-family: inherit; }'
    + '.kbr-btn-primary { background: var(--accent, #C4956A); color: #fff; }'
    + '.kbr-btn-primary:hover { background: var(--accent-dark, #8E4D58); }'
    + '.kbr-btn-secondary { background: #f1f1f1; color: #333; }'
    + '.kbr-btn-danger { background: #FEE2E2; color: #991B1B; }'
    + '.kbr-btn:disabled { opacity: 0.5; cursor: not-allowed; }'
    + '.kbr-list-item { display: grid; grid-template-columns: 50px 1fr auto; gap: 12px; padding: 10px; border-bottom: 1px solid #f0f0f0; align-items: center; }'
    + '.kbr-list-item:last-child { border-bottom: none; }'
    + '.kbr-list-img { width: 50px; height: 50px; border-radius: 6px; object-fit: cover; background: #f9f9f9; }'
    + '.kbr-list-img-empty { width: 50px; height: 50px; border-radius: 6px; background: #f9f9f9; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }'
    + '.kbr-list-name { font-size: 0.88rem; font-weight: 600; }'
    + '.kbr-list-meta { font-size: 0.72rem; color: #888; margin-top: 2px; }'
    + '.kbr-list-actions { display: flex; gap: 4px; }'
    + '.kbr-list-actions button { padding: 4px 10px; border: none; border-radius: 4px; font-size: 0.72rem; cursor: pointer; font-weight: 600; }'
    + '.kbr-list-actions .kbr-edit { background: #DBEAFE; color: #1E40AF; }'
    + '.kbr-list-actions .kbr-del { background: #FEE2E2; color: #991B1B; }'
    + '.kbr-status-badge { display: inline-block; font-size: 0.65rem; padding: 1px 8px; border-radius: 3px; font-weight: 600; margin-right: 4px; }'
    + '.kbr-status-published { background: #F0FFF4; color: #166534; }'
    + '.kbr-status-draft { background: #FEF3C7; color: #92400E; }'
    + '.kbr-empty { padding: 40px 20px; text-align: center; color: #888; }'
    + '.kbr-save-status { font-size: 0.78rem; color: #666; margin-top: 8px; }';
  document.head.appendChild(style);

  panel.innerHTML = ''
    + '<div class="kbr-layout">'
    + '  <div class="kbr-main">'
    + '    <div class="kbr-form-section">'
    + '      <h3>Routine Details</h3>'
    + '      <div class="kbr-row"><label>Title</label><input type="text" id="kbrTitle" placeholder="Morning Korean Skincare Routine for Oily Skin"></div>'
    + '      <div class="kbr-row"><label>URL Slug</label><input type="text" id="kbrSlug" placeholder="morning-routine-oily-skin"></div>'
    + '      <div class="kbr-row"><label>Excerpt (short description)</label><textarea id="kbrExcerpt" placeholder="A 5-step Korean morning routine for oily skin..."></textarea></div>'
    + '      <div class="kbr-row-2col">'
    + '        <div class="kbr-row"><label>Cover Image URL</label><input type="text" id="kbrCover" placeholder="https://..."></div>'
    + '        <div class="kbr-row"><label>Image Position</label><select id="kbrCoverPos"><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option></select></div>'
    + '      </div>'
    + '      <div class="kbr-row-3col">'
    + '        <div class="kbr-row"><label>Skin Type</label><select id="kbrSkinType"><option value="">-- Select --</option><option value="oily">Oily</option><option value="dry">Dry</option><option value="combination">Combination</option><option value="sensitive">Sensitive</option><option value="acne-prone">Acne-prone</option><option value="mature">Mature</option><option value="all">All</option></select></div>'
    + '        <div class="kbr-row"><label>Time of Day</label><select id="kbrTimeOfDay"><option value="">-- Select --</option><option value="morning">Morning</option><option value="evening">Evening</option><option value="weekly">Weekly</option><option value="travel">Travel</option><option value="anytime">Anytime</option></select></div>'
    + '        <div class="kbr-row"><label>Duration</label><input type="text" id="kbrDuration" placeholder="10 minutes"></div>'
    + '      </div>'
    + '      <div class="kbr-row"><label>Tags (comma-separated)</label><input type="text" id="kbrTags" placeholder="morning routine, oily skin, Korean skincare"></div>'
    + '      <div class="kbr-row"><label>Intro paragraph (shown above steps)</label><textarea id="kbrIntro" placeholder="This routine focuses on..."></textarea></div>'
    + '    </div>'
    + '    <div class="kbr-form-section">'
    + '      <h3>Steps</h3>'
    + '      <div id="kbrStepsContainer"></div>'
    + '      <button class="kbr-add-step-btn" onclick="addRoutineStep()">+ Add Step</button>'
    + '    </div>'
    + '    <div class="kbr-form-section">'
    + '      <h3>Outro (optional)</h3>'
    + '      <div class="kbr-row"><label>Closing paragraph</label><textarea id="kbrOutro" placeholder="Final thoughts on this routine..."></textarea></div>'
    + '    </div>'
    + '    <div class="kbr-actions">'
    + '      <button class="kbr-btn kbr-btn-primary" id="kbrBtnPublish" onclick="saveRoutine(\'published\')">Publish</button>'
    + '      <button class="kbr-btn kbr-btn-secondary" id="kbrBtnDraft" onclick="saveRoutine(\'draft\')">Save Draft</button>'
    + '      <button class="kbr-btn kbr-btn-secondary" onclick="newRoutine()">+ New Routine</button>'
    + '    </div>'
    + '    <div class="kbr-save-status" id="kbrStatus"></div>'
    + '  </div>'
    + '  <div class="kbr-sidebar">'
    + '    <div class="kbr-form-section">'
    + '      <h3>All Routines <span id="kbrCount" style="font-size:0.75rem;color:#888;font-weight:400;"></span></h3>'
    + '      <div id="kbrList"></div>'
    + '    </div>'
    + '  </div>'
    + '</div>';

  // Initialize empty form state
  newRoutine();
}

function newRoutine() {
  kbEditingRoutineIndex = -1;
  document.getElementById("kbrTitle").value = "";
  document.getElementById("kbrSlug").value = "";
  document.getElementById("kbrExcerpt").value = "";
  document.getElementById("kbrCover").value = "";
  document.getElementById("kbrCoverPos").value = "center";
  document.getElementById("kbrSkinType").value = "";
  document.getElementById("kbrTimeOfDay").value = "";
  document.getElementById("kbrDuration").value = "";
  document.getElementById("kbrTags").value = "";
  document.getElementById("kbrIntro").value = "";
  document.getElementById("kbrOutro").value = "";
  document.getElementById("kbrStepsContainer").innerHTML = "";
  document.getElementById("kbrStatus").textContent = "";
  // Auto-slug from title
  var titleInput = document.getElementById("kbrTitle");
  if (titleInput && !titleInput._slugListener) {
    titleInput.addEventListener("input", function() {
      var slugInput = document.getElementById("kbrSlug");
      if (kbEditingRoutineIndex === -1 || !slugInput.value) {
        slugInput.value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
    });
    titleInput._slugListener = true;
  }
}

function addRoutineStep(data) {
  var container = document.getElementById("kbrStepsContainer");
  if (!container) return;
  var idx = container.children.length;
  var d = data || {};
  var card = document.createElement("div");
  card.className = "kbr-step-card";
  card.dataset.stepIdx = idx;
  card.innerHTML = ''
    + '<div class="kbr-step-header">'
    + '  <span class="kbr-step-num">Step ' + (idx + 1) + '</span>'
    + '  <button class="kbr-step-remove" onclick="removeRoutineStep(this)">Remove</button>'
    + '</div>'
    + '<div class="kbr-row"><label>Step Title (e.g. Water Cleanser)</label><input type="text" class="kbrStepTitle" value="' + escapeHTMLAttr(d.title || "") + '" placeholder="Oil Cleanser"></div>'
    + '<div class="kbr-row-2col">'
    + '  <div class="kbr-row"><label>Product Name</label><input type="text" class="kbrStepProductName" value="' + escapeHTMLAttr(d.productName || "") + '" placeholder="Beauty of Joseon Glow Serum"></div>'
    + '  <div class="kbr-row"><label>Wait Time (minutes)</label><input type="number" class="kbrStepWait" value="' + escapeHTMLAttr(d.waitTime || "0") + '" min="0" max="60"></div>'
    + '</div>'
    + '<div class="kbr-row"><label>Product Image URL</label><input type="text" class="kbrStepProductImg" value="' + escapeHTMLAttr(d.productImage || "") + '" placeholder="https://m.media-amazon.com/..."></div>'
    + '<div class="kbr-row"><label>Amazon Product URL (affiliate link)</label><input type="text" class="kbrStepProductUrl" value="' + escapeHTMLAttr(d.productUrl || "") + '" placeholder="https://www.amazon.com/dp/..."></div>'
    + '<div class="kbr-row"><label>Why this step?</label><textarea class="kbrStepWhy" placeholder="Explain why this step matters...">' + escapeHTML(d.whyThisStep || "") + '</textarea></div>'
    + '<div class="kbr-row"><label>Tip (optional)</label><input type="text" class="kbrStepTip" value="' + escapeHTMLAttr(d.tip || "") + '" placeholder="Use lukewarm water -- hot water strips your barrier."></div>';
  container.appendChild(card);
}

function removeRoutineStep(btn) {
  var card = btn.closest(".kbr-step-card");
  if (!card) return;
  card.remove();
  // Renumber remaining steps
  var cards = document.querySelectorAll("#kbrStepsContainer .kbr-step-card");
  cards.forEach(function(c, i) {
    c.dataset.stepIdx = i;
    var numEl = c.querySelector(".kbr-step-num");
    if (numEl) numEl.textContent = "Step " + (i + 1);
  });
}

function gatherStepsFromForm() {
  var cards = document.querySelectorAll("#kbrStepsContainer .kbr-step-card");
  var steps = [];
  cards.forEach(function(card, i) {
    steps.push({
      stepNumber: i + 1,
      title: card.querySelector(".kbrStepTitle").value.trim(),
      productName: card.querySelector(".kbrStepProductName").value.trim(),
      productImage: card.querySelector(".kbrStepProductImg").value.trim(),
      productUrl: card.querySelector(".kbrStepProductUrl").value.trim(),
      whyThisStep: card.querySelector(".kbrStepWhy").value.trim(),
      waitTime: card.querySelector(".kbrStepWait").value.trim() || "0",
      tip: card.querySelector(".kbrStepTip").value.trim()
    });
  });
  return steps;
}

function editRoutine(index) {
  var r = kbRoutines[index];
  if (!r) return;
  kbEditingRoutineIndex = index;
  document.getElementById("kbrTitle").value = r.title || "";
  document.getElementById("kbrSlug").value = r.slug || "";
  document.getElementById("kbrExcerpt").value = r.excerpt || "";
  var coverUrl = "";
  var coverPos = "center";
  if (typeof r.cover === "string") coverUrl = r.cover;
  else if (r.cover && r.cover.url) { coverUrl = r.cover.url; if (r.cover.position) coverPos = r.cover.position; }
  document.getElementById("kbrCover").value = coverUrl;
  document.getElementById("kbrCoverPos").value = coverPos;
  document.getElementById("kbrSkinType").value = r.skinType || "";
  document.getElementById("kbrTimeOfDay").value = r.timeOfDay || "";
  document.getElementById("kbrDuration").value = r.duration || "";
  document.getElementById("kbrTags").value = (r.tags || []).join(", ");
  document.getElementById("kbrIntro").value = r.intro || "";
  document.getElementById("kbrOutro").value = r.outro || "";
  // Build steps
  var container = document.getElementById("kbrStepsContainer");
  container.innerHTML = "";
  (r.steps || []).forEach(function(s) { addRoutineStep(s); });
  document.getElementById("kbrStatus").textContent = "Editing: " + r.title;
  // Scroll to top of form
  document.getElementById("tab-routines").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteRoutine(index) {
  var r = kbRoutines[index];
  if (!r) return;
  if (!confirm('Delete routine "' + (r.title || "Untitled") + '"? This cannot be undone.')) return;
  kbRoutines.splice(index, 1);
  if (kbEditingRoutineIndex === index) { newRoutine(); }
  else if (kbEditingRoutineIndex > index) { kbEditingRoutineIndex--; }
  pushRoutinesToGitHub("Delete routine: " + (r.title || "Untitled"));
}

async function saveRoutine(status) {
  var title = document.getElementById("kbrTitle").value.trim();
  var slug = document.getElementById("kbrSlug").value.trim();
  var excerpt = document.getElementById("kbrExcerpt").value.trim();
  var cover = document.getElementById("kbrCover").value.trim();
  var coverPos = document.getElementById("kbrCoverPos").value;
  var skinType = document.getElementById("kbrSkinType").value;
  var timeOfDay = document.getElementById("kbrTimeOfDay").value;
  var duration = document.getElementById("kbrDuration").value.trim();
  var tags = document.getElementById("kbrTags").value.split(",").map(function(t){return t.trim();}).filter(Boolean);
  var intro = document.getElementById("kbrIntro").value.trim();
  var outro = document.getElementById("kbrOutro").value.trim();
  var steps = gatherStepsFromForm();
  var statusEl = document.getElementById("kbrStatus");

  if (!title || !slug) {
    statusEl.textContent = "Title and slug are required.";
    if (window.showToast) showToast("Title and slug required", "error");
    return;
  }
  if (status === "published" && steps.length === 0) {
    statusEl.textContent = "Add at least one step before publishing.";
    if (window.showToast) showToast("Add at least one step", "error");
    return;
  }

  var dupIndex = kbRoutines.findIndex(function(r) { return r.slug === slug; });
  if (dupIndex !== -1 && dupIndex !== kbEditingRoutineIndex) {
    statusEl.textContent = "A routine with this slug already exists.";
    if (window.showToast) showToast("Duplicate slug", "error");
    return;
  }

  var existing = kbEditingRoutineIndex >= 0 ? kbRoutines[kbEditingRoutineIndex] : null;
  var routineDate = existing && existing.date ? existing.date : new Date().toISOString();
  var routineId = existing && existing.id ? existing.id : slug;

  var coverData = "";
  if (cover) coverData = { url: cover, position: coverPos };

  var routine = {
    id: routineId,
    slug: slug,
    title: title,
    excerpt: excerpt,
    skinType: skinType,
    timeOfDay: timeOfDay,
    duration: duration,
    stepCount: steps.length,
    cover: coverData,
    tags: tags,
    date: routineDate,
    status: status,
    visibility: "public",
    intro: intro,
    steps: steps,
    outro: outro
  };

  if (kbEditingRoutineIndex >= 0) {
    kbRoutines[kbEditingRoutineIndex] = routine;
  } else {
    kbRoutines.unshift(routine);
    kbEditingRoutineIndex = 0;
  }

  var msg = status === "draft" ? "Saved draft: " + title : "Published: " + title;
  await pushRoutinesToGitHub(msg);
}

async function pushRoutinesToGitHub(message) {
  var btnPub = document.getElementById("kbrBtnPublish");
  var btnDraft = document.getElementById("kbrBtnDraft");
  var statusEl = document.getElementById("kbrStatus");
  if (btnPub) btnPub.disabled = true;
  if (btnDraft) btnDraft.disabled = true;
  statusEl.textContent = "Saving to GitHub...";

  try {
    var jsonStr = JSON.stringify(kbRoutines, null, 2);
    var encoded = btoa(unescape(encodeURIComponent(jsonStr)));
    var body = { message: message || "Update routines", content: encoded, branch: GITHUB_BRANCH };
    if (kbRoutinesSHA) body.sha = kbRoutinesSHA;
    var resp = await fetch("https://api.github.com/repos/" + GITHUB_OWNER + "/" + GITHUB_REPO + "/contents/data/routines.json", {
      method: "PUT",
      headers: { "Authorization": "token " + token, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      var err = await resp.json();
      statusEl.textContent = "Error: " + (err.message || "Failed to save");
      if (window.showToast) showToast("Save failed", "error");
      if (btnPub) btnPub.disabled = false;
      if (btnDraft) btnDraft.disabled = false;
      return;
    }
    var result = await resp.json();
    kbRoutinesSHA = result.content.sha;
    statusEl.textContent = "OK: Saved! Live in ~30 seconds.";
    renderRoutinesList();
    if (window.showToast) showToast(message || "Saved!", "success");
  } catch(e) {
    statusEl.textContent = "Error: " + e.message;
    if (window.showToast) showToast("Save failed", "error");
  }
  if (btnPub) btnPub.disabled = false;
  if (btnDraft) btnDraft.disabled = false;
}

function renderRoutinesList() {
  var list = document.getElementById("kbrList");
  var count = document.getElementById("kbrCount");
  if (!list) return;
  var published = kbRoutines.filter(function(r){return r.status === "published";}).length;
  var drafts = kbRoutines.filter(function(r){return r.status === "draft";}).length;
  var summary = published + " published";
  if (drafts) summary += ", " + drafts + " draft" + (drafts > 1 ? "s" : "");
  if (count) count.textContent = "(" + summary + ")";

  if (!kbRoutines.length) {
    list.innerHTML = '<div class="kbr-empty">No routines yet. Use the form on the left to create your first one.</div>';
    return;
  }

  var sorted = kbRoutines.slice().sort(function(a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
  list.innerHTML = sorted.map(function(r) {
    var realIndex = kbRoutines.indexOf(r);
    var coverUrl = "";
    if (typeof r.cover === "string") coverUrl = r.cover;
    else if (r.cover && r.cover.url) coverUrl = r.cover.url;
    var imgHTML = coverUrl
      ? '<img src="' + coverUrl + '" class="kbr-list-img">'
      : '<div class="kbr-list-img-empty">*</div>';
    var statusBadge = r.status === "published"
      ? '<span class="kbr-status-badge kbr-status-published">LIVE</span>'
      : '<span class="kbr-status-badge kbr-status-draft">DRAFT</span>';
    return '<div class="kbr-list-item">'
      + imgHTML
      + '<div>'
      + '  <div class="kbr-list-name">' + escapeHTML(r.title || "Untitled") + '</div>'
      + '  <div class="kbr-list-meta">' + statusBadge + (r.skinType || "") + (r.skinType && r.timeOfDay ? " - " : "") + (r.timeOfDay || "") + " - " + (r.steps || []).length + ' steps</div>'
      + '</div>'
      + '<div class="kbr-list-actions">'
      + '  <button class="kbr-edit" onclick="editRoutine(' + realIndex + ')">Edit</button>'
      + '  <button class="kbr-del" onclick="deleteRoutine(' + realIndex + ')">Del</button>'
      + '</div>'
      + '</div>';
  }).join("");
}

function escapeHTML(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeHTMLAttr(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
