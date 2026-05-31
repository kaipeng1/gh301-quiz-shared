# Quiz Bot — Local Setup Guide

A flashcard quiz app with AI-powered answer grading. Cards live in `src/cards.js` — swap in your own content without touching anything else.

---

## Prerequisites

- **Node.js 18+** — download from [nodejs.org](https://nodejs.org) (LTS version recommended)
- An **API key** for an AI provider (Anthropic Claude recommended — see below)

---

## 1. Get an API key

### Anthropic (Claude) — recommended, works out of the box

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign up or log in
2. In the left sidebar, click **API Keys**
3. Click **Create Key**, give it a name, and copy the key — it starts with `sk-ant-api03-`
4. You'll need a credit card on file; Anthropic charges per use (typical study session costs a few cents)

### OpenAI (GPT) or Google (Gemini)

See [Switching to a different AI provider](#switching-to-a-different-ai-provider) below — requires a small code change.

---

## 2. Configure your API key

Open the `.env` file in the project root and paste your key:

```
VITE_ANTHROPIC_KEY=sk-ant-api03-your-key-here
```

> ⚠️ **Keep this file private.** `.env` is listed in `.gitignore` and will not be committed to git, but don't share the folder as a zip with the key still in it.

---

## 3. Install dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

This only needs to be run once (or again after pulling updates).

---

## 4. Load your cards

The file `src/cards.js` contains 10 sample cards showing the format. Replace them with your own content:

### Option A — Use an LLM to convert your existing notes (fastest)

1. Export your notes from Anki (`File → Export → Notes in Plain Text`), Notion, Obsidian, or copy them from wherever you study
2. Open a chat with Claude or ChatGPT and paste the following prompt, followed by the full contents of `src/cards.js`, followed by your notes:

   > *"Here is cards.js from a flashcard app. Read the comments carefully — they explain every field and the HTML format for answers. Replace the sample CARDS array with cards based on my notes below. Generate a unique random 8-character lowercase hex id for each card. Keep `export default CARDS;` at the bottom unchanged."*

3. Paste the LLM's output back into `src/cards.js` and save

### Option B — Edit cards.js manually

Each card follows this shape — the comments at the top of `src/cards.js` explain every field:

```js
{
  id: "a1b2c3d4",       // unique 8-char hex string
  q:  "Your question",  // plain text
  a:  "<div style=\"text-align:left;\"><b>Key term</b> — explanation</div>",
  t:  "concept",        // "concept" or "formula"
  tn: 1,                // topic number 1–6 (see TOPIC_LABELS in app.jsx)
  tg: ["Tag_One"],      // tag array
},
```

### Update topic and tag names

Topic names and tag labels are defined in `src/app.jsx` (around lines 35–58):

- **`TOPIC_LABELS`** — maps topic numbers to display names shown in the filter UI:
  ```js
  const TOPIC_LABELS = {0:"All", 1:"Chapter 1", 2:"Chapter 2", ...};
  ```
- **`TAG_META`** — maps tag keys to human-readable labels. Any tag not listed here still works and displays as typed.

### Update the grading prompt

The AI grader's instructions are in `src/app.jsx` around line 480. The default prompt references a specific actuarial exam. Replace the `system:` string with instructions suited to your subject:

```js
system: "You are grading a student's answer about [your subject]. Be encouraging but honest. ..."
```

---

## 5. Start the app

```bash
npm start
```

This launches two processes:

| Process | Port | Purpose |
|---|---|---|
| Vite dev server | 5173 | The quiz app UI |
| CORS proxy | 8081 | Forwards API calls to Anthropic (required to avoid browser CORS errors) |

Open the URL Vite prints — usually **http://localhost:5173**

---

## Switching to a different AI provider

The app is wired for Anthropic by default. To use OpenAI (GPT-4o) or Google (Gemini) instead, you need to update three things:

### 1. `proxy.js` — change the forwarding target

```js
// OpenAI example — replace the https.request options:
hostname: 'api.openai.com',
path: '/v1/chat/completions',
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + req.headers['authorization']?.replace('Bearer ', ''),
},
```

### 2. `src/app.jsx` — update `API_HEADERS` and the fetch body

Near the top of the file, `API_HEADERS` sends Anthropic-specific headers. For OpenAI:

```js
// Replace API_HEADERS with:
const API_HEADERS = IS_LOCAL
  ? {"Content-Type":"application/json","Authorization":"Bearer "+__OPENAI_KEY__}
  : {"Content-Type":"application/json","Authorization":"Bearer "+__OPENAI_KEY__};
```

In the `fetch` call (~line 478), update the request body format and the response field used to extract the text:

```js
// OpenAI request body:
body: JSON.stringify({
  model: "gpt-4o",
  messages: [{role:"system", content: "..."}, {role:"user", content: "..."}]
})

// OpenAI response — change:
data.content?.[0]?.text
// to:
data.choices?.[0]?.message?.content
```

### 3. `.env` — add your new provider's key

```
VITE_OPENAI_KEY=sk-...
```

And reference it in `vite.config.js` under `define` the same way `__ANTHROPIC_KEY__` is set.

---

## Importing and exporting progress

Your quiz progress (scores, notes, edits) is saved automatically in your browser's `localStorage`. Use the **Export State** button in the app to download a `.json` backup, and **Import State** to restore it — useful for switching computers.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm install` fails | Make sure Node.js 18+ is installed: `node --version` |
| App opens but grader says "Couldn't reach evaluator" | Check that `npm start` is still running in the terminal; the proxy on port 8081 must be running |
| API key error / 401 | Double-check the key in `.env` — no spaces, no quotes around the value |
| Blank page or crash after editing cards.js | Open browser DevTools (F12) → Console tab for the error; most likely a syntax error in the cards array (missing comma, unclosed string, etc.) |
| Port 5173 or 8081 already in use | Stop other dev servers, or change the ports in `vite.config.js` and `proxy.js` |
