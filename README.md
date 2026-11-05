# Voice Notes AI — Project Overview

> **Private voice notes with local AI question-answering. No backend. No invented answers.**

| Item | Details |
|---|---|
| Project Name | Voice Notes AI |
| Current Version | v19 (Final) |
| Project Type | Progressive Web App (PWA) |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Storage | Browser `localStorage` + Markdown (`voiceNotes_md`) |
| Voice Input | Web Speech API (`SpeechRecognition`, en-US) |
| Voice Output | Web Speech API (`speechSynthesis`) |
| Local AI | Transformers.js — `Xenova/all-MiniLM-L6-v2` (~23 MB, quantized) |
| Backend | None |
| License | MIT (Open Source) |
| Location | `C:\Dev\Repos\voice-notes-app` |

---

## 1. What Is This App?

Voice Notes AI is a local, installable web application that allows users to:

1. Dictate notes using English voice input
2. Store notes locally in the browser
3. Organize notes into individual shopping/task items
4. Ask questions about previously saved notes
5. Receive answers taken **only from saved notes**
6. Add, edit, complete, and delete items by clicking or using voice commands
7. Export all notes as a readable Markdown file

### Example Use Case

Save by voice:

> "I want to buy flower and eggs from Walmart, toothpaste from Target, and football from Target."

Later ask:

> "What should I buy at Target?"

Answer:

- toothpaste
- football

After shopping, say:

> "Remove all items from Target."

Only the Target items are deleted. The Walmart items remain.

---

## 2. Problem Statement

Traditional note-taking requires typing, opening multiple lists, and manually searching earlier notes.

Existing voice assistants may:

- Send personal notes to external cloud services
- Generate answers that are not based on the user's own data
- Make it difficult to organize items by store
- Not allow users to retrieve all related items across multiple notes

This project addresses those issues by creating a **private, browser-based, voice-first note system** with local question answering.

---

## 3. Key Features

### 3.1 Voice Note Creation

- English speech recognition using `en-US`
- Live transcription while speaking
- Users can review and edit text before saving
- Supports spoken punctuation:
  - Say **"comma"** → converted to `,`
  - Say **"period"** → converted to `.`
  - Say **"question mark"** → converted to `?`

### 3.2 Smart Item Splitting

A single spoken sentence can contain multiple items and stores.

Example:

```text
I want to buy flower and eggs from Walmart toothpaste from Target
```

The app automatically converts it into:

```text
flower from Walmart
eggs from Walmart
toothpaste from Target
```

The store is inherited by all items in the same group. Therefore, "flower and eggs from Walmart" becomes two complete Walmart items, not one item missing its store.

### 3.3 Search Across All Notes

Questions are answered using the **entire current contents of local storage**, not only the most recent note.

For example, if toothpaste is in an old note and football is in a new note, asking "What should I buy at Target?" returns both.

### 3.4 Deterministic Store Questions

Store-specific questions do not depend only on the AI ranking.

Questions such as:

- "What should I buy at Target?"
- "What do I need from Walmart?"
- "Show me items from Five Below"

use a direct store filter and return **every matching item from every note**.

### 3.5 General Question Answering

For non-store questions, the application uses a local semantic AI model to find relevant saved content.

The system is **extractive**, not generative:

- It finds and quotes existing saved text
- It does not invent facts
- If no sufficiently relevant content exists, it responds:

> "I don't have that information in your saved notes."

### 3.6 Editing and Item Management

Users can:

- Edit a complete note
- Add a new item to an existing note
- Delete a complete note
- Mark one item as done
- Remove answered items after asking a question
- Search saved notes
- Delete all notes
- Export notes as Markdown

### 3.7 Voice Deletion Commands

| Voice Command | Action |
|---|---|
| "Remove all items from Target" | Deletes every Target item from all notes |
| "Delete all items from Walmart" | Deletes every Walmart item |
| "Remove toothpaste" | Deletes items containing the word "toothpaste" |
| "Delete my previous note" | Deletes the most recently saved note |
| "Delete all notes" | Deletes all stored notes |

All deletion operations require user confirmation before anything is permanently removed.

### 3.8 Installable PWA

The application can be installed on supported devices and launched like a native application. It includes:

- Web app manifest
- Service worker
- 192×192 and 512×512 icons
- Standalone display mode
- Cached application files for faster repeat loading

