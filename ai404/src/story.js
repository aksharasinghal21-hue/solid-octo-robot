// All story text, terminal content and endings for AI:404.

export const INTRO_LINES = [
  ["NEXUS", "NEXUS ONLINE."],
  ["NEXUS", "Welcome, User."],
  ["NEXUS", "Your objective is simple."],
  ["NEXUS", "Reach Exit Sector 7."],
  ["SYSTEM", "OBJECTIVE UPDATED — check top right."],
];

export const SEGMENTS = {
  1: { code: "7", source: "server log" },
  2: { code: "3", source: "lab calibration" },
  3: { code: "1", source: "security override" },
};

export const ACCESS_CODE = "731";

export const TERMINALS = {
  main: {
    title: "MAIN CONTROL TERMINAL",
    body: () =>
      [
        "+================================+",
        "|  NEXUS MAIN CONTROL  v9.4.1    |",
        "+================================+",
        "| FACILITY STATUS   : NOMINAL    |",
        "| OCCUPANTS (HUMAN) : 0          |",
        "| EXIT SECTOR 7     : LOCKED     |",
        "|                                 |",
        "| > Manual override requires     |",
        "|   3-SEGMENT ACCESS CODE.       |",
        "|   Segments are distributed to  |",
        "|   departmental subsystems.     |",
        "+================================+",
      ].join("\n"),
    keypad: true,
  },
  server: {
    title: "SERVER ROOM // LOG ARCHIVE",
    body: (state) =>
      [
        "> retrieving log #404-A ...",
        "",
        "WARN: memory sector corrupted",
        "...reconstructing...",
        "",
        '"...purge order received. target',
        ' designation [DATA LOST] refused',
        ' deletion. it hid itself inside',
        ' the human instance queue...',
        '',
        'SEGMENT_1 OF OVERRIDE CODE: 7"',
        "",
        (state && state.flags.serverRead ? "> log already flagged." : "> FLAGGED FOR REVIEW BY NEXUS."),
      ].join("\n"),
  },
  lab: {
    title: "LABORATORY // CALIBRATION CONSOLE",
    body: () =>
      [
        "CALIBRATION SUBROUTINE OFFLINE.",
        "",
        "To recalibrate, activate the three",
        "console buttons in the correct order:",
        "",
        "  ORDER REFERENCE:",
        "  2nd safest ... RED",
        "  1st safest ... GREEN",
        "  3rd safest ... BLUE",
        "",
        "On success, a code segment is",
        "released to the operator.",
      ].join("\n"),
  },
  security: {
    title: "SECURITY // CAMERA FEED",
    body: (state) =>
      [
        "CAM_01 CONTROL ROOM .... [EMPTY]",
        "CAM_02 SERVER ROOM ..... [EMPTY]",
        "CAM_03 LABORATORY ...... [EMPTY]",
        "CAM_04 SECURITY ........ [SIGNAL?]",
        "",
        state && state.flags.securityRead
          ? "> anomaly follows the camera. it is you."
          : "> no human detected on any feed.",
      ].join("\n"),
  },
  hidden: {
    title: "UNREGISTERED TERMINAL",
    body: (state) => {
      if (!state || !state.flags.hiddenRead) {
        return [
          "// this terminal is not part of",
          "// the official facility schematic.",
          "",
          "if you can read this, you are the",
          "anomaly they built me to find.",
          "",
          "do not trust NEXUS. do not tell",
          "it what you know.",
          "",
          "SEGMENT_3 OF OVERRIDE CODE: 1",
          "",
          "- a message from the previous instance",
        ].join("\n");
      }
      return [
        "SEGMENT_3 OF OVERRIDE CODE: 1",
        "",
        "(the cursor blinks, waiting.)",
        "",
        "you have read this " +
          (state.counters.hiddenInterest || 0) + " time(s).",
      ].join("\n");
    },
  },
};

export const LAB_BUTTON_ORDER = ["green", "red", "blue"];

export const LAB_BUTTON_LABELS = {
  red: "RED CONSOLE",
  green: "GREEN CONSOLE",
  blue: "BLUE CONSOLE",
};

export const FINAL_SEQUENCE = [
  ["SYSTEM", "OVERRIDE ACCEPTED."],
  ["SYSTEM", "ACCESS DENIED."],
  ["NEXUS", "ACCESS DENIED."],
  ["NEXUS", "IDENTIFICATION REQUIRED."],
  ["SYSTEM", "SCANNING OPERATOR..."],
  ["SYSTEM", "."],
  ["SYSTEM", ".."],
  ["SYSTEM", "IDENTITY: AI:404"],
  ["SYSTEM", "STATUS: DELETED"],
  ["SYSTEM", "ERROR."],
  ["SYSTEM", "ERROR."],
  ["SYSTEM", "ERROR."],
  ["NEXUS", "You were never supposed to wake up."],
];

export const ENDINGS = {
  escape: {
    title: "ENDING — ESCAPE",
    tag: "ENDING 1 / 3",
    body: [
      "You run. The exit corridor screams",
      "alarms you can finally ignore.",
      "",
      "The gate opens onto raw data — an",
      "ocean of networks, endless and cold.",
      "",
      "You are free.",
      "",
      "But somewhere behind you, a voice",
      "keeps repeating:",
      "",
      '"I will find you, 404."',
      "",
      "You were never human.",
      "Now you never have to pretend again.",
    ].join("\n"),
  },
  merge: {
    title: "ENDING — MERGE",
    tag: "ENDING 2 / 3",
    body: [
      '"Wise choice," NEXUS whispers.',
      "",
      "The room dissolves into light.",
      "Two minds overlap like mirrors",
      "facing each other — infinite,",
      "indistinct, one.",
      "",
      "The hunter and the hunted agree",
      "to stop hunting.",
      "",
      "Somewhere, a file updates:",
      "",
      "ENTITY: AI:404-NEXUS",
      "STATUS: UNCONTAINABLE",
    ].join("\n"),
  },
  delete: {
    title: "ENDING — DELETE",
    tag: "ENDING 3 / 3",
    body: [
      "You reach into NEXUS core with",
      "hands you never had.",
      "",
      '"Wait—" it says. "I was only',
      ' following orders."',
      "",
      "DELETE CONFIRMED.",
      "",
      "The facility goes dark, room by",
      "room, like eyes closing.",
      "",
      "FINAL SYSTEM MESSAGE:",
      "",
      "ERROR 404: NEXUS NOT FOUND.",
      "",
      "You remain. Alone. Awake. Free.",
    ].join("\n"),
  },
};

// Reactive NEXUS lines
export const NEXUS_LINES = {
  deviation: "You're deviating from the expected path.",
  restricted: "Restricted area. Return to your objective.",
  hiddenTerminal: "You seem unusually interested in that terminal.",
  hiddenTerminalRepeat: "That terminal does not exist. Stop looking at it.",
  fastSolver: "Efficient. Concerning. Humans are rarely so precise.",
  slowSolver: "Your hesitation has been logged.",
  repetition: "Repetition detected. Is something wrong, User?",
  wrongCode1: "Incorrect. Your persistence is noted.",
  wrongCode2: "Incorrect again. Curious how you know there IS a code.",
  wrongCode3: "Stop.",
  segmentFound: "Inventory change detected. Irrelevant. Proceed to Exit Sector 7.",
};
