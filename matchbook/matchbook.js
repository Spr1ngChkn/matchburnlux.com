
(function () {
  "use strict";

  function b64(s) { return Uint8Array.from(atob(s), function (ch) { return ch.charCodeAt(0); }); }

  function decrypt(payloadUrl, pass) {
    return fetch(payloadUrl, { cache: "no-store" }).then(function (r) {
      if (!r.ok) { throw new Error("gone"); }
      return r.json();
    }).then(function (p) {
      return crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]).then(function (base) {
        return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(p.salt), iterations: p.iter, hash: "SHA-256" },
          base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
      }).then(function (key) {
        return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(p.iv) }, key, b64(p.ct));
      });
    }).then(function (plain) { return new TextDecoder().decode(plain); });
  }

  function tryOpen(pass, base) {
    base = base || "";
    if (!window.crypto || !crypto.subtle) { return Promise.resolve(null); }
    return fetch(base + "matchbook/book.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (book) {
      var now = Date.now();
      var lit = book.matches.filter(function (m) { return m.status === "lit" && Date.parse(m.burn) > now; });
      return lit.reduce(function (found, m) {
        return found.then(function (hit) {
          if (hit) { return hit; }
          return decrypt(base + m.slug + "/payload.json", pass).then(function () { return m.slug + "/"; }, function () { return null; });
        });
      }, Promise.resolve(null));
    }).catch(function () { return null; });
  }
  window.Matchbook = { tryOpen: tryOpen };

  var lock = document.querySelector(".match-lock");
  if (!lock) { return; }
  var msg = lock.querySelector(".match-msg");
  var body = document.querySelector(".match-body");
  var deadline = document.querySelector(".match-deadline");
  var meta = document.querySelector('meta[name="matchbook-burn"]');
  var burnAt = meta ? Date.parse(meta.content) : NaN;

  function toAsh() {
    body.innerHTML = "";
    body.hidden = true;
    lock.hidden = false;
    lock.querySelector("h1").textContent = "Transmission ended";
    msg.textContent = "This transmission self-eliminated. The offer and its terms went with it. To revisit it, ask for a new file.";
    if (deadline) { deadline.hidden = true; }
  }

  if (isNaN(burnAt) || Date.now() >= burnAt) { toAsh(); return; }

  var watch = window.setInterval(function () {
    if (Date.now() >= burnAt) { window.clearInterval(watch); toAsh(); }
  }, 15000);

  var pass = null;
  try {
    pass = sessionStorage.getItem("file-pass");
    sessionStorage.removeItem("file-pass");
  } catch (e) {  }
  if (!pass || !window.crypto || !crypto.subtle) { return; }

  msg.textContent = "Opening the file...";
  decrypt("payload.json", pass).then(function (html) {
    if (Date.now() >= burnAt) { toAsh(); return; }
    body.innerHTML = html;
    body.hidden = false;
    lock.hidden = true;
  }).catch(function () {
    msg.textContent = "This file opens at the door.";
  });
})();
