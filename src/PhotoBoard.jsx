import { useRef, useState, useCallback, useEffect } from 'react';

const BOARD_W = 1200;
const BOARD_H = 800;

const TAPE_COLORS = ['#ffffffcc', '#ffd700cc', '#ff69b4cc', '#87ceebcc', '#98fb98cc'];

export default function PhotoBoard({ strips, onClose, onNewRound }) {
  const boardRef = useRef(null);
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Place new strips when they arrive
  useEffect(() => {
    if (strips.length > items.length) {
      const newStrips = strips.slice(items.length).map((src, i) => ({
        id: Date.now() + i,
        src,
        x: 100 + Math.random() * (BOARD_W - 300),
        y: 80 + Math.random() * (BOARD_H - 400),
        rotation: (Math.random() - 0.5) * 15,
        tape: TAPE_COLORS[Math.floor(Math.random() * TAPE_COLORS.length)],
      }));
      setItems(prev => [...prev, ...newStrips]);
    }
  }, [strips, items.length]);

  const getPos = useCallback((e) => {
    const rect = boardRef.current.getBoundingClientRect();
    const scaleX = BOARD_W / rect.width;
    const scaleY = BOARD_H / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const startDrag = useCallback((e, id) => {
    e.stopPropagation();
    const pos = getPos(e);
    const item = items.find(i => i.id === id);
    if (!item) return;
    dragOffset.current = { x: pos.x - item.x, y: pos.y - item.y };
    setDragging(id);
  }, [items, getPos]);

  const onDrag = useCallback((e) => {
    if (dragging === null) return;
    const pos = getPos(e);
    setItems(prev => prev.map(i =>
      i.id === dragging ? { ...i, x: pos.x - dragOffset.current.x, y: pos.y - dragOffset.current.y } : i
    ));
  }, [dragging, getPos]);

  const stopDrag = useCallback(() => {
    setDragging(null);
  }, []);

  const rotateItem = useCallback((id, delta) => {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, rotation: i.rotation + delta } : i
    ));
  }, []);

  // Export board as image
  const downloadBoard = useCallback(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = BOARD_W;
    canvas.height = BOARD_H;
    const ctx = canvas.getContext('2d');

    // Locker door background
    const grad = ctx.createLinearGradient(0, 0, 0, BOARD_H);
    grad.addColorStop(0, '#7a7a82');
    grad.addColorStop(0.5, '#6e6e76');
    grad.addColorStop(1, '#62626a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    // Metal brush texture
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`;
      const y = Math.random() * BOARD_H;
      ctx.fillRect(0, y, BOARD_W, 1);
    }
    // Vent slits at top
    ctx.fillStyle = '#3a3a42';
    for (let i = 0; i < 5; i++) {
      const slitX = BOARD_W * 0.3 + i * 30;
      ctx.beginPath();
      ctx.roundRect(slitX, 25, 20, 4, 2);
      ctx.fill();
    }
    // Scribbles/sticker residue
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(BOARD_W * 0.8, BOARD_H * 0.15, 25, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(BOARD_W * 0.1, BOARD_H * 0.85);
    ctx.quadraticCurveTo(BOARD_W * 0.15, BOARD_H * 0.8, BOARD_W * 0.2, BOARD_H * 0.83);
    ctx.stroke();

    // Draw strips
    const loadPromises = items.map(item => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ item, img });
      img.onerror = () => resolve(null);
      img.src = item.src;
    }));

    const loaded = (await Promise.all(loadPromises)).filter(Boolean);
    loaded.forEach(({ item, img }) => {
      ctx.save();
      ctx.translate(item.x + 75, item.y + 150);
      ctx.rotate(item.rotation * Math.PI / 180);
      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
      ctx.drawImage(img, -75, -150, 150, 300);
      ctx.shadowColor = 'transparent';
      // Tape
      ctx.fillStyle = item.tape;
      ctx.fillRect(-25, -155, 50, 16);
      ctx.restore();
    });

    const link = document.createElement('a');
    link.download = 'photobooth-board.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [items]);

  return (
    <div className="preview-overlay">
      <div className="board-modal">
        <div
          className="photo-board"
          ref={boardRef}
          onMouseMove={onDrag}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onTouchMove={onDrag}
          onTouchEnd={stopDrag}
        >
          {/* Locker door surface */}
          <div className="board-locker" />
          {/* Vent slits */}
          <div className="locker-vents">
            <div className="vent-slit" />
            <div className="vent-slit" />
            <div className="vent-slit" />
            <div className="vent-slit" />
            <div className="vent-slit" />
          </div>

          {/* Pinned strips */}
          {items.map(item => (
            <div
              key={item.id}
              className={`board-strip ${dragging === item.id ? 'dragging' : ''}`}
              style={{
                left: item.x * (100 / BOARD_W) + '%',
                top: item.y * (100 / BOARD_H) + '%',
                transform: `rotate(${item.rotation}deg)`,
              }}
              onMouseDown={e => startDrag(e, item.id)}
              onTouchStart={e => { e.stopPropagation(); startDrag(e, item.id); }}
            >
              {/* Washi tape */}
              <div className="board-tape" style={{ background: item.tape }} />
              <img src={item.src} alt="Strip" draggable={false} />
              {/* Rotate buttons */}
              <div className="board-strip-controls">
                <button onClick={(e) => { e.stopPropagation(); rotateItem(item.id, -5); }}>&#8630;</button>
                <button onClick={(e) => { e.stopPropagation(); rotateItem(item.id, 5); }}>&#8631;</button>
              </div>
            </div>
          ))}

        </div>

        <div className="board-actions">
          <button className="btn btn-capture" onClick={onNewRound}>
            NEW STRIP
          </button>
          <button className="btn btn-download" onClick={downloadBoard}>
            SAVE BOARD
          </button>
          <button className="btn btn-filter" onClick={onClose}>
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
