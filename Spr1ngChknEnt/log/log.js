
(function () {
  "use strict";
  var list = document.querySelector(".log-list");
  if (!list) { return; }
  var entries = Array.prototype.slice.call(list.querySelectorAll(".log-entry"));
  if (!entries.length) { return; }
  var FOLD_OVER = 3;

  function iso(d) {
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function parse(s) {
    var p = s.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2], 12);
  }
  function line(html) {
    var gap = document.createElement("p");
    gap.className = "log-gap";
    gap.innerHTML = html;
    return gap;
  }

  function missing(newer, older) {
    var days = [];
    var d = parse(newer);
    d.setDate(d.getDate() - 1);
    while (iso(d) > older && days.length < 5000) {
      days.push(iso(d));
      d.setDate(d.getDate() - 1);
    }
    return days;
  }

  function fill(days, before) {
    if (!days.length) { return; }
    if (days.length <= FOLD_OVER) {
      days.forEach(function (k) {
        list.insertBefore(line("[" + k + "] <span class=\"code\">E404</span> no entry logged. The crew was heads-down (or AFK)."), before);
      });
      return;
    }
    list.insertBefore(line("[" + days[days.length - 1] + " &hellip; " + days[0] + "] <span class=\"code\">E404 &times;" + days.length +
      "</span> days off the log."), before);
  }

  var tomorrow = new Date();
  tomorrow.setHours(12);
  tomorrow.setDate(tomorrow.getDate() + 1);
  var newer = iso(tomorrow);
  entries.forEach(function (e) {
    var date = e.getAttribute("data-date");
    fill(missing(newer, date), e);
    newer = date;
  });
})();
