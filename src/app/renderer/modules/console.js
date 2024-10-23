class ConsoleManager {
  constructor() {
    this.consoleElement = null;
    this.logContainer = null;
    this.filterInput = null;
    this.levelFilter = null;
    this.autoScroll = true;
    this.logs = [];

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    this.createConsoleUI();
    this.setupEventListeners();
    this.loadInitialLogs();
  }

  createConsoleUI() {
    if (!document.getElementById("console-container")) {
      const dashboard = document.getElementById("dashboard");
      if (!dashboard) return;

      const consoleContainer = document.createElement("div");
      consoleContainer.id = "console-container";
      consoleContainer.innerHTML = `
                <div class="console-header">
                    <h2>Console</h2>
                    <div class="console-controls">
                        <input type="text" id="log-filter" placeholder="Filter logs...">
                        <select id="level-filter">
                            <option value="all">All Levels</option>
                            <option value="info">Info</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                            <option value="debug">Debug</option>
                        </select>
                        <label>
                            <input type="checkbox" id="auto-scroll" checked>
                            Auto-scroll
                        </label>
                        <button id="export-logs">Export</button>
                        <button id="save-logs">Save</button>
                        <button id="clear-logs">Clear</button>
                    </div>
                </div>
                <div class="console-output"></div>
            `;

      dashboard.appendChild(consoleContainer);
    }

    this.consoleElement = document.getElementById("console-container");
    this.logContainer = this.consoleElement?.querySelector(".console-output");
    this.filterInput = document.getElementById("log-filter");
    this.levelFilter = document.getElementById("level-filter");
  }

  setupEventListeners() {
    if (!this.consoleElement) return;

    this.filterInput?.addEventListener("input", () => this.filterLogs());
    this.levelFilter?.addEventListener("change", () => this.filterLogs());

    const autoScrollCheckbox = document.getElementById("auto-scroll");
    autoScrollCheckbox?.addEventListener("change", (e) => {
      this.autoScroll = e.target.checked;
      if (this.autoScroll) {
        this.scrollToBottom();
      }
    });

    document
      .getElementById("export-logs")
      ?.addEventListener("click", () => this.exportLogs());
    document
      .getElementById("save-logs")
      ?.addEventListener("click", () => this.saveLogs());
    document
      .getElementById("clear-logs")
      ?.addEventListener("click", () => this.clearLogs());

    // Listen for new logs from the main process
    if (window.electronAPI?.onLog) {
      window.electronAPI.onLog((log) => this.addLog(log));
    }
  }

  formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
  }

  createLogElement(log) {
    const logElement = document.createElement("div");
    logElement.className = `log-entry log-${log.level}`;

    const meta = log.meta ? JSON.stringify(log.meta, null, 2) : "";
    const metaHtml = meta
      ? `<pre class="log-meta">${this.escapeHtml(meta)}</pre>`
      : "";

    logElement.innerHTML = `
            <span class="log-timestamp">[${this.formatTimestamp(
              log.timestamp
            )}]</span>
            <span class="log-level">${log.level.toUpperCase()}</span>
            <span class="log-message">${this.escapeHtml(
              String(log.message)
            )}</span>
            ${metaHtml}
        `;

    return logElement;
  }

  escapeHtml(unsafe) {
    if (typeof unsafe !== "string") return "";
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  addLog(log) {
    if (!log) return;

    try {
      this.logs.push(log);

      if (this.shouldShowLog(log)) {
        const logElement = this.createLogElement(log);
        this.logContainer?.appendChild(logElement);

        if (this.autoScroll) {
          this.scrollToBottom();
        }
      }
    } catch (error) {
      console.error("Error adding log:", error);
    }
  }

  shouldShowLog(log) {
    if (!log) return false;

    const filterText = this.filterInput?.value.toLowerCase() || "";
    const levelFilter = this.levelFilter?.value || "all";

    if (levelFilter !== "all" && log.level !== levelFilter) {
      return false;
    }

    if (filterText) {
      const logText = `${log.message || ""} ${JSON.stringify(
        log.meta || {}
      )}`.toLowerCase();
      if (!logText.includes(filterText)) {
        return false;
      }
    }

    return true;
  }

  filterLogs() {
    if (!this.logContainer) return;

    try {
      this.logContainer.innerHTML = "";
      this.logs.forEach((log) => {
        if (this.shouldShowLog(log)) {
          const logElement = this.createLogElement(log);
          this.logContainer.appendChild(logElement);
        }
      });

      if (this.autoScroll) {
        this.scrollToBottom();
      }
    } catch (error) {
      console.error("Error filtering logs:", error);
    }
  }

  scrollToBottom() {
    if (this.logContainer) {
      this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
  }

  async loadInitialLogs() {
    try {
      if (window.electronAPI?.getLogs) {
        const logs = await window.electronAPI.getLogs();
        logs.forEach((log) => this.addLog(log));
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  }

  async exportLogs() {
    try {
      if (!window.electronAPI?.exportLogs) return;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `bot-logs-${timestamp}.txt`;
      await window.electronAPI.exportLogs(filename);
      alert("Logs exported successfully!");
    } catch (error) {
      console.error("Failed to export logs:", error);
      alert("Failed to export logs. Please try again.");
    }
  }

  async saveLogs() {
    try {
      if (!window.electronAPI?.saveLogs) return;
      await window.electronAPI.saveLogs();
      alert("Logs saved successfully!");
    } catch (error) {
      console.error("Failed to save logs:", error);
      alert("Failed to save logs. Please try again.");
    }
  }

  clearLogs() {
    if (this.logContainer) {
      this.logContainer.innerHTML = "";
      this.logs = [];
    }
  }
}

export default ConsoleManager;
