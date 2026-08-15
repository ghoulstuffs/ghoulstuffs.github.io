/* ═══════════════════════════════════════════════════════════════════
   sound.js — "LAST ONE OUT"
   Slow jazz for an office after everyone's gone home.
   82 BPM, D minor, heavily swung. Rhodes, nylon guitar, upright bass,
   brushes on the snare, vinyl underneath it all.

   Written note by note in the Web Audio API — no mp3, no license,
   nothing to load. The harmony is a real eight-bar jazz cycle
   (Dm9 · Gm11 · Cmaj9 · Fmaj7 · Bm7♭5 · E7♭9 · Am9 · A7♭13), and the
   arrangement strips down to piano twice so it isn't one flat loop.

   ── AUTOPLAY ─────────────────────────────────────────────────────
   No browser lets a page make sound before the visitor touches it.
   So the track arms itself and starts on their first click, tap, key
   or scroll, and there's a visible SOUND button.

   ── USING YOUR OWN TRACK ─────────────────────────────────────────
   Put an mp3 at audio/theme.mp3 and change one line:
       file: "audio/theme.mp3"
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── SETTINGS ─────────────────────────────────── [EDIT] here ── */
  var SETTINGS = {
    file:    "",     // "audio/theme.mp3" to use your own. Empty = built-in.
    volume:  0.34,   // 0–1. Louder than you'd think, because jazz is quiet.
    fadeIn:  4,      // seconds
    runFor:  178,    // ~3 minutes before it bows out
    fadeOut: 14
  };

  var BPM   = 82;
  var STEP  = 60 / BPM / 4;
  var SWING = 0.23;        // heavy. This is where the shuffle lives.

  /* ── HARMONY ─────────────────────────────────────────────────────
     Rootless voicings — the bass owns the bottom, the Rhodes owns the
     colour. One chord per bar, eight bars, then it turns around. */
  var CHORDS = [
    { k: [53, 57, 60, 64], b: 38 },  // Dm9
    { k: [58, 60, 62, 65], b: 43 },  // Gm11
    { k: [59, 62, 64, 67], b: 36 },  // Cmaj9
    { k: [57, 60, 64, 65], b: 41 },  // Fmaj7
    { k: [57, 59, 62, 65], b: 35 },  // Bm7b5
    { k: [56, 59, 62, 65], b: 40 },  // E7b9   ← the tension
    { k: [55, 59, 60, 64], b: 33 },  // Am9    ← the release
    { k: [55, 59, 61, 65], b: 33 }   // A7b13  ← back to the top
  ];

  /* The tune. Sparse on purpose — the rests are the point. */
  var TUNE = [
    [[0, 81], [6, 84], [10, 81], [11, 79]],
    [[2, 77], [6, 79], [12, 81]],
    [[0, 84], [4, 86], [7, 84], [12, 79]],
    [[0, 81], [6, 77], [10, 76]],
    [[2, 77], [6, 81], [9, 80], [12, 79]],
    [[0, 80], [4, 79], [8, 76], [12, 74]],
    [[0, 76], [5, 79], [8, 81], [13, 84]],
    [[0, 85], [4, 81], [8, 79], [12, 77]]
  ];

  var COMP  = [[2, 7, 11], [0, 6, 13], [3, 8], [2, 9, 14]];   // Rhodes stabs
  var WALK  = [0, 4, 8, 12];                                   // bass, on the beat

  /* ── PLUMBING ─────────────────────────────────────────────────── */
  var ac, master, comp, mix, send, verb, noise, crackle, el;
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
    comp.threshold.value = -20;
    comp.ratio.value = 2.6;
    comp.attack.value = 0.01;
    comp.release.value = 0.28;
    comp.connect(master);

    mix = ac.createGain();
    mix.gain.value = 0.85;
    mix.connect(comp);

    verb = ac.createConvolver();
    verb.buffer = impulse(2.6, 2.6);
    var wet = ac.createGain();
    wet.gain.value = 0.42;
    verb.connect(wet);
    wet.connect(comp);
    send = ac.createGain();
    send.gain.value = 0.55;
    send.connect(verb);

    noise = whiteNoise(2);
    startCrackle();
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

  function noiseAt() {
    var s = ac.createBufferSource();
    s.buffer = noise;
    s.playbackRate.value = 0.75 + Math.random() * 0.5;
    return s;
  }

  /* Vinyl. Not a gimmick — a continuous quiet floor is what makes the
     silences between notes feel like a room instead of a mute button. */
  function startCrackle() {
    var len = Math.floor(ac.sampleRate * 4);
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.05;
      if (Math.random() < 0.00035) d[i] = (Math.random() * 2 - 1) * 0.85;
    }
    crackle = ac.createBufferSource();
    crackle.buffer = buf;
    crackle.loop = true;
    var hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1600;
    var g = ac.createGain(); g.gain.value = 0.09;
    crackle.connect(hp); hp.connect(g); g.connect(mix);
    crackle.start();
  }

  /* ── VOICES ───────────────────────────────────────────────────── */

  // Rhodes. FM at a 1:1 ratio with the index falling away fast is the
  // tine being struck; what rings on underneath is the tone bar.
  function rhodes(t, midi, v, dur) {
    v = v || 1; dur = dur || 2.2;
    var f = mtof(midi);
    var car = ac.createOscillator(), mod = ac.createOscillator();
    var mg = ac.createGain(), g = ac.createGain(), lp = ac.createBiquadFilter();
    var lfo = ac.createOscillator(), lg = ac.createGain();

    car.type = "sine"; mod.type = "sine";
    car.frequency.value = f;
    mod.frequency.value = f;
    mg.gain.setValueAtTime(f * 3.4, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.22);
    mod.connect(mg); mg.connect(car.frequency);

    lp.type = "lowpass";
    lp.frequency.setValueAtTime(4200, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + dur * 0.7);

    lfo.type = "sine"; lfo.frequency.value = 4.6; lg.gain.value = 0.13;
    lfo.connect(lg); lg.connect(g.gain);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.19 * v, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    car.connect(lp); lp.connect(g); g.connect(mix); g.connect(send);
    car.start(t); mod.start(t); lfo.start(t);
    car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }

  // Nylon guitar, by Karplus–Strong: a burst of noise fed into a delay
  // line one wavelength long, filtered a little each time round. That
  // really is how a plucked string decays, which is why it sounds like
  // one instead of like a synth pretending.
  function pluck(t, midi, v, dur) {
    v = v || 1; dur = dur || 1.6;
    var f = mtof(midi);
    var n = noiseAt();
    var burst = ac.createGain();
    var delay = ac.createDelay(0.06);
    var fb = ac.createGain();
    var lp = ac.createBiquadFilter();
    var out = ac.createGain();

    burst.gain.setValueAtTime(v, t);
    burst.gain.setValueAtTime(0, t + 0.004);

    delay.delayTime.value = 1 / f;
    fb.gain.setValueAtTime(0.972, t);
    fb.gain.setValueAtTime(0, t + dur);
    lp.type = "lowpass"; lp.frequency.value = 2600;

    n.connect(burst); burst.connect(delay);
    delay.connect(lp); lp.connect(fb); fb.connect(delay);

    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(0.26 * v, t + 0.008);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    delay.connect(out); out.connect(mix); out.connect(send);

    n.start(t); n.stop(t + 0.05);
  }

  // Upright bass: a short pitch drop at the attack is the finger
  // pulling off the string, and it's most of what makes it read as
  // wood rather than a sine wave.
  function bass(t, midi, dur) {
    dur = dur || 0.62;
    var f = mtof(midi);
    var o = ac.createOscillator(), o2 = ac.createOscillator();
    var o2g = ac.createGain(), lp = ac.createBiquadFilter(), g = ac.createGain();

    o.type = "sine"; o2.type = "triangle";
    o.frequency.setValueAtTime(f * 1.06, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    o2.frequency.setValueAtTime(f * 1.06, t);
    o2.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    o2g.gain.value = 0.5;

    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.2);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42, t + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    o.connect(lp); o2.connect(o2g); o2g.connect(lp);
    lp.connect(g); g.connect(mix);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);

    // fingertip on the string
    var n = noiseAt(), bp = ac.createBiquadFilter(), ng = ac.createGain();
    bp.type = "bandpass"; bp.frequency.value = 900;
    ng.gain.setValueAtTime(0.1, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    n.connect(bp); bp.connect(ng); ng.connect(mix);
    n.start(t); n.stop(t + 0.05);
  }

  function kick(t, v) {
    v = v || 1;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(105, t);
    o.frequency.exponentialRampToValueAtTime(41, t + 0.11);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55 * v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g); g.connect(mix);
    o.start(t); o.stop(t + 0.38);
  }

  // Brush, not a snare hit: a swell of filtered noise that breathes.
  function brush(t, v) {
    v = v || 1;
    var n = noiseAt(), bp = ac.createBiquadFilter(), g = ac.createGain();
    bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = 0.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1 * v, t + 0.07);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    n.connect(bp); bp.connect(g); g.connect(mix); g.connect(send);
    n.start(t); n.stop(t + 0.34);
  }

  function stick(t, v) {
    v = v || 1;
    var n = noiseAt(), bp = ac.createBiquadFilter(), g = ac.createGain();
    bp.type = "bandpass"; bp.frequency.value = 1750; bp.Q.value = 3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3 * v, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    n.connect(bp); bp.connect(g); g.connect(mix); g.connect(send);
    n.start(t); n.stop(t + 0.09);
  }

  function ride(t, v) {
    v = v || 1;
    var n = noiseAt(), hp = ac.createBiquadFilter(), g = ac.createGain();
    hp.type = "highpass"; hp.frequency.value = 6200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.062 * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    n.connect(hp); hp.connect(g); g.connect(mix); g.connect(send);
    n.start(t); n.stop(t + 0.46);
  }

  /* ── ARRANGEMENT ──────────────────────────────────────────────────
     Two deliberate drops to almost nothing, so the loud parts have
     something to be louder than. */
  function partOf(b) {
    if (b < 8)  return "alone";   // Rhodes and bass, nobody else in
    if (b < 24) return "band";
    if (b < 32) return "alone";   // everything falls away
    if (b < 56) return "full";    // guitar takes the tune
    return "band";
  }

  function at(b, s) {
    var t = startedAt + (b * 16 + s) * STEP;
    return (s % 2) ? t + STEP * SWING : t;
  }

  function schedule(b, s) {
    var part = partOf(b);
    var ch = CHORDS[b % 8];
    var t = at(b, s);
    var i;

    // the tune
    var line = TUNE[b % 8];
    for (i = 0; i < line.length; i++) {
      if (line[i][0] !== s) continue;
      if (part === "full") {
        pluck(t, line[i][1], 0.9, 1.5);
        rhodes(t, line[i][1] - 12, 0.5, 1.6);
      } else {
        rhodes(t, line[i][1], part === "alone" ? 0.78 : 1, 1.9);
      }
    }

    // Rhodes comping, always slightly behind the beat
    var pat = COMP[b % 4];
    if (pat.indexOf(s) > -1 && (part !== "alone" || s % 4 === 2)) {
      for (i = 0; i < ch.k.length; i++) {
        rhodes(t, ch.k[i], part === "alone" ? 0.42 : 0.6, 1.5);
      }
    }

    // guitar comps on the offbeat once the band is in
    if (part !== "alone" && (s === 5 || s === 13) && b % 2 === 0) {
      for (i = 1; i < ch.k.length; i++) pluck(t, ch.k[i] + 12, 0.32, 1.1);
    }

    // walking bass
    if (WALK.indexOf(s) > -1) {
      var note = ch.b;
      if (s === 4)  note = ch.b + 7;
      if (s === 8)  note = ch.b + 3;
      if (s === 12) note = CHORDS[(b + 1) % 8].b - 1;   // leads into the next chord
      bass(t, note, part === "alone" ? 0.8 : 0.62);
    }

    // brushes
    if (part === "band" || part === "full") {
      if (s === 0 || s === 8) kick(t, 0.8);
      if (s === 4 || s === 12) stick(t, 0.8);
      if (s === 2 || s === 6 || s === 10 || s === 14) brush(t, 0.85);
      if (s % 4 === 0) ride(t, 1);
      if (part === "full" && (s === 3 || s === 11)) ride(t, 0.55);
      if (b % 8 === 7 && s === 14) { brush(t, 1.2); stick(t, 0.6); }
    }
  }

  /* ── SCHEDULER ────────────────────────────────────────────────── */
  function pump() {
    while (clock < ac.currentTime + 0.16) {
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
        ac.createMediaElementSource(el).connect(comp);
      }
      el.currentTime = 0;
      var p = el.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      bar = 0; step = 0;
      startedAt = ac.currentTime + 0.15;
      clock = startedAt;
      timer = setInterval(pump, 25);
    }

    fade(SETTINGS.volume, SETTINGS.fadeIn);

    setTimeout(function () { if (playing) fade(0.0001, SETTINGS.fadeOut); },
               SETTINGS.runFor * 1000);
    setTimeout(function () { if (playing) stop(); },
               (SETTINGS.runFor + SETTINGS.fadeOut) * 1000);
  }

  function stop() {
    if (!playing) return;
    playing = false;
    fade(0.0001, 0.6);
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

  document.addEventListener("visibilitychange", function () {
    if (!playing || !ac) return;
    fade(document.hidden ? 0.0001 : SETTINGS.volume, 0.6);
  });
})();
