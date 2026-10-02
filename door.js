

if (window.location.protocol === "http:" && !/^(127\.0\.0\.1|localhost)$/.test(window.location.hostname)) {
  window.location.replace("https://" + window.location.host + window.location.pathname + window.location.search + window.location.hash);
}

var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

var SE_DOOR = document.body && document.body.getAttribute("data-door") === "se";
var DOOR_BASE = (document.currentScript && document.currentScript.src.replace(/door\.js(\?.*)?$/, "")) || "";

function showWalkCue(onWalk, side) {
  var left = side === "left";
  var hallway = document.querySelector(".hallway");
  if (!hallway || hallway.querySelector(left ? ".walk-cue--left" : ".walk-cue:not(.walk-cue--left)")) {
    return;
  }
  var cue = document.createElement("button");
  cue.type = "button";
  cue.className = left ? "walk-cue walk-cue--left" : "walk-cue";
  cue.setAttribute("aria-label", left ? "Walk back up the hall" : "Walk on down the hall");
  var icon = document.createElement("img");
  icon.className = "walk-cue-icon";
  icon.src = DOOR_BASE + (left ? "img/walk-left.svg" : "img/walk.svg");
  icon.alt = "";
  cue.appendChild(icon);
  hallway.appendChild(cue);
  var gone = false;
  function go(e) {
    if (gone) {
      return;
    }
    gone = true;
    if (e && e.pointerType === "touch") {
      var img = document.createElement("img");
      img.src = DOOR_BASE + (left ? "img/walk-left.svg" : "img/walk.svg");
      img.alt = "";
      img.className = "touch-icon touch-walk";
      img.style.left = e.clientX + "px";
      img.style.top = e.clientY + "px";
      document.body.appendChild(img);
      window.setTimeout(function () { img.remove(); }, 900);
    }
    cue.classList.add("is-gone");
    window.setTimeout(function () { cue.remove(); }, 600);
    onWalk();
  }
  cue.addEventListener("pointerup", go);
  cue.addEventListener("click", function () { go(null); });
  window.setTimeout(function () { cue.classList.add("is-shown"); }, 50);
  if (left) {
    var idleTimer = window.setTimeout(function () { cue.classList.add("is-idle"); }, 3000);
    cue.addEventListener("pointerenter", function () {
      window.clearTimeout(idleTimer);
      cue.classList.remove("is-idle");
    });
    cue.addEventListener("pointerleave", function () {
      idleTimer = window.setTimeout(function () { cue.classList.add("is-idle"); }, 900);
    });
    cue.addEventListener("focus", function () { cue.classList.remove("is-idle"); });
  }
}

function walkAcross(o) {
  var walk = Hallway.footsteps(5200) || 5200;
  Hallway.player.stop();
  document.dispatchEvent(new CustomEvent("hall-walk"));
  try { sessionStorage.setItem(o.flag, "1"); } catch (err) {  }
  var hallway = document.querySelector(".hallway");
  if (hallway) {
    hallway.style.setProperty("--walk-ms", walk + "ms");
    hallway.style.setProperty("--step-ms", "860ms");
    hallway.style.setProperty("--steps", String(Math.round(walk / 860)));
    hallway.classList.remove("is-arriving");
    var realDoor = hallway.querySelector(".door:not(.door-ghost)");
    if (realDoor && !reduceMotion.matches) {
      var ghost = realDoor.cloneNode(true);
      ghost.classList.remove("is-open");
      ghost.classList.add("door-ghost");
      if (o.dir === "left") {
        ghost.classList.add("door-ghost--from-left");
      }
      ghost.setAttribute("aria-hidden", "true");
      ghost.removeAttribute("aria-label");
      ghost.querySelectorAll("[id]").forEach(function (el) { el.removeAttribute("id"); });
      ghost.querySelectorAll("button, .glass-silhouette, .under-door-floor, .tv-light, .tv-glow, .slab-edge").forEach(function (el) { el.remove(); });
      var glass = ghost.querySelector(".glass");
      var lettering = ghost.querySelector(".glass-lettering");
      if (lettering) {
        lettering.innerHTML = o.lettering;
      }
      if (o.dir === "right" && glass && !glass.querySelector(".tv-glow")) {
        var glow = document.createElement("div");
        glow.className = "tv-glow";
        glow.innerHTML = "<span></span><span></span><span></span><span></span>";
        glass.insertBefore(glow, glass.querySelector(".glass-frost"));
      }
      if (o.silhouette && glass) {
        var sil = document.createElement("div");
        sil.className = "glass-silhouette";
        glass.insertBefore(sil, glass.firstChild);
      }
      ghost.style.left = realDoor.offsetLeft + "px";
      ghost.style.top = realDoor.offsetTop + "px";
      ghost.style.width = realDoor.offsetWidth + "px";
      hallway.appendChild(ghost);
    }
    hallway.classList.add(o.dir === "left" ? "is-walking-back" : "is-leaving");
  }
  window.setTimeout(function () {
    window.location.href = o.dest;
  }, walk + 150);
}

