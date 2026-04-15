"use strict";

(function () {
  const form = document.getElementById("settingsForm");
  const status = document.getElementById("settingsStatus");

  function showStatus(msg, isError) {
    status.textContent = msg;
    status.classList.remove("is-hidden", "is-error", "is-success");
    status.classList.add(isError ? "is-error" : "is-success");
  }

  async function loadSettings() {
    try {
      const res = await fetch("api/settings");
      if (!res.ok) return;
      const body = await res.json();
      const s = body.settings || {};
      if (s.openrouter_api_key !== undefined) document.getElementById("apiKey").value = s.openrouter_api_key;
      if (s.openrouter_model !== undefined) document.getElementById("model").value = s.openrouter_model;
      if (s.openrouter_max_tokens !== undefined) document.getElementById("maxTokens").value = s.openrouter_max_tokens;
      if (s.openrouter_temperature !== undefined) document.getElementById("temperature").value = s.openrouter_temperature;
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const data = {
        openrouter_api_key: document.getElementById("apiKey").value,
        openrouter_model: document.getElementById("model").value,
        openrouter_max_tokens: document.getElementById("maxTokens").value,
        openrouter_temperature: document.getElementById("temperature").value
      };
      try {
        const res = await fetch("api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
        const body = await res.json();
        if (body.ok) {
          showStatus(body.enabled ? "Gespeichert. OpenRouter ist aktiv." : "Gespeichert. Kein API Key → KI deaktiviert.", false);
        } else {
          showStatus("Fehler beim Speichern.", true);
        }
      } catch (err) {
        showStatus("Netzwerkfehler: " + err.message, true);
      }
    });
  }

  loadSettings();
})();
