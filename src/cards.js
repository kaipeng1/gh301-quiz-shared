// =============================================================================
// cards.js — Flashcard content for the quiz app
// =============================================================================
//
// This is the only file you need to edit to add your own cards.
// The 10 cards below are samples — replace them with your own content.
//
// Two other things to update in app.jsx when you customize this:
//   • TOPIC_LABELS (line ~35) — change the topic names to match your subject
//     e.g. {0:"All", 1:"Chapter 1", 2:"Chapter 2", ...}
//   • TAG_META (line ~38)     — add/rename tags used in your tg arrays
//     Any tag string not listed there still works; it just shows as-is.
//
// ─────────────────────────────────────────────────────────────────────────────
// FIELD REFERENCE
// ─────────────────────────────────────────────────────────────────────────────
//
//   id  — unique 8-character lowercase hex string, e.g. "a3f2c1d8"
//          No two cards may share an id. Generate randomly or sequentially.
//
//   q   — question text (plain string, no HTML)
//
//   a   — answer as an HTML string.
//          Always wrap in: <div style="text-align:left;">...</div>
//          Useful tags:
//            <b>key term</b>          bold
//            <i>mnemonic or tip</i>   italic
//            <br>                     line break
//            <br><br>                 paragraph break between sections
//            1. Item<br>2. Item       numbered list (inline, no <ol> needed)
//
//   t   — card type string:
//            "concept"  — definition, explanation, or list
//            "formula"  — calculation or step-by-step procedure
//
//   tn  — topic number (integer 0–6).
//          Maps to TOPIC_LABELS in app.jsx. Group related cards together.
//          0 is conventionally a catch-all / master list topic.
//
//   tg  — array of tag strings, e.g. ["Tag_One", "Tag_Two"]
//          Use PascalCase with underscores for multi-word tags.
//          Tags listed in TAG_META (app.jsx) get a human-readable label;
//          any other string works fine and displays as typed.
//
// ─────────────────────────────────────────────────────────────────────────────
// HOW TO FILL THIS IN USING AN LLM
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Export your notes from Anki (File → Export → "Notes in Plain Text"),
//    Notion, Obsidian, or wherever you keep them.
//
// 2. Open a new chat with an LLM (Claude, ChatGPT, etc.) and paste:
//
//    ┌─────────────────────────────────────────────────────────────────────┐
//    │ Here is cards.js from a flashcard app. Read the comments at the     │
//    │ top carefully — they explain every field and the HTML format for     │
//    │ answers. Then replace the sample CARDS array with cards based on     │
//    │ my notes (pasted below). Follow these rules:                        │
//    │                                                                     │
//    │ • Generate a unique random 8-char lowercase hex id for each card.   │
//    │ • q: plain text question, no HTML.                                  │
//    │ • a: answer wrapped in <div style="text-align:left;">. Use <b> for  │
//    │   key terms, <br><br> between sections, <i> for mnemonics/tips.     │
//    │ • t: "concept" for explanations/lists, "formula" for calculations.  │
//    │ • tn: group related cards under the same topic number (1–6).        │
//    │ • tg: short PascalCase tag strings that describe the card's topic.  │
//    │ • Keep "export default CARDS;" at the bottom unchanged.             │
//    │                                                                     │
//    │ [paste the full contents of this cards.js file here]               │
//    │ [paste your exported notes below]                                   │
//    └─────────────────────────────────────────────────────────────────────┘
//
// 3. Paste the LLM's output back here and save. The app hot-reloads.
//
// =============================================================================

