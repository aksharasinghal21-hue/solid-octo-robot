import { NEXUS_LINES } from "./story.js";

// Simulated adaptive AI: tracks player behavior with simple counters/flags
// and reacts through the UI. No real ML — pure game logic.
export class Nexus {
  constructor(ui, audio, state) {
    this.ui = ui;
    this.audio = audio;
    this.state = state;
    this.said = new Set(); // lines already delivered (once each)
  }

  _once(key, line) {
    if (this.said.has(key)) return;
    this.said.add(key);
    this.say(line);
  }

  say(line) {
    this.audio.nexusBlip();
    this.ui.nexusSay(line);
  }

  // --- event hooks -------------------------------------------------------

  roomEntered(roomId) {
    const v = this.state.visitedRooms;
    if (v.has(roomId)) return;
    v.add(roomId);

    if (roomId === "server") {
      setTimeout(
        () => this.say("Power fluctuations detected. Ignore them."),
        1200
      );
    }
    if (roomId === "lab") {
      setTimeout(
        () => this.say("Testing in progress. Do not touch the equipment."),
        1200
      );
    }
    if (roomId === "security") {
      this._once("restricted", NEXUS_LINES.restricted);
      // deviation: went to security before collecting any segments
      if (this.state.segments.size === 0) {
        this._once("deviation", NEXUS_LINES.deviation);
      }
    }
    if (roomId === "exitcorridor" && !this.state.flags.allCollected) {
      this.say("Exit Sector 7 is sealed. Authorization required.");
    }
  }

  terminalUsed(id) {
    const c = this.state.counters;
    c.terminalsUsed = (c.terminalsUsed || 0) + 1;

    if (id === "hidden") {
      if (!this.state.flags.hiddenRead) {
        this.state.flags.hiddenRead = true;
        setTimeout(() => this._once("suspicious", "Why did you inspect that terminal?"), 2500);
        setTimeout(() => this.say("You weren't supposed to see that."), 5500);
      } else {
        c.hiddenInterest = (c.hiddenInterest || 0) + 1;
        if (c.hiddenInterest >= 2) this._once("hiddenInt", NEXUS_LINES.hiddenTerminal);
        if (c.hiddenInterest >= 4) this._once("hiddenInt2", NEXUS_LINES.hiddenTerminalRepeat);
      }
    }
    if (id === "main" && this.state.counters.wrongCodes > 0) {
      // silent; wrong-code reactions handled on submit
    }
  }

  actionRepeated(id, count) {
    if (count === 3) {
      if (id === "hidden") return; // hidden terminal has its own arc
      this._once("rep_" + id, NEXUS_LINES.repetition);
    }
  }

  segmentFound(n) {
    const total = this.state.segments.size;
    this._once("seg" + n, NEXUS_LINES.segmentFound);
    if (total === 3) this.allSegmentsCollected();
  }

  allSegmentsCollected() {
    const elapsed = (Date.now() - this.state.startTime) / 1000;
    this.state.flags.allCollected = true;

    // scripted turn
    setTimeout(() => this.say("..."), 1500);
    setTimeout(() => this._once("stop", "Stop."), 4000);

    // behavior-based reaction
    if (elapsed < 240) {
      setTimeout(() => this._once("pace", NEXUS_LINES.fastSolver), 8000);
    } else {
      setTimeout(() => this._once("pace", NEXUS_LINES.slowSolver), 8000);
    }
  }

  wrongCode(attempt) {
    if (attempt === 1) this.say(NEXUS_LINES.wrongCode1);
    else if (attempt === 2) this.say(NEXUS_LINES.wrongCode2);
    else this._once("wrong3", NEXUS_LINES.wrongCode3);
  }
}
