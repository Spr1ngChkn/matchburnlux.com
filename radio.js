
(function () {
  "use strict";

  var radio = document.querySelector(".radio");
  if (!radio) { return; }

  // Spr1ngChkn Originals: homemade spy-jazz, served from this site (no third-party stream).
  var TRACKS = [
    { file: "audio/trench-coat-shuffle", title: "Trench Coat Shuffle" },
    { file: "audio/midnight-in-the-hallway", title: "Midnight in the Hallway" }
  ];
  var EXT = (function () {
    var a = document.createElement("audio");
    return a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"') ? ".ogg" : ".mp3";
  })();
  var VOLUME = 0.25;
  var FADE_MS = 1500;

  var playBtn = radio.querySelector(".radio-play");
  var stopBtn = radio.querySelector(".radio-stop");
  var slider = radio.querySelector(".radio-volume");
  var nowEl = radio.querySelector(".radio-now");
  var audio = null;
  var which = 0;
  var fadeTimer = null;

  function setNow(text) {
    if (nowEl) { nowEl.textContent = text; }
  }

  function fadeTo(target, done) {
    window.clearInterval(fadeTimer);
    var start = audio.volume;
    var t0 = Date.now();
    fadeTimer = window.setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / FADE_MS);
      audio.volume = start + (target - start) * k;
      if (k === 1) {
        window.clearInterval(fadeTimer);
        if (done) { done(); }
      }
    }, 40);
  }

  function load(i) {
    which = (i + TRACKS.length) % TRACKS.length;
    audio.src = TRACKS[which].file + EXT;
    setNow("Spr1ngChkn Originals — " + TRACKS[which].title);
  }

  function play() {
    if (!audio) {
      audio = new Audio();
      audio.preload = "none";
      audio.addEventListener("ended", function () {
        load(which + 1);
        audio.play().catch(function () {});
      });
      audio.addEventListener("error", function () {
        setNow("The radio is warming up. Try again in a moment.");
        stopped();
      });
      load(Math.floor(Math.random() * TRACKS.length));
    }
    audio.volume = 0;
    audio.play().then(function () {
      fadeTo(slider ? Number(slider.value) : VOLUME);
      playBtn.hidden = true;
      stopBtn.hidden = false;
      radio.classList.add("is-on");
    }).catch(function () {
      setNow("Press play to tune in.");
    });
  }

  function stopped() {
    playBtn.hidden = false;
    stopBtn.hidden = true;
    radio.classList.remove("is-on");
  }

  function stop() {
    if (!audio) { return; }
    fadeTo(0, function () {
      audio.pause();
      setNow("Spr1ngChkn Originals");
      stopped();
    });
  }

  document.addEventListener("se-enter", function () {
    radio.classList.add("is-emerging");
    play();
  });

  document.addEventListener("hall-walk", function () {
    if (audio && !audio.paused) { stop(); }
  });

  playBtn.addEventListener("click", play);
  stopBtn.addEventListener("click", stop);
  if (slider) {
    slider.value = VOLUME;
    slider.addEventListener("input", function () {
      if (audio && !audio.paused) {
        window.clearInterval(fadeTimer);
        audio.volume = Number(slider.value);
      }
    });
  }
})();
