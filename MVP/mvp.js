// MVP prototype helper — no backend.
// Unifies params/navigation, adds app-like transitions, and shared feedback UI.

(function syncMvpRole() {
  const p = new URLSearchParams(window.location.search);
  document.documentElement.setAttribute(
    "data-mvp-role",
    p.get("role") === "admin" ? "admin" : "user"
  );
})();

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function normalizeOrgName(orgRaw) {
  const raw = (orgRaw || "").trim();
  if (!raw) return "";

  const normalized = raw
    .replace(/（例）/g, "")
    .replace(/\(例\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const map = {
    Honda: "Honda",
    ホンダ: "Honda",
    元請け: "元請け",
    損保A: "損保A",
    物流B: "物流B",
  };

  return map[normalized] || normalized;
}

function buildMvpHref(path, params) {
  const q = new URLSearchParams();
  Object.keys(params || {}).forEach(key => {
    const val = params[key];
    if (val !== undefined && val !== null && val !== "") q.set(key, String(val));
  });
  const qs = q.toString();
  return qs ? path + "?" + qs : path;
}

function initPageEnterAnimation() {
  const body = document.body;
  if (!body) return;

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    body.classList.add("page-ready");
    return;
  }

  const navDir = sessionStorage.getItem("mvp-nav-dir") || "forward";
  body.classList.add(navDir === "back" ? "page-enter-back" : "page-enter-forward");
  requestAnimationFrame(() => {
    body.classList.add("page-enter-active");
    window.setTimeout(() => {
      body.classList.add("page-ready");
      body.classList.remove("page-enter-forward", "page-enter-back", "page-enter-active");
    }, 260);
  });
}

function shouldAnimateNavLink(anchor) {
  if (!anchor) return false;
  const href = anchor.getAttribute("href") || "";
  if (!href || href.startsWith("#")) return false;
  if (anchor.hasAttribute("data-no-transition")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (/^https?:\/\//i.test(href)) return false;
  return true;
}

function initNavigationTransitions() {
  document.addEventListener("click", e => {
    const anchor = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!shouldAnimateNavLink(anchor)) return;

    const href = anchor.getAttribute("href");
    const navDirAttr = anchor.getAttribute("data-nav-dir");
    const navDir = navDirAttr || (anchor.classList.contains("back") ? "back" : "forward");
    sessionStorage.setItem("mvp-nav-dir", navDir);

    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    e.preventDefault();
    document.body.classList.add("page-leave", navDir === "back" ? "page-leave-back" : "page-leave-forward");
    window.setTimeout(() => {
      window.location.href = href;
    }, 130);
  });
}

function ensureMvpToast() {
  if (document.getElementById("mvpToast")) return;
  const toast = document.createElement("div");
  toast.id = "mvpToast";
  toast.className = "mvp-toast";
  toast.setAttribute("aria-live", "polite");
  toast.setAttribute("aria-atomic", "true");
  toast.hidden = true;
  document.body.appendChild(toast);
}

function mvpNotify(message, tone) {
  ensureMvpToast();
  const toast = document.getElementById("mvpToast");
  if (!toast) return;
  toast.className = "mvp-toast" + (tone ? " is-" + tone : "");
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.remove("is-visible");
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  window.clearTimeout(mvpNotify._timer);
  mvpNotify._timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => {
      toast.hidden = true;
    }, 180);
  }, 1800);
}

