import { useMemo } from 'react';
import Photobooth from './Photobooth';
import useChiptune from './useChiptune';
import './App.css';

// Generate random stars for the background
function generateStars(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    dur: Math.random() * 3 + 2,
    delay: Math.random() * 3,
  }));
}

// Floating pixel decorations
const DECORATIONS = [
  { emoji: '\u2764\ufe0f', x: 5, y: 15, size: 20, dur: 5, delay: 0 },
  { emoji: '\u2b50', x: 90, y: 10, size: 18, dur: 4, delay: 1 },
  { emoji: '\ud83c\udf1f', x: 8, y: 70, size: 22, dur: 6, delay: 0.5 },
  { emoji: '\ud83c\udf08', x: 92, y: 60, size: 24, dur: 5.5, delay: 1.5 },
  { emoji: '\ud83c\udf38', x: 3, y: 40, size: 16, dur: 4.5, delay: 2 },
  { emoji: '\ud83d\udc96', x: 95, y: 35, size: 20, dur: 3.5, delay: 0.8 },
  { emoji: '\u2728', x: 7, y: 85, size: 14, dur: 4, delay: 1.2 },
  { emoji: '\ud83c\udf1f', x: 88, y: 80, size: 16, dur: 5, delay: 2.5 },
  { emoji: '\ud83c\udf80', x: 12, y: 55, size: 18, dur: 6.5, delay: 0.3 },
  { emoji: '\ud83d\udc9c', x: 85, y: 45, size: 15, dur: 3.8, delay: 1.8 },
];

export default function App() {
  const { playing, songs, play, stop } = useChiptune();
  const stars = useMemo(() => generateStars(80), []);

  return (
    <div className="app">
      {/* Music selector */}
      <div className="music-panel">
        {songs.map((s, i) => (
          <button
            key={i}
            className={`music-toggle ${playing === i ? 'playing' : ''}`}
            onClick={() => playing === i ? stop() : play(i)}
          >
            <span className="note">{playing === i ? '\u266b' : '\u266a'}</span>
            {s.name}
          </button>
        ))}
        {playing !== null && (
          <button className="music-toggle music-off" onClick={stop}>
            OFF
          </button>
        )}
      </div>
      {/* Starfield background */}
      <div className="starfield">
        {stars.map(s => (
          <div
            key={s.id}
            className="star"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              '--dur': `${s.dur}s`,
              '--delay': `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Floating decorations */}
      <div className="decorations">
        {DECORATIONS.map((d, i) => (
          <div
            key={i}
            className="decor"
            style={{
              left: `${d.x}%`,
              top: `${d.y}%`,
              '--size': `${d.size}px`,
              '--dur': `${d.dur}s`,
              '--delay': `${d.delay}s`,
              fontSize: `${d.size}px`,
            }}
          >
            {d.emoji}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="header">
        <h1 className="title">RETRO PHOTOBOOTH</h1>
        <p className="subtitle">- INSERT COIN TO PLAY -</p>
      </header>

      <div className="rainbow-divider" />

      {/* Main photobooth */}
      <Photobooth />

      {/* Footer */}
      <footer className="footer">
        RETRO PHOTOBOOTH (C) 1980 --- ALL RIGHTS RESERVED
      </footer>
    </div>
  );
}
