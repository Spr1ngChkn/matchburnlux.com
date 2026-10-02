
(function () {
  "use strict";
  var EXPIRES = Date.parse("2026-10-03T01:25:00Z");
  var lock = document.querySelector(".cade-lock");
  var msg = document.querySelector(".cade-msg");
  var body = document.querySelector(".cade-body");

  function withdrawn() {
    body.hidden = true;
    body.innerHTML = "";
    lock.hidden = false;
    msg.textContent = "This file has been withdrawn. Sorry we missed you.";
  }
  if (Date.now() > EXPIRES) { withdrawn(); return; }
  window.setInterval(function () { if (Date.now() > EXPIRES) { withdrawn(); } }, 30000);

  var pass = null;
  try {
    pass = sessionStorage.getItem("file-pass");
    sessionStorage.removeItem("file-pass");
  } catch (e) {  }
  if (!pass || !window.crypto || !crypto.subtle) { return; }

  function b64(s) { return Uint8Array.from(atob(s), function (ch) { return ch.charCodeAt(0); }); }

  msg.textContent = "Opening the file...";
  fetch("payload.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (p) {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]).then(function (base) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64(p.salt), iterations: p.iter, hash: "SHA-256" },
        base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    }).then(function (key) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(p.iv) }, key, b64(p.ct));
    });
  }).then(function (plain) {
    body.innerHTML = new TextDecoder().decode(plain);
    body.hidden = false;
    lock.hidden = true;
  }).catch(function () {
    msg.textContent = "This file opens at the door.";
  });
})();
