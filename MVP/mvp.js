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

window.mvpNotify = mvpNotify;
window.buildMvpHref = buildMvpHref;
window.normalizeOrgName = normalizeOrgName;

document.addEventListener("DOMContentLoaded", () => {
  initPageEnterAnimation();
  initNavigationTransitions();

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