const CARDS = [
  {
    id: "a1b2c3d4",
    q:  "What is active recall and why is it effective?",
    a:  "<div style=\"text-align:left;\"><b>Active recall</b> is a study technique where you actively retrieve information from memory rather than passively re-reading it.<br><br><b>Why it works:</b><br>• Forces the brain to reconstruct knowledge, strengthening memory pathways<br>• Surfaces gaps you didn't know you had<br>• More durable retention than highlighting or re-reading<br><br><i>💡 Tip: Use flashcards, practice questions, or blank-page recall after reading a section.</i></div>",
    t:  "concept",
    tn: 1,
    tg: ["Study_Methods"],
  },
  {
    id: "e5f6a7b8",
    q:  "What is spaced repetition?",
    a:  "<div style=\"text-align:left;\"><b>Spaced repetition</b> is a learning technique that schedules review sessions at increasing intervals based on how well you know each item.<br><br><b>Core idea:</b> Review again just before you are about to forget — this is more efficient than reviewing everything daily.<br><br><b>Intervals (example):</b><br>Day 1 → Day 3 → Day 7 → Day 14 → Day 30<br><br><i>💡 Mnemonic: Space out the hard stuff; skip the easy stuff.</i></div>",
    t:  "concept",
    tn: 1,
    tg: ["Study_Methods"],
  },
  {
    id: "c9d0e1f2",
    q:  "What are the 4 stages of the conscious competence learning model?",
    a:  "<div style=\"text-align:left;\">1. <b>Unconscious incompetence</b> — you don't know what you don't know<br>2. <b>Conscious incompetence</b> — you know you don't know it<br>3. <b>Conscious competence</b> — you can do it, but it takes effort<br>4. <b>Unconscious competence</b> — you do it automatically<br><br><i>💡 Mnemonic: UI → CI → CC → UC (\"you see, see you\")</i></div>",
    t:  "concept",
    tn: 1,
    tg: ["Study_Methods", "Models"],
  },
  {
    id: "03a4b5c6",
    q:  "How is a weighted average calculated?",
    a:  "<div style=\"text-align:left;\"><b>Formula:</b><br>Weighted Average = Σ(value × weight) ÷ Σ(weights)<br><br><b>Example:</b> Exam worth 60%, quiz worth 40%:<br>• Exam score = 80, Quiz score = 90<br>• Weighted avg = (80 × 0.6) + (90 × 0.4) = 48 + 36 = <b>84</b><br><br><i>💡 Key: divide by the sum of weights, not the number of items.</i></div>",
    t:  "formula",
    tn: 2,
    tg: ["Math", "Formula"],
  },
  {
    id: "d7e8f901",
    q:  "What is the difference between correlation and causation?",
    a:  "<div style=\"text-align:left;\"><b>Correlation:</b> two variables move together — when one changes, the other tends to change.<br><br><b>Causation:</b> one variable directly causes the other to change.<br><br><b>Key distinction:</b> correlation does NOT imply causation. A lurking third variable (confounder) may drive both.<br><br><b>Example:</b> Ice cream sales and drowning rates are correlated — both are caused by hot weather, not each other.<br><br><i>💡 Test for causation: randomized controlled experiment or strong theoretical mechanism.</i></div>",
    t:  "concept",
    tn: 2,
    tg: ["Statistics", "Research"],
  },
  {
    id: "2a3b4c5d",
    q:  "What is opportunity cost?",
    a:  "<div style=\"text-align:left;\"><b>Opportunity cost</b> is the value of the next-best alternative you give up when making a choice.<br><br><b>Formula:</b> Opportunity cost = Benefit of best forgone option<br><br><b>Example:</b> Spending 4 hours studying means giving up 4 hours of work that could have earned $60 — the opportunity cost is $60, not $0.<br><br><i>💡 Every decision has an opportunity cost, even choosing to do nothing.</i></div>",
    t:  "concept",
    tn: 3,
    tg: ["Economics"],
  },
  {
    id: "6e7f8a9b",
    q:  "What are the 3 types of economic goods?",
    a:  "<div style=\"text-align:left;\">1. <b>Private goods</b> — excludable and rival (e.g. a sandwich)<br>2. <b>Public goods</b> — non-excludable and non-rival (e.g. national defense, street lighting)<br>3. <b>Common goods</b> — non-excludable but rival (e.g. fish in an open ocean)<br><br><b>Also:</b> <b>Club goods</b> — excludable but non-rival (e.g. streaming service)<br><br><i>💡 Grid: Excludable? × Rival? = 4 quadrants, 4 good types.</i></div>",
    t:  "concept",
    tn: 3,
    tg: ["Economics", "Models"],
  },
  {
    id: "0c1d2e3f",
    q:  "What is the difference between RAM and ROM?",
    a:  "<div style=\"text-align:left;\"><b>RAM (Random Access Memory):</b><br>• Temporary, volatile — data is lost when power is off<br>• Stores data the CPU is actively using<br>• Fast read and write<br><br><b>ROM (Read-Only Memory):</b><br>• Permanent, non-volatile — data persists without power<br>• Stores firmware/boot instructions<br>• Read-only (typically)<br><br><i>💡 Mnemonic: RAM = Running programs; ROM = Remembered permanently.</i></div>",
    t:  "concept",
    tn: 4,
    tg: ["Computing"],
  },
  {
    id: "4f5a6b7c",
    q:  "How is percentage change calculated?",
    a:  "<div style=\"text-align:left;\"><b>Formula:</b><br>% Change = ((New − Old) ÷ Old) × 100<br><br><b>Example:</b> Price rises from $80 to $100:<br>% Change = ((100 − 80) ÷ 80) × 100 = 25%<br><br><b>Watch out:</b><br>• Positive result = increase; negative = decrease<br>• Base is always the <b>original (old)</b> value, not the new one<br><br><i>💡 \"New minus Old over Old\" — NOO formula.</i></div>",
    t:  "formula",
    tn: 4,
    tg: ["Math", "Formula"],
  },
  {
    id: "8d9e0f1a",
    q:  "What is the Feynman technique for learning?",
    a:  "<div style=\"text-align:left;\">A 4-step method for deep understanding:<br><br>1. <b>Choose a concept</b> you want to learn<br>2. <b>Explain it simply</b> — write it out as if teaching a child<br>3. <b>Identify gaps</b> — where did your explanation break down?<br>4. <b>Review and simplify</b> — go back to source material, fill gaps, refine<br><br><i>💡 \"If you can't explain it simply, you don't understand it well enough.\" — Feynman</i><br><br>Named after physicist Richard Feynman, who was renowned for making complex ideas accessible.</div>",
    t:  "concept",
    tn: 1,
    tg: ["Study_Methods", "Models"],
  },
];

export default CARDS;
