# Campus Customs

A shop for Yale apparel with a chat assistant built in: a React + Vite +
TypeScript front end, a FastAPI back end, and a PydanticAI agent whose every
claim about a garment comes from the shop's own database rather than from the
model.

MGT 409 · homework 4.

---

## Before anything: place the data pack

**This repository does not contain the course data.** The SQLite database and
the 102 product photographs are supplied with the assignment and are
deliberately excluded here, so the repository carries only the code.

Unpack the course data pack into the project root so that it looks like this:

```
hw4/
└── data/
    ├── campus_customs.db        # catalogue, inventory, users, chat_messages
    └── products/                # 102 .jpg product photographs
```

Nothing will run without it: the catalogue, the product images, the accounts
and the chat all read from that database. If `data/campus_customs.db` is
missing, the backend starts but every catalogue route fails.

---

## Running it

Two processes: the API on port 8000, the site on port 5173. You need **Python
3.11+** and **Node 18+**.

### 1. Configure the key

```bash
cp .env.example .env
```

Then open `.env` and set `PORTKEY_API_KEY` to the key issued for the course.
Nothing else needs changing. `.env` is gitignored and must never be committed —
`.env.example` carries the variable names only.

### 2. Back end

From the project root:

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r requirements.txt
```

Then, **from the `backend/` folder**:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Check it with `http://localhost:8000/api/health`, which reports the model in
use and whether a key is configured — without revealing the key.

### 3. Front end

In a second terminal, from the `frontend/` folder:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The dev server proxies `/api` and `/media` to
the backend, so the browser sees a single origin and no CORS is involved in
development.

### Signing in

The supplied database contains seeded accounts. Guests can use the whole shop
and the chat; signing in additionally saves the conversation, lets the
assistant greet you by name, and lets it recall earlier visits.

---

## How the two halves fit together

```
browser (React + Vite, :5173)
   │  /api and /media proxied in development
   ▼
FastAPI  backend/main.py  (:8000)
   ├── catalogue routes ─────────────▶ db.py ──▶ data/campus_customs.db
   ├── account routes ──▶ auth.py ───▶ db.py ──▶ users
   └── POST /api/chat
         ├── agent.ask() ──▶ PydanticAI agent  backend/agent.py
         │                      ├── instructions: backend/prompts/prompt.md
         │                      └── tools: backend/tools.py ──▶ db.py
         └── every tool call and every run ──▶ output/audit_trail.json
```

**The front end** renders the catalogue, the product pages with live per-size
stock, the account forms, and a floating chat panel. When the assistant
searches, it returns **structured product matches** — not prose the browser has
to parse — and the page renders them as cards above the grid, with the
assistant's filter shown as removable chips. Clicking an earlier result in the
chat puts that set back on the page.

**The back end** serves the catalogue read-only, handles signup and login
against the supplied `users` table, and runs the agent. The agent has five
tools over the live database and is instructed never to state a fact it did not
get from one of them.

A full description of the design, the data, the tools, the safety rules and the
specifications is in [`output/harness.md`](output/harness.md).

---

## Layout

```
hw4/
├── AI_prompts.md              # the assignment prompt log
├── README.md
├── requirements.txt           # Python dependencies
├── .env.example               # variable names only — copy to .env
├── .gitignore
├── frontend/                  # Vite + React + TypeScript app
├── backend/
│   ├── main.py                # FastAPI app — uvicorn main:app --reload --port 8000
│   ├── agent.py               # PydanticAI agent: model, prompt, tool registration
│   ├── models.py              # every type the API and the agent exchange
│   ├── tools.py               # the five tools the agent can call
│   ├── db.py                  # all SQLite access
│   ├── auth.py                # password hashing and verification
│   ├── audit.py               # the append-only audit trail
│   └── prompts/
│       └── prompt.md          # system prompt: voice, tool guidance, safety rules
├── output/
│   ├── harness.md             # how the whole system works
│   ├── design.md              # design direction and the three lighting options
│   ├── usability.md           # four usability improvements and their reasoning
│   ├── app_check.html         # application checks, with screenshots
│   ├── app_check_images/      # screenshots linked from app_check.html
│   └── audit_trail.json       # append-only record of agent activity
└── data/                      # NOT in this repository — place the data pack here
```

---

## Notes for a reader

- **The audit trail ships non-empty.** `output/audit_trail.json` holds the
  entries from acceptance testing, including four runs made to fail on purpose —
  one for each non-normal stop reason. They are test artefacts, not incidents.
- **Sessions are not an auth boundary.** A successful login returns the user
  record and the browser remembers it; no API route yet requires proof of
  identity. This is stated plainly in the harness.
- **Password reset, cart, orders and payment are not built.** The assistant is
  instructed to say so rather than imply otherwise.
- **The artwork is original.** The bulldog, the shopfront and the campus map are
  drawn for this project in SVG; they are not Yale's trademarked marks. The
  product photographs come from the course data pack.
