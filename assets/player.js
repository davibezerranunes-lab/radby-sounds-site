/* Radby Sounds — web player (vanilla, sem dependencias) */
(function () {
  const audio = new Audio();
  audio.preload = "metadata";

  const el = (id) => document.getElementById(id);
  const seek = el("seek"), cur = el("t-cur"), dur = el("t-dur");
  const npTitle = el("np-title"), npArtist = el("np-artist"), npDl = el("np-dl");
  const btnPlay = el("btn-play"), btnPrev = el("btn-prev"), btnNext = el("btn-next");
  const vol = el("vol"), list = el("playlist"), empty = el("empty");
  const gate = el("gate"), gateCode = el("gate-code"), gateBtn = el("gate-btn"), gateErr = el("gate-err");

  const STORE_KEY = "radby_unlocked";
  let tracks = [], index = -1, playing = false, started = false, accessCode = "";

  const ICON_PLAY = "▶", ICON_PAUSE = "❚❚";

  function fmt(s) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ":" + String(r).padStart(2, "0");
  }

  function fileUrl(t) { return "music/" + t.file; }

  function renderList() {
    list.innerHTML = "";
    tracks.forEach((t, i) => {
      const li = document.createElement("li");
      li.innerHTML =
        '<span class="pl-num">' + (i + 1) + "</span>" +
        '<span class="pl-info"><span class="pl-title"></span><br><span class="pl-artist"></span></span>' +
        '<a class="pl-dl" download>Baixar</a>';
      li.querySelector(".pl-title").textContent = t.title;
      li.querySelector(".pl-artist").textContent = t.artist || "";
      const a = li.querySelector(".pl-dl");
      a.href = fileUrl(t);
      a.addEventListener("click", (e) => e.stopPropagation());
      li.addEventListener("click", () => { i === index ? toggle() : load(i, true); });
      list.appendChild(li);
    });
    highlight();
  }

  function highlight() {
    [...list.children].forEach((li, i) => li.classList.toggle("active", i === index));
  }

  function load(i, autoplay) {
    if (i < 0 || i >= tracks.length) return;
    index = i;
    const t = tracks[i];
    audio.src = fileUrl(t);
    npTitle.textContent = t.title;
    npArtist.textContent = t.artist || "";
    npDl.href = fileUrl(t);
    npDl.setAttribute("download", "");
    highlight();
    if (autoplay) play();
  }

  function play() {
    audio.play().then(() => { playing = true; btnPlay.textContent = ICON_PAUSE; })
      .catch(() => { playing = false; btnPlay.textContent = ICON_PLAY; });
  }
  function pause() { audio.pause(); playing = false; btnPlay.textContent = ICON_PLAY; }
  function toggle() { playing ? pause() : (index < 0 ? load(0, true) : play()); }
  function next() { load((index + 1) % tracks.length, true); }
  function prev() { load((index - 1 + tracks.length) % tracks.length, true); }

  btnPlay.addEventListener("click", toggle);
  btnNext.addEventListener("click", () => tracks.length && next());
  btnPrev.addEventListener("click", () => tracks.length && prev());
  audio.addEventListener("ended", () => tracks.length && next());
  audio.addEventListener("pause", () => { playing = false; btnPlay.textContent = ICON_PLAY; });
  audio.addEventListener("play", () => { playing = true; btnPlay.textContent = ICON_PAUSE; });

  seek.addEventListener("input", () => { if (audio.duration) audio.currentTime = seek.value; });
  audio.addEventListener("timeupdate", () => {
    cur.textContent = fmt(audio.currentTime);
    if (audio.duration) { seek.max = audio.duration; seek.value = audio.currentTime; }
  });
  audio.addEventListener("loadedmetadata", () => { dur.textContent = fmt(audio.duration); });

  vol.addEventListener("input", () => { audio.volume = vol.value; });
  audio.volume = 0.9;

  /* --- gate de acesso (codigo uma vez por navegador) --- */
  function unlock() {
    try { localStorage.setItem(STORE_KEY, "1"); } catch (e) {}
    gate.hidden = true;
    if (started) return;
    started = true;
    if (!tracks.length) { empty.hidden = false; return; }
    renderList();
    load(0, false);
  }

  function tryUnlock() {
    const val = (gateCode.value || "").trim().toUpperCase();
    if (val && val === accessCode.toUpperCase()) {
      gateErr.hidden = true;
      unlock();
    } else {
      gateErr.hidden = false;
      gate.classList.remove("shake");
      void gate.offsetWidth;
      gate.classList.add("shake");
      gateCode.value = "";
      gateCode.focus();
    }
  }

  gateBtn.addEventListener("click", tryUnlock);
  gateCode.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });

  /* --- manifest --- */
  fetch("music/manifest.json")
    .then((r) => { if (!r.ok) throw 0; return r.json(); })
    .then((m) => {
      tracks = (m.tracks || []).filter((t) => t && t.file);
      accessCode = String(m.access_code || "").trim();
      let unlocked = false;
      if (!accessCode) unlocked = true;
      else { try { unlocked = localStorage.getItem(STORE_KEY) === "1"; } catch (e) {} }
      if (unlocked) unlock();
      else gate.hidden = false;
    })
    .catch(() => {
      gate.hidden = true;
      empty.hidden = false;
      empty.textContent = "Não foi possível carregar as músicas.";
    });
})();