var SE_GLASS = '<div class="glass-top"><img class="se-glass-logo" src="' + DOOR_BASE + 'img/se-chick.png" alt="">' +
  '<h1 class="wordmark"><span class="gold-leaf ghost-name">Spr1ngChkn</span>' +
  '<span class="gold-leaf ghost-ent">Enterprises</span></h1></div><hr class="glass-line ghost-line">' +
  '<div class="glass-bottom"><p class="gold-leaf glass-below ghost-tag">Game. Tech. Code.</p></div>';
var MBL_GLASS = '<div class="glass-top"><h1 class="wordmark"><span class="wordmark-line gold-leaf">Matchburn</span>' +
  '<span class="wordmark-line wordmark-line--lux gold-leaf">LUX</span></h1>' +
  '<p class="gold-leaf glass-above">Creative Consultant</p></div><hr class="glass-line">' +
  '<div class="glass-bottom"><p class="gold-leaf glass-below">Technical Services</p></div>';

var Hallway = (function () {
  "use strict";

  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  var ctx = null;
  var master = null;
  var muted = false;
  var phono = null;

  function unlock() {
    if (ctx) {
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      return true;
    }
    if (!AudioCtx) {
      return false;
    }
    ctx = new AudioCtx();
    ctx.resume();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;

    var compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 24;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.25;
    var warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 6000;
    warmth.Q.value = 0.4;

    master.connect(compressor);
    compressor.connect(warmth);
    warmth.connect(ctx.destination);
    return true;
  }

  function ready() {
    return !!ctx && !muted;
  }

  function toggleMuted() {
    if (!ctx) {
      unlock();
      muted = false;
      play();
      return muted;
    }
    muted = !muted;
    var now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.5);
    return muted;
  }

  function noiseBuffer(seconds) {
    var buf = ctx.createBuffer(1, Math.max(1, Math.round(ctx.sampleRate * seconds)), ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  var roomConvolver = null;
  function room() {
    if (roomConvolver) {
      return roomConvolver;
    }
    var len = Math.round(ctx.sampleRate * 2.6);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.6 * Math.pow(1 - i / len, 3.2);
    }
    [0.011, 0.019, 0.031, 0.043, 0.058, 0.077].forEach(function (sec, k) {
      data[Math.round(sec * ctx.sampleRate)] += (k % 2 ? -1 : 1) * (0.9 - k * 0.12);
    });
    roomConvolver = ctx.createConvolver();
    roomConvolver.buffer = buf;
    var wet = ctx.createGain();
    wet.gain.value = 0.42;
    roomConvolver.connect(wet);
    wet.connect(master);
    return roomConvolver;
  }

  function burst(opts) {
    if (!ready()) {
      return;
    }
    var dur = opts.duration || 0.05;
    var t0 = ctx.currentTime + (opts.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.02);
    var filter = ctx.createBiquadFilter();
    filter.type = opts.filterType || "bandpass";
    filter.frequency.value = opts.freq || 2000;
    filter.Q.value = opts.q || 1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain || 0.3, t0 + (opts.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    if (opts.toRoom) {
      var send = ctx.createGain();
      send.gain.value = opts.toRoom;
      filter.connect(send);
      send.connect(room());
    }
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  }

  function tone(opts) {
    if (!ready()) {
      return;
    }
    var dur = opts.duration || 0.15;
    var t0 = ctx.currentTime + (opts.delay || 0);
    var osc = ctx.createOscillator();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.freq || 800, t0);
    if (opts.freqTo) {
      osc.frequency.exponentialRampToValueAtTime(opts.freqTo, t0 + dur);
    }
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain || 0.2, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function sweep(opts) {
    if (!ready()) {
      return;
    }
    var dur = opts.duration || 0.7;
    var t0 = ctx.currentTime + (opts.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur + 0.05);
    var filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(opts.from, t0);
    filter.frequency.linearRampToValueAtTime(opts.to, t0 + dur * 0.65);
    filter.frequency.linearRampToValueAtTime(opts.from * 0.85, t0 + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(opts.gain || 0.16, t0 + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  function footsteps(totalMs) {
    if (!ready()) {
      return;
    }
    var stepMs = 860;
    var steps = Math.max(1, Math.round(totalMs / stepMs));
    var at = 0;
    for (var i = 0; i < steps; i++) {
      (function (i, at) {
        var t = steps > 1 ? i / (steps - 1) : 1;
        var level = 0.06 + t * 0.6;
        var bright = 500 + t * 1900;
        window.setTimeout(function () {
          burst({ duration: 0.06, filterType: "lowpass", freq: bright, q: 0.6, gain: level * 0.8, attack: 0.012, toRoom: 0.5 });
          burst({ duration: 0.13, filterType: "lowpass", freq: 150 + t * 110, q: 0.7, gain: level * 1.35, attack: 0.01, toRoom: 0.35 });
          burst({ duration: 0.09, filterType: "lowpass", freq: bright * 0.4, gain: level * 0.55, attack: 0.015, delay: 0.07, toRoom: 0.45 });
        }, at);
      })(i, at);
      at += stepMs * (i % 2 ? 1.04 : 0.96);
    }
    var turnAt = at + stepMs * 0.45;
    window.setTimeout(function () {
      sweep({ from: 1400, to: 2600, duration: 0.45, gain: 0.05 });
      burst({ duration: 0.12, filterType: "lowpass", freq: 900, q: 0.5, gain: 0.08, attack: 0.03, delay: 0.1 });
    }, turnAt);
    window.setTimeout(function () {
      burst({ duration: 0.08, filterType: "lowpass", freq: 1500, q: 0.6, gain: 0.34, attack: 0.02, toRoom: 0.4 });
      burst({ duration: 0.16, filterType: "lowpass", freq: 230, q: 0.7, gain: 0.55, attack: 0.02, toRoom: 0.3 });
      burst({ duration: 0.2, filterType: "bandpass", freq: 700, q: 0.8, gain: 0.07, attack: 0.05, delay: 0.1 });
    }, turnAt + stepMs * 0.75);
    return turnAt + stepMs * 0.75 + 300;
  }

  var PLAYLIST = [
    { file: "jelly-bean-blues-1924.mp3", artist: "Ma Rainey & Her Georgia Band (with Louis Armstrong)", title: "Jelly Bean Blues", year: 1924 },
    { file: "downhearted-blues-1923.mp3", artist: "Bessie Smith", title: "Downhearted Blues", year: 1923 },
    { file: "crazy-blues-1920.mp3", artist: "Mamie Smith & Her Jazz Hounds", title: "Crazy Blues", year: 1920 },
    { file: "gulf-coast-blues-1923.mp3", artist: "Bessie Smith", title: "Gulf Coast Blues", year: 1923 },
    { file: "downhearted-blues-1922-alberta-hunter.mp3", artist: "Alberta Hunter", title: "Downhearted Blues", year: 1922 },
  ];
  var SHUFFLE = false;
  if (SHUFFLE) {
    for (var s = PLAYLIST.length - 1; s > 0; s--) {
      var r = Math.floor(Math.random() * (s + 1));
      var tmp = PLAYLIST[s]; PLAYLIST[s] = PLAYLIST[r]; PLAYLIST[r] = tmp;
    }
  }
  var trackIndex = 0;
  var playing = false;
  var onTrack = null;

  function crackleBuffer() {
    var seconds = 7;
    var buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) {
      var r = Math.random();
      if (r < 0.0006) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      } else if (r < 0.00065) {
        for (var k = 0; k < 40 && i + k < data.length; k++) {
          data[i + k] = (Math.random() * 2 - 1) * Math.exp(-k / 8);
        }
      }
    }
    return buf;
  }

  var BEHIND_DOOR_LEVEL = 0.15;
  var BEHIND_DOOR_CUTOFF = 1700;

  function buildPhonograph() {
    if (phono) {
      return phono;
    }
    var layer = function (buf, type, freq, level) {
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      var filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      var g = ctx.createGain();
      g.gain.value = level;
      src.connect(filter);
      filter.connect(g);
      src.start();
      return g;
    };
    var hissGain = layer(noiseBuffer(3), "bandpass", 1500, 0.018);
    var crackleGain = layer(crackleBuffer(), "highpass", 700, 0.38);
    var rumbleGain = layer(noiseBuffer(3), "lowpass", 90, 0.2);

    var audioEl = new Audio();
    audioEl.loop = false;
    audioEl.preload = "none";
    var needle = ctx.createMediaElementSource(audioEl);
    var recordGain = ctx.createGain();
    recordGain.gain.value = 1;
    needle.connect(recordGain);

    var distanceFilter = ctx.createBiquadFilter();
    distanceFilter.type = "lowpass";
    distanceFilter.frequency.value = 500;
    var level = ctx.createGain();
    level.gain.value = 0;

    hissGain.connect(distanceFilter);
    crackleGain.connect(distanceFilter);
    rumbleGain.connect(distanceFilter);
    recordGain.connect(distanceFilter);
    distanceFilter.connect(level);
    level.connect(master);

    audioEl.addEventListener("ended", function () {
      next();
    });

    phono = { audio: audioEl, level: level, distanceFilter: distanceFilter, recordGain: recordGain };
    return phono;
  }

  function currentTrack() {
    return PLAYLIST[trackIndex];
  }

  function loadTrack(index, autoplay) {
    trackIndex = ((index % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
    var p = buildPhonograph();
    p.audio.pause();
    p.audio.src = "audio/" + PLAYLIST[trackIndex].file;
    p.audio.currentTime = 0;
    if (autoplay) {
      p.audio.play();
    }
    if (onTrack) {
      onTrack(currentTrack());
    }
  }

  function play() {
    if (!ctx && !unlock()) {
      return;
    }
    var p = buildPhonograph();
    if (!p.audio.src) {
      loadTrack(trackIndex, false);
    }
    playing = true;
    p.audio.play();
    var now = ctx.currentTime;
    p.level.gain.cancelScheduledValues(now);
    p.level.gain.setValueAtTime(p.level.gain.value, now);
    p.level.gain.linearRampToValueAtTime(BEHIND_DOOR_LEVEL, now + 0.8);
    p.distanceFilter.frequency.setValueAtTime(BEHIND_DOOR_CUTOFF, now);
  }

  function stop() {
    if (!ctx) {
      return;
    }
    playing = false;
    var p = buildPhonograph();
    var now = ctx.currentTime;
    p.level.gain.cancelScheduledValues(now);
    p.level.gain.setValueAtTime(p.level.gain.value, now);
    p.level.gain.linearRampToValueAtTime(0.0001, now + 0.9);
    window.setTimeout(function () {
      if (!playing) {
        p.audio.pause();
      }
    }, 900);
  }

  function next() {
    loadTrack(trackIndex + 1, playing);
  }

  function phonographArrive(ms) {
    if (!ready()) {
      return;
    }
    loadTrack(trackIndex, true);
    playing = true;
    var p = buildPhonograph();
    var now = ctx.currentTime;
    var secs = ms / 1000;
    var NEEDLE_S = 1.4;
    var SWELL_S = 3.2;
    function sCurve(from, to, n) {
      var c = new Float32Array(n);
      for (var i = 0; i < n; i++) {
        var x = i / (n - 1);
        c[i] = from + (to - from) * (0.5 - 0.5 * Math.cos(Math.PI * x));
      }
      return c;
    }
    p.level.gain.cancelScheduledValues(now);
    p.level.gain.setValueCurveAtTime(sCurve(0.0001, BEHIND_DOOR_LEVEL, 64), now + 0.2, Math.max(0.5, secs - 0.2));
    p.recordGain.gain.cancelScheduledValues(now);
    p.recordGain.gain.setValueAtTime(0, now);
    p.recordGain.gain.setValueCurveAtTime(sCurve(0, 1, 64), now + NEEDLE_S, SWELL_S);
    p.distanceFilter.frequency.setValueAtTime(280, now);
    p.distanceFilter.frequency.exponentialRampToValueAtTime(BEHIND_DOOR_CUTOFF, now + secs);
  }

  function playVoice(name) {
  }

  var SFX_BOOST = 1.8;
  function loud(o) {
    var c = {};
    for (var k in o) { c[k] = o[k]; }
    c.gain = Math.min(0.95, (o.gain || 0.2) * SFX_BOOST);
    return c;
  }

  return {
    unlock: unlock,
    ready: ready,
    toggleMuted: toggleMuted,
    isMuted: function () { return muted; },
    burst: function (o) { return burst(loud(o)); },
    tone: function (o) { return tone(loud(o)); },
    sweep: function (o) { return sweep(loud(o)); },
    footsteps: footsteps,
    phonographArrive: phonographArrive,
    playVoice: playVoice,
    player: {
      play: play,
      stop: stop,
      next: next,
      current: currentTrack,
      isPlaying: function () { return playing; },
      onTrackChange: function (fn) { onTrack = fn; }
    }
  };
})();

(function () {
  "use strict";

  document.documentElement.classList.add("js");

  function pause(ms) {
    return reduceMotion.matches ? 0 : ms;
  }

  document.querySelectorAll("form.list-signup").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var hp = form.querySelector("#list-website");
      if (hp && hp.value !== "") {
        e.preventDefault();
      }
    });
  });

  var lamp = document.querySelector(".lamp");

  function scheduleFlicker() {
    var wait = 7000 + Math.random() * 11000;
    window.setTimeout(flicker, wait);
  }

  function flicker() {
    if (!reduceMotion.matches) {
      lamp.classList.add("is-flickering");
      window.setTimeout(function () {
        lamp.classList.remove("is-flickering");
      }, 90);

      if (Math.random() < 0.33) {
        window.setTimeout(function () {
          lamp.classList.add("is-flickering");
        }, 180);
        window.setTimeout(function () {
          lamp.classList.remove("is-flickering");
        }, 250);
      }
    }
    scheduleFlicker();
  }

  if (lamp) {
    scheduleFlicker();
  }

  var doorSlab      = document.querySelector(".door-slab");
  var knockLow       = document.querySelector(".knock-zone--low");
  var knockHigh      = document.querySelector(".knock-zone--high");
  var handle         = document.querySelector(".handle");
  var notice         = document.querySelector(".knock-notice");
  var lowerPanel     = document.querySelector(".lower-panel");
  var card           = document.getElementById("contact");
  var cardName       = document.getElementById("card-name");
  var brochure       = document.getElementById("brochure");
  var underDoor      = document.querySelector(".under-door");
  var brochureName   = document.getElementById("brochure-name");
  var plate          = document.querySelector(".appointment-plate");
  var plateForm      = document.querySelector(".appointment-form");
  var plateInput     = document.getElementById("appointment-password");
  var plateRefusal   = document.querySelector(".appointment-refusal");
  var plateClose     = document.querySelector(".appointment-close");

  if (!doorSlab || !knockLow || !knockHigh || !handle || !card || !brochure || !plate) {
    return;
  }

  var busy = false;

  knockLow.hidden = false;
  knockHigh.hidden = false;
  plate.hidden = false;

  handle.removeAttribute("aria-hidden");
  handle.setAttribute("role", "button");
  handle.setAttribute("tabindex", "0");
  handle.setAttribute("aria-label", SE_DOOR ? "Open the door" : "Try the handle: by appointment only");

  function anyPanelOpen() {
    return card.classList.contains("is-open") || brochure.classList.contains("is-open");
  }

  function anyOverlayOpen() {
    return anyPanelOpen() || plate.classList.contains("is-open");
  }

  function openOverlay(el, focusTarget) {
    el.classList.add("is-open");
    document.body.classList.add("overlay-is-open");
    if (focusTarget) {
      focusTarget.focus({ preventScroll: true });
    }
  }

  function closeOverlay(el, focusTarget) {
    el.classList.remove("is-open");
    if (!anyOverlayOpen()) {
      document.body.classList.remove("overlay-is-open");
    }
    if (focusTarget) {
      focusTarget.focus({ preventScroll: true });
    }
  }

  function showNotice(text) {
    notice.textContent = "";
    var strong = document.createElement("strong");
    strong.textContent = text;
    notice.appendChild(strong);
    notice.classList.add("is-shown");
  }

  function hideNotice() {
    notice.classList.remove("is-shown");
    notice.textContent = "";
  }

  function closeCard() {
    closeOverlay(card, knockHigh);
    lowerPanel.classList.remove("is-delivering");
    hideNotice();
  }

  function closeBrochure() {
    closeOverlay(brochure, knockLow);
    lowerPanel.classList.remove("is-delivering");
    hideNotice();
  }

  function knock(zone) {
    if (busy || anyOverlayOpen()) {
      return;
    }
    busy = true;

    doorSlab.classList.remove("is-knocking");
    void doorSlab.offsetWidth;
    doorSlab.classList.add("is-knocking");

    [45, 342, 639].forEach(function (t, k) {
      var d = pause(t) / 1000;
      if (SE_DOOR) {
        Hallway.burst({ duration: 0.04, filterType: "lowpass", freq: 700, gain: 0.22, delay: d, toRoom: 0.1 });
        Hallway.tone({ freq: [660, 880, 1320][k], type: "square", duration: 0.07, gain: 0.04, delay: d + 0.02 });
        return;
      }
      Hallway.burst({ duration: 0.02, filterType: "highpass", freq: 3200, gain: 0.22, delay: d, toRoom: 0.15 });
      Hallway.tone({ freq: 2400, type: "triangle", duration: 0.12, gain: 0.09, delay: d + 0.01 });
    });

    var message = document.body.getAttribute("data-knock-message") || "you...\nand everyone else, kid";

    window.setTimeout(function () { showNotice(message); }, pause(1000));
    window.setTimeout(function () {
      lowerPanel.classList.add("is-delivering");
    }, pause(1900));
    window.setTimeout(function () {
      if (zone === "low") {
        openOverlay(card, cardName);
      } else if (underDoor) {
        underDoor.classList.add("is-out");
        Hallway.sweep({ duration: 0.7, from: 1200, to: 2600, gain: 0.14 });
        Hallway.playVoice("take-a-number");
      }
      doorSlab.classList.remove("is-knocking");
      busy = false;
    }, pause(2500));
  }

  knockLow.addEventListener("click", function () {
    if (busy || anyOverlayOpen()) {
      return;
    }
    Hallway.burst({ duration: 0.03, filterType: "bandpass", freq: 2200, q: 3, gain: 0.22 });
    Hallway.tone({ freq: 1800, type: "triangle", duration: 0.18, gain: 0.07, delay: 0.02 });
    Hallway.burst({ duration: 0.09, filterType: "lowpass", freq: 500, gain: 0.16, delay: 0.22, toRoom: 0.2 });
    Hallway.playVoice("leave-a-message");
    openOverlay(card, cardName);
  });
  knockHigh.addEventListener("click", function () { knock("high"); });

  if (underDoor) {
    underDoor.hidden = false;
    underDoor.addEventListener("click", function () {
      underDoor.classList.remove("is-out");
      hideNotice();
      openOverlay(brochure, brochureName);
    });
  }

  var cardClose = card.querySelector(".panel-close");
  var brochureClose = brochure.querySelector(".panel-close");
  if (cardClose) {
    cardClose.addEventListener("click", closeCard);
  }
  if (brochureClose) {
    brochureClose.addEventListener("click", closeBrochure);
  }

  document.querySelectorAll('a[href="#contact"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      if (brochure.classList.contains("is-open")) {
        closeBrochure();
      }
      openOverlay(card, cardName);
    });
  });

  document.querySelectorAll('a[href="#brochure"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      if (card.classList.contains("is-open")) {
        closeCard();
      }
      openOverlay(brochure, brochureName);
    });
  });

  if (window.location.hash === "#contact") {
    openOverlay(card, cardName);
  } else if (window.location.hash === "#brochure") {
    openOverlay(brochure, brochureName);
  }

  function openAppointment() {
    if (busy) {
      return;
    }
    if (SE_DOOR) {
      if (anyPanelOpen()) {
        closeCard();
        closeBrochure();
      }
      Hallway.burst({ duration: 0.03, filterType: "highpass", freq: 3600, gain: 0.12 });
      Hallway.tone({ freq: 160, type: "sine", duration: 0.25, gain: 0.16, delay: 0.08 });
      Hallway.sweep({ from: 260, to: 700, duration: 1.2, gain: 0.06, delay: 0.25 });
      document.dispatchEvent(new CustomEvent("se-door-open"));
      return;
    }
    if (anyPanelOpen()) {
      closeCard();
      closeBrochure();
    }
    plateRefusal.textContent = "";
    Hallway.burst({ duration: 0.02, filterType: "highpass", freq: 3500, gain: 0.12 });
    Hallway.burst({ duration: 0.02, filterType: "highpass", freq: 3000, gain: 0.14, delay: 0.09 });
    Hallway.burst({ duration: 0.03, filterType: "highpass", freq: 4000, gain: 0.16, delay: 0.19 });
    Hallway.tone({ freq: 180, type: "sine", duration: 0.2, gain: 0.18, delay: 0.24 });
    [0.42, 0.5, 0.58].forEach(function (d) {
      Hallway.burst({ duration: 0.03, filterType: "bandpass", freq: 2600, q: 2, gain: 0.13, delay: d });
    });
    Hallway.playVoice("may-i-help-you");
    openOverlay(plate, plateInput);
  }

  function closeAppointment() {
    closeOverlay(plate, handle);
    plateRefusal.textContent = "";
  }

  handle.addEventListener("click", openAppointment);
  handle.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openAppointment();
    }
  });

  if (plateClose) {
    plateClose.addEventListener("click", closeAppointment);
  }

  function sha256Hex(text) {
    var bytes = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", bytes).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
    });
  }

  function refuse() {
    plateRefusal.textContent = "The office is locked. By appointment only.";
    if (plateInput) {
      plateInput.value = "";
      plateInput.focus({ preventScroll: true });
    }
  }

  if (plateForm) {
    plateForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var key = window.DOOR_KEY_SHA256;
      var tried = plateInput ? plateInput.value : "";
      if (!tried || !window.crypto || !crypto.subtle) {
        refuse();
        return;
      }
      var DOWN_THE_HALL = "dcdb6f8f6ee863d915d6f56f0d932b66cc0ae57bc15785f67b39c1a8635a74cf";
      sha256Hex(tried.trim().toLowerCase()).then(function (hall) {
        if (hall !== DOWN_THE_HALL) {
          return false;
        }
        plateRefusal.textContent = "Down the hall.";
        window.setTimeout(function () {
          closeAppointment();
          showWalkCue(function () {
            walkAcross({ dir: "right", lettering: SE_GLASS, dest: "Spr1ngChknEnt/", flag: "mbl-walk" });
          });
        }, 900);
        return true;
      }).then(function (walked) {
        if (walked) {
          return null;
        }
        if (!key) {
          refuse();
          return null;
        }
        return sha256Hex(tried);
      }).then(function (hex) {
        if (hex === null || hex === undefined) {
          return;
        }
        if (hex !== key) {
          refuse();
          return;
        }
        Hallway.burst({ duration: 0.03, filterType: "highpass", freq: 3200, gain: 0.14 });
        Hallway.tone({ freq: 140, type: "sine", duration: 0.35, gain: 0.2, delay: 0.12 });
        Hallway.sweep({ from: 300, to: 900, duration: 1.1, gain: 0.08, delay: 0.4 });
        plateRefusal.textContent = "Come in.";
        window.setTimeout(function () {
          window.location.href = "office/";
        }, 1400);
      }, refuse);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") {
      return;
    }
    if (card.classList.contains("is-open")) {
      closeCard();
    } else if (brochure.classList.contains("is-open")) {
      closeBrochure();
    } else if (plate.classList.contains("is-open")) {
      closeAppointment();
    }
  });

})();

