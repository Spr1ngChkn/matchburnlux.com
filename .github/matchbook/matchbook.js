#!/usr/bin/env node
/*
  MATCHBOOK: self-eliminating private files for matchburnlux.com.

  A "match" is one private page: its text is encrypted with a passcode and it
  carries a burn time. When the time comes, the match burns down to ash: the
  encrypted file is deleted and only a short notice stays at its address.

  Three things enforce the burn, so no one has to remember it:
    1. The page itself (site/matchbook/matchbook.js) refuses to open after the
       burn time, and wipes itself if it is open on screen when the time passes.
    2. A scheduled GitHub Actions workflow in the public repo runs `burn` every
       10 minutes and commits the ash. (GitHub may run it late under load, so
       the page's own lock in 1. is what makes the deadline exact.)
    3. The publish script runs `burn` on the source before every publish, so an
       expired match can never be published again.

  Commands (no dependencies; Node 18+):
    node matchbook.js strike <slug> --burn <time> --from <draft.html> [--title <t>]
        Light a new match. <time> is ISO with an offset, e.g. 2026-10-02T19:45:00-07:00.
        The passcode is asked for twice, hidden (or read from MATCHBOOK_PASS).
        Writes site/<slug>/index.html + payload.json and adds the match to the book.
    node matchbook.js burn [--now <time>]       Burn every lit match whose time has passed.
    node matchbook.js snuff <slug>              Burn one match now, whatever its time.
    node matchbook.js list                      Show the book.
    Any command takes --site <dir> (default: ../../site from this file).

  The book: site/matchbook/book.json, public. It holds slugs, burn times and
  status only: no passcodes, no fingerprints, no client details.

  Honest limits, kept in view:
  - Ash is final on the live site, but git keeps history: the encrypted file stays
    in the public repo's past commits. Only a strong passcode protects it there,
    so strike enforces 12+ characters and uses PBKDF2 with 600,000 iterations.
  - The door no longer keeps a fast SHA-256 fingerprint of file passcodes (that
    made guessing cheap); it tries the passcode against each lit match instead.
*/
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ITERATIONS = 600000;          // PBKDF2-SHA-256 (OWASP 2023 guidance)
const MIN_PASS = 12;
const ZONE = "America/Los_Angeles"; // Las Vegas time for the notices

// ---- arguments ------------------------------------------------------------
const argv = process.argv.slice(2);
const cmd = argv[0];
function opt(name, fallback) {
  const i = argv.indexOf("--" + name);
  return i > -1 ? argv[i + 1] : fallback;
}
const SITE = path.resolve(opt("site", path.join(__dirname, "..", "..", "site")));
const BOOK = path.join(SITE, "matchbook", "book.json");

