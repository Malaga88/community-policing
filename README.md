# GubiWatch

Web-based community policing and incident report system for ATBU Gubi Campus
— a final year project.

## Project structure

```
gubiwatch/
├── public/              # Frontend — plain HTML, CSS, and JavaScript
│   ├── index.html        # Landing page
│   ├── report.html        # Incident report form
│   ├── dashboard.html     # Shared incident dashboard (map + list views)
│   ├── css/
│   └── js/
└── server/              # Backend — Node.js, Express, MongoDB (Mongoose)
    ├── server.js          # Entry point
    ├── config/db.js        # MongoDB connection
    ├── models/             # User.js, Report.js (Mongoose schemas)
    ├── controllers/         # Route handler logic
    ├── routes/              # Express route definitions
    ├── middleware/           # Auth (JWT) + error handling
    ├── seed/                 # Sample-data seeding script
    └── .env.example
```

## Setting up the backend

1. **Install dependencies**

   ```bash
   cd server
   npm install
   ```

2. **Set up MongoDB.** Either:
   - Install MongoDB locally and use `mongodb://127.0.0.1:27017/gubiwatch`, or
   - Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) and use the connection string it gives you.

3. **Create your `.env` file**

   ```bash
   cp .env.example .env
   ```

   Then open `.env` and fill in `MONGODB_URI` and a `JWT_SECRET` (any long random string — this is what signs login tokens).

4. **(Optional) Seed some sample reports** so the dashboard isn't empty on first run:

   ```bash
   npm run seed
   ```

5. **Start the server**

   ```bash
   npm run dev
   ```

   You should see:
   ```
   MongoDB connected: <host>/gubiwatch
   GubiWatch server running at http://localhost:5000
   ```

6. **Open the site.** The backend also serves the frontend directly, so just visit **http://localhost:5000** — no separate frontend server needed. `index.html`, `report.html`, and `dashboard.html` are all served from `/public`.

## How the frontend talks to the backend

- `public/js/dashboard.js` calls `GET /api/reports` (optionally `?category=theft` etc.) to load reports for both the map and list views. If the API can't be reached, it falls back to a small set of demo reports and shows a banner saying so — so the dashboard is still browsable if you open the HTML files without the server running.
- `public/js/report.js` submits new reports via `POST /api/reports`. On failure it shows the server's error message inline rather than failing silently.

## API reference

| Method | Route                | Description |
|--------|-----------------------|--------------|
| GET    | `/api/health`          | Basic health check |
| GET    | `/api/reports`         | List reports, newest first. Supports `?category=theft\|harassment\|hazard\|suspicious` |
| GET    | `/api/reports/stats`   | Aggregate stats (total, top category, % anonymous) |
| POST   | `/api/reports`         | Create a report — `{ category, location, description, isAnonymous, reporterName?, lat?, lng? }` |
| POST   | `/api/auth/register`   | Create a student account — `{ fullName, email, password, matricNumber? }` |
| POST   | `/api/auth/login`      | Log in — `{ email, password }`, returns a JWT |

Note: `/api/auth` exists and works, but no page in `/public` calls it yet —
`report.html` still just takes a typed name for identified reports rather
than requiring login. It's there and ready for whenever a login/register
page gets built.

## A known limitation of this build

I was not able to run this backend against a live MongoDB instance while
building it in this environment — no local MongoDB install was available,
and outbound network access was restricted to a small allowlist that
didn't include MongoDB's servers. What I *did* verify:

- every backend file loads without syntax or import errors,
- the full Express app assembles (routes, middleware, static file serving)
  without error,
- the startup sequence correctly waits for a real DB connection before
  claiming to be "running", and exits cleanly if one can't be reached.

What I could **not** verify directly: an actual round-trip of submitting a
report through `report.html` and seeing it appear on `dashboard.html`
against a real database. Please run through that flow yourself once you
have MongoDB connected, before treating this as fully working.