(function () {
  "use strict";

  var rfiSend = document.getElementById("rfi-send");
  var rfiNote = document.getElementById("rfi-note");
  var rfiEmail = document.getElementById("rfi-email");
  if (rfiSend && rfiNote) {
    rfiSend.addEventListener("click", function () {
      var hint = document.querySelector(".rfi-hint");
      var text = rfiNote.value.trim();
      var d = rfiSend.dataset;
      if (!text) {
        if (hint) hint.textContent = d.empty || "Write a line or two first, then leave the note.";
        rfiNote.focus();
        return;
      }
      var subject = encodeURIComponent(d.subject || "Request for info (matchburnlux.com)");
      var from = rfiEmail ? rfiEmail.value.trim() : "";
      var body = encodeURIComponent(from ? text + "\n\nReply to: " + from : text);
      window.location.href = "mailto:" + (d.to || "ignite@matchburnlux.com") + "?subject=" + subject + "&body=" + body;
      if (hint) hint.textContent = d.sent || "Your email app should open with the note ready to send.";
    });
  }

})();

(function () {
  "use strict";

  var button = document.querySelector(".sound-switch");
  if (!button) {
    return;
  }
  button.hidden = false;

  function paint() {
    var on = !Hallway.isMuted();
    button.setAttribute("aria-label", on ? "Sound on (press to mute)" : "Sound off (press to unmute)");
    button.setAttribute("aria-pressed", String(on));
  }

  button.addEventListener("click", function () {
    Hallway.toggleMuted();
    paint();
  });

  paint();
})();

