
(function () {
  "use strict";
  var overlay = document.querySelector(".app-overlay");
  var go = document.querySelector(".app-go");
  if (!overlay || !go) { return; }
  var steps = overlay.querySelectorAll(".app-step");
  var title = overlay.querySelector(".app-form-title");

  function show(name) {
    steps.forEach(function (s) { s.hidden = s.getAttribute("data-step") !== name; });
  }
  go.addEventListener("click", function () { show("games"); overlay.hidden = false; });
  overlay.querySelector(".app-close").addEventListener("click", function () { overlay.hidden = true; });
  overlay.addEventListener("click", function (e) {
    var b = e.target.closest("[data-go]");
    if (!b) { return; }
    if (b.getAttribute("data-title") && title) { title.textContent = b.getAttribute("data-title"); }
    show(b.getAttribute("data-go"));
  });
  overlay.querySelector(".app-send").addEventListener("click", function () {
    var name = document.getElementById("app-name").value.trim();
    var goal = document.getElementById("app-goal").value.trim();
    var hint = overlay.querySelector(".app-hint");
    if (!goal) { hint.textContent = "Type your goal first, then transmit."; return; }
    var body = encodeURIComponent((name ? "From: " + name + "\n\n" : "") + goal);
    window.location.href = "mailto:spr1ngchkn@matchburnlux.com?subject=" +
      encodeURIComponent((title ? title.textContent : "Spr1ngChkn.app") + " (Spr1ngChkn.app)") + "&body=" + body;
    hint.textContent = "Your mail client should open with it ready to send.";
  });
})();
