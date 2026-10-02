
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
  var light = document.querySelector(".tv-light");
  var channel = document.querySelector(".tv-channel");
  var channelName = document.querySelector(".tv-channel-name");
  var channelLogo = document.querySelector(".tv-channel-logo");
  var powered = document.querySelector(".tv-powered-name");
  if (!door || !light || !channel) {
    return;
  }

  var CHANNELS = [
    { name: "Mimo", href: "https://getmimo.com/invite/inhibz" },
    { name: "twitch.tv/spr1ngchkn", href: "https://www.twitch.tv/spr1ngchkn" },
    { name: "Discord", href: "https://discord.gg/PkWJ9Hkf4" },
    { name: "Buy me a coffee", href: "https://buymeacoffee.com/spr1ngchkn" },
    { name: "Matchburn LUX", href: "../", logo: "../img/match.png", home: true }
  ].filter(function (c) { return c.href; });

  var POWERED = [
    { name: "Anthropic", href: "https://www.anthropic.com/" },
    { name: "SomaFM", href: "https://somafm.com/secretagent/" },
    { name: "Intel", href: "https://www.intel.com/" },
    { name: "NVIDIA", href: "https://www.nvidia.com/" },
    { name: "MSI", href: "https://www.msi.com/" },
    { name: "Corsair", href: "https://www.corsair.com/" },
    { name: "Apple", href: "https://www.apple.com/" },
    { name: "Microsoft", href: "https://www.microsoft.com/" }
  ];

  var CHANNEL_MS = reduceMotion.matches ? 9000 : 4200;
  var POWERED_MS = reduceMotion.matches ? 5000 : 1400;
  var ch = 0;
  var pw = 0;

  function showChannel() {
    var c = CHANNELS[ch];
    channel.href = c.href;
    if (c.home) {
      channel.removeAttribute("target");
      channel.removeAttribute("rel");
    } else {
      channel.target = "_blank";
      channel.rel = "noopener noreferrer";
    }
    channelName.textContent = c.name;
    if (channelLogo) {
      channelLogo.hidden = !c.logo;
      if (c.logo) { channelLogo.src = c.logo; }
    }
    light.setAttribute("data-channel", String(ch % 4));
    var chick = light.querySelector(".tv-chick");
    if (chick) { chick.hidden = !!c.home; }
  }

  function showPowered() {
    var p = POWERED[pw];
    powered.textContent = p.name;
    powered.href = p.href;
  }

  var started = false;
  function openDoor() {
    door.classList.add("is-open");
    light.hidden = false;
    if (started) {
      return;
    }
    started = true;
    showChannel();
    showPowered();
    window.setInterval(function () {
      ch = (ch + 1) % CHANNELS.length;
      showChannel();
    }, CHANNEL_MS);
    window.setInterval(function () {
      pw = (pw + 1) % POWERED.length;
      showPowered();
    }, POWERED_MS);
  }

  var slab = document.querySelector(".door-slab");
  if (slab && !slab.querySelector(".slab-edge")) {
    var edge = document.createElement("div");
    edge.className = "slab-edge";
    edge.setAttribute("aria-hidden", "true");
    slab.appendChild(edge);
  }

  document.addEventListener("se-door-open", openDoor);

  showWalkCue(function () {
    walkAcross({ dir: "left", lettering: MBL_GLASS, silhouette: true, dest: "../", flag: "se-walk" });
  }, "left");
})();