(function () {
  "use strict";

  var playBtn = document.getElementById("deck-play");
  var stopBtn = document.getElementById("deck-stop");
  var nextBtn = document.getElementById("deck-next");
  var tickerText = document.getElementById("ticker-text");
  var tickerLive = document.getElementById("ticker-live");
  if (!playBtn || !stopBtn || !nextBtn || !tickerText) {
    return;
  }
  playBtn.hidden = false;
  stopBtn.hidden = false;
  nextBtn.hidden = false;
  tickerText.parentElement.hidden = false;

  function paintTrack(track) {
    var label = track.artist + " · " + track.title + " (" + track.year + ")";
    tickerText.textContent = label + "    —    " + label;
    if (tickerLive) {
      tickerLive.textContent = "Now playing: " + label;
    }
    tickerText.classList.remove("is-scrolling");
    void tickerText.offsetWidth;
    tickerText.classList.add("is-scrolling");
  }

  Hallway.player.onTrackChange(paintTrack);
  paintTrack(Hallway.player.current());

  playBtn.addEventListener("click", function () { Hallway.player.play(); });
  stopBtn.addEventListener("click", function () { Hallway.player.stop(); });
  nextBtn.addEventListener("click", function () { Hallway.player.next(); });
})();

(function () {
  "use strict";

  var gate = document.getElementById("entry-gate");
  if (!gate) {
    return;
  }

  var walkedIn = false;
  try {
    walkedIn = SE_DOOR && sessionStorage.getItem("mbl-walk") === "1";
    sessionStorage.removeItem("mbl-walk");
  } catch (err) {  }
  var walkedBack = false;
  try {
    walkedBack = !SE_DOOR && sessionStorage.getItem("se-walk") === "1";
    sessionStorage.removeItem("se-walk");
  } catch (err) {  }
  if (walkedBack) {
    var wakeBack = function () {
      Hallway.unlock();
      if (!Hallway.player.isPlaying()) {
        Hallway.player.play();
      }
      document.removeEventListener("pointerdown", wakeBack, true);
      document.removeEventListener("keydown", wakeBack, true);
    };
    document.addEventListener("pointerdown", wakeBack, true);
    document.addEventListener("keydown", wakeBack, true);
    return;
  }
  if (walkedIn) {
    document.addEventListener("DOMContentLoaded", function () {
      document.dispatchEvent(new CustomEvent("se-enter"));
    });
    var wake = function () {
      Hallway.unlock();
      if (!document.querySelector(".radio.is-on")) {
        document.dispatchEvent(new CustomEvent("se-enter"));
      }
      document.removeEventListener("pointerdown", wake, true);
      document.removeEventListener("keydown", wake, true);
    };
    document.addEventListener("pointerdown", wake, true);
    document.addEventListener("keydown", wake, true);
    return;
  }
  gate.hidden = false;

  var opened = false;
  var ARRIVAL_MS = 7000;

  function enter() {
    if (opened) {
      return;
    }
    opened = true;
    Hallway.unlock();
    if (SE_DOOR) {
      document.dispatchEvent(new CustomEvent("se-enter"));
    }
    var walkMs = SE_DOOR ? ARRIVAL_MS : (Hallway.footsteps(ARRIVAL_MS) || ARRIVAL_MS);
    if (!SE_DOOR) {
      Hallway.phonographArrive(ARRIVAL_MS);
    }

    var STEP_MS = 860;
    var hallway = document.querySelector(".hallway");
    if (hallway && !reduceMotion.matches) {
      hallway.style.setProperty("--walk-ms", walkMs + "ms");
      hallway.style.setProperty("--step-ms", STEP_MS + "ms");
      hallway.style.setProperty("--steps", String(Math.round(ARRIVAL_MS / STEP_MS)));
      hallway.classList.add("is-arriving");
    }

    var fadeCss = getComputedStyle(gate).getPropertyValue("--gate-fade").trim();
    var fadeMs = parseFloat(fadeCss) * (/ms$/.test(fadeCss) ? 1 : 1000) || 7000;
    if (reduceMotion.matches) { fadeMs = 400; }
    gate.classList.add("is-fading");
    window.setTimeout(function () {
      gate.hidden = true;
    }, fadeMs);
  }

  gate.addEventListener("click", enter);
  gate.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      enter();
    }
  });
})();

(function () {
  "use strict";
  var zones = SE_DOOR ? [
    [".knock-zone--high", DOOR_BASE + "img/se-gamepad.svg", "touch-fist"],
    [".knock-zone--low", DOOR_BASE + "img/se-chat.svg", "touch-letter"],
    [".handle", DOOR_BASE + "img/se-power.svg", "touch-key"]
  ] : [
    [".knock-zone--high", DOOR_BASE + "img/fist.svg", "touch-fist"],
    [".knock-zone--low", DOOR_BASE + "img/letter.svg", "touch-letter"],
    [".handle", DOOR_BASE + "img/key.svg", "touch-key"]
  ];
  zones.forEach(function (z) {
    var el = document.querySelector(z[0]);
    if (!el) {
      return;
    }
    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "touch" && e.pointerType !== "pen") {
        return;
      }
      var img = document.createElement("img");
      img.src = z[1];
      img.alt = "";
      img.className = "touch-icon " + z[2];
      img.style.left = e.clientX + "px";
      img.style.top = e.clientY + "px";
      document.body.appendChild(img);
      window.setTimeout(function () { img.remove(); }, 900);
    });
  });
})();
