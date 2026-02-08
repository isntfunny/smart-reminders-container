"use strict";

(function () {
  const form = document.getElementById("automationForm");
  const promptInput = document.getElementById("automationPrompt");
  const statusEl = document.getElementById("automationStatus");
  const resultEl = document.getElementById("automationResult");
  const titleEl = document.getElementById("automationTitle");
  const messageEl = document.getElementById("automationMessage");
  const editorHost = document.getElementById("automationEditor");
  let editor = null;
  let monacoReady = null;

  if (!form) {
    return;
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#b00020" : "#1b1b1f";
    statusEl.classList.remove("is-hidden");
  }

  function clearStatus() {
    statusEl.textContent = "";
    statusEl.classList.add("is-hidden");
  }

  function showResult() {
    resultEl.classList.remove("is-hidden");
  }

  function setYaml(value) {
    if (editor) {
      editor.setValue(value);
      return;
    }
    editorHost.textContent = value;
  }

  function ensureMonaco() {
    if (monacoReady) {
      return monacoReady;
    }

    monacoReady = new Promise((resolve) => {
      if (!window.require || !editorHost) {
        resolve(null);
        return;
      }

      window.require.config({
        paths: {
          vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.46.0/min/vs"
        }
      });

      window.require(["vs/editor/editor.main"], () => {
        editor = window.monaco.editor.create(editorHost, {
          value: "",
          language: "yaml",
          theme: "vs-dark",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 13,
          automaticLayout: true
        });
        resolve(editor);
      });
    });

    return monacoReady;
  }

  ensureMonaco();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = promptInput.value.trim();

    if (!prompt) {
      setStatus("Bitte eine Automation beschreiben.", true);
      return;
    }

    clearStatus();
    setStatus("Automation wird generiert...", false);

    try {
      const response = await fetch("/api/automation/mock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error("Serverfehler: " + response.status);
      }

      const payload = await response.json();

      if (!payload || !payload.ok) {
        throw new Error(payload && payload.error ? payload.error : "Unbekannter Fehler");
      }

      titleEl.textContent = payload.title || "Automation";
      messageEl.textContent = payload.message || "";
      await ensureMonaco();
      setYaml(payload.yaml || "");
      showResult();
      setStatus("Fertig.", false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setStatus(message, true);
    }
  });
})();
