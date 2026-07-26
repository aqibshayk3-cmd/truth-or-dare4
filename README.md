# Truth or Dare — Live (Vercel deploy)

This is your Truth-or-Dare game, wired up so both players' devices actually
share game state (turn, question, answer, punishment) through a tiny
serverless API instead of browser-only storage.

## Why you need a database
The game syncs by both devices reading/writing the same "room" record every
~1.4 seconds. That requires somewhere both devices can reach — a plain static
site can't do that on its own. We use **Upstash Redis**, which has a
permanent free tier and takes about 2 minutes to set up.

## 1. Create a free Upstash Redis database
1. Go to https://console.upstash.com/ and sign up (free, no credit card).
2. Click **Create Database**. Any region is fine — pick one close to you.
3. Once created, open the database and find the **REST API** section.
4. Copy the two values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## 2. Deploy to Vercel
**Option A — via GitHub (recommended)**
1. Push this folder (`index.html`, `api/room.js`, `package.json`) to a new
   GitHub repo.
2. Go to https://vercel.com/new and import that repo.
3. Before/after the first deploy, go to **Project Settings → Environment
   Variables** and add:
   - `UPSTASH_REDIS_REST_URL` = (value from step 1)
   - `UPSTASH_REDIS_REST_TOKEN` = (value from step 1)
4. Redeploy (Vercel → Deployments → ⋯ → Redeploy) if you added the env vars
   after the first deploy.

**Option B — via Vercel CLI**
```bash
npm i -g vercel
cd this-folder
vercel
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel --prod
```

## 3. Test it
Open your deployed URL (`https://your-project.vercel.app`) on two different
devices/browsers (or one normal tab + one incognito tab), have one join as
Player 1 (password `03323` — change this in `index.html` if you want) and the
other join as Player 2. Moves made on one device should now appear on the
other within ~1–2 seconds.

## Live camera (new)
There's now a **📹 Video** tab both players can see.
- It's locked behind a password (`CAM_PASS`, set to `03323` by default — change
  it near the top of the `<script>` in `index.html`, right under `PASS`).
- Once unlocked, each person has their own **Open My Camera** / **Close My
  Camera** button. Opening it asks *that person's own browser* for camera/mic
  permission — there's no way for one side to switch on the other person's
  camera remotely. Once both people have their camera open, they see each
  other live.
- This is real peer-to-peer video (WebRTC), signaled through a second key in
  the same Upstash database. It needs HTTPS to access the camera, which
  Vercel gives you automatically — it won't work if you just open `index.html`
  as a local file.
- It uses public STUN servers for connectivity, which covers most home
  networks. If a call won't connect on a strict corporate/school network, that
  network likely needs a TURN server, which isn't included here.
- Closing either person's camera ends the call for both; reopening starts a
  fresh one.

## Notes
- The Player 1 password is the constant `PASS = '03323'` near the top of the
  `<script>` in `index.html` — change it before sharing the link.
- Everything else about the game (turns, punishments, rich-text/image/GIF/
  video answers, history tab) is unchanged.
- Upstash's free tier includes a generous daily command allowance, which is
  more than enough for casual play between two people. If you ever hit
  limits, Upstash will tell you in its dashboard.
