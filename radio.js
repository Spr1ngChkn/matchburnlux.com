
(function () {
  "use strict";

  var radio = document.querySelector(".radio");
  if (!radio) { return; }

  var STREAMS = [
    "https://ice2.somafm.com/secretagent-128-mp3",
    "https://ice6.somafm.com/secretagent-128-mp3",
    "https://ice5.somafm.com/secretagent-128-mp3"
  ];
  var SONGS = "https://somafm.com/songs/secretagent.json";
  var VOLUME = 0.35;
  var FADE_MS = 1500;

  var playBtn = radio.querySelector(".radio-play");
  var stopBtn = radio.querySelector(".radio-stop");
  var slider = radio.querySelector(".radio-volume");
  var nowEl = radio.querySelector(".radio-now");
  var audio = null;
  var which = 0;
  var pollTimer = null;
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

  function pollSong() {
    if (!window.fetch) { return; }
    fetch(SONGS, { cache: "no-store" }).then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (data) {
      var s = data && data.songs && data.songs[0];
      if (s && audio && !audio.paused) {
        setNow(s.artist + " — " + s.title);
      }
    }).catch(function () {  });
  }

  function play() {
    if (!audio) {
      audio = new Audio();
      audio.preload = "none";
      audio.addEventListener("error", function () {
        which += 1;
        if (which < STREAMS.length) {
          audio.src = STREAMS[which];
          audio.play().catch(function () {});
        } else {
          which = 0;
          setNow("The station isn't answering. Try again in a moment.");
          stopped();
        }
      });
    }
    audio.src = STREAMS[which];
    audio.volume = 0;
    setNow("Tuning in…");
    audio.play().then(function () {
      fadeTo(slider ? Number(slider.value) : VOLUME);
      playBtn.hidden = true;
      stopBtn.hidden = false;
      radio.classList.add("is-on");
      pollSong();
      pollTimer = window.setInterval(pollSong, 30000);
    }).catch(function () {
      setNow("Press play to tune in.");
    });
  }

  function stopped() {
    window.clearInterval(pollTimer);
    playBtn.hidden = false;
    stopBtn.hidden = true;
    radio.classList.remove("is-on");
  }

  function stop() {
    if (!audio) { return; }
    fadeTo(0, function () {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setNow("Secret Agent, on SomaFM");
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