---

## 4. Technology Stack

| Area | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Voice Recognition | Web Speech API — `SpeechRecognition` |
| Voice Output | Web Speech API — `speechSynthesis` |
| Local AI | Transformers.js |
| AI Model | `Xenova/all-MiniLM-L6-v2` |
| Model Format | Quantized browser model, approximately 23 MB |
| Data Storage | Browser `localStorage` |
| Readable Backup | Markdown stored in local storage, exported as `.md` |
| PWA Support | Web App Manifest and Service Worker |
| Backend | None |
| Database Server | None |
| Build Tools | None required |
| Hosting | Any static web server or GitHub Pages |
| License Model | Open-source components / MIT project structure |

The app intentionally avoids a backend and build system to keep the project simple, portable, and easy to upload to GitHub.

---

## 5. System Architecture

```text
┌──────────────────────────────┐
│ User                         │
│ - Speaks a note              │
│ - Asks a question            │
│ - Gives a delete command     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Speech Recognition           │
│ Browser Web Speech API       │
│ Language: English (en-US)    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Text Processing              │
│ - Spoken punctuation cleanup │
│ - Sentence splitting         │
│ - Store detection            │
│ - Item splitting             │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Browser Local Storage        │
│ - Structured notes (JSON)    │
│ - Readable Markdown backup   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Question Processing          │
│ 1. Delete-command check      │
│ 2. Store-specific search     │
│ 3. Shopping-list search      │
│ 4. Local semantic AI search  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Answer Display + Speech      │
│ - Text/list output           │
│ - Optional spoken answer     │
│ - Source note dates          │
└──────────────────────────────┘
```

---

## 6. How Voice Input Works

1. The browser requests microphone permission.
2. `SpeechRecognition` listens using the `en-US` language setting.
3. Interim speech results appear while the user is speaking.
4. Final speech is placed in the note text box.
5. The user can review or edit the text.
6. When saved, the application:
   - Converts spoken punctuation into actual punctuation
   - Assigns a unique timestamp-based ID
   - Stores the note text and date
   - Updates the Markdown backup
   - Re-renders the notes list

---

## 7. How Smart Chunking Works

Speech often produces long run-on sentences without punctuation. The application therefore cannot rely only on periods.

### Step 1: Normalize Dictation

```text
olive oil comma cycle from Walmart
```

becomes:

```text
olive oil, cycle from Walmart
```

### Step 2: Remove Common Prefixes

```text
I want to buy eggs from Walmart
```

is processed as:

```text
eggs from Walmart
```

### Step 3: Find Store Boundaries

The parser identifies patterns such as:

```text
from Walmart
from Target
from Aldi
from Five Below
```

Each store ends the current shopping segment and starts the next one.

### Step 4: Split Individual Items

```text
flower and eggs from Walmart
```

Result:

```text
flower from Walmart
eggs from Walmart
```

Comma-separated format:

```text
flower, eggs, vegetables, and cycle from Walmart
```

Result:

```text
flower from Walmart
eggs from Walmart
vegetables from Walmart
cycle from Walmart
```

Multi-store format:

```text
milk from Aldi and a toy from Five Below and toothpaste from Target
```

Result:

```text
milk from Aldi
a toy from Five Below
toothpaste from Target
```

### Why This Matters

Accurate chunking is essential. If the full sentence is one chunk, the answer will be the full sentence. When each store/item is a separate chunk, the application can return only the relevant item.

---

## 8. How Question Answering Works

The question processor follows a deliberate priority order.

### Priority 1: Delete Commands

The system first checks whether the input starts with an action such as `remove`, `delete`, `clear`, or `erase`. If it is a delete command, it is handled before question answering.

### Priority 2: Store-Specific Questions

Example: "What should I buy at Target?"

The application extracts `Target`, searches all stored chunks, and returns every chunk containing that store. This is deterministic: every matching Target item is returned, regardless of which note contains it.

### Priority 3: General Shopping Questions

Example: "What should I buy?"

The application returns all stored shopping items across all notes.

### Priority 4: Semantic AI Search

For other questions, the application uses local text embeddings.

The model converts the user's question and every stored item into numeric vectors. It then calculates **cosine similarity** between the question and each item.

The `all-MiniLM-L6-v2` model produces **384-dimensional embeddings**.

