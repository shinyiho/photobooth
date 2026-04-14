import { useRef, useState, useCallback } from 'react';

// Song 1: Bouncy Arcade
const SONG_1 = {
  name: 'ARCADE',
  bpm: 140,
  melody: [
    523.25,0.15, 659.25,0.15, 783.99,0.15, 1046.5,0.3, 0,0.1,
    783.99,0.15, 659.25,0.3, 0,0.1,
    587.33,0.15, 698.46,0.15, 880.0,0.15, 783.99,0.3, 0,0.1,
    659.25,0.15, 523.25,0.3, 0,0.1,
    783.99,0.1, 880.0,0.1, 987.77,0.1, 1046.5,0.25,
    987.77,0.1, 880.0,0.1, 783.99,0.25, 0,0.15,
    659.25,0.15, 698.46,0.15, 659.25,0.15, 523.25,0.15,
    392.0,0.15, 523.25,0.4, 0,0.3,
  ],
  bass: [
    130.81,0.4, 0,0.1, 130.81,0.2, 164.81,0.4, 0,0.1,
    146.83,0.2, 130.81,0.4, 0,0.1, 196.0,0.2,
    174.61,0.4, 0,0.1, 130.81,0.4, 0,0.2,
  ],
};

// Song 2: Dreamy Waltz
const SONG_2 = {
  name: 'DREAM',
  bpm: 100,
  melody: [
    659.25,0.3, 783.99,0.3, 880.0,0.6, 0,0.15,
    783.99,0.3, 659.25,0.3, 587.33,0.6, 0,0.15,
    523.25,0.3, 587.33,0.3, 659.25,0.3, 783.99,0.3,
    880.0,0.6, 783.99,0.6, 0,0.15,
    1046.5,0.3, 987.77,0.3, 880.0,0.6, 0,0.15,
    783.99,0.3, 659.25,0.3, 523.25,0.6, 0,0.3,
  ],
  bass: [
    130.81,0.6, 196.0,0.3, 164.81,0.6, 196.0,0.3,
    174.61,0.6, 196.0,0.3, 130.81,0.6, 0,0.3,
  ],
};

// Song 3: Funky Beat
const SONG_3 = {
  name: 'FUNKY',
  bpm: 120,
  melody: [
    392.0,0.1, 440.0,0.1, 523.25,0.2, 0,0.05,
    523.25,0.1, 587.33,0.1, 659.25,0.2, 0,0.05,
    783.99,0.15, 659.25,0.1, 587.33,0.1, 523.25,0.2, 0,0.1,
    440.0,0.1, 392.0,0.1, 349.23,0.2, 392.0,0.3, 0,0.1,
    523.25,0.1, 523.25,0.1, 659.25,0.15, 587.33,0.15,
    523.25,0.2, 0,0.05, 440.0,0.1, 392.0,0.15,
    349.23,0.15, 392.0,0.3, 0,0.2,
  ],
  bass: [
    98.0,0.2, 0,0.05, 98.0,0.1, 130.81,0.2, 0,0.05,
    110.0,0.2, 0,0.05, 110.0,0.1, 146.83,0.2, 0,0.05,
    116.54,0.2, 0,0.05, 116.54,0.1, 130.81,0.2, 0,0.05,
    98.0,0.3, 0,0.15,
  ],
};

// Song 4: Kawaii Pop — cute bouncy J-pop
const SONG_4 = {
  name: 'KAWAII',
  bpm: 150,
  melody: [
    783.99,0.12, 880.0,0.12, 1046.5,0.12, 880.0,0.12, 783.99,0.24, 0,0.06,
    659.25,0.12, 783.99,0.12, 880.0,0.24, 783.99,0.12, 659.25,0.24, 0,0.06,
    523.25,0.12, 659.25,0.12, 783.99,0.12, 1046.5,0.24,
    987.77,0.12, 880.0,0.12, 783.99,0.24, 0,0.06,
    880.0,0.12, 783.99,0.12, 659.25,0.12, 783.99,0.12,
    880.0,0.24, 1046.5,0.36, 0,0.24,
  ],
  bass: [
    196.0,0.24, 0,0.06, 196.0,0.12, 261.63,0.24, 0,0.06,
    220.0,0.24, 0,0.06, 220.0,0.12, 261.63,0.24, 0,0.06,
    174.61,0.24, 0,0.06, 196.0,0.12, 261.63,0.36, 0,0.12,
  ],
};

// Song 5: Chill Lo-fi — slow mellow
const SONG_5 = {
  name: 'LOFI',
  bpm: 80,
  melody: [
    523.25,0.4, 493.88,0.4, 440.0,0.4, 392.0,0.4, 0,0.2,
    440.0,0.4, 493.88,0.2, 523.25,0.6, 0,0.2,
    587.33,0.4, 523.25,0.4, 493.88,0.2, 440.0,0.6, 0,0.2,
    392.0,0.4, 440.0,0.4, 523.25,0.8, 0,0.4,
  ],
  bass: [
    130.81,0.6, 0,0.2, 146.83,0.6, 0,0.2,
    110.0,0.6, 0,0.2, 130.81,0.6, 0,0.4,
  ],
};

