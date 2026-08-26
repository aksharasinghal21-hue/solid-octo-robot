import { ENDINGS } from "./story.js";

const $ = (id) => document.getElementById(id);

// Manages all DOM overlays: HUD, messages, terminal, keypad, pause, endings.
export class UI {
  constructor({ onCloseTerminal, onKeypadSubmit }) {
    this.onCloseTerminal = onCloseTerminal;
    this.onKeypadSubmit = onKeypadSubmit;
    this.msgQueue = [];

    $("btn-start").addEventListener("click", () => this._startCb && this._startCb());
    $("btn-resume").addEventListener("click", () => this._resumeCb && this._resumeCb());
    $("btn-restart").addEventListener("click", () => location.reload());
    $("btn-again").addEventListener("click", () => location.reload());
    $("term-close").addEventListener("click", () => this.closeTerminal());

    // keypad
    const input = $("keypad-input");
    document.querySelectorAll("#term-keypad .keys button").forEach((b) => {
      b.addEventListener("click", () => {
        const k = b.dataset.k;
        if (k === "C") input.value = "";
        else if (k === "E") this.onKeypadSubmit(input.value);
        else if (input.value.replace(/\s/g, "").length < 3)
          input.value = (input.value + k).replace(/(.)/g, "$1 ").trim();
      });
    });
  }

  onStart(cb) { this._startCb = cb; }
  onResume(cb) { this._resumeCb = cb; }

  show(id) { $(id).classList.remove("hidden"); }
  hide(id) { $(id).classList.add("hidden"); }

  setInteractPrompt(text) {
    $("interact-prompt").textContent = text || "";
  }

  setObjective(text) {
    $("objective").innerHTML = `<span class="obj-label">OBJECTIVE</span><br/>${text}`;
  }

  nexusSay(text) {
    this._addMessage("NEXUS", text, "nexus-msg");
  }

  systemSay(text) {
    this._addMessage("SYSTEM", text, "sys-msg");
  }

  _addMessage(speaker, text, cls) {
    const box = $("messages");
    const el = document.createElement("div");
    el.className = "message " + cls;
    el.innerHTML = `<span class="speaker">${speaker}:</span> ${text}`;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => el.classList.add("fade"), 5200);
    setTimeout(() => el.remove(), 6000);
  }

  openTerminal(title, bodyText, withKeypad) {
    this.show("terminal-screen");
    $("term-title").textContent = title;
    $("term-body").textContent = bodyText;
    $("term-keypad").classList.toggle("hidden", !withKeypad);
    $("keypad-input").value = "";
  }

  closeTerminal() {
    this.hide("terminal-screen");
    this.onCloseTerminal && this.onCloseTerminal();
  }

  flashKeypadError() {
    const el = $("keypad-input");
    el.classList.add("error-shake");
    setTimeout(() => el.classList.remove("error-shake"), 500);
  }

  // Timed full-screen-ish message sequence (final reveal).
  runSequence(lines, onDone, intervalMs = 1400) {
    this.show("ending-screen");
    $("ending-title").textContent = "// NEXUS CORE";
    $("ending-tag").textContent = "";
    $("btn-again").classList.add("hidden");
    let i = 0;
    const pre = $("ending-body");
    pre.textContent = "";
    const tick = () => {
      if (i >= lines.length) {
        onDone();
        return;
      }
      const [who, text] = lines[i++];
      pre.textContent += `${who === "NEXUS" ? "NEXUS" : "SYSTEM"}> ${text}\n`;
      setTimeout(tick, who === "SYSTEM" && text.length <= 5 ? 600 : intervalMs);
    };
    tick();
  }

  showChoices(choices) {
    const panel = document.querySelector(".ending-panel");
    let row = document.getElementById("choice-row");
    if (!row) {
      row = document.createElement("div");
      row.id = "choice-row";
      row.className = "choice-row";
      panel.insertBefore(row, $("btn-again"));
    }
    row.innerHTML = "";
    choices.forEach(([label, id]) => {
      const b = document.createElement("button");
      b.className = "btn-neon choice-btn";
      b.textContent = label;
      b.addEventListener("click", () => this.showEnding(id));
      row.appendChild(b);
    });
  }

  showEnding(id) {
    const e = ENDINGS[id];
    $("ending-title").textContent = e.title;
    $("ending-body").textContent = e.body;
    $("ending-tag").textContent = e.tag;
    const row = document.getElementById("choice-row");
    if (row) row.remove();
    $("btn-again").classList.remove("hidden");
  }
}