function initSpotlightWalkthrough() {
  const body = document.body;
  if (!body) return;

  const selector = body.getAttribute("data-walkthrough-target");
  if (!selector) return;

  const title = body.getAttribute("data-walkthrough-title") || "この画面の使い方";
  const text =
    body.getAttribute("data-walkthrough-text") ||
    "光っている箇所をタップすると次の操作に進みます。";
  const pageKey =
    body.getAttribute("data-walkthrough-key") ||
    (window.location.pathname || "mvp-page").replace(/[^\w-]+/g, "_");
  const autoEnabled = body.getAttribute("data-walkthrough-auto") !== "false";
  const doneKey = "mvp_walkthrough_done_" + pageKey;
  const pad = 8;
  /** Extra gap so targets are not flush with chrome / viewport edge (avoids “thin strip” CTA). */
  const WALK_TOP_COMFORT = 12;
  const WALK_BOTTOM_COMFORT = 40;
  let cleanup = null;

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function getTarget() {
    const nodes = Array.from(document.querySelectorAll(selector));
    return nodes.find(isVisible) || null;
  }

  function prefersReducedMotion() {
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function getWalkthroughChromeInsets() {
    let top = 0;
    let bottom = 0;
    const header = document.querySelector(".mobile-header");
    if (header) {
      const cs = getComputedStyle(header);
      if (cs.display !== "none" && cs.visibility !== "hidden") {
        top = Math.max(top, header.getBoundingClientRect().bottom);
      }
    }
    const nav = document.querySelector(".bottom-nav");
    if (nav) {
      const cs = getComputedStyle(nav);
      if (cs.display !== "none" && cs.visibility !== "hidden") {
        const nr = nav.getBoundingClientRect();
        bottom = Math.max(bottom, window.innerHeight - nr.top);
      }
    }
    if (window.visualViewport) {
      const vv = window.visualViewport;
      if (vv.offsetTop > 0) top = Math.max(top, vv.offsetTop);
      const gap = window.innerHeight - (vv.offsetTop + vv.height);
      if (gap > 0) bottom = Math.max(bottom, gap);
    }
    return { top: top + 8, bottom: bottom + 8 };
  }

  function isRectInWalkthroughViewport(rect, padArg) {
    const p = padArg == null ? 8 : padArg;
    const insets = getWalkthroughChromeInsets();
    const minTop = insets.top + p + WALK_TOP_COMFORT;
    const maxBottom = window.innerHeight - insets.bottom - p - WALK_BOTTOM_COMFORT;
    return (
      rect.top >= minTop &&
      rect.left >= p &&
      rect.bottom <= maxBottom &&
      rect.right <= window.innerWidth - p
    );
  }

  function ensureTargetInView(targetEl) {
    if (!targetEl || !isVisible(targetEl)) return;
    const pad = 8;
    for (let attempt = 0; attempt < 10; attempt++) {
      const insets = getWalkthroughChromeInsets();
      const minTop = insets.top + pad + WALK_TOP_COMFORT;
      const maxBottom = window.innerHeight - insets.bottom - pad - WALK_BOTTOM_COMFORT;
      const rect = targetEl.getBoundingClientRect();
      if (isRectInWalkthroughViewport(rect, pad)) break;
      let dy = 0;
      if (rect.bottom > maxBottom) dy = rect.bottom - maxBottom;
      else if (rect.top < minTop) dy = rect.top - minTop;
      if (dy === 0) break;
      window.scrollBy({ top: dy, left: 0, behavior: "auto" });
    }
  }

  function markDone() {
    try {
      localStorage.setItem(doneKey, "1");
    } catch (e) {}
  }

  function shouldSkipAuto() {
    if (!autoEnabled) return true;
    try {
      return localStorage.getItem(doneKey) === "1";
    } catch (e) {
      return false;
    }
  }

  function startWalkthrough(force) {
    if (!force && shouldSkipAuto()) return;
    const target = getTarget();
    if (!target) return;

    ensureTargetInView(target);

    if (cleanup) cleanup(false);

    const overlay = document.createElement("div");
    overlay.className = "walkthrough-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", title);
    overlay.innerHTML = [
      '<div class="walkthrough-spotlight" aria-hidden="true"></div>',
      '<div class="walkthrough-pulse" aria-hidden="true"></div>',
      '<div class="walkthrough-card">',
      '  <p class="walkthrough-card__title"></p>',
      '  <p class="walkthrough-card__text"></p>',
      '  <div class="walkthrough-card__actions">',
      '    <button class="btn" type="button" data-walkthrough-close>閉じる</button>',
      "  </div>",
      "</div>",
    ].join("");
    document.body.appendChild(overlay);
    document.body.classList.add("walkthrough-open");

    const spotlight = overlay.querySelector(".walkthrough-spotlight");
    const pulse = overlay.querySelector(".walkthrough-pulse");
    const card = overlay.querySelector(".walkthrough-card");
    const titleEl = overlay.querySelector(".walkthrough-card__title");
    const textEl = overlay.querySelector(".walkthrough-card__text");
    const closeBtn = overlay.querySelector("[data-walkthrough-close]");

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;

    function isInTarget(x, y, rect) {
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    function position() {
      if (!isVisible(target)) return;
      const rect = target.getBoundingClientRect();
      const top = Math.max(6, rect.top - pad);
      const left = Math.max(6, rect.left - pad);
      const width = rect.width + pad * 2;
      const height = rect.height + pad * 2;

      spotlight.style.top = top + "px";
      spotlight.style.left = left + "px";
      spotlight.style.width = width + "px";
      spotlight.style.height = height + "px";

      pulse.style.top = top - 2 + "px";
      pulse.style.left = left - 2 + "px";
      pulse.style.width = width + 4 + "px";
      pulse.style.height = height + 4 + "px";

      const cardWidth = card.offsetWidth || 300;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let cardLeft = rect.left + rect.width / 2 - cardWidth / 2;
      cardLeft = Math.max(12, Math.min(cardLeft, vw - cardWidth - 12));
      let cardTop = rect.bottom + 14;
      if (cardTop + 128 > vh) cardTop = rect.top - 130;
      cardTop = Math.max(12, cardTop);
      card.style.left = cardLeft + "px";
      card.style.top = cardTop + "px";
    }

    function finish(markAsDone) {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      window.removeEventListener("scroll", position, true);
      overlay.removeEventListener("click", onOverlayClick, true);
      if (closeBtn) closeBtn.removeEventListener("click", onClose, true);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.body.classList.remove("walkthrough-open");
      if (markAsDone) markDone();
    }

    function onOverlayClick(e) {
      if (e.target === closeBtn || (closeBtn && closeBtn.contains(e.target))) return;
      const rect = target.getBoundingClientRect();
      if (isInTarget(e.clientX, e.clientY, rect)) {
        finish(true);
        target.click();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    }

    function onClose(e) {
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    }

    overlay.addEventListener("click", onOverlayClick, true);
    if (closeBtn) closeBtn.addEventListener("click", onClose, true);
    function onViewportChange() {
      ensureTargetInView(target);
      position();
    }

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    window.addEventListener("scroll", position, true);
    ensureTargetInView(target);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        position();
      });
    });

    cleanup = function (markAsDone) {
      finish(markAsDone);
      cleanup = null;
    };
  }

  window.mvpStartWalkthrough = function (force) {
    startWalkthrough(!!force);
  };

  const triggerSelector = body.getAttribute("data-walkthrough-trigger");
  if (triggerSelector) {
    const trigger = document.querySelector(triggerSelector);
    if (trigger) {
      trigger.addEventListener("click", function (e) {
        e.preventDefault();
        startWalkthrough(true);
      });
    }
  }

  window.setTimeout(function () {
    startWalkthrough(false);
  }, 240);
}

