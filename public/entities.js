"use strict";

(function () {
  const searchInput = document.getElementById("entitySearch");
  const countEl = document.getElementById("entityCount");
  const detailSection = document.getElementById("entity-detail");
  const detailEntityId = document.getElementById("detail-entity-id");
  const detailDomainBadge = document.getElementById("detail-domain-badge");
  const detailAttributes = document.getElementById("detail-attributes");
  const detailClose = document.getElementById("detail-close");

  let table = null;
  let debounceTimer = null;

  // ── Helpers ──────────────────────────────────────────────────────────

  function formatDate(val) {
    if (!val) return "—";
    return new Date(val).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function stateChip(state) {
    if (!state) return '<span class="state-null">—</span>';
    const cls =
      state === "on" ? "state-on"
      : state === "off" ? "state-off"
      : state === "unavailable" ? "state-unavail"
      : "state-other";
    return `<span class="state-chip ${cls}">${state}</span>`;
  }

  // ── Detail panel ──────────────────────────────────────────────────────

  function showDetail(rowData) {
    detailEntityId.textContent = rowData.entityId;
    detailDomainBadge.textContent = rowData.domain;
    detailAttributes.innerHTML = "";

    const attrs = rowData.attributes || {};
    const keys = Object.keys(attrs);

    if (!keys.length) {
      detailAttributes.innerHTML = '<p class="results-info">Keine Attribute.</p>';
    } else {
      keys.forEach((key) => {
        const val = attrs[key];
        const row = document.createElement("div");
        row.className = "detail-row";
        const label = document.createElement("span");
        label.className = "detail-key";
        label.textContent = key;
        const value = document.createElement("span");
        value.className = "detail-value";
        const display =
          typeof val === "object" && val !== null
            ? JSON.stringify(val, null, 2)
            : String(val ?? "—");
        value.textContent = display;
        row.appendChild(label);
        row.appendChild(value);
        detailAttributes.appendChild(row);
      });
    }

    detailSection.classList.remove("is-hidden");
    detailSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideDetail() {
    detailSection.classList.add("is-hidden");
  }

  if (detailClose) {
    detailClose.addEventListener("click", hideDetail);
  }

  // ── Table ─────────────────────────────────────────────────────────────

  function buildTable(data) {
    if (table) {
      table.replaceData(data);
      updateCount(data.length);
      return;
    }

    table = new Tabulator("#entity-table", {
      data: data,
      layout: "fitColumns",
      groupBy: "domain",
      groupToggleElement: "header",
      groupStartOpen: true,
      groupHeader: function (value, count) {
        return `<span class="group-domain">${value}</span><span class="group-count">${count}</span>`;
      },
      maxHeight: "65vh",
      initialSort: [{ column: "entityId", dir: "asc" }],
      columns: [
        {
          title: "Entity ID",
          field: "entityId",
          widthGrow: 3,
          formatter: function (cell) {
            return `<span class="entity-id-cell">${cell.getValue()}</span>`;
          }
        },
        {
          title: "State",
          field: "state",
          widthGrow: 1,
          formatter: function (cell) {
            return stateChip(cell.getValue());
          }
        },
        {
          title: "Last seen",
          field: "lastSeen",
          widthGrow: 2,
          formatter: function (cell) {
            return formatDate(cell.getValue());
          }
        }
      ]
    });

    // Native delegation — avoids Tabulator v6 rowClick quirks
    document.getElementById("entity-table").addEventListener("click", function (e) {
      const rowEl = e.target.closest(".tabulator-row:not(.tabulator-group)");
      if (!rowEl) return;
      const row = table.getRow(rowEl);
      if (row) showDetail(row.getData());
    });

    updateCount(data.length);
  }

  function updateCount(n) {
    if (countEl) countEl.textContent = `${n} Entities`;
  }

  // ── Load ──────────────────────────────────────────────────────────────

  async function loadEntities(q) {
    const url = q ? `api/entities?q=${encodeURIComponent(q)}` : "api/entities";
    const res = await fetch(url);
    if (!res.ok) throw new Error("API error " + res.status);
    const body = await res.json();
    return body.entities || [];
  }

  async function init() {
    try {
      if (countEl) countEl.textContent = "Lade…";
      const params = new URLSearchParams(window.location.search);
      const initialQ = params.get("q") || "";
      if (initialQ && searchInput) searchInput.value = initialQ;

      const data = await loadEntities(initialQ);
      buildTable(data);
    } catch (err) {
      if (countEl) countEl.textContent = "Fehler beim Laden.";
      console.error(err);
    }
  }

  // ── Search ────────────────────────────────────────────────────────────

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async function () {
        const q = searchInput.value.trim();
        try {
          const data = await loadEntities(q);
          buildTable(data);
          hideDetail();
        } catch (err) {
          console.error(err);
        }
      }, 300);
    });
  }

  // init
  if (typeof Tabulator !== "undefined") {
    init();
  } else {
    // Tabulator CDN might still be loading
    window.addEventListener("load", init);
  }
})();
