// Minimal helper for the MVP HTML prototype (no backend).
// It reads query params so the same pages feel consistent when clicking "案件詳細".

(function syncMvpRole() {
  const p = new URLSearchParams(window.location.search);
  document.documentElement.setAttribute(
    "data-mvp-role",
    p.get("role") === "admin" ? "admin" : "user"
  );
})();

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

document.addEventListener("DOMContentLoaded", () => {
  const role = getQueryParam("role") || "user";
  const orgFallback = "Honda（例）";
  const orgQuery = getQueryParam("org") || orgFallback;
  const path = window.location.pathname || "";
  const isInAdminOrUserFolder = /\/(admin|user)\//.test(path);
  // Pages in this prototype live at:
  // - admin:   ./admin/admin-cases.html, ./admin/admin-case-detail.html, ...
  // - user:    ./user/user-cases.html, ./user/user-new-case.html, ...
  // so from subfolders we need "../" to reach the MVP root.
  const rootPrefix = isInAdminOrUserFolder ? "../" : "./";
  const label = document.getElementById("caseIdLabel");
  if (label) {
    const caseId = getQueryParam("caseId") || "000000";
    label.textContent = caseId;
  }

  const orgLabel = document.getElementById("orgLabel");
  if (orgLabel) {
    const org = orgQuery;
    orgLabel.textContent = org;
  }

  // Role-based visibility: html[data-mvp-role] + styles.css (.role-user-only / .role-admin-only).

  // Shared back-to-list button (when present).
  const backBtn = document.getElementById("backToListBtn");
  if (backBtn && role === "admin") {
    backBtn.setAttribute("href", rootPrefix + "admin/admin-cases.html");
  }
  if (backBtn && role === "user") {
    backBtn.setAttribute("href", rootPrefix + "user/user-cases.html");
  }

  // Sidebar navigation (prototype only): set hrefs + active state.
  const navCaseListLink = document.getElementById("navCaseListLink");
  const navVendorsLink = document.getElementById("navVendorsLink");
  const navNewCaseLink = document.getElementById("navNewCaseLink");
  const navInboxLink = document.getElementById("navInboxLink");

  const hrefOrg = encodeURIComponent(orgQuery);

  if (navCaseListLink) {
    navCaseListLink.href =
      role === "admin"
        ? rootPrefix + "admin/admin-cases.html?role=admin&org=" + hrefOrg
        : rootPrefix + "user/user-cases.html?role=user&org=" + hrefOrg;
  }
  if (navVendorsLink) {
    navVendorsLink.href =
      rootPrefix + "vendors.html?role=" + encodeURIComponent(role) + "&org=" + hrefOrg;
  }
  if (navInboxLink) {
    navInboxLink.href =
      rootPrefix + "inbox.html?role=" + encodeURIComponent(role) + "&org=" + hrefOrg;
  }
  if (navNewCaseLink) {
    navNewCaseLink.href =
      rootPrefix + "user/user-new-case.html?role=user&org=" + hrefOrg;
  }

  // Active state: based on current pathname.
  const navItems = document.querySelectorAll("a.nav-item");
  navItems.forEach((el) => el.classList.remove("active"));
  const file = (window.location.pathname || "").split("/").pop();
  const isInbox = file.startsWith("inbox");
  const isVendors = file === "vendors.html";
  const isNewCase = file === "user-new-case.html";

  if (isVendors && navVendorsLink) navVendorsLink.classList.add("active");
  if (isInbox && navInboxLink) navInboxLink.classList.add("active");
  if (isNewCase && navNewCaseLink) navNewCaseLink.classList.add("active");
  if (!isVendors && !isInbox && !isNewCase && navCaseListLink) {
    navCaseListLink.classList.add("active");
  }

  // Role pill label (optional).
  const rolePill = document.getElementById("rolePill");
  if (rolePill) {
    if (role === "admin") rolePill.textContent = "Admin";
    if (role === "user") rolePill.textContent = "User";
  }
});

