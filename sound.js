/* ═══════════════════════════════════════════════════════════════════
   sound.js — "SHERBET VAULT"
   Instrumental melodic glitch hop, 108 BPM, F major.
   Written note-by-note in the Web Audio API, so there is no mp3 to
   host, nothing to license, and nothing to load. It just plays.

   ── THE ONE THING TO KNOW ────────────────────────────────────────
   No browser on earth lets a page play sound before the visitor
   touches it. Chrome, Safari and Firefox all block it. So the track
   arms itself and starts on the visitor's first click, tap, key or
   scroll — which is as close to autoplay as the web allows — and
   there's a visible SOUND button so nobody feels ambushed.

   ── SWAPPING IN A REAL TRACK ─────────────────────────────────────
   Generate an mp3 (Suno, Udio, wherever), drop it in the repo at
   audio/theme.mp3, and change ONE line below:
       file: "audio/theme.mp3"
   Everything else — fade in, fade out, the button — keeps working.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── SETTINGS ─────────────────────────────────── [EDIT] here ── */
  var SETTINGS = {
    file:    "",     // "audio/theme.mp3" once you have one. Empty = built-in track.
    volume:  0.30,   // 0 to 1. Background music, so it sits under everything.
    fadeIn:  2.5,    // seconds
    runFor:  168,    // seconds of music before it bows out (2:48)
    fadeOut: 10      // seconds
  };

  /* ── THE COMPOSITION ──────────────────────────────────────────── */
  var BPM = 108;
  var STEP = 60 / BPM / 4;    // one 16th note
  var SWING = 0.17;           // how far the off-16ths lean. This is the bounce.

  // F major, rootless voicings so the chords never crowd the bass.
  // Fmaj9 → Dm9 → B♭maj9 → C13. Sunlit, jazzy, keeps falling forward.
  var CHORDS = [
    { keys: [57, 60, 64, 67], bass: 41 },
    { keys: [53, 57, 60, 64], bass: 38 },
    { keys: [57, 60, 62, 65], bass: 34 },
    { keys: [58, 62, 64, 69], bass: 36 }
  ];

  // The piano hook. Four bars, [16th-note position, note].
  var RIFF = [
    [[0, 84], [3, 81], [6, 79], [7, 81], [10, 84], [14, 86]],
    [[0, 84], [2, 86], [6, 88], [9, 86], [12, 84], [14, 81]],
    [[0, 82], [3, 79], [6, 77], [7, 79], [10, 82], [14, 84]],
    [[0, 84], [4, 81], [6, 79], [10, 77], [12, 76], [13, 77]]
  ];

  var STABS = [[0, 3, 6, 10, 11, 14], [0, 2, 7, 10, 13]];
  var KICKS = [[0, 6, 10], [0, 6, 10, 11]];
  var GHOST = [7, 15];

  /* ── AUDIO PLUMBING ───────────────────────────────────────────── */
  var ac, master, comp, mix, send, verb, noise, el;
  var timer = null, playing = false, armed = true;
  var bar = 0, step = 0, clock = 0, startedAt = 0;

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function build() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    ac = new Ctx();

    master = ac.createGain();
    master.gain.value = 0.0001;
    master.connect(ac.destination);

    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3.4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    comp.connect(master);

    mix = ac.createGain();
    mix.gain.value = 0.9;
    mix.connect(comp);

    // a small room, so the piano isn't sitting in a dry box
    verb = ac.createConvolver();
    verb.buffer = impulse(1.9, 3.2);
    var wet = ac.createGain();
    wet.gain.value = 0.34;
    verb.connect(wet);
    wet.connect(comp);
    send = ac.createGain();
    send.gain.value = 0.5;
    send.connect(verb);

    noise = whiteNoise(2);
  }

  function impulse(secs, decay) {
    var rate = ac.sampleRate, len = Math.floor(rate * secs);
    var buf = ac.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function whiteNoise(secs) {
    var len = Math.floor(ac.sampleRate * secs);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function noiseAt(t) {
    var s = ac.createBufferSource();
    s.buffer = noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    return s;
  }

  /* ── THE VOICES ───────────────────────────────────────────────── */

  // Kick: a sine that falls off a cliff, plus a click of air on top.
  function kick(t, v) {
    v = v || 1;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(148, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.095);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.95 * v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(mix);
    o.start(t); o.stop(t + 0.34);

    var n = noiseAt(t), hp = ac.createBiquadFilter(), ng = ac.createGain();
    hp.type = "highpass"; hp.frequency.value = 1400;
    ng.gain.setValueAtTime(0.22 * v, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
    n.connect(hp); hp.connect(ng); ng.connect(mix);
    n.start(t); n.stop(t + 0.04);
  }

  // Snare: dusty, cracked, sits back a little in the reverb.
  function snare(t, v) {
    v = v || 1;
    var n = noiseAt(t), bp = ac.createBiquadFilter(), g = ac.createGain();
    bp.type = "bandpass"; bp.frequency.value = 1850; bp.Q.value = 0.65;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    n.connect(bp); bp.connect(g); g.connect(mix); g.connect(send);
    n.start(t); n.stop(t + 0.17);

    var o = ac.createOscillator(), og = ac.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(205, t);
    o.frequency.exponentialRampToValueAtTime(148, t + 0.08);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.26 * v, t + 0.003);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(og); og.connect(mix);
    o.start(t); o.stop(t + 0.12);
  }

  function hat(t, v, len) {
    len = len || 0.045;
    var n = noiseAt(t), hp = ac.createBiquadFilter(), g = ac.createGain();
    hp.type = "highpass"; hp.frequency.value = 7600;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15 * v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    n.connect(hp); hp.connect(g); g.connect(mix);
    n.start(t); n.stop(t + len + 0.03);
  }

  // Piano: two-operator FM. The fast-decaying modulator is the hammer
  // hitting the string; what's left ringing underneath is the string.
  function piano(t, midi, v, dur) {
    v = v || 1; dur = dur || 0.3;
    var f = mtof(midi);
    var car = ac.createOscillator(), mod = ac.createOscillator();
    var mg = ac.createGain(), g = ac.createGain(), lp = ac.createBiquadFilter();
    car.type = "sine"; mod.type = "sine";
    car.frequency.value = f;
    mod.frequency.value = f * 3.01;
    mg.gain.setValueAtTime(f * 2.6, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.07, t + 0.09);
    mod.connect(mg); mg.connect(car.frequency);
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(5600, t);
    lp.frequency.exponentialRampToValueAtTime(1500, t + 0.28);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2 * v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(lp); lp.connect(g); g.connect(mix); g.connect(send);
    car.start(t); mod.start(t);
    car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
  }

  // Bass: round, short, elastic. Stays below 300Hz so it never argues
  // with the piano.
  function bass(t, midi, dur) {
    var o = ac.createOscillator(), o2 = ac.createOscillator();
    var o2g = ac.createGain(), lp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = "sine"; o2.type = "triangle";
    o.frequency.value = mtof(midi);
    o2.frequency.value = mtof(midi);
    o2g.gain.value = 0.4;
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1100, t);
    lp.frequency.exponentialRampToValueAtTime(280, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(o2g); o2g.connect(lp);
    lp.connect(g); g.connect(mix);
    o.start(t); o2.start(t);
    o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }

  // Vibraphone: sine plus its fourth harmonic, wobbled. Pastel confetti.
  function vibe(t, midi, v) {
    v = v || 1;
    var f = mtof(midi);
    var o = ac.createOscillator(), h = ac.createOscillator();
    var hg = ac.createGain(), g = ac.createGain();
    var lfo = ac.createOscillator(), lg = ac.createGain();
    o.type = "sine"; h.type = "sine";
    o.frequency.value = f; h.frequency.value = f * 4;
    hg.gain.value = 0.16;
    lfo.type = "sine"; lfo.frequency.value = 5.4; lg.gain.value = 0.35;
    lfo.connect(lg); lg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09 * v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g); h.connect(hg); hg.connect(g);
    g.connect(mix); g.connect(send);
    o.start(t); h.start(t); lfo.start(t);
    o.stop(t + 1.2); h.stop(t + 1.2); lfo.stop(t + 1.2);
  }

  // The glitch: one note retriggered six times, pitching up, gain
  // shrinking. Sounds like the track skipping on purpose.
  function stutter(t, midi) {
    for (var i = 0; i < 6; i++) {
      piano(t + i * STEP / 3, midi + i * 2, 0.9 - i * 0.1, 0.09);
    }
  }

  /* ── THE ARRANGEMENT ──────────────────────────────────────────── */
  function partOf(b) {
    if (b < 4) return "open";        // hook alone, filter shut
    if (b < 8) return "build";       // drums walk in
    if (b >= 24 && b < 28) return "break";
    if (b >= 56 && b < 60) return "break";
    return "full";
  }

  function at(b, s) {
    var t = startedAt + (b * 16 + s) * STEP;
    return (s % 2) ? t + STEP * SWING : t;
  }

  function schedule(b, s) {
    var part = partOf(b);
    var ch = CHORDS[b % 4];
    var t = at(b, s);
    var i;

    // piano hook — always there, it's the spine of the track
    var line = RIFF[b % 4];
    for (i = 0; i < line.length; i++) {
      if (line[i][0] === s) piano(t, line[i][1], part === "open" ? 0.7 : 1, 0.26);
    }

    // chord stabs
    if (part !== "open" && part !== "break") {
      var pat = STABS[(b >> 1) % 2];
      if (pat.indexOf(s) > -1) {
        for (i = 0; i < ch.keys.length; i++) piano(t, ch.keys[i], 0.5, 0.19);
      }
    }

    // drums
    if (part === "build" || part === "full") {
      if (KICKS[b % 2].indexOf(s) > -1) kick(t);
      if (s === 4 || s === 12) snare(t);
      if (GHOST.indexOf(s) > -1) snare(t, 0.22);
      if (s % 2 === 0) hat(t, s % 4 === 0 ? 1 : 0.6);
      if ((b % 4 === 3) && (s === 13 || s === 15)) hat(t, 0.8, 0.03);
    }

    if (part === "break") {
      if (s === 0 || s === 9) kick(t, 0.8);
      if (s === 6) snare(t, 0.7);
      if (s % 3 === 0) hat(t, 0.35, 0.025);
      if (s === 12) stutter(t, ch.keys[3] + 12);
    }

    // bass
    if (part === "full") {
      if (s === 0) bass(t, ch.bass, 0.4);
      if (s === 6) bass(t, ch.bass, 0.22);
      if (s === 10) bass(t, ch.bass + 7, 0.2);
      if (s === 14 && b % 2 === 1) bass(t, ch.bass + 5, 0.16);
    }

    // vibraphone answers the piano in the back half
    if (b >= 28 && part === "full" && s === 8 && b % 2 === 0) {
      vibe(t, ch.keys[2] + 12, 1);
    }
    if (part === "open" && s === 0) vibe(t, ch.keys[1] + 12, 0.7);

    // a tape-zip into every eighth bar
    if (b % 8 === 7 && s === 14 && part === "full") stutter(t, ch.keys[0] + 12);
  }

  /* ── SCHEDULER ────────────────────────────────────────────────── */
  function pump() {
    while (clock < ac.currentTime + 0.14) {
      schedule(bar, step);
      step++;
      if (step === 16) { step = 0; bar++; }
      clock = startedAt + (bar * 16 + step) * STEP;
    }
  }

  /* ── TRANSPORT ────────────────────────────────────────────────── */
  function fade(to, secs) {
    var now = ac.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(Math.max(to, 0.0001), now + secs);
  }

  function start() {
    if (playing) return;
    if (!ac) build();
    if (ac.state === "suspended") ac.resume();

    playing = true;
    document.body.classList.add("is-playing");
    paint();

    if (SETTINGS.file) {
      if (!el) {
        el = new Audio(SETTINGS.file);
        el.loop = true;
        el.crossOrigin = "anonymous";
        var src = ac.createMediaElementSource(el);
        src.connect(comp);
      }
      el.currentTime = 0;
      var p = el.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      bar = 0; step = 0;
      startedAt = ac.currentTime + 0.12;
      clock = startedAt;
      timer = setInterval(pump, 25);
    }

    fade(SETTINGS.volume, SETTINGS.fadeIn);

    // bow out gracefully rather than cutting off
    setTimeout(function () {
      if (playing) fade(0.0001, SETTINGS.fadeOut);
    }, SETTINGS.runFor * 1000);
    setTimeout(function () {
      if (playing) stop();
    }, (SETTINGS.runFor + SETTINGS.fadeOut) * 1000);
  }

  function stop() {
    if (!playing) return;
    playing = false;
    fade(0.0001, 0.4);
    if (timer) { clearInterval(timer); timer = null; }
    if (el) el.pause();
    document.body.classList.remove("is-playing");
    paint();
  }

  /* ── BUTTON ───────────────────────────────────────────────────── */
  var btn = document.getElementById("sound");

  function paint() {
    if (!btn) return;
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
    btn.querySelector(".sound__text").textContent = playing ? "Sound on" : "Sound off";
  }

  if (btn) {
    btn.addEventListener("click", function () {
      armed = false;
      if (playing) stop(); else start();
    });
  }

  // First touch anywhere arms the track — the closest thing to autoplay
  // that browsers permit.
  function firstTouch(e) {
    if (e.target && e.target.closest && e.target.closest("#sound")) return;
    detach();
    if (armed) start();
  }
  function detach() {
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (n) {
      window.removeEventListener(n, firstTouch);
    });
  }
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (n) {
    window.addEventListener(n, firstTouch, { passive: true });
  });

  // drop the volume when the tab goes to the background
  document.addEventListener("visibilitychange", function () {
    if (!playing || !ac) return;
    fade(document.hidden ? 0.0001 : SETTINGS.volume, 0.5);
  });
})();