This allows the system to recognize related meanings, such as:

| Saved Text | Related Question |
|---|---|
| purchase | buy |
| automobile | car |
| meeting | appointment |

Items below the relevance threshold are excluded to reduce unsupported answers.

---

## 9. Data Storage Design

The app uses two local-storage entries:

### 9.1 `voiceNotes`

Structured JSON used by the application:

```json
[
  {
    "id": 1710000000000,
    "text": "I want to buy eggs from Walmart.",
    "date": "5/13/2026, 3:30:15 PM"
  }
]
```

### 9.2 `voiceNotes_md`

A human-readable Markdown version:

```markdown
# Voice Notes

## 5/13/2026, 3:30:15 PM

I want to buy eggs from Walmart.
```

Users can also export this content as `voice-notes.md`, which can be opened in Notepad, VS Code, Obsidian, GitHub, or another Markdown editor.

### 9.3 Storage Capacity

Browser `localStorage` typically provides approximately **5–10 MB per website**.

That could theoretically represent tens of thousands of short sentences, but the practical recommended limit for this design is approximately **3,000–5,000 sentences**, because all candidate items are processed when asking an AI question.

For larger long-term storage, IndexedDB would be a better future replacement.

---

## 10. Privacy and Security Design

Privacy features include:

- No application backend
- No user account
- No project database server
- Notes stored in the user's browser
- AI embedding model runs locally in the browser after initial download
- Answers are restricted to saved content
- HTML is escaped before note text is displayed, reducing cross-site scripting risk
- Deletions require explicit confirmation

> **Important technical note:** In Chrome, the browser's speech-recognition service may require an internet connection and may process speech through the browser provider's service. Therefore, **note storage and AI search are local, but browser speech recognition is not guaranteed to be fully offline**.
>
> Once downloaded and cached, the AI model can perform embeddings locally without sending saved notes to a project server.

---

## 11. PWA and Caching Technical Details

The project includes:

```text
manifest.webmanifest
sw.js
icons/icon-192.png
icons/icon-512.png
```

The current application version is **v19**.

The service worker uses a **network-first strategy for code files** such as HTML, JavaScript, and CSS.

This was an important reliability fix. Earlier versions could temporarily run old cached JavaScript even after files were replaced. Network-first loading ensures updated application code is used when the server is available.

Static assets, such as icons, can be served from cache.

---

## 12. Project Structure

```text
voice-notes-app/
├── index.html
├── manifest.webmanifest
├── sw.js
├── README.md
├── PROJECT_OVERVIEW.md
├── LICENSE
├── .gitignore
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── css/
│   └── styles.css
└── js/
    └── app.js
```

This structure is suitable for:

- Running locally with a static server
- Uploading directly to GitHub
- Publishing through GitHub Pages
- Deploying to other static hosting services

---

## 13. How to Run Locally

**Option A — Python (recommended):**

```powershell
cd <To project Folder>\voice-notes-app
py -m http.server 8000
```

Then open `http://localhost:8000` in Chrome or Edge and allow microphone access.

**Option B — VS Code:**

Install the "Live Server" extension, right-click `index.html`, and select `Open with Live Server`.

**Option C — Node.js:**

```powershell
cd C:\Dev\Repos\voice-notes-app
npx --yes serve .
```

> **Note:** Microphone access will not work reliably from `file://`. You must use `localhost` or `https://`.

---

## 14. Main Engineering Challenges Solved

### Challenge 1: Whole Sentence Returned Instead of One Item

- **Cause:** Speech produced one long sentence with no commas or periods.
- **Solution:** Split content at each `from <store>` boundary.

### Challenge 2: "Flower" Separated From Its Store

Input: `flower and eggs from Walmart`

Incorrect early result: `flower` / `eggs from Walmart`

- **Solution:** Store inheritance — when multiple items share one store, the store is copied to each item.

### Challenge 3: Multiple Items From One Store

Input: `flower eggs vegetables and cycle from Walmart`

- **Solution:** Split single-word item lists and assign the shared store to each resulting item.

### Challenge 4: Saying "comma" Stored the Word "comma"

- **Cause:** Browser speech recognition does not automatically interpret punctuation commands.
- **Solution:** Convert spoken words such as "comma" and "period" into punctuation before saving. The same normalization is applied when old notes are parsed.