// Song 6: Retro Disco — groovy bassline
const SONG_6 = {
  name: 'DISCO',
  bpm: 115,
  melody: [
    659.25,0.15, 0,0.05, 659.25,0.15, 783.99,0.15, 880.0,0.3, 0,0.1,
    783.99,0.15, 659.25,0.15, 587.33,0.15, 659.25,0.3, 0,0.1,
    880.0,0.15, 0,0.05, 880.0,0.15, 1046.5,0.15, 987.77,0.3, 0,0.1,
    880.0,0.15, 783.99,0.15, 659.25,0.15, 587.33,0.3, 0,0.2,
  ],
  bass: [
    146.83,0.15, 0,0.05, 146.83,0.15, 0,0.05, 196.0,0.15, 0,0.05,
    146.83,0.15, 0,0.05, 174.61,0.15, 0,0.05, 130.81,0.15, 0,0.05,
    146.83,0.15, 0,0.05, 196.0,0.3, 0,0.1,
  ],
};

// Song 7: Space Synth — ethereal arpeggios
const SONG_7 = {
  name: 'SPACE',
  bpm: 90,
  melody: [
    261.63,0.2, 329.63,0.2, 392.0,0.2, 523.25,0.2,
    392.0,0.2, 329.63,0.2, 261.63,0.4, 0,0.2,
    293.66,0.2, 349.23,0.2, 440.0,0.2, 587.33,0.2,
    440.0,0.2, 349.23,0.2, 293.66,0.4, 0,0.2,
    329.63,0.2, 392.0,0.2, 493.88,0.2, 659.25,0.2,
    493.88,0.2, 392.0,0.2, 329.63,0.4, 0,0.4,
  ],
  bass: [
    65.41,0.8, 0,0.2, 73.42,0.8, 0,0.2,
    82.41,0.8, 0,0.4,
  ],
};

// Song 8: Purikura Jingle — short cute loop
const SONG_8 = {
  name: 'PURI',
  bpm: 160,
  melody: [
    1046.5,0.1, 987.77,0.1, 880.0,0.1, 783.99,0.2, 0,0.05,
    880.0,0.1, 987.77,0.1, 1046.5,0.2, 1174.66,0.3, 0,0.1,
    1046.5,0.1, 880.0,0.1, 783.99,0.1, 659.25,0.2, 0,0.05,
    783.99,0.1, 880.0,0.1, 783.99,0.2, 659.25,0.3, 0,0.1,
    783.99,0.1, 880.0,0.1, 1046.5,0.1, 1174.66,0.1,
    1318.51,0.3, 1046.5,0.3, 0,0.2,
  ],
  bass: [
    196.0,0.2, 0,0.05, 261.63,0.2, 0,0.05,
    220.0,0.2, 0,0.05, 261.63,0.2, 0,0.05,
    196.0,0.2, 0,0.05, 261.63,0.3, 0,0.15,
  ],
};

const SONGS = [SONG_1, SONG_2, SONG_3, SONG_4, SONG_5, SONG_6, SONG_7, SONG_8];

function parsePairs(arr) {
  const notes = [];
  for (let i = 0; i < arr.length; i += 2) {
    notes.push({ note: arr[i], dur: arr[i + 1] });
  }
  return notes;
}

function getDuration(notes) {
  return notes.reduce((sum, n) => sum + n.dur, 0);
}

function scheduleNotes(ctx, dest, nodes, notes, startTime, type, gain, detune = 0) {
  let t = startTime;
  for (const { note, dur } of notes) {
    if (note === 0) { t += dur; continue; }
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = note;
    osc.detune.value = detune;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur - 0.02);
    osc.connect(env);
    env.connect(dest);
    osc.start(t);
    osc.stop(t + dur);
    nodes.push(osc);
    t += dur;
  }
}

export default function useChiptune() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);
  const timerRef = useRef(null);
  const nodesRef = useRef([]);
  const [playing, setPlaying] = useState(null); // null | song index

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    nodesRef.current.forEach(n => { try { n.stop(0); } catch (_) {} });
    nodesRef.current = [];
    if (masterRef.current) {
      masterRef.current.disconnect();
      masterRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
    setPlaying(null);
  }, []);

  const play = useCallback((songIndex) => {
    stop();
    const song = SONGS[songIndex];
    const melody = parsePairs(song.melody);
    const bass = parsePairs(song.bass);
    const melodyDur = getDuration(melody);
    const bassDur = getDuration(bass);

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    ctxRef.current = ctx;
    masterRef.current = master;
    setPlaying(songIndex);

    function loop() {
      if (!ctxRef.current || ctxRef.current !== ctx) return;
      const now = ctx.currentTime + 0.1;
      const nodes = nodesRef.current;
      scheduleNotes(ctx, master, nodes, melody, now, 'square', 0.08);
      scheduleNotes(ctx, master, nodes, melody, now, 'square', 0.04, 6);
      const bassRepeats = Math.ceil(melodyDur / bassDur);
      let bt = now;
      for (let i = 0; i < bassRepeats; i++) {
        scheduleNotes(ctx, master, nodes, bass, bt, 'triangle', 0.12);
        bt += bassDur;
      }
      for (let i = 0; i < Math.floor(melodyDur / 0.2); i++) {
        const t = now + i * 0.2;
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
          data[j] = (Math.random() * 2 - 1) * 0.3;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(i % 2 === 0 ? 0.04 : 0.02, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        noise.connect(noiseGain);
        noiseGain.connect(master);
        noise.start(t);
        noise.stop(t + 0.05);
        nodes.push(noise);
      }
      timerRef.current = setTimeout(loop, melodyDur * 1000 - 100);
    }

    loop();
  }, [stop]);

  return { playing, songs: SONGS, play, stop };
}