window.mvpNotify = mvpNotify;
window.buildMvpHref = buildMvpHref;
window.normalizeOrgName = normalizeOrgName;

document.addEventListener("DOMContentLoaded", () => {
  initPageEnterAnimation();
  initNavigationTransitions();
  initSpotlightWalkthrough();

  const role        = getQueryParam("role") || "user";
  const orgFallback = role === "admin" ? "元請け" : "Honda";
  const orgQuery    = normalizeOrgName(getQueryParam("org") || orgFallback);
  const path        = window.location.pathname || "";
  const isInSubfolder = /\/(admin|user)\//.test(path);
  // Pages in admin/ or user/ folders need "../" to reach root assets.
  const rootPrefix = isInSubfolder ? "../" : "./";
  const hrefOrg    = orgQuery;

  // ── Case ID label ────────────────────────────────────────
  const caseIdLabel = document.getElementById("caseIdLabel");
  if (caseIdLabel) {
    caseIdLabel.textContent = getQueryParam("caseId") || "000000";
  }

  // ── Org label ────────────────────────────────────────────
  const orgLabel = document.getElementById("orgLabel");
  if (orgLabel) orgLabel.textContent = orgQuery;

  // ── Role pill ────────────────────────────────────────────
  const rolePill = document.getElementById("rolePill");
  if (rolePill) {
    rolePill.textContent = role === "admin" ? "管理者" : "利用者";
  }

  // ── Back-to-list button ──────────────────────────────────
  const backBtn = document.getElementById("backToListBtn");
  if (backBtn) {
    backBtn.href = role === "admin"
      ? buildMvpHref(rootPrefix + "admin/admin-cases.html", { role: "admin", org: hrefOrg })
      : buildMvpHref(rootPrefix + "user/user-cases.html", { role: "user", org: hrefOrg });
    backBtn.setAttribute("data-nav-dir", "back");
  }

  // ── Determine current page for active-state detection ────
  const file    = path.split("/").pop();
  const isInbox   = file.startsWith("inbox");
  const isVendors = file === "vendors.html";
  const isNewCase = file === "user-new-case.html";
  const isCases   = !isInbox && !isVendors && !isNewCase;

  // ── Sidebar nav links ────────────────────────────────────
  const navCaseListLink = document.getElementById("navCaseListLink");
  const navVendorsLink  = document.getElementById("navVendorsLink");
  const navNewCaseLink  = document.getElementById("navNewCaseLink");
  const navInboxLink    = document.getElementById("navInboxLink");

  if (navCaseListLink) {
    navCaseListLink.href = role === "admin"
      ? buildMvpHref(rootPrefix + "admin/admin-cases.html", { role: "admin", org: hrefOrg })
      : buildMvpHref(rootPrefix + "user/user-cases.html", { role: "user", org: hrefOrg });
  }
  if (navVendorsLink) {
    navVendorsLink.href = buildMvpHref(rootPrefix + "vendors.html", { role: role, org: hrefOrg });
  }
  if (navInboxLink) {
    navInboxLink.href = buildMvpHref(rootPrefix + "inbox.html", { role: role, org: hrefOrg });
  }
  if (navNewCaseLink) {
    navNewCaseLink.href = buildMvpHref(rootPrefix + "user/user-new-case.html", { role: "user", org: hrefOrg });
  }

  // Sidebar active state
  document.querySelectorAll("a.nav-item").forEach(el => el.classList.remove("active"));
  if (isVendors && navVendorsLink) navVendorsLink.classList.add("active");
  else if (isInbox && navInboxLink) navInboxLink.classList.add("active");
  else if (isNewCase && navNewCaseLink) navNewCaseLink.classList.add("active");
  else if (navCaseListLink) navCaseListLink.classList.add("active");

  // ── Bottom nav links ─────────────────────────────────────
  const bnCaseList = document.getElementById("bnCaseList");
  const bnNewCase  = document.getElementById("bnNewCase");
  const bnInbox    = document.getElementById("bnInbox");
  const bnVendors  = document.getElementById("bnVendors");

  if (bnCaseList) {
    bnCaseList.href = role === "admin"
      ? buildMvpHref(rootPrefix + "admin/admin-cases.html", { role: "admin", org: hrefOrg })
      : buildMvpHref(rootPrefix + "user/user-cases.html", { role: "user", org: hrefOrg });
  }
  if (bnNewCase) {
    bnNewCase.href = buildMvpHref(rootPrefix + "user/user-new-case.html", { role: "user", org: hrefOrg });
  }
  if (bnInbox) {
    bnInbox.href = buildMvpHref(rootPrefix + "inbox.html", { role: role, org: hrefOrg });
  }
  if (bnVendors) {
    bnVendors.href = buildMvpHref(rootPrefix + "vendors.html", { role: role, org: hrefOrg });
  }

  // Bottom nav active state
  document.querySelectorAll(".bottom-nav__item").forEach(el => el.classList.remove("active"));
  if (isVendors && bnVendors)       bnVendors.classList.add("active");
  else if (isInbox && bnInbox)      bnInbox.classList.add("active");
  else if (isNewCase && bnNewCase)  bnNewCase.classList.add("active");
  else if (bnCaseList)              bnCaseList.classList.add("active");

  // ── Mobile header title (update dynamically where needed) ─
  // Pages that want a dynamic title can read data-mobile-title attribute
  // or override via their own inline script after DOMContentLoaded.
});
