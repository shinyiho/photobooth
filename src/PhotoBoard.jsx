import { useRef, useState, useCallback, useEffect } from 'react';
import { saveBoardLayout, deleteItem } from './boardService';

const BOARD_W = 1200;
const BOARD_H = 800;

export default function PhotoBoard({ items: propItems, myStripId, onUpdateItem, onDeleteItem, onNewRound }) {
  const boardRef = useRef(null);
  const [items, setItems] = useState([]);
  const [dragging, setDragging] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Sync propItems → local items using localId as stable key.
  // - Adds items whose localId isn't in local state yet.
  // - Updates id when a pending item is confirmed by Firestore (localId stays same, id changes).
  useEffect(() => {
    setItems(prev => {
      const byLocalId = new Map(prev.map(i => [i.localId, i]));
      let changed = false;
      const next = prev.map(i => {
        const incoming = propItems.find(p => p.localId === i.localId);
        if (incoming && incoming.id !== i.id) {
          changed = true;
          return { ...i, id: incoming.id }; // adopt the real Firestore id
        }
        return i;
      });
      const newOnes = propItems.filter(p => !byLocalId.has(p.localId));
      if (newOnes.length > 0) return [...next, ...newOnes];
      return changed ? next : prev;
    });
  }, [propItems]);

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
    if (id !== myStripId) return;
    e.stopPropagation();
    const pos = getPos(e);
    const item = items.find(i => i.id === id);
    if (!item) return;
    dragOffset.current = { x: pos.x - item.x, y: pos.y - item.y };
    setDragging(id);
  }, [items, getPos, myStripId]);

  const onDrag = useCallback((e) => {
    if (dragging === null) return;
    const pos = getPos(e);
    setItems(prev => prev.map(i =>
      i.id === dragging ? { ...i, x: pos.x - dragOffset.current.x, y: pos.y - dragOffset.current.y } : i
    ));
  }, [dragging, getPos]);

  const stopDrag = useCallback(() => {
    if (dragging !== null) {
      setItems(prev => {
        const item = prev.find(i => i.id === dragging);
        if (item) {
          onUpdateItem?.(item.id, { x: item.x, y: item.y });
          saveBoardLayout(prev).catch(e => console.error('Failed to save board', e));
        }
        return prev;
      });
    }
    setDragging(null);
  }, [dragging, onUpdateItem]);

  const deleteMyStrip = useCallback(() => {
    if (!myStripId) return;
    setItems(prev => prev.filter(i => i.id !== myStripId));
    onDeleteItem?.(myStripId);
    deleteItem(myStripId).catch(e => console.error('Failed to delete strip', e));
    onNewRound?.();
  }, [myStripId, onDeleteItem, onNewRound]);

  const rotateItem = useCallback((id, delta) => {
    setItems(prev => {
      const next = prev.map(i =>
        i.id === id ? { ...i, rotation: i.rotation + delta } : i
      );
      const item = next.find(i => i.id === id);
      if (item) onUpdateItem?.(id, { rotation: item.rotation });
      saveBoardLayout(next).catch(e => console.error('Failed to save board', e));
      return next;
    });
  }, [onUpdateItem]);

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
          {/* Board background */}
          <div className="board-locker" />

          {/* Pinned strips */}
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`board-strip ${dragging === item.id ? 'dragging' : ''}`}
              style={{
                left: item.x * (100 / BOARD_W) + '%',
                top: item.y * (100 / BOARD_H) + '%',
                transform: `rotate(${item.rotation}deg)`,
                zIndex: dragging === item.id ? items.length + 10 : index + 1,
                cursor: item.id === myStripId ? (dragging === item.id ? 'grabbing' : 'grab') : 'default',
              }}
              onMouseDown={e => startDrag(e, item.id)}
              onTouchStart={e => { e.stopPropagation(); startDrag(e, item.id); }}
            >
              {/* Washi tape */}
              <div className="board-tape" style={{ background: item.tape }} />
              <img src={item.src} alt="Strip" draggable={false} />
            </div>
          ))}

        </div>

        <div className="board-actions">
          <button className="btn-arcade btn-arcade-red" onClick={deleteMyStrip} disabled={!myStripId}>DITCH</button>
          <button className="btn-arcade btn-arcade-cyan" onClick={() => myStripId && rotateItem(myStripId, -5)}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 .49-5"/>
            </svg>
          </button>
          <button className="btn-arcade btn-arcade-cyan" onClick={() => myStripId && rotateItem(myStripId, 5)}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-.49-5"/>
            </svg>
          </button>
          <button className="btn-arcade btn-arcade-green" onClick={onNewRound}>NEW<br/>STRIP</button>
        </div>
      </div>
    </div>
  );
}
