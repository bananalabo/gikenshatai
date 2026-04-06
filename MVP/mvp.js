// MVP prototype helper — no backend.
// Reads query params so the same pages feel consistent when navigating.
// Also wires the bottom tab bar and mobile header.

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

document.addEventListener("DOMContentLoaded", () => {
  const role        = getQueryParam("role") || "user";
  const orgFallback = "Honda（例）";
  const orgQuery    = getQueryParam("org") || orgFallback;
  const path        = window.location.pathname || "";
  const isInSubfolder = /\/(admin|user)\//.test(path);
  // Pages in admin/ or user/ folders need "../" to reach root assets.
  const rootPrefix = isInSubfolder ? "../" : "./";
  const hrefOrg    = encodeURIComponent(orgQuery);

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
    rolePill.textContent = role === "admin" ? "Admin" : "User";
  }

  // ── Back-to-list button ──────────────────────────────────
  const backBtn = document.getElementById("backToListBtn");
  if (backBtn) {
    backBtn.href = role === "admin"
      ? rootPrefix + "admin/admin-cases.html?role=admin&org=" + hrefOrg
      : rootPrefix + "user/user-cases.html?role=user&org=" + hrefOrg;
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
      ? rootPrefix + "admin/admin-cases.html?role=admin&org=" + hrefOrg
      : rootPrefix + "user/user-cases.html?role=user&org=" + hrefOrg;
  }
  if (navVendorsLink) {
    navVendorsLink.href = rootPrefix + "vendors.html?role=" + encodeURIComponent(role) + "&org=" + hrefOrg;
  }
  if (navInboxLink) {
    navInboxLink.href = rootPrefix + "inbox.html?role=" + encodeURIComponent(role) + "&org=" + hrefOrg;
  }
  if (navNewCaseLink) {
    navNewCaseLink.href = rootPrefix + "user/user-new-case.html?role=user&org=" + hrefOrg;
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
      ? rootPrefix + "admin/admin-cases.html?role=admin&org=" + hrefOrg
      : rootPrefix + "user/user-cases.html?role=user&org=" + hrefOrg;
  }
  if (bnNewCase) {
    bnNewCase.href = rootPrefix + "user/user-new-case.html?role=user&org=" + hrefOrg;
  }
  if (bnInbox) {
    bnInbox.href = rootPrefix + "inbox.html?role=" + encodeURIComponent(role) + "&org=" + hrefOrg;
  }
  if (bnVendors) {
    bnVendors.href = rootPrefix + "vendors.html?role=" + encodeURIComponent(role) + "&org=" + hrefOrg;
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
