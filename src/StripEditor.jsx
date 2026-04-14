import { useRef, useState, useCallback, useEffect } from 'react';
import PreviewActions from './PreviewActions';
import EditorToolbar, { DEFAULT_STICKERS, DRAW_COLORS, STAMPS, STAMP_COLORS } from './EditorToolbar';

const STRIP_W = 460;
const PHOTO_W = 400;
const PHOTO_H = 300;
const PADDING = 20;
const BORDER = 30;

export default function StripEditor({ photos, onClose, onDone }) {
  const baseCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [stickers, setStickers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const isDraggingSticker = useRef(false);
  const dragSnapshotSaved = useRef(false);
  const [mode, setMode] = useState('sticker'); // 'sticker' | 'stamp' | 'draw'
  const [stickerCategories, setStickerCategories] = useState(null);
  const [activeCategory, setActiveCategory] = useState('classic');
  const [selectedSticker, setSelectedSticker] = useState({ type: 'emoji', emoji: DEFAULT_STICKERS[0] });
  const [selectedStamp, setSelectedStamp] = useState(0);
  const [stampColor, setStampColor] = useState(STAMP_COLORS[0]);
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [drawSize, setDrawSize] = useState(16);
  const [penType, setPenType] = useState('neon'); // 'marker' | 'neon' | 'airbrush' | 'glitter'
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const tempCanvasRef = useRef(null);
  const highlightRef = useRef(null);
  const containerRef = useRef(null);

  // 10-minute editing timeout
  const [timeLeft, setTimeLeft] = useState(600);
  const downloadRef = useRef(null);
  const timeUpRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          timeUpRef.current = true;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && timeUpRef.current) {
      timeUpRef.current = false;
      if (downloadRef.current) downloadRef.current();
    }
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timerWarning = timeLeft <= 60;

  // Undo / Redo history
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [historyLen, setHistoryLen] = useState(0); // triggers re-render on change

  const stripH = photos.length * PHOTO_H + (photos.length + 1) * PADDING + BORDER * 2;

  const getDrawData = useCallback(() => {
    const dc = drawCanvasRef.current;
    if (!dc) return null;
    return dc.getContext('2d').getImageData(0, 0, dc.width, dc.height);
  }, []);

  const setDrawData = useCallback((imageData) => {
    const dc = drawCanvasRef.current;
    if (!dc || !imageData) return;
    const ctx = dc.getContext('2d');
    ctx.clearRect(0, 0, dc.width, dc.height);
    ctx.putImageData(imageData, 0, 0);
  }, []);

  const saveSnapshot = useCallback(() => {
    undoStack.current.push({
      bgColor,
      stickers: JSON.parse(JSON.stringify(stickers)),
      drawData: getDrawData(),
    });
    redoStack.current = [];
    setHistoryLen(undoStack.current.length);
  }, [bgColor, stickers, getDrawData]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    // Save current state to redo
    redoStack.current.push({
      bgColor,
      stickers: JSON.parse(JSON.stringify(stickers)),
      drawData: getDrawData(),
    });
    const prev = undoStack.current.pop();
    setBgColor(prev.bgColor);
    setStickers(prev.stickers);
    setDrawData(prev.drawData);
    setHistoryLen(undoStack.current.length);
  }, [bgColor, stickers, getDrawData, setDrawData]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    // Save current state to undo
    undoStack.current.push({
      bgColor,
      stickers: JSON.parse(JSON.stringify(stickers)),
      drawData: getDrawData(),
    });
    const next = redoStack.current.pop();
    setBgColor(next.bgColor);
    setStickers(next.stickers);
    setDrawData(next.drawData);
    setHistoryLen(undoStack.current.length);
  }, [bgColor, stickers, getDrawData, setDrawData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Render the base strip (background + photos + text)
  const renderBase = useCallback(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;
    canvas.width = STRIP_W;
    canvas.height = stripH;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, STRIP_W, stripH);

    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = bgColor === '#ffffff' || bgColor === '#fffacd' || bgColor === '#e6e6fa'
      ? '#ff6b9d' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('RETRO BOOTH', STRIP_W / 2, BORDER + 12);

    const promises = photos.map((src, i) => {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          const y = BORDER + PADDING + i * (PHOTO_H + PADDING) + 10;
          ctx.drawImage(img, BORDER, y, PHOTO_W, PHOTO_H);
          resolve();
        };
        img.src = src;
      });
    });

    Promise.all(promises).then(() => {
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = '#888';
      ctx.textAlign = 'center';
      ctx.fillText('1980 vibes', STRIP_W / 2, stripH - BORDER + 15);
    });
  }, [bgColor, photos, stripH]);

  useEffect(() => {
    renderBase();
  }, [renderBase]);

  // Fetch sticker manifest
  useEffect(() => {
    fetch('/stickers/stickers.json')
      .then(r => r.json())
      .then(data => setStickerCategories(data.categories))
      .catch(() => {});
  }, []);

  // Init draw canvas size
  useEffect(() => {
    const dc = drawCanvasRef.current;
    if (dc) { dc.width = STRIP_W; dc.height = stripH; }
    const hc = highlightRef.current;
    if (hc) { hc.width = STRIP_W; hc.height = stripH; }
  }, [stripH]);

  // Get position relative to canvas accounting for CSS scaling
  const getPos = useCallback((e) => {
    const rect = baseCanvasRef.current.getBoundingClientRect();
    const scaleX = STRIP_W / rect.width;
    const scaleY = stripH / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, [stripH]);

  // Neon pen — dual-tone with glow core
  const drawNeonStroke = useCallback((ctx, color, size) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 1.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.shadowBlur = size * 0.8;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.shadowBlur = size * 0.3;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.35;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.restore();
  }, []);

  // Soft airbrush — radial gradient dots along path
  const drawAirbrushStroke = useCallback((ctx, color, size, points) => {
    if (!points || points.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const r = size * 1.8;
    const tmp = document.createElement('canvas').getContext('2d');
    tmp.fillStyle = color;
    const hex = tmp.fillStyle;
    const cr = parseInt(hex.slice(1, 3), 16);
    const cg = parseInt(hex.slice(3, 5), 16);
    const cb = parseInt(hex.slice(5, 7), 16);

    const spacing = Math.max(2, size * 0.15);
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i > 0) {
        const prev = points[i - 1];
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;
        if (Math.sqrt(dx * dx + dy * dy) < spacing) continue;
      }

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grad.addColorStop(0, `rgba(255, 255, 255, 0.35)`);
      grad.addColorStop(0.15, `rgba(${cr}, ${cg}, ${cb}, 0.3)`);
      grad.addColorStop(0.4, `rgba(${cr}, ${cg}, ${cb}, 0.12)`);
      grad.addColorStop(0.7, `rgba(${cr}, ${cg}, ${cb}, 0.04)`);
      grad.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);

      ctx.fillStyle = grad;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.restore();
  }, []);

  // Draw a 4-point star shape
  const drawStar = useCallback((ctx, cx, cy, r) => {
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const outerX = cx + Math.cos(angle) * r;
      const outerY = cy + Math.sin(angle) * r;
      const innerAngle = angle + Math.PI / 4;
      const innerX = cx + Math.cos(innerAngle) * r * 0.3;
      const innerY = cy + Math.sin(innerAngle) * r * 0.3;
      if (i === 0) ctx.moveTo(outerX, outerY);
      else ctx.lineTo(outerX, outerY);
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
  }, []);

  const drawGlitterStroke = useCallback((ctx, color, size, points) => {
    if (!points || points.length === 0) return;
    // Base gel stroke
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = size;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    // White core
    ctx.shadowBlur = size * 0.4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = size * 0.25;
    ctx.globalAlpha = 0.8;
    ctx.stroke();
    ctx.restore();
    // Sparkle particles along path — drawn as shapes
    ctx.save();
    for (let i = 0; i < points.length; i += 2) {
      const p = points[i];
      const seed = (Math.round(p.x) * 73 + Math.round(p.y) * 137 + i * 31) % 1000;
      for (let j = 0; j < 3; j++) {
        const hash = (seed * (j + 1) * 7 + 11) % 1000;
        const ox = ((hash % 100) / 100 - 0.5) * size * 2;
        const oy = (((hash * 3) % 100) / 100 - 0.5) * size * 2;
        const r = (hash % 40) / 100 * size * 0.4 + size * 0.15;
        ctx.fillStyle = j === 0 ? '#ffffff' : color;
        ctx.globalAlpha = 0.5 + (hash % 50) / 100;
        ctx.shadowColor = j === 0 ? '#ffffff' : color;
        ctx.shadowBlur = r * 2;
        if (hash % 3 === 0) {
          // Circle dot
          ctx.beginPath();
          ctx.arc(p.x + ox, p.y + oy, r * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Star sparkle
          drawStar(ctx, p.x + ox, p.y + oy, r);
        }
      }
    }
    ctx.restore();
  }, [drawStar]);

  const strokePointsRef = useRef([]);

  // Drawing handlers — Purikura style brushes
  const startDraw = useCallback((e) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    isDrawingRef.current = true;
    setIsDrawing(true);
    strokePointsRef.current = [];

    const tc = document.createElement('canvas');
    tc.width = STRIP_W;
    tc.height = stripH;
    tempCanvasRef.current = tc;

    const ctx = tc.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    strokePointsRef.current.push(pos);

    if (penType === 'marker') {
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawSize;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'bevel';
    }
  }, [mode, penType, drawColor, drawSize, getPos, stripH]);

  const draw = useCallback((e) => {
    if (!isDrawingRef.current || mode !== 'draw') return;
    e.preventDefault();
    const tc = tempCanvasRef.current;
    if (!tc) return;
    const ctx = tc.getContext('2d');
    const pos = getPos(e);
    ctx.clearRect(0, 0, tc.width, tc.height);
    ctx.lineTo(pos.x, pos.y);
    strokePointsRef.current.push(pos);

    if (penType === 'marker') {
      ctx.stroke();
    } else if (penType === 'neon') {
      drawNeonStroke(ctx, drawColor, drawSize);
    } else if (penType === 'airbrush') {
      drawAirbrushStroke(ctx, drawColor, drawSize, strokePointsRef.current);
    } else if (penType === 'glitter') {
      drawGlitterStroke(ctx, drawColor, drawSize, strokePointsRef.current);
    }

    // Show live preview
    const hc = highlightRef.current;
    if (hc) {
      const hCtx = hc.getContext('2d');
      hCtx.clearRect(0, 0, hc.width, hc.height);
      hCtx.globalAlpha = penType === 'marker' ? 0.4 : 1;
      hCtx.drawImage(tc, 0, 0);
      hCtx.globalAlpha = 1;
    }
  }, [mode, penType, drawColor, drawSize, getPos, drawNeonStroke, drawGlitterStroke]);

  const stopDraw = useCallback(() => {
    if (isDrawingRef.current) {
      const tc = tempCanvasRef.current;
      const dc = drawCanvasRef.current;
      if (tc && dc) {
        const ctx = dc.getContext('2d');
        ctx.globalAlpha = penType === 'marker' ? 0.4 : 1;
        ctx.drawImage(tc, 0, 0);
        ctx.globalAlpha = 1;
      }
      const hc = highlightRef.current;
      if (hc) hc.getContext('2d').clearRect(0, 0, hc.width, hc.height);
      tempCanvasRef.current = null;
      strokePointsRef.current = [];
      saveSnapshot();
    }
    isDrawingRef.current = false;
    setIsDrawing(false);
  }, [penType, saveSnapshot]);

  // Sticker/stamp placement via click
  const handleCanvasClick = useCallback((e) => {
    saveSnapshot();
    const id = Date.now();
    const pos = getPos(e);
    if (mode === 'sticker') {
      if (selectedSticker.type === 'image') {
        const isHeadwear = /catears|frog|bear/.test(selectedSticker.src);
        setStickers(prev => [...prev, { type: 'sticker', src: selectedSticker.src, x: pos.x, y: pos.y, size: isHeadwear ? 120 : 60, rotation: 0, id }]);
      } else {
        setStickers(prev => [...prev, { type: 'sticker', emoji: selectedSticker.emoji, x: pos.x, y: pos.y, size: 40, rotation: 0, id }]);
      }
    } else if (mode === 'stamp') {
      const text = STAMPS[selectedStamp].fn();
      setStickers(prev => [...prev, { type: 'stamp', text, x: pos.x, y: pos.y, size: 14, rotation: 0, color: stampColor, id }]);
    }
    setSelectedId(id);
  }, [mode, selectedSticker, selectedStamp, stampColor, getPos, saveSnapshot]);

  const adjustSticker = useCallback((id, prop, delta) => {
    saveSnapshot();
    setStickers(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (prop === 'size') return { ...s, size: Math.max(16, Math.min(120, s.size + delta)) };
      if (prop === 'rotation') return { ...s, rotation: (s.rotation || 0) + delta };
      return s;
    }));
  }, [saveSnapshot]);

  const startDragSelected = useCallback((e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    isDraggingSticker.current = true;
    dragSnapshotSaved.current = false;
  }, []);

  const dragSelected = useCallback((e) => {
    if (!isDraggingSticker.current || selectedId === null) return;
    if (!dragSnapshotSaved.current) {
      saveSnapshot();
      dragSnapshotSaved.current = true;
    }
    const pos = getPos(e);
    const id = selectedId;
    setStickers(prev => prev.map(s => s.id === id ? { ...s, x: pos.x, y: pos.y } : s));
  }, [selectedId, getPos, saveSnapshot]);

  const stopDragSelected = useCallback(() => {
    isDraggingSticker.current = false;
  }, []);

  const deleteSticker = useCallback((id) => {
    saveSnapshot();
    setStickers(prev => prev.filter(s => s.id !== id));
  }, [saveSnapshot]);

  const clearDrawing = useCallback(() => {
    saveSnapshot();
    const dc = drawCanvasRef.current;
    if (dc) {
      const ctx = dc.getContext('2d');
      ctx.clearRect(0, 0, dc.width, dc.height);
    }
  }, [saveSnapshot]);

  // Export final image
  const download = useCallback(async () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = STRIP_W;
    exportCanvas.height = stripH;
    const ctx = exportCanvas.getContext('2d');

    // Draw base
    ctx.drawImage(baseCanvasRef.current, 0, 0);

    // Draw freehand layer
    ctx.drawImage(drawCanvasRef.current, 0, 0);

    // Pre-load image stickers
    const imageCache = {};
    await Promise.all(
      stickers.filter(s => s.src).map(s => new Promise(resolve => {
        if (imageCache[s.src]) return resolve();
        const img = new Image();
        img.onload = () => { imageCache[s.src] = img; resolve(); };
        img.onerror = () => resolve();
        img.src = s.src;
      }))
    );

    // Draw stickers and stamps
    stickers.forEach(s => {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate((s.rotation || 0) * Math.PI / 180);
      if (s.type === 'stamp') {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${s.size}px "Press Start 2P", monospace`;
        ctx.fillStyle = s.color || '#ff6b9d';
        ctx.shadowColor = s.color || '#ff6b9d';
        ctx.shadowBlur = 6;
        ctx.fillText(s.text, 0, 0);
      } else if (s.src && imageCache[s.src]) {
        ctx.drawImage(imageCache[s.src], -s.size / 2, -s.size / 2, s.size, s.size);
      } else if (s.emoji) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${s.size}px serif`;
        ctx.fillText(s.emoji, 0, 0);
      }
      ctx.restore();
    });

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'retro-photobooth-strip.png';
    link.href = dataUrl;
    link.click();
    if (onDone) onDone(dataUrl);
  }, [stickers, stripH, onDone]);

  downloadRef.current = download;

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="editor-modal" onClick={e => e.stopPropagation()}>
        <EditorToolbar
          bgColor={bgColor}
          onBgChange={(c) => { saveSnapshot(); setBgColor(c); }}
          mode={mode}
          onModeChange={setMode}
          stickerCategories={stickerCategories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          selectedSticker={selectedSticker}
          onStickerChange={setSelectedSticker}
          selectedId={selectedId}
          onAdjustSticker={adjustSticker}
          selectedStamp={selectedStamp}
          onStampChange={setSelectedStamp}
          stampColor={stampColor}
          onStampColorChange={setStampColor}
          drawColor={drawColor}
          onDrawColorChange={setDrawColor}
          drawSize={drawSize}
          onDrawSizeChange={setDrawSize}
          penType={penType}
          onPenTypeChange={setPenType}
          onClearDrawing={clearDrawing}
        >
          <PreviewActions
            onUndo={undo}
            onRedo={redo}
            canUndo={undoStack.current.length > 0}
            canRedo={redoStack.current.length > 0}
            onDownload={download}
            onClose={onClose}
          />
        </EditorToolbar>

        {/* Canvas area */}
        <div
          className="editor-canvas-wrap"
          ref={containerRef}
          onMouseDown={mode === 'draw' ? startDraw : ((mode === 'sticker' || mode === 'stamp') ? handleCanvasClick : undefined)}
          onMouseMove={mode === 'draw' ? draw : dragSelected}
          onMouseUp={mode === 'draw' ? stopDraw : stopDragSelected}
          onMouseLeave={mode === 'draw' ? stopDraw : stopDragSelected}
          onTouchStart={mode === 'draw' ? startDraw : ((mode === 'sticker' || mode === 'stamp') ? handleCanvasClick : undefined)}
          onTouchMove={mode === 'draw' ? draw : dragSelected}
          onTouchEnd={mode === 'draw' ? stopDraw : stopDragSelected}
          onClick={() => { if (mode === 'draw') setSelectedId(null); }}
        >
          <canvas ref={baseCanvasRef} className="editor-canvas" />
          <canvas
            ref={drawCanvasRef}
            className="editor-canvas editor-draw-layer"
          />
          <canvas
            ref={highlightRef}
            className="editor-canvas editor-draw-layer"
          />
          {/* Render stickers and stamps as positioned overlays */}
          {stickers.map(s => {
            const canvas = baseCanvasRef.current;
            if (!canvas) return null;
            const rect = canvas.getBoundingClientRect();
            const scaleX = rect.width / STRIP_W;
            const scaleY = rect.height / stripH;
            const isSelected = selectedId === s.id;
            const isStamp = s.type === 'stamp';
            const isImage = !!s.src;
            return (
              <div
                key={s.id}
                className={`placed-sticker ${isSelected ? 'selected' : ''} ${isStamp ? 'placed-stamp' : ''}`}
                style={{
                  left: s.x * scaleX,
                  top: s.y * scaleY,
                  ...(isImage
                    ? { width: s.size * scaleX, height: s.size * scaleX }
                    : { fontSize: s.size * scaleX }),
                  color: isStamp ? s.color : undefined,
                  transform: `translate(-50%, -50%) rotate(${s.rotation || 0}deg)`,
                }}
                onMouseDown={e => startDragSelected(e, s.id)}
                onTouchStart={e => startDragSelected(e, s.id)}
                onClick={e => e.stopPropagation()}
                onDoubleClick={() => deleteSticker(s.id)}
              >
                {isImage
                  ? <img src={s.src} alt="" draggable={false} />
                  : isStamp ? s.text : s.emoji}
              </div>
            );
          })}
        </div>

        <div className={`editor-timer-block ${timerWarning ? 'warning' : ''}`}>
          <span className="toolbar-label">TIME</span>
          <span className="editor-timer">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}
