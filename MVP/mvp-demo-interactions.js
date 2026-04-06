/**
 * MVP demo: client-side filters and message send (sessionStorage).
 * Loaded after mvp.js on relevant screens.
 */
(function () {
  const STORAGE_KEY = "mvp_demo_v1";

  function loadState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveState(state) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function formatThreadTime(d) {
    const mo = d.getMonth() + 1;
    const day = d.getDate();
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    return mo + "/" + day + " " + h + ":" + m;
  }

  /** Known case → inbox thread id (compose uses same thread as inbox row). */
  var CASE_TO_THREAD = {
    "000012": "t001",
    "000102": "t002",
    "000013": "t003",
  };

  var THREAD_DEFAULTS = {
    t001: {
      caseId: "000012",
      subject: "見積PDFの差し替えについて",
      preview: "見積PDFを差し替えました。ご確認お願いします。",
      unread: true,
    },
    t002: {
      caseId: "000102",
      subject: "途中写真の追加依頼",
      preview: "工程の途中写真を共有いただけますか。",
      unread: true,
    },
    t003: {
      caseId: "000013",
      subject: "完了報告の確認",
      preview: "完了報告の内容をご確認ください。",
      unread: false,
    },
  };

  function resolveThreadId(params) {
    var explicit = (params.get("threadId") || "").trim();
    if (explicit) return explicit;
    var caseId = (params.get("caseId") || "").trim();
    if (CASE_TO_THREAD[caseId]) return CASE_TO_THREAD[caseId];
    if (params.get("compose") === "1" && caseId) return "n" + caseId;
    return explicit || "t001";
  }

  function getThreadMeta(threadId, state) {
    var def = THREAD_DEFAULTS[threadId];
    var ov = (state.threads && state.threads[threadId]) || {};
    if (!def && !ov.caseId && !ov.dynamic) return null;
    return {
      caseId: ov.caseId != null ? ov.caseId : def ? def.caseId : "",
      subject: ov.subject != null ? ov.subject : def ? def.subject : "（無題）",
      preview: ov.preview != null ? ov.preview : def ? def.preview : "",
      unread: ov.unread !== undefined ? ov.unread : def ? def.unread : false,
    };
  }

  function getOutbound(threadId, state) {
    var ov = (state.threads && state.threads[threadId]) || {};
    return Array.isArray(ov.outbound) ? ov.outbound : [];
  }

  function appendOutbound(threadId, text, state, options) {
    state.threads = state.threads || {};
    var row = state.threads[threadId] || {};
    row.outbound = Array.isArray(row.outbound) ? row.outbound : [];
    row.outbound.push({ text: text, ts: Date.now() });
    row.preview = text.length > 100 ? text.slice(0, 100) + "…" : text;
    row.unread = false;
    if (options && options.dynamic) {
      row.dynamic = true;
      row.caseId = options.caseId || row.caseId || "";
      if (!row.subject) row.subject = "案件 #" + row.caseId + " へのメッセージ";
    }
    state.threads[threadId] = row;
    saveState(state);
    return state;
  }

  function markThreadRead(threadId, state) {
    state.threads = state.threads || {};
    state.threads[threadId] = state.threads[threadId] || {};
    state.threads[threadId].unread = false;
    saveState(state);
  }

  function buildMsgBubble(text, ts) {
    var d = new Date(ts);
    var wrap = document.createElement("div");
    wrap.className = "msg-bubble msg-bubble--out";
    wrap.setAttribute("data-demo-sent", "1");
    wrap.innerHTML =
      '<div class="msg-meta">' +
      '<span class="msg-sender">あなた</span>' +
      '<time class="msg-time" datetime="' +
      d.toISOString() +
      '">' +
      formatThreadTime(d) +
      "</time>" +
      "</div>" +
      '<div class="msg-text"></div>';
    wrap.querySelector(".msg-text").textContent = text;
    return wrap;
  }

  function hydrateThreadMessages(threadId, state) {
    var list = document.querySelector("#threadMessageListWrap .msg-list");
    if (!list) return;
    list.querySelectorAll("[data-demo-sent]").forEach(function (el) {
      el.remove();
    });
    getOutbound(threadId, state).forEach(function (m) {
      list.appendChild(buildMsgBubble(m.text, m.ts));
    });
  }

  function unreadCount(state) {
    var n = 0;
    Object.keys(THREAD_DEFAULTS).forEach(function (tid) {
      var meta = getThreadMeta(tid, state);
      if (meta && meta.unread) n++;
    });
    Object.keys(state.threads || {}).forEach(function (tid) {
      if (THREAD_DEFAULTS[tid]) return;
      var row = state.threads[tid];
      if (row && row.dynamic && row.unread) n++;
    });
    return n;
  }

  function updateInboxBadges(count) {
    var navBadge = document.querySelector("#navInboxLink .badge");
    if (navBadge) {
      if (count > 0) {
        navBadge.textContent = String(count);
        navBadge.style.display = "";
      } else {
        navBadge.style.display = "none";
      }
    }
    var bn = document.querySelector("#bnInbox .bn-badge");
    if (bn) {
      if (count > 0) {
        bn.textContent = String(count);
        bn.style.display = "";
      } else {
        bn.style.display = "none";
      }
    }
  }

  function getDisplayPreview(threadId, state) {
    var ob = getOutbound(threadId, state);
    if (ob.length) {
      return { label: "あなたの送信", text: ob[ob.length - 1].text };
    }
    var meta = getThreadMeta(threadId, state);
    var text = meta ? meta.preview || meta.subject || "" : "";
    return { label: "最新のメッセージ", text: text };
  }

  function applyInboxCard(el, meta, role, org, state) {
    if (!el || !meta) return;
    var tid = el.getAttribute("data-thread-id");
    el.dataset.unread = meta.unread ? "1" : "0";
    var dot = el.querySelector(".inbox-thread-card__status-dot");
    var stText = el.querySelector(".inbox-thread-card__status-text");
    var caseEl = el.querySelector(".inbox-thread-card__case");
    var subj = el.querySelector(".inbox-thread-card__subject");
    var lastLabel = el.querySelector(".inbox-thread-card__last-label");
    var lastText = el.querySelector(".inbox-thread-card__last-text");
    if (dot) {
      dot.classList.toggle("inbox-thread-card__status-dot--unread", meta.unread);
      dot.classList.toggle("inbox-thread-card__status-dot--read", !meta.unread);
    }
    if (stText) stText.textContent = meta.unread ? "未読" : "既読";
    if (caseEl) caseEl.textContent = "案件 #" + meta.caseId;
    if (subj) {
      subj.textContent = meta.subject;
      subj.style.fontWeight = meta.unread ? "700" : "600";
    }
    var dp = getDisplayPreview(tid, state);
    if (lastLabel) lastLabel.textContent = dp.label;
    if (lastText) lastText.textContent = dp.text;
    if (window.buildMvpHref) {
      el.href = window.buildMvpHref("./inbox-thread.html", {
        role: role,
        org: org,
        caseId: meta.caseId,
        threadId: tid,
      });
    } else {
      el.href =
        "./inbox-thread.html?role=" +
        encodeURIComponent(role) +
        "&org=" +
        encodeURIComponent(org) +
        "&caseId=" +
        encodeURIComponent(meta.caseId) +
        "&threadId=" +
        encodeURIComponent(tid);
    }
  }

  function inboxCardTemplate() {
    return (
      '<div class="uc-case-card__body">' +
      '<div class="inbox-thread-card__top">' +
      '<span class="inbox-thread-card__status">' +
      '<span class="inbox-thread-card__status-dot inbox-thread-card__status-dot--unread" aria-hidden="true"></span>' +
      '<span class="inbox-thread-card__status-text">未読</span>' +
      "</span>" +
      '<span class="inbox-thread-card__case"></span>' +
      "</div>" +
      '<div class="uc-case-card__title inbox-thread-card__subject"></div>' +
      '<div class="inbox-thread-card__last">' +
      '<span class="inbox-thread-card__last-label"></span>' +
      '<p class="inbox-thread-card__last-text"></p>' +
      "</div>" +
      "</div>" +
      '<svg class="uc-case-card__chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>'
    );
  }

  function ensureDynamicInboxCard(list, threadId, meta, role, org, state) {
    var existing = list.querySelector('[data-thread-id="' + threadId + '"]');
    if (existing) return existing;
    var a = document.createElement("a");
    a.className = "uc-case-card inbox-thread-card";
    a.setAttribute("data-thread-id", threadId);
    a.innerHTML = inboxCardTemplate();
    list.insertBefore(a, list.firstChild);
    applyInboxCard(a, meta, role, org, state);
    return a;
  }

  function initInboxPage() {
    var list = document.getElementById("inboxThreadList");
    if (!list) return;

    var params = new URLSearchParams(window.location.search);
    var role = params.get("role") || "user";
    var org = params.get("org") || "Honda";
    var state = loadState();

    Object.keys(THREAD_DEFAULTS).forEach(function (tid) {
      var el = list.querySelector('[data-thread-id="' + tid + '"]');
      var meta = getThreadMeta(tid, state);
      if (el && meta) applyInboxCard(el, meta, role, org, state);
    });

    Object.keys(state.threads || {}).forEach(function (tid) {
      var row = state.threads[tid];
      if (!row || !row.dynamic) return;
      var meta = getThreadMeta(tid, state);
      if (meta) ensureDynamicInboxCard(list, tid, meta, role, org, state);
    });

    var filterMode = "all";

    function applyInboxFilter() {
      list.querySelectorAll(".inbox-thread-card[data-thread-id]").forEach(function (el) {
        var unread = el.dataset.unread === "1";
        var show = filterMode === "all" || unread;
        el.style.display = show ? "" : "none";
      });
    }

    var btnUnread = document.getElementById("inboxFilterUnread");
    var btnAll = document.getElementById("inboxFilterAll");
    function setActive(mode) {
      filterMode = mode;
      if (btnUnread) btnUnread.classList.toggle("is-active", mode === "unread");
      if (btnAll) btnAll.classList.toggle("is-active", mode === "all");
      applyInboxFilter();
    }
    if (btnUnread) {
      btnUnread.addEventListener("click", function () {
        setActive("unread");
        if (window.mvpNotify) window.mvpNotify("未読のみ表示しています", "info");
      });
    }
    if (btnAll) {
      btnAll.addEventListener("click", function () {
        setActive("all");
        if (window.mvpNotify) window.mvpNotify("すべてのスレッドを表示しています", "info");
      });
    }
    setActive("all");

    updateInboxBadges(unreadCount(state));

    document.querySelectorAll("a[href*='inbox-thread.html']").forEach(function (a) {
      try {
        var url = new URL(a.href, window.location.href);
        url.searchParams.set("role", role);
        url.searchParams.set("org", org);
        a.href = url.toString();
      } catch (e) {}
    });
  }

  function initInboxThreadPage() {
    var sendBtn = document.getElementById("threadSendBtn");
    var input = document.getElementById("threadReplyInput");
    var listWrap = document.getElementById("threadMessageListWrap");
    var emptyBox = document.getElementById("threadEmptyCompose");
    if (!sendBtn || !input) return;

    var params = new URLSearchParams(window.location.search);
    var role = params.get("role") || "user";
    var org = params.get("org") || "Honda";
    var caseId = (params.get("caseId") || "").trim();
    var compose = params.get("compose") === "1";
    var threadId = resolveThreadId(params);

    var state = loadState();
    markThreadRead(threadId, state);
    state = loadState();

    hydrateThreadMessages(threadId, state);

    var hasStaticMessages =
      listWrap && listWrap.querySelector(".msg-bubble:not([data-demo-sent])");
    var hasOutbound = getOutbound(threadId, state).length > 0;

    if (compose) {
      if (hasStaticMessages || hasOutbound) {
        if (listWrap) listWrap.style.display = "";
        if (emptyBox) emptyBox.setAttribute("hidden", "");
      } else {
        if (listWrap) listWrap.style.display = "none";
        if (emptyBox) emptyBox.removeAttribute("hidden");
      }
    }

    var demoNote = document.querySelector(".thread-composer__demo");
    if (demoNote) {
      demoNote.textContent =
        "Demo: 送信した内容はこのブラウザのタブ内に保持され、受信箱一覧にも反映されます。";
    }
    var emptyDemo = document.querySelector("#threadEmptyCompose .demo-note");
    if (emptyDemo) emptyDemo.textContent = "送信するとスレッドが表示され、受信箱にも行が追加されます。";

    sendBtn.addEventListener("click", function () {
      var text = (input.value || "").trim();
      if (!text) {
        if (window.mvpNotify) window.mvpNotify("メッセージを入力してください", "info");
        return;
      }

      state = loadState();
      var isNewDynamic = threadId.charAt(0) === "n" && !THREAD_DEFAULTS[threadId];
      appendOutbound(threadId, text, state, {
        dynamic: isNewDynamic,
        caseId:
          caseId ||
          (THREAD_DEFAULTS[threadId] ? THREAD_DEFAULTS[threadId].caseId : "") ||
          "",
      });
      state = loadState();

      var list = document.querySelector("#threadMessageListWrap .msg-list");
      if (list) {
        var last = getOutbound(threadId, state);
        var lastMsg = last[last.length - 1];
        if (lastMsg) list.appendChild(buildMsgBubble(lastMsg.text, lastMsg.ts));
      }

      if (listWrap) listWrap.style.display = "";
      if (emptyBox) emptyBox.setAttribute("hidden", "");

      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      if (compose && window.history && window.history.replaceState) {
        var u = new URL(window.location.href);
        u.searchParams.delete("compose");
        u.searchParams.set("threadId", threadId);
        u.searchParams.set("caseId", caseId);
        u.searchParams.set("role", role);
        u.searchParams.set("org", org);
        window.history.replaceState({}, "", u.pathname + u.search);
      }

      if (window.mvpNotify) window.mvpNotify("送信しました", "success");
    });

    updateInboxBadges(unreadCount(loadState()));
  }

  function initUserCasesFilters() {
    var grid = document.getElementById("userCasesCardList");
    var caseInput = document.getElementById("ucCaseIdFilter");
    var statusSel = document.getElementById("ucStatusFilter");
    var searchBtn = document.getElementById("ucSearchBtn");
    var resetBtn = document.getElementById("ucFilterReset");
    var empty = document.getElementById("emptyCasesState");
    var meta = document.getElementById("orgFilterLabel");
    if (!grid) return;

    function runFilter() {
      var orgRaw = new URLSearchParams(window.location.search).get("org") || "Honda";
      var org = window.normalizeOrgName ? window.normalizeOrgName(orgRaw) : orgRaw;
      var idQ = (caseInput && caseInput.value.trim()) || "";
      var st = (statusSel && statusSel.value) || "すべて";

      var visible = 0;
      grid.querySelectorAll(".uc-case-card[data-org]").forEach(function (card) {
        var rowOrgRaw = card.getAttribute("data-org") || "";
        var rowOrg = window.normalizeOrgName ? window.normalizeOrgName(rowOrgRaw) : rowOrgRaw;
        var orgOk = !org || rowOrg === org;
        var cid = (card.getAttribute("data-case-id") || "").trim();
        var idOk = !idQ || cid.indexOf(idQ.replace(/^#/, "")) !== -1;
        var cardSt = (card.getAttribute("data-status") || "").trim();
        var stOk = st === "すべて" || cardSt === st;
        var show = orgOk && idOk && stOk;
        card.style.display = show ? "" : "none";
        if (show) visible++;
      });

      if (empty) empty.style.display = visible ? "none" : "";
      if (meta) {
        var parts = [];
        parts.push(org ? "組織：" + org : "組織：すべて");
        if (idQ) parts.push("案件ID：" + idQ);
        if (st !== "すべて") parts.push("ステータス：" + st);
        meta.textContent = parts.join(" · ");
      }
    }

    if (searchBtn) {
      searchBtn.addEventListener("click", function () {
        runFilter();
        if (window.mvpNotify) window.mvpNotify("検索条件を適用しました", "info");
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (caseInput) caseInput.value = "";
        if (statusSel) statusSel.selectedIndex = 0;
        var orgRaw = new URLSearchParams(window.location.search).get("org") || "Honda";
        var org = window.normalizeOrgName ? window.normalizeOrgName(orgRaw) : orgRaw;
        var visible = 0;
        grid.querySelectorAll(".uc-case-card[data-org]").forEach(function (card) {
          var rowOrgRaw = card.getAttribute("data-org") || "";
          var rowOrg = window.normalizeOrgName ? window.normalizeOrgName(rowOrgRaw) : rowOrgRaw;
          var show = !org || rowOrg === org;
          card.style.display = show ? "" : "none";
          if (show) visible++;
        });
        if (empty) empty.style.display = visible ? "none" : "";
        if (meta) meta.textContent = org ? "フィルタ：" + org : "フィルタ：なし";
        if (window.mvpNotify) window.mvpNotify("条件をクリアしました", "info");
      });
    }
  }

  function initAdminCasesFilters() {
    var tbody = document.querySelector("#adminCasesRows");
    if (!tbody) return;

    var caseInput = document.getElementById("adminCaseIdFilter");
    var vendorInput = document.getElementById("adminVendorFilter");
    var statusSel = document.getElementById("adminStatusFilter");
    var searchBtn = document.getElementById("adminCaseSearchBtn");
    var resetBtn = document.getElementById("adminCaseResetBtn");
    var empty = document.getElementById("emptyCasesState");
    var label = document.getElementById("orgFilterLabel");

    function runFilter() {
      var orgRaw = new URLSearchParams(window.location.search).get("org") || "元請け";
      var org = window.normalizeOrgName ? window.normalizeOrgName(orgRaw) : orgRaw;
      var idQ = (caseInput && caseInput.value.trim()) || "";
      var vendorQ = (vendorInput && vendorInput.value.trim().toLowerCase()) || "";
      var st = (statusSel && statusSel.value) || "すべて";

      var visible = 0;
      tbody.querySelectorAll("tr[data-org]").forEach(function (tr) {
        var rowOrgRaw = tr.getAttribute("data-org") || "";
        var rowOrg = window.normalizeOrgName ? window.normalizeOrgName(rowOrgRaw) : rowOrgRaw;
        var orgOk = !org || rowOrg === org;
        var cid = (tr.getAttribute("data-case-id") || "").trim();
        var idOk = !idQ || cid.indexOf(idQ.replace(/^#/, "")) !== -1;
        var vendor = (tr.getAttribute("data-vendor") || "").toLowerCase();
        var vendorOk = !vendorQ || vendor.indexOf(vendorQ) !== -1;
        var trSt = (tr.getAttribute("data-status") || "").trim();
        var stOk = st === "すべて" || trSt === st;
        var show = orgOk && idOk && vendorOk && stOk;
        tr.style.display = show ? "" : "none";
        if (show) visible++;
      });

      if (empty) empty.style.display = visible ? "none" : "";
      if (label) {
        var parts = [];
        parts.push(org ? "組織：" + org : "組織：すべて");
        if (idQ) parts.push("案件ID：" + idQ);
        if (vendorQ) parts.push("関連先：" + vendorQ);
        if (st !== "すべて") parts.push("ステータス：" + st);
        label.textContent = parts.join(" · ");
      }
    }

    if (searchBtn) {
      searchBtn.addEventListener("click", function () {
        runFilter();
        if (window.mvpNotify) window.mvpNotify("検索条件を適用しました", "info");
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (caseInput) caseInput.value = "";
        if (vendorInput) vendorInput.value = "";
        if (statusSel) statusSel.selectedIndex = 0;
        var orgRaw = new URLSearchParams(window.location.search).get("org") || "元請け";
        var org = window.normalizeOrgName ? window.normalizeOrgName(orgRaw) : orgRaw;
        var visible = 0;
        tbody.querySelectorAll("tr[data-org]").forEach(function (tr) {
          var rowOrgRaw = tr.getAttribute("data-org") || "";
          var rowOrg = window.normalizeOrgName ? window.normalizeOrgName(rowOrgRaw) : rowOrgRaw;
          var show = !org || rowOrg === org;
          tr.style.display = show ? "" : "none";
          if (show) visible++;
        });
        if (empty) empty.style.display = visible ? "none" : "";
        if (label) label.textContent = org ? "フィルタ：" + org : "フィルタ：なし";
        if (window.mvpNotify) window.mvpNotify("条件をクリアしました", "info");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initInboxPage();
    initInboxThreadPage();
    initUserCasesFilters();
    initAdminCasesFilters();
  });

  window.mvpDemo = {
    loadState: loadState,
    saveState: saveState,
    unreadCount: function () {
      return unreadCount(loadState());
    },
  };
})();
