// ═══════════════════════════════════════════════════════════════
// admin-seo.js — Real-time SEO Analysis (like Yoast/RankMath)
// Loaded by admin.html. Reads from blog editor fields and scores
// the post on basics, content, structure, readability, and E-E-A-T.
// ═══════════════════════════════════════════════════════════════

var seoAnalysisTimer = null;

function runSEOAnalysis() {
  var keyword = (document.getElementById("seoFocusKeyword").value || "").trim().toLowerCase();
  var title = (document.getElementById("blogTitle").value || "").trim();
  var slug = (document.getElementById("blogSlug").value || "").trim();
  var excerpt = (document.getElementById("blogExcerpt").value || "").trim();
  var cover = (document.getElementById("blogCover").value || "").trim();
  var visual = document.getElementById("blogVisual");
  var plainText = visual ? (visual.innerText || "").trim() : "";

  var checks = [];

  if (!keyword) {
    document.getElementById("seoChecks").innerHTML = '<p class="seo-empty-state">Enter a focus keyword above to start analysis.</p>';
    setSEOScoreDot(null);
    return;
  }

  var titleL = title.toLowerCase();
  var slugL = slug.toLowerCase();
  var excerptL = excerpt.toLowerCase();
  var contentL = plainText.toLowerCase();
  var keywordWords = keyword.split(/\s+/).filter(Boolean);

  // ───── BASICS ─────
  checks.push({
    cat: "Basics",
    label: "Keyword in title",
    pass: titleL.includes(keyword) ? "pass" : (keywordWords.every(function(w){return titleL.includes(w);}) ? "warn" : "fail"),
    msg: titleL.includes(keyword) ? "Exact keyword found in title." : (keywordWords.every(function(w){return titleL.includes(w);}) ? "All keyword words appear, but not as exact phrase." : "Add the focus keyword to the title.")
  });

  var slugKeyword = keyword.replace(/\s+/g, "-");
  checks.push({
    cat: "Basics",
    label: "Keyword in URL slug",
    pass: slugL.includes(slugKeyword) ? "pass" : (keywordWords.every(function(w){return slugL.includes(w);}) ? "warn" : "fail"),
    msg: slugL.includes(slugKeyword) ? "Slug includes the keyword." : "Add the keyword to the URL slug."
  });

  var exLen = excerpt.length;
  checks.push({
    cat: "Basics",
    label: "Meta description length",
    pass: (exLen >= 120 && exLen <= 160) ? "pass" : (((exLen >= 80 && exLen < 120) || (exLen > 160 && exLen <= 180)) ? "warn" : "fail"),
    msg: exLen === 0 ? "Add a meta description (excerpt). Ideal: 120-160 chars." : (exLen < 120 ? "Excerpt is " + exLen + " chars. Aim for 120-160." : (exLen > 160 ? "Excerpt is " + exLen + " chars. Keep under 160 to avoid Google truncating it." : "Excerpt is " + exLen + " chars."))
  });

  checks.push({
    cat: "Basics",
    label: "Keyword in meta description",
    pass: excerptL.includes(keyword) ? "pass" : (keywordWords.every(function(w){return excerptL.includes(w);}) ? "warn" : "fail"),
    msg: excerptL.includes(keyword) ? "Keyword found in excerpt." : "Mention the focus keyword in your excerpt."
  });

  // ───── CONTENT ─────
  var words = plainText.split(/\s+/).filter(Boolean);
  var wordCount = words.length;

  checks.push({
    cat: "Content",
    label: "Word count",
    pass: wordCount >= 1000 ? "pass" : (wordCount >= 600 ? "warn" : "fail"),
    msg: wordCount + " words. " + (wordCount >= 1000 ? "Great depth." : (wordCount >= 600 ? "Decent length. Aim for 1000+ for pillar articles." : "Too short. Aim for 600+ for thin content, 1500+ for pillar articles."))
  });

  var keywordOccurrences = 0;
  if (keyword && contentL) {
    var re = new RegExp("\\b" + keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
    keywordOccurrences = (contentL.match(re) || []).length;
  }
  var density = wordCount > 0 ? (keywordOccurrences / wordCount) * 100 : 0;
  checks.push({
    cat: "Content",
    label: "Keyword density",
    pass: (density >= 0.5 && density <= 2.5) ? "pass" : (((density > 0 && density < 0.5) || (density > 2.5 && density <= 3.5)) ? "warn" : "fail"),
    msg: keywordOccurrences === 0 ? "Keyword not found in content." : keywordOccurrences + " occurrences (" + density.toFixed(2) + "%). " + (density < 0.5 ? "Use it a few more times naturally." : (density > 2.5 ? "Too dense — risks keyword stuffing." : "Healthy density."))
  });

  var first100 = words.slice(0, 100).join(" ").toLowerCase();
  checks.push({
    cat: "Content",
    label: "Keyword in intro",
    pass: first100.includes(keyword) ? "pass" : "fail",
    msg: first100.includes(keyword) ? "Keyword appears in the first 100 words." : "Add the keyword to your opening paragraph."
  });

  var h2s = visual ? visual.querySelectorAll("h2") : [];
  var h2WithKeyword = 0;
  h2s.forEach(function(h){ if (h.textContent.toLowerCase().includes(keyword)) h2WithKeyword++; });
  checks.push({
    cat: "Content",
    label: "Keyword in subheading",
    pass: h2WithKeyword > 0 ? "pass" : (h2s.length > 0 ? "warn" : "fail"),
    msg: h2s.length === 0 ? "No H2 subheadings found. Add at least 2-3." : (h2WithKeyword > 0 ? h2WithKeyword + " of " + h2s.length + " H2s contain the keyword." : "None of your " + h2s.length + " H2s contain the keyword.")
  });

  checks.push({
    cat: "Content",
    label: "Subheading count (H2)",
    pass: h2s.length >= 3 ? "pass" : (h2s.length >= 1 ? "warn" : "fail"),
    msg: h2s.length + " H2 headings. " + (h2s.length >= 3 ? "Good structure." : "Aim for 3+ to break up content.")
  });

  // ───── STRUCTURE ─────
  var imgs = visual ? visual.querySelectorAll("img") : [];
  var imgsWithoutAlt = 0;
  imgs.forEach(function(img){ if (!img.getAttribute("alt") || !img.getAttribute("alt").trim()) imgsWithoutAlt++; });
  checks.push({
    cat: "Structure",
    label: "Image alt text",
    pass: imgs.length === 0 ? "warn" : (imgsWithoutAlt === 0 ? "pass" : "fail"),
    msg: imgs.length === 0 ? "No images. Consider adding at least one." : (imgsWithoutAlt === 0 ? "All " + imgs.length + " images have alt text." : imgsWithoutAlt + " of " + imgs.length + " images missing alt text.")
  });

  var allLinks = visual ? visual.querySelectorAll("a[href]") : [];
  var internalCount = 0, externalCount = 0;
  allLinks.forEach(function(a){
    var href = a.getAttribute("href") || "";
    if (href.startsWith("/") || href.includes("kbeauty.fun")) internalCount++;
    else if (href.startsWith("http")) externalCount++;
  });
  checks.push({
    cat: "Structure",
    label: "Internal links",
    pass: internalCount >= 2 ? "pass" : (internalCount === 1 ? "warn" : "fail"),
    msg: internalCount + " internal link" + (internalCount !== 1 ? "s" : "") + ". " + (internalCount >= 2 ? "Good — helps topical authority." : "Link to your category pages or other blog posts.")
  });

  checks.push({
    cat: "Structure",
    label: "External links",
    pass: externalCount >= 1 ? "pass" : "warn",
    msg: externalCount + " external link" + (externalCount !== 1 ? "s" : "") + ". " + (externalCount >= 1 ? "Citing sources boosts trust." : "Cite a study, research, or authoritative source.")
  });

  checks.push({
    cat: "Structure",
    label: "Featured image",
    pass: cover ? "pass" : "fail",
    msg: cover ? "Cover image set." : "Add a cover image."
  });

  // ───── READABILITY ─────
  var sentences = plainText.split(/[.!?]+/).filter(function(s){return s.trim().length > 5;});
  var sentenceCount = Math.max(sentences.length, 1);
  var syllableCount = 0;
  words.forEach(function(w){ syllableCount += countSyllables(w); });
  var flesch = wordCount > 0 ? 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount) : 0;
  flesch = Math.max(0, Math.min(100, flesch));
  checks.push({
    cat: "Readability",
    label: "Flesch Reading Ease",
    pass: flesch >= 60 ? "pass" : (flesch >= 50 ? "warn" : "fail"),
    msg: flesch.toFixed(0) + "/100. " + (flesch >= 70 ? "Easy to read." : (flesch >= 60 ? "Plain English — good." : (flesch >= 50 ? "Fairly difficult. Try shorter sentences." : "Hard to read. Simplify language.")))
  });

  var avgSent = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  checks.push({
    cat: "Readability",
    label: "Average sentence length",
    pass: avgSent > 0 && avgSent <= 20 ? "pass" : (avgSent <= 25 ? "warn" : "fail"),
    msg: avgSent.toFixed(1) + " words/sentence. " + (avgSent <= 20 ? "Punchy and readable." : (avgSent <= 25 ? "Slightly long. Break up some sentences." : "Sentences too long. Aim for under 20 words avg."))
  });

  var paras = visual ? visual.querySelectorAll("p") : [];
  var longParas = 0;
  paras.forEach(function(p){
    var pw = (p.innerText || "").trim().split(/\s+/).filter(Boolean).length;
    if (pw > 150) longParas++;
  });
  checks.push({
    cat: "Readability",
    label: "Paragraph length",
    pass: longParas === 0 ? "pass" : (longParas <= 2 ? "warn" : "fail"),
    msg: longParas === 0 ? "All paragraphs are reader-friendly." : longParas + " paragraph" + (longParas > 1 ? "s are" : " is") + " over 150 words. Break them up."
  });

  // ───── E-E-A-T SIGNALS ─────
  var tables = visual ? visual.querySelectorAll("table").length : 0;
  var lists = visual ? visual.querySelectorAll("ul, ol").length : 0;
  checks.push({
    cat: "E-E-A-T",
    label: "Tables or lists",
    pass: (tables + lists) >= 2 ? "pass" : ((tables + lists) >= 1 ? "warn" : "fail"),
    msg: tables + " table" + (tables !== 1 ? "s" : "") + ", " + lists + " list" + (lists !== 1 ? "s" : "") + ". " + ((tables + lists) >= 2 ? "Good — structured data scannable." : "Add comparison tables or bullet lists.")
  });

  var productCards = visual ? visual.querySelectorAll(".kb-product-card").length : 0;
  checks.push({
    cat: "E-E-A-T",
    label: "Product cards",
    pass: productCards >= 1 ? "pass" : "warn",
    msg: productCards + " product card" + (productCards !== 1 ? "s" : "") + ". " + (productCards >= 1 ? "Good monetization signal." : "Add product cards for affiliate revenue.")
  });

  // ───── COMPUTE SCORE ─────
  var passed = checks.filter(function(c){return c.pass === "pass";}).length;
  var warned = checks.filter(function(c){return c.pass === "warn";}).length;
  var totalChecks = checks.length;
  var score = Math.round(((passed * 1.0) + (warned * 0.5)) / totalChecks * 100);

  setSEOScoreDot(score);
  renderSEOChecks(checks);
}

