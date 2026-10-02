
(function () {
  "use strict";
  var list = document.querySelector(".log-list");
  if (!list) { return; }
  var entries = Array.prototype.slice.call(list.querySelectorAll(".log-entry"));
  if (!entries.length) { return; }

  function iso(d) {
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  var have = {};
  entries.forEach(function (e) { have[e.getAttribute("data-date")] = e; });
  var oldest = entries[entries.length - 1].getAttribute("data-date");

  var day = new Date();
  var guard = 0;
  var before = entries[0];
  while (iso(day) > oldest && guard < 400) {
    var key = iso(day);
    if (have[key]) {
      before = have[key].nextSibling;
    } else {
      var gap = document.createElement("p");
      gap.className = "log-gap";
      gap.innerHTML = "[" + key + "] <span class=\"code\">E404</span> no entry logged. The crew was heads-down (or AFK).";
      list.insertBefore(gap, have[key] || before);
    }
    day.setDate(day.getDate() - 1);
    guard++;
  }
})();
