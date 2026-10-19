
(function () {
  "use strict";

  try {
    var nav = performance.getEntriesByType("navigation")[0];
    if (nav && nav.type === "reload") {
      window.location.replace("../");
      return;
    }
  } catch (e) {  }

  var door = document.querySelector(".door");
  var garden = document.querySelector(".sm-garden");
  if (!door || !garden) {
    return;
  }

  function openDoor() {
    door.classList.add("is-open");
    garden.hidden = false;
  }

  var slab = document.querySelector(".door-slab");
  if (slab && !slab.querySelector(".slab-edge")) {
    var edge = document.createElement("div");
    edge.className = "slab-edge";
    edge.setAttribute("aria-hidden", "true");
    slab.appendChild(edge);
  }

  // Flute: slow phrases in a minor pentatonic, the scale these flutes are
  // tuned to, played in the browser (no recordings, nothing to license). Goes
  // through Hallway, so the sound switch mutes it. Soft and sparse in the
  // hallway; fuller and more often once the door is open (owner, 2026-10-18).
  var SCALE = [392, 440, 523.25, 587.33, 659.25, 783.99, 880];
  var at = 1;
  var playing = false;
  var timer = 0;
  var HALL = { gain: 0.022, restMin: 4, restMax: 9 };
  var OPEN = { gain: 0.06, restMin: 1.5, restMax: 4 };
  var level = HALL;
  function phrase() {
    var t = 0;
    var notes = 3 + Math.floor(Math.random() * 4);
    for (var k = 0; k < notes; k++) {
      var step = [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
      var from = at;
      at = Math.max(0, Math.min(SCALE.length - 1, at + step));
      var last = k === notes - 1;
      var dur = last ? 2.4 + Math.random() * 1.6 : 0.5 + Math.random() * 0.9;
      Hallway.flute({
        freq: SCALE[at],
        from: Math.random() < 0.35 ? SCALE[from] : 0,
        duration: dur,
        gain: level.gain,
        delay: t
      });
      t += dur * 0.92;
    }
    if (Math.random() < 0.5) {
      at = 1;
    }
    var rest = level.restMin + Math.random() * (level.restMax - level.restMin);
    timer = window.setTimeout(phrase, (t + rest) * 1000);
  }
  function startFlute(delay) {
    if (playing) {
      return;
    }
    playing = true;
    timer = window.setTimeout(phrase, delay || 1500);
  }
  // Browsers keep sound off until the visitor's first tap or click, so the
  // first touch anywhere starts a phrase straight away instead of waiting.
  function firstTouch() {
    document.removeEventListener("pointerdown", firstTouch, true);
    window.clearTimeout(timer);
    playing = true;
    timer = window.setTimeout(phrase, 400);
  }
  document.addEventListener("pointerdown", firstTouch, true);

  document.addEventListener("door-close", function () {
    level = HALL;
    window.setTimeout(function () {
      if (!door.classList.contains("is-open")) {
        garden.hidden = true;
      }
    }, 1900);
  });

  document.addEventListener("sm-enter", function () { startFlute(); });
  document.addEventListener("sm-door-open", function () {
    openDoor();
    level = OPEN;
    if (playing) {
      window.clearTimeout(timer);
      timer = window.setTimeout(phrase, 900);
    } else {
      startFlute(900);
    }
  });

  showWalkCue(function () {
    walkAcross({ dir: "right", lettering: MBL_GLASS, silhouette: true, dest: "../", flag: "sm-walk" });
  }, "right", "Walk down the hall to Matchburn LUX");
})();