function readBook() {
  if (!fs.existsSync(BOOK)) return { matches: [] };
  return JSON.parse(fs.readFileSync(BOOK, "utf8"));
}
function writeBook(book) {
  fs.writeFileSync(BOOK, JSON.stringify(book, null, 2) + "\n");
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
// "7:45 PM, Friday, October 2, 2026"
function spoken(iso) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { timeZone: ZONE, hour: "numeric", minute: "2-digit" });
  const day = d.toLocaleDateString("en-US", { timeZone: ZONE, weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return time + ", " + day;
}

// ---- the pages --------------------------------------------------------------
// Both pages live one folder down (site/<slug>/), so paths start with "../".
const HEAD = (title, extra) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; form-action 'none'; base-uri 'none'; object-src 'none'">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>${esc(title)} · Matchburn LUX</title>
  <link rel="icon" type="image/png" sizes="32x32" href="../img/favicon-32.png">
  <link rel="stylesheet" href="../site.css">
${extra}</head>
<body class="page">

  <header class="page-top">
    <a href="../">Matchburn LUX</a>
  </header>
`;
const FOOT = `
  <footer class="site-footer">
    <p class="fine">&copy; 2006&ndash;2026 Matchburn LUX &middot; All rights reserved &middot; by appointment only</p>
  </footer>

</body>
</html>
`;

function litPage(match) {
  return HEAD(match.title, `  <link rel="stylesheet" href="../matchbook/match.css">
  <meta name="matchbook-burn" content="${esc(match.burn)}">
  <script src="../matchbook/matchbook.js" defer></script>
`) + `
  <main class="sheet">
    <div class="match-lock">
      <h1>${esc(match.title)}</h1>
      <p class="byline">Matchburn LUX &middot; by appointment only</p>
      <p class="lede match-msg" role="status" aria-live="polite">This file opens at the door. Try the handle.</p>
      <p class="signoff"><a href="../">Back to the door</a></p>
    </div>
    <div class="match-body" hidden></div>
    <p class="match-deadline">This transmission will self-eliminate at ${esc(spoken(match.burn))}.</p>
  </main>
` + FOOT;
}

function ashPage(match) {
  return HEAD("Self-eliminated", "") + `
  <main class="sheet">
    <h1>Transmission ended</h1>
    <p class="byline">Matchburn LUX &middot; by appointment only</p>
    <p class="lede">This transmission self-eliminated at ${esc(spoken(match.burn))}.
      The offer and its terms went with it.</p>
    <p class="signoff"><strong>Sorry we missed you.</strong> To revisit it, ask for a new file.</p>
    <p class="signoff"><a href="../">Back to the door</a></p>
  </main>
` + FOOT;
}

// ---- burning ------------------------------------------------------------------
// Ash = the folder emptied, then a single notice page written in its place.
function burnOne(match) {
  const dir = path.join(SITE, match.slug);
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { recursive: true, force: true });
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, "index.html"), ashPage(match));
  match.status = "ash";
  match.ashed = new Date().toISOString();
}

function burnDue(nowIso) {
  const now = nowIso ? new Date(nowIso) : new Date();
  const book = readBook();
  const burned = [];
  for (const m of book.matches) {
    if (m.status === "lit" && new Date(m.burn) <= now) {
      burnOne(m);
      burned.push(m.slug);
    }
  }
  if (burned.length) writeBook(book);
  console.log(burned.length ? "Burned: " + burned.join(", ") : "Nothing due.");
}

// ---- striking -------------------------------------------------------------------
function askHidden(question) {
  if (process.env.MATCHBOOK_PASS) return Promise.resolve(process.env.MATCHBOOK_PASS);
  if (!process.stdin.isTTY) {
    return Promise.reject(new Error("No terminal for a hidden prompt: run from PowerShell, or set MATCHBOOK_PASS."));
  }
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let typed = "";
    const onData = (buf) => {
      for (const ch of buf.toString("utf8")) {
        if (ch === "\r" || ch === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          return resolve(typed);
        }
        if (ch === "\u0003") process.exit(1);                  // Ctrl+C
        if (ch === "\u007f" || ch === "\b") typed = typed.slice(0, -1);
        else typed += ch;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function strike(slug) {
  const burn = opt("burn");
  const from = opt("from");
  const title = opt("title", "A file for you");
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error("slug: lowercase letters, digits and dashes only.");
  if (!burn || isNaN(new Date(burn)) || !/[+-]\d\d:\d\d$|Z$/.test(burn)) {
    throw new Error("--burn needs an ISO time with an offset, e.g. 2026-10-02T19:45:00-07:00");
  }
  if (new Date(burn) <= new Date()) throw new Error("That burn time has already passed.");
  if (!from || !fs.existsSync(from)) throw new Error("--from must point to the draft HTML fragment.");
  const book = readBook();
  if (book.matches.some((m) => m.slug === slug)) throw new Error("A match named " + slug + " is already in the book.");

  // The passcode is matched at the door in lower case, trimmed (as visitors type it).
  const pass = (await askHidden("Passcode: ")).trim().toLowerCase();
  if (!process.env.MATCHBOOK_PASS) {
    const again = (await askHidden("Again: ")).trim().toLowerCase();
    if (again !== pass) throw new Error("The two passcodes differ.");
  }
  if (pass.length < MIN_PASS) throw new Error("Passcode needs " + MIN_PASS + "+ characters (it guards the file in git history forever).");

  // Encrypt: PBKDF2-SHA-256 -> AES-256-GCM. WebCrypto expects the tag appended to the ciphertext.
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pass, salt, ITERATIONS, 32, "sha256");
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(fs.readFileSync(from, "utf8"), "utf8"), c.final(), c.getAuthTag()]);

  const match = { slug, title, burn, status: "lit", struck: new Date().toISOString() };
  const dir = path.join(SITE, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "payload.json"), JSON.stringify({
    salt: salt.toString("base64"), iv: iv.toString("base64"), iter: ITERATIONS, ct: ct.toString("base64")
  }) + "\n");
  fs.writeFileSync(path.join(dir, "index.html"), litPage(match));
  book.matches.push(match);
  writeBook(book);
  console.log("Struck " + slug + ": burns at " + spoken(burn) + " (Las Vegas). Opens from the MBL door handle.");
  console.log("Delete the plaintext draft when you're done: " + from);
}

// ---- main ---------------------------------------------------------------------
(async () => {
  try {
    if (cmd === "strike") await strike(argv[1]);
    else if (cmd === "burn") burnDue(opt("now"));
    else if (cmd === "snuff") {
      const book = readBook();
      const m = book.matches.find((x) => x.slug === argv[1]);
      if (!m) throw new Error("No match named " + argv[1]);
      burnOne(m);
      writeBook(book);
      console.log("Snuffed " + m.slug + ".");
    } else if (cmd === "list") {
      for (const m of readBook().matches) console.log(m.status.padEnd(4), m.slug.padEnd(24), spoken(m.burn));
    } else {
      console.log("Usage: matchbook.js strike|burn|snuff|list  (see the notes at the top of this file)");
      process.exitCode = 2;
    }
  } catch (e) {
    console.error("matchbook: " + e.message);
    process.exitCode = 1;
  }
})();