### Challenge 5: Answers Only Came From the Latest Note

- **Cause:** Earlier ranking and filtering favored one top candidate.
- **Solution:** Build candidates from every note, then return every relevant matching item instead of only the single highest-ranked item.

### Challenge 6: Old Application Code Continued Running

- **Cause:** PWA/service-worker caching.
- **Solution:** Versioned script URLs (`js/app.js?v=19`) and network-first service-worker handling for HTML, JavaScript, and CSS.

---

## 15. Functional Testing Examples

| Test | Input | Expected Result |
|---|---|---|
| Shared store | "flower and eggs from Walmart" | `flower from Walmart`, `eggs from Walmart` |
| Multiple stores | "flowers from Walmart, toothpaste from Target" | Correct item returned for each store |
| Cross-note search | Target items in two different notes | Both Target items returned |
| Shopping list | "What should I buy at Walmart?" | All Walmart items only |
| Complete list | "What should I buy?" | All saved buying items |
| Spoken comma | "olive oil comma cycle from Walmart" | Two distinct items |
| Voice deletion | "Remove all items from Target" | All Target items removed after confirmation |
| Previous note deletion | "Delete my previous note" | Most recent note displayed for confirmation and deleted |
| Unknown question | Ask about information never saved | "I don't have that information in your saved notes." |

---

## 16. Suggested Live Demo Script

1. **Save a multi-store list by voice:**
   > "I want to buy flower and eggs from Walmart toothpaste from Target"
2. **Show automatic item splitting** in the Saved Notes section (Items in this note).
3. **Save a second note:**
   > "I want to buy football from Target"
4. **Ask:** "What should I buy at Target?"
   → Shows `toothpaste` and `football` — items retrieved from **two different notes**.
5. **Ask:** "What should I buy at Walmart?"
   → Shows `flower` and `eggs`.
6. **Voice delete:** Click 🗑️ Voice Delete and say "Remove all items from Target", confirm the popup.
   → Only the Walmart items remain.
7. **Export:** Click Export .md and open the downloaded Markdown file.

---

## 17. Limitations

1. **Browser dependency** — Best supported in Chrome and Edge. Speech recognition is not consistently available in all browsers.
2. **Speech accuracy** — Recognition errors can affect items, such as hearing "flower" instead of "flour". Users can edit the transcript before saving.
3. **Store-based chunk assumptions** — The smartest splitting relies heavily on the `item from <store>` pattern. Complex free-form notes may remain larger chunks.
4. **Multi-word item ambiguity** — A comma or "and" is recommended between multi-word items. Example: "olive oil, peanut butter, and cycle from Walmart".
5. **Storage scalability** — `localStorage` is suitable for personal use but not very large archives.
6. **AI loading** — The first AI use downloads an approximately 23 MB model. Subsequent use benefits from browser caching.
7. **Extractive answers** — This is a safety and accuracy decision. The app will quote saved content rather than compose new summaries or explanations.

---

## 18. Future Enhancements

1. **IndexedDB storage** — Store more notes and support larger personal archives.
2. **Saved AI embeddings** — Calculate each item's embedding once when saved, making searches faster as the number of notes grows.
3. **Categories and tags** — Shopping, Work, Personal, Reminders.
4. **Better natural-language parsing** — Quantities, units, due dates, and priorities. Example: "two litres of milk by Friday".
5. **Import and restore** — Import a previously exported Markdown or JSON file.
6. **Improved offline speech** — Investigate fully local speech-recognition models such as Whisper running through WebAssembly.
7. **Checklist mode** — Checkbox-based shopping completion, completed-item history, and undo.
8. **Cloud-optional synchronization** — Keep local storage as default, with optional encrypted backup or GitHub synchronization.

---

## 19. Conclusion

Voice Notes AI demonstrates that a useful voice assistant can be built with open web technologies, no application backend, and answers grounded strictly in the user's own saved information.

> Voice Notes AI is an open-source, browser-based Progressive Web App that turns English speech into structured local notes. It automatically separates items by store, understands spoken punctuation, searches across all saved notes, and uses a local embedding model for general questions. Store and shopping questions use deterministic retrieval so every relevant item is returned, while general answers are quoted only from the user's saved text to prevent hallucination. Users can edit, add, complete, export, and voice-delete items, making the application a privacy-conscious and practical hands-free personal assistant.