function setSEOScoreDot(score) {
  var dot = document.getElementById("seoScoreDot");
  if (!dot) return;
  if (score === null) {
    dot.textContent = "—";
    dot.className = "seo-score-dot seo-score-empty";
    return;
  }
  dot.textContent = score;
  if (score >= 80) dot.className = "seo-score-dot seo-score-good";
  else if (score >= 50) dot.className = "seo-score-dot seo-score-ok";
  else dot.className = "seo-score-dot seo-score-bad";
}

function renderSEOChecks(checks) {
  var byCat = {};
  checks.forEach(function(c){
    if (!byCat[c.cat]) byCat[c.cat] = [];
    byCat[c.cat].push(c);
  });

  var html = "";
  Object.keys(byCat).forEach(function(cat){
    html += '<div class="seo-cat-group">';
    html += '<div class="seo-cat-title">' + cat + '</div>';
    byCat[cat].forEach(function(c){
      var icon = c.pass === "pass" ? "✅" : (c.pass === "warn" ? "⚠️" : "❌");
      html += '<div class="seo-check seo-check-' + c.pass + '">';
      html += '<span class="seo-check-icon">' + icon + '</span>';
      html += '<div class="seo-check-body"><div class="seo-check-label">' + c.label + '</div><div class="seo-check-msg">' + c.msg + '</div></div>';
      html += '</div>';
    });
    html += '</div>';
  });

  document.getElementById("seoChecks").innerHTML = html;
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  var matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function scheduleSEOAnalysis() {
  if (seoAnalysisTimer) clearTimeout(seoAnalysisTimer);
  seoAnalysisTimer = setTimeout(runSEOAnalysis, 500);
}

// Wire up listeners once DOM is ready
function initSEOAnalysis() {
  ["seoFocusKeyword","blogTitle","blogSlug","blogExcerpt","blogCover"].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", scheduleSEOAnalysis);
  });
  var visual = document.getElementById("blogVisual");
  if (visual) visual.addEventListener("input", scheduleSEOAnalysis);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSEOAnalysis);
} else {
  initSEOAnalysis();
}
