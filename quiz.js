/* ============================================================
   FIND YOUR K-BEAUTY MATCH - Product Quiz
   kbeauty.fun

   Depends on globals already loaded by shared.js on this site:
     - loadAllProducts()   -> returns array of all products, each tagged p._cat
     - loadConfig()        -> already called on homepage before this runs
     - CATEGORY_META       -> { catKey: { title, file } }
     - SITE_PAGES          -> { catKey: "/category-url" }
     - renderProductCard(p, x, catKey) -> returns HTML string for a product card

   This file is self-contained: it injects its own CSS and HTML,
   no changes needed to shared.css.
   ============================================================ */

(function () {

  // ---------- CONFIG ----------
  var SCROLL_TRIGGER_PERCENT = 50;   // fire after 50% scroll depth
  var TIME_TRIGGER_MS = 20000;       // OR after 20s, whichever first
  var DISMISS_COOLDOWN_DAYS = 7;     // don't re-show for 7 days after close
  var STORAGE_DISMISS_KEY = "kb_quiz_dismissed_until";
  var SESSION_SHOWN_KEY = "kb_quiz_shown_this_session";
  var RESULT_LIMIT = 4;

  // Skip entirely on admin / localhost, same convention as ad skip logic
  if (location.pathname.indexOf("/admin") === 0) return;
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;

  // Respect dismiss cooldown
  try {
    var dismissedUntil = localStorage.getItem(STORAGE_DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) return;
  } catch (e) {}

  // Only once per browser session (tab)
  try {
    if (sessionStorage.getItem(SESSION_SHOWN_KEY)) return;
  } catch (e) {}

  // ---------- KEYWORD MAPS ----------
  // Each maps a quiz answer to keywords searched (priority order) in:
  // subtag (weight 3) -> tag (weight 2) -> name (weight 1)

  var CONCERN_KEYWORDS = {
    acne: ["acne", "breakout", "blemish", "spot", "pimple", "salicylic", "bha", "tea tree", "clarifying", "clear"],
    dullness: ["brightening", "glow", "dull", "vitamin c", "niacinamide", "radiance", "tone", "brighten"],
    dehydration: ["hydrating", "moisture", "hyaluronic", "dewy", "water", "moisturiz", "hydra"],
    aging: ["anti-aging", "anti aging", "wrinkle", "firming", "retinol", "elasticity", "collagen", "fine line"]
  };

  var SKINTYPE_KEYWORDS = {
    oily: ["oil-free", "oil free", "oily", "mattifying", "pore", "sebum", "oil control"],
    dry: ["dry", "nourishing", "rich", "hydrating", "moisturiz"],
    combination: ["balancing", "combination", "combo"],
    sensitive: ["sensitive", "gentle", "fragrance-free", "fragrance free", "calming", "centella", "soothing"]
  };

  var CATEGORY_KEYWORDS = {
    // kept only as a text-search fallback if the exact tag/subtag match
    // below ever comes up empty for a product not yet tagged correctly
    cleanser: ["cleanser", "cleansing", "face wash", "foam"],
    serum: ["serum", "ampoule", "essence"],
    moisturizer: ["moisturizer", "moisturiser", "cream", "lotion"],
    sunscreen: ["sunscreen", "spf", "sun cream", "sun stick"]
  };

  // Exact tag/subtag pairs, matching config.json's real taxonomy.
  // This is now the PRIMARY way category filtering works (precise),
  // not text-guessing on product names.
  var CATEGORY_TAG_MAP = {
    cleanser: { tag: "Face", subtag: "Cleansers" },
    serum: { tag: "Face", subtag: "Serums & Essences" },
    moisturizer: { tag: "Face", subtag: "Creams & Moisturizers" },
    sunscreen: { tag: "Sunscreens & Tanning", subtag: "Sunscreens" }
    // "routine" intentionally has no entry -> no product-type filter applied
  };

  // Builds the same URL pattern category.js already reads via
  // urlParams.get("tag") / urlParams.get("subtag") - e.g.
  // /skincare?tag=Face&subtag=Serums%20%26%20Essences
  function categoryDeepLink(categoryAnswer) {
    var mapping = CATEGORY_TAG_MAP[categoryAnswer];
    if (!mapping) return "/skincare";
    return "/skincare?tag=" + encodeURIComponent(mapping.tag) + "&subtag=" + encodeURIComponent(mapping.subtag);
  }

  // ---------- QUESTIONS ----------
  var QUESTIONS = [
    {
      key: "skinType",
      title: "What's your skin type?",
      options: [
        { label: "Oily", value: "oily" },
        { label: "Dry", value: "dry" },
        { label: "Combination", value: "combination" },
        { label: "Sensitive", value: "sensitive" }
      ]
    },
    {
      key: "concern",
      title: "What's your main concern right now?",
      options: [
        { label: "Acne & breakouts", value: "acne" },
        { label: "Dullness & uneven tone", value: "dullness" },
        { label: "Dehydration", value: "dehydration" },
        { label: "Fine lines & aging", value: "aging" }
      ]
    },
    {
      key: "category",
      title: "What do you want to focus on?",
      options: [
        { label: "Cleanser", value: "cleanser" },
        { label: "Serum", value: "serum" },
        { label: "Moisturizer", value: "moisturizer" },
        { label: "Sunscreen", value: "sunscreen" },
        { label: "A full routine", value: "routine" }
      ]
    },
    {
      key: "budget",
      title: "Budget comfort?",
      options: [
        { label: "Budget-friendly", value: "budget" },
        { label: "Mid-range", value: "midrange" },
        { label: "No preference", value: "any" }
      ]
    }
  ];

  var answers = {};
  var currentStep = 0; // 0 = overview, 1..4 = questions, 5 = result
  var totalSteps = QUESTIONS.length + 2; // overview + 4 questions + result

  // ---------- STYLES ----------
  var css = [
    "#kbQuizOverlay{position:fixed;inset:0;background:rgba(20,16,14,0.55);z-index:9999;",
    "display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;",
    "transition:opacity .25s ease;}",
    "#kbQuizOverlay.kb-show{opacity:1;}",
    "#kbQuizCard{background:#fff;border-radius:16px;max-width:440px;width:100%;",
    "max-height:88vh;overflow-y:auto;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.25);",
    "font-family:'Outfit',sans-serif;transform:translateY(16px);transition:transform .25s ease;}",
    "#kbQuizOverlay.kb-show #kbQuizCard{transform:translateY(0);}",
    ".kb-quiz-close{position:absolute;top:12px;right:14px;background:none;border:none;",
    "font-size:1.4rem;line-height:1;cursor:pointer;color:var(--text-light,#888);z-index:2;",
    "width:32px;height:32px;border-radius:50%;}",
    ".kb-quiz-close:hover{background:#f2f2f2;}",
    ".kb-quiz-inner{padding:32px 26px 26px;}",
    ".kb-quiz-eyebrow{font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;",
    "color:#E8447A;font-weight:600;margin-bottom:8px;}",
    ".kb-quiz-title{font-family:'Noto Serif Display',serif;font-size:1.4rem;",
    "margin:0 0 10px;color:#2a221d;line-height:1.3;}",
    ".kb-quiz-sub{font-size:0.92rem;color:var(--text-light,#777);margin-bottom:22px;line-height:1.5;}",
    ".kb-quiz-btn{display:block;width:100%;text-align:left;padding:14px 16px;margin-bottom:10px;",
    "border:1.5px solid #e8e0da;border-radius:10px;background:#fff;font-family:'Outfit',sans-serif;",
    "font-size:0.95rem;font-weight:500;color:#2a221d;cursor:pointer;transition:all .15s ease;}",
    ".kb-quiz-btn:hover{border-color:#E8447A;background:#fff5f8;}",
    ".kb-quiz-start{background:linear-gradient(135deg,#FF6B8A,#E8447A);color:#fff;border:none;padding:14px 20px;",
    "border-radius:10px;font-size:0.98rem;font-weight:600;cursor:pointer;width:100%;",
    "font-family:'Outfit',sans-serif;margin-top:4px;}",
    ".kb-quiz-start:hover{opacity:0.92;}",
    ".kb-quiz-progress{display:flex;gap:6px;margin-bottom:22px;}",
    ".kb-quiz-progress span{height:4px;flex:1;background:#eee3db;border-radius:2px;overflow:hidden;}",
    ".kb-quiz-progress span i{display:block;height:100%;width:0%;background:#E8447A;",
    "transition:width .2s ease;}",
    ".kb-quiz-progress span.kb-done i{width:100%;}",
    ".kb-quiz-results-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 18px;}",
    ".kb-quiz-results-grid .product-card{font-size:0.82rem;}",
    ".kb-quiz-routine-card{background:#fbf6f2;border:1.5px solid #eee3db;border-radius:12px;",
    "padding:14px 16px;margin-bottom:16px;}",
    ".kb-quiz-routine-card a{color:#E8447A;font-weight:600;text-decoration:none;",
    "font-size:0.92rem;}",
    ".kb-quiz-browse{display:block;text-align:center;padding:12px;border:1.5px solid #E8447A;",
    "border-radius:10px;color:#E8447A;text-decoration:none;font-size:0.9rem;font-weight:600;",
    "margin-top:4px;}",
    ".kb-quiz-browse:hover{background:#fff5f8;}",
    "@media(max-width:480px){.kb-quiz-results-grid{grid-template-columns:1fr 1fr;}",
    ".kb-quiz-inner{padding:26px 18px 20px;}}"
  ].join("");

  var styleTag = document.createElement("style");
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // ---------- TRIGGER LOGIC ----------
  var triggered = false;

  function maybeTrigger() {
    if (triggered) return;
    triggered = true;
    try { sessionStorage.setItem(SESSION_SHOWN_KEY, "1"); } catch (e) {}
    openQuiz();
  }

  function scrollCheck() {
    var scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    if (scrollPercent >= SCROLL_TRIGGER_PERCENT) {
      window.removeEventListener("scroll", scrollCheck);
      maybeTrigger();
    }
  }

  window.addEventListener("scroll", scrollCheck, { passive: true });
  setTimeout(maybeTrigger, TIME_TRIGGER_MS);

  // ---------- SCORING ----------
  function textMatchScore(product, keywords) {
    if (!keywords || !keywords.length) return 0;
    var subtag = (product.subtag || "").toLowerCase();
    var tag = (product.tag || "").toLowerCase();
    var name = (product.name || "").toLowerCase();
    var score = 0;
    for (var i = 0; i < keywords.length; i++) {
      var k = keywords[i];
      if (subtag.indexOf(k) !== -1) score += 3;
      if (tag.indexOf(k) !== -1) score += 2;
      if (name.indexOf(k) !== -1) score += 1;
    }
    return score;
  }

  function reviewCount(p) {
    return parseInt((p.reviews || "0").toString().replace(/[^0-9]/g, "")) || 0;
  }

  function passesBudget(p, budget) {
    if (budget === "any" || !budget) return true;
    var price = parseFloat(p.price);
    if (isNaN(price)) return true;
    if (budget === "budget") return price <= 15;
    if (budget === "midrange") return price > 15 && price <= 30;
    return true;
  }

  function baseQualityFilter(p) {
    if (!p.image || !p.image.toString().trim()) return false;
    if (!p.id || !p._cat) return false;
    return reviewCount(p) >= 50 && (parseFloat(p.rating) || 0) >= 4.0;
  }

  // HARD gate: does this product actually belong to the chosen category?
  // Primary check: exact tag/subtag match against config.json taxonomy.
  // Fallback: loose keyword search, only used if the exact match finds
  // nothing at all (e.g. a product mistagged or missing subtag).
  function matchesCategory(p, category) {
    var mapping = CATEGORY_TAG_MAP[category];
    if (!mapping) return true; // "routine" (or unknown) -> no product-type filter
    return p.tag === mapping.tag && p.subtag === mapping.subtag;
  }

  function matchesCategoryLoose(p, category) {
    var keywords = CATEGORY_KEYWORDS[category];
    if (!keywords) return true;
    var subtag = (p.subtag || "").toLowerCase();
    var tag = (p.tag || "").toLowerCase();
    var name = (p.name || "").toLowerCase();
    for (var i = 0; i < keywords.length; i++) {
      var k = keywords[i];
      if (subtag.indexOf(k) !== -1 || tag.indexOf(k) !== -1 || name.indexOf(k) !== -1) return true;
    }
    return false;
  }

  function scoreProducts(products, opts) {
    // opts: { skinType, concern, useSkinType, useConcern, budget }
    // Category is NOT scored here anymore -- it's a hard filter applied
    // before this function ever runs (see getResults below). This only
    // ranks within whatever pool it's given.
    return products
      .filter(baseQualityFilter)
      .map(function (p) {
        var score = 0;
        if (opts.useConcern && opts.concern) score += textMatchScore(p, CONCERN_KEYWORDS[opts.concern]);
        if (opts.useSkinType && opts.skinType) score += textMatchScore(p, SKINTYPE_KEYWORDS[opts.skinType]);
        return { p: p, score: score };
      })
      .filter(function (row) { return row.score > 0; })
      .filter(function (row) { return passesBudget(row.p, opts.budget); })
      .sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return reviewCount(b.p) - reviewCount(a.p);
      })
      .map(function (row) { return row.p; });
  }

  function getResults(allProducts, ans) {
    var skincare = allProducts.filter(function (p) { return p._cat === "skincare"; });

    // STEP 1: hard-filter to the chosen category first (serum picks only see
    // serums, cleanser picks only see cleansers, etc). "routine" / unknown
    // category = no product-type filter, same as before.
    var hasCategoryFilter = !!(ans.category && CATEGORY_TAG_MAP[ans.category]);
    var categoryPool = hasCategoryFilter
      ? skincare.filter(function (p) { return matchesCategory(p, ans.category); })
      : skincare;

    // If exact tag/subtag match came up thin (e.g. catalog gaps), widen
    // with a loose keyword match before giving up on the category entirely.
    if (hasCategoryFilter && categoryPool.length < RESULT_LIMIT) {
      var looseMatches = skincare.filter(function (p) {
        return matchesCategory(p, ans.category) || matchesCategoryLoose(p, ans.category);
      });
      if (looseMatches.length > categoryPool.length) categoryPool = looseMatches;
    }

    // STEP 2: within that category pool, rank by skin type + concern match,
    // loosening gradually if too few results.
    var attempts = [
      { useSkinType: true, useConcern: true },
      { useSkinType: false, useConcern: true }
    ];

    var results = [];
    for (var i = 0; i < attempts.length; i++) {
      var opts = {
        skinType: ans.skinType,
        concern: ans.concern,
        budget: ans.budget,
        useSkinType: attempts[i].useSkinType,
        useConcern: attempts[i].useConcern
      };
      results = scoreProducts(categoryPool, opts);
      if (results.length >= RESULT_LIMIT) break;
    }

    // STEP 3: still not enough? fall back to best sellers WITHIN the category
    // pool (so a serum pick still only ever shows serums).
    if (results.length < RESULT_LIMIT) {
      var bestSellers = categoryPool
        .filter(baseQualityFilter)
        .filter(function (p) { return passesBudget(p, ans.budget); })
        .sort(function (a, b) { return reviewCount(b) - reviewCount(a); });
      var existingIds = {};
      results.forEach(function (p) { existingIds[p.id] = true; });
      bestSellers.forEach(function (p) {
        if (!existingIds[p.id] && results.length < RESULT_LIMIT) {
          results.push(p);
          existingIds[p.id] = true;
        }
      });
    }

    // STEP 4: absolute last resort -- only if the category pool itself was
    // too small to fill results (rare, e.g. very few serums in catalog).
    // Widens to all skincare rather than showing nothing, but this should
    // be uncommon with 800-1000+ products.
    if (results.length === 0 && hasCategoryFilter) {
      results = skincare.filter(baseQualityFilter).sort(function (a, b) { return reviewCount(b) - reviewCount(a); });
    }

    return results.slice(0, RESULT_LIMIT);
  }

  // Attempts to find a matching routine. Defensive: routines.json schema
  // isn't fully known here, so this checks a few likely field shapes.
  // NOTE TO INAM: verify field names below against your actual routines.json
  // and adjust if the match isn't firing correctly.
  function findMatchingRoutine(routines, ans) {
    if (!routines || !routines.length) return null;
    var skinType = (ans.skinType || "").toLowerCase();
    for (var i = 0; i < routines.length; i++) {
      var r = routines[i];
      var haystack = [
        r.skinType, r.skin_type, (r.tags || []).join(" "),
        r.title, r.name
      ].filter(Boolean).join(" ").toLowerCase();
      if (skinType && haystack.indexOf(skinType) !== -1) return r;
    }
    return null;
  }

  // ---------- RENDER ----------
  var overlayEl, cardEl;

  function progressHTML() {
    var dots = "";
    for (var i = 1; i <= QUESTIONS.length + 1; i++) {
      var doneClass = i <= currentStep ? " kb-done" : "";
      dots += '<span class="' + doneClass.trim() + '"><i></i></span>';
    }
    return '<div class="kb-quiz-progress">' + dots + "</div>";
  }

  function renderOverview() {
    return (
      '<div class="kb-quiz-inner">' +
        '<div class="kb-quiz-eyebrow">60-second match</div>' +
        '<h2 class="kb-quiz-title">Find Your K-Beauty Match</h2>' +
        '<p class="kb-quiz-sub">Answer 4 quick questions and we\'ll match you with Korean skincare picks suited to your skin - plus your ideal routine if we\'ve got one.</p>' +
        '<button class="kb-quiz-start" id="kbQuizStartBtn">Start Quiz →</button>' +
      "</div>"
    );
  }

  function renderQuestion(q) {
    var optsHTML = q.options.map(function (o) {
      return '<button class="kb-quiz-btn" data-key="' + q.key + '" data-value="' + o.value + '">' + o.label + "</button>";
    }).join("");
    return (
      '<div class="kb-quiz-inner">' +
        progressHTML() +
        '<h2 class="kb-quiz-title">' + q.title + "</h2>" +
        optsHTML +
      "</div>"
    );
  }

  function renderLoading() {
    return '<div class="kb-quiz-inner">' + progressHTML() + '<p class="kb-quiz-sub">Finding your matches…</p></div>';
  }

  function renderResults(results, routine, ans) {
    var catKey = "skincare";
    var cardsHTML = results.map(function (p) {
      return renderProductCard(p, null, catKey);
    }).join("");

    var routineHTML = "";
    if (routine) {
      var routineUrl = routine.url || routine.slug ? "/routines/" + (routine.slug || routine.id) : "/routines";
      routineHTML =
        '<div class="kb-quiz-routine-card">' +
          '<div style="font-size:0.8rem;color:var(--text-light,#888);margin-bottom:4px;">Your Routine Match</div>' +
          '<a href="' + routineUrl + '">' + (routine.title || routine.name || "View Your Routine") + " →</a>" +
        "</div>";
    }

    var browseUrl = categoryDeepLink(ans.category);
    var browseLabel = (ans.category && CATEGORY_TAG_MAP[ans.category])
      ? "Browse More " + (CATEGORY_TAG_MAP[ans.category].subtag) + " \u2192"
      : "Browse More Skincare \u2192";

    return (
      '<div class="kb-quiz-inner">' +
        '<div class="kb-quiz-eyebrow">Your matches</div>' +
        '<h2 class="kb-quiz-title">Picked for your skin</h2>' +
        routineHTML +
        '<div class="kb-quiz-results-grid">' + cardsHTML + "</div>" +
        '<a class="kb-quiz-browse" href="' + browseUrl + '">' + browseLabel + '</a>' +
      "</div>"
    );
  }

  function renderStep() {
    if (currentStep === 0) {
      cardEl.innerHTML = renderOverview();
      var startBtn = document.getElementById("kbQuizStartBtn");
      if (startBtn) startBtn.onclick = function () { currentStep = 1; renderStep(); };
      return;
    }
    if (currentStep >= 1 && currentStep <= QUESTIONS.length) {
      var q = QUESTIONS[currentStep - 1];
      cardEl.innerHTML = renderQuestion(q);
      var btns = cardEl.querySelectorAll(".kb-quiz-btn");
      for (var i = 0; i < btns.length; i++) {
        btns[i].onclick = function () {
          answers[this.getAttribute("data-key")] = this.getAttribute("data-value");
          currentStep++;
          renderStep();
        };
      }
      return;
    }
    // Result step
    cardEl.innerHTML = renderLoading();
    Promise.all([
      loadAllProducts(),
      fetch("/data/routines.json").then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
    ]).then(function (out) {
      var allProducts = out[0] || [];
      var routines = out[1] || [];
      var results = getResults(allProducts, answers);
      var routine = findMatchingRoutine(routines, answers);
      cardEl.innerHTML = renderResults(results, routine, answers);
      logQuizCompletion(answers, results.length);
      if (typeof window.kbFireSmartlinkMilestone === "function") window.kbFireSmartlinkMilestone();
    }).catch(function () {
      cardEl.innerHTML = '<div class="kb-quiz-inner"><p class="kb-quiz-sub">Something went wrong loading your matches. Please try again shortly.</p></div>';
    });
  }

  function logQuizCompletion(ans, resultCount) {
    try {
      if (typeof gtag === "function") {
        gtag("event", "quiz_completed", {
          skin_type: ans.skinType || "",
          concern: ans.concern || "",
          category: ans.category || "",
          budget: ans.budget || "",
          result_count: resultCount
        });
      }
    } catch (e) {}
  }

  function closeQuiz(remember) {
    overlayEl.classList.remove("kb-show");
    setTimeout(function () {
      if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
    }, 250);
    if (remember) {
      try {
        var until = Date.now() + DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
        localStorage.setItem(STORAGE_DISMISS_KEY, until.toString());
      } catch (e) {}
    }
  }

  function openQuiz() {
    overlayEl = document.createElement("div");
    overlayEl.id = "kbQuizOverlay";

    var wrapper = document.createElement("div");
    wrapper.id = "kbQuizCard";

    var closeBtn = document.createElement("button");
    closeBtn.className = "kb-quiz-close";
    closeBtn.id = "kbQuizCloseBtn";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.innerHTML = "×";
    closeBtn.onclick = function () { closeQuiz(true); };

    var contentEl = document.createElement("div");
    contentEl.id = "kbQuizContent";

    wrapper.appendChild(closeBtn);
    wrapper.appendChild(contentEl);
    overlayEl.appendChild(wrapper);
    document.body.appendChild(overlayEl);

    cardEl = contentEl; // renderStep() only ever touches this inner container now

    overlayEl.addEventListener("click", function (e) {
      if (e.target === overlayEl) closeQuiz(true);
    });

    currentStep = 0;
    renderStep();
    requestAnimationFrame(function () { overlayEl.classList.add("kb-show"); });
  }

})();
