(function () {
  "use strict";

  /* ── SETTINGS ─────────────────────────────────── */
  var SETTINGS = {
    volume:  0.25,   // Lowered to prevent hurting ears
    fadeIn:  3,
    runFor:  180,    // 3 minutes
    fadeOut: 10
  };

  var BPM   = 160;
  var STEP  = 60 / BPM / 4; // Quarter note step
  var SWING = 0.15;        // Slight swing for bounce

  /* ── CHORD PROGRESSION (Upbeat Jazzy Glitch Hop) ── */
  var CHORDS = [
    { root: 57, name: 'A' }, // A Maj
    { root: 62, name: 'D' }, // D Maj
    { root: 64, name: 'E' }, // E Maj
    { root: 57, name: 'A' }  // A Maj
  ];

  /* ── PLUMBING ─────────────────────────────────── */
  var ac, master, comp, mix, send, verb;
  var timer = null, playing = false, armed = true;
  var bar = 0, step = 0, clock = 0, startedAt = 0;

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function build() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = 0.0001;
    master.connect(ac.destination);

    // Stronger compressor to catch any sudden digital peaks
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.ratio.value = 4;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    comp.connect(master);

    mix = ac.createGain();
    mix.gain.value = 0.9;
    mix.connect(comp);

    // Reverb for atmosphere
    verb = ac.createConvolver();
    verb.buffer = impulse(2.0, 2.0);
    var wet = ac.createGain();
    wet.gain.value = 0.35;
    verb.connect(wet);
    wet.connect(comp);
    send = ac.createGain();
    send.gain.value = 0.3;
    send.connect(verb);
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

  /* ── SYNTH INSTRUMENTS ────────────────────────── */

  // Glitch-Hop Piano (Staccato, bright, jazzy)
  function piano(t, midi, v, dur) {
    v = v || 0.8; dur = dur || 0.25;
    var f = mtof(midi);
    var osc = ac.createOscillator();
    var g = ac.createGain();
    var lp = ac.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(f, t);
    
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(v * 0.8, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    lp.type = "lowpass";
    lp.frequency.setValueAtTime(4500, t);
    lp.frequency.exponentialRampToValueAtTime(1800, t + dur);

    osc.connect(lp); lp.connect(g); g.connect(mix); g.connect(send);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  // Warm, Smooth Bass (Using Sine wave to prevent harsh screeching)
  function bass(t, midi, dur) {
    dur = dur || 0.4;
    var f = mtof(midi);
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = "sine"; // Switched to sine so it's warm and deep, not piercing
    osc.frequency.setValueAtTime(f, t);
    
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    var lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 450;

    osc.connect(lp); lp.connect(g); g.connect(mix); g.connect(send);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  // Glitch Percussion (Softer volumes to avoid clipping)
  function kick(t, v) {
    v = v || 0.7;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6 * v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(mix);
    o.start(t); o.stop(t + 0.22);
  }

  function snare(t, v) {
    v = v || 0.35; // Reduced snare volume
    var noise = ac.createBufferSource();
    var buffer = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i=0; i<data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/data.length, 2);
    noise.buffer = buffer;

    var g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = "highpass"; lp.frequency.value = 600;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25 * v, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    noise.connect(lp); lp.connect(g); g.connect(mix); g.connect(send);
    noise.start(t); noise.stop(t + 0.15);
  }

  function hihat(t, v, open) {
    v = v || 0.3;
    var noise = ac.createBufferSource();
    var buffer = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i=0; i<data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/data.length, 1.5);
    noise.buffer = buffer;

    var g = ac.createGain(), lp = ac.createBiquadFilter();
    lp.type = "highpass"; lp.frequency.value = 8000;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.001);
    var length = open ? 0.4 : 0.04;
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    noise.connect(lp); lp.connect(g); g.connect(mix); g.connect(send);
    noise.start(t); noise.stop(t + length + 0.01);
  }

  // ── SCHEDULER ──────────────────────────────────
  function at(b, s) {
    return startedAt + (b * 16 + s) * STEP;
  }

  function schedule(b, s) {
    var t = at(b, s);
    var chord = CHORDS[b % 4];
    var root = chord.root;

    // 1. Melodic Piano
    if (s === 0 || s === 4 || s === 8 || s === 12) {
        piano(t, root + 24 + 4, 0.4, 0.2);
        piano(t + STEP*2, root + 24 + 7, 0.3, 0.1);
    }

    // 2. Staccato Piano Chords
    if (s === 2 || s === 6 || s === 10 || s === 14) {
        piano(t, root, 0.25, 0.1);
        piano(t + 0.005, root + 4, 0.2, 0.1);
        piano(t + 0.01, root + 7, 0.25, 0.1);
    }

    // 3. Walking Bass
    if (s % 2 === 0) {
        var bassNote = root - 12;
        if (s === 4) bassNote = root - 7;
        if (s === 8) bassNote = root - 5;
        if (s === 12) bassNote = root - 12;
        bass(t, bassNote, 0.3);
    }

    // 4. Drums (Removed harsh glitch noises completely)
    if (s === 0) { kick(t, 0.9); hihat(t, 0.7); }
    if (s === 2) { snare(t, 0.8); hihat(t, 0.9); }
    if (s === 4) { kick(t, 0.8); hihat(t, 0.7); }
    if (s === 6) { snare(t, 0.9); }
    if (s === 8) { kick(t, 0.9); hihat(t, 0.7); }
    if (s === 10) { hihat(t, 0.4); }
    if (s === 12) { kick(t, 0.7); snare(t, 0.5); hihat(t, 0.9); }
    if (s === 14) { snare(t, 0.8); }
  }

  function pump() {
    while (clock < ac.currentTime + 0.16) {
      schedule(bar, step);
      step++;
      if (step === 16) { step = 0; bar++; }
      clock = startedAt + (bar * 16 + step) * STEP;
    }
  }

  /* ── TRANSPORT ────────────────────────────────── */
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

    bar = 0; step = 0;
    startedAt = ac.currentTime + 0.15;
    clock = startedAt;
    timer = setInterval(pump, 25);

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
    document.body.classList.remove("is-playing");
    paint();
  }

  /* ── BUTTON ───────────────────────────────────── */
  var btn = document.getElementById("sound");
  function paint() {
    if (!btn) return;
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
    btn.querySelector(".sound__text").textContent = playing ? "Sound on" : "Sound off";
  }
  if (btn) btn.addEventListener("click", function () { armed = false; if (playing) stop(); else start(); });

  function firstTouch(e) {
    if (e.target && e.target.closest && e.target.closest("#sound")) return;
    detach();
    if (armed) start();
  }
  function detach() { ["pointerdown", "keydown", "wheel", "touchstart"].forEach(n => window.removeEventListener(n, firstTouch)); }
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach(n => window.addEventListener(n, firstTouch, { passive: true }));
})();