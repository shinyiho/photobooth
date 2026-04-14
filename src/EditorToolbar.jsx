const BG_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#1a1a2e' },
  { name: 'Pink', value: '#ffb6c1' },
  { name: 'Lavender', value: '#e6e6fa' },
  { name: 'Mint', value: '#b2f5ea' },
  { name: 'Peach', value: '#ffdab9' },
  { name: 'Sky', value: '#87ceeb' },
  { name: 'Lemon', value: '#fffacd' },
];

const DEFAULT_STICKERS = [
  '\u2764\ufe0f', '\u2b50', '\ud83c\udf38', '\ud83c\udf1f', '\ud83e\udd8b', '\ud83c\udf08',
  '\ud83d\udc8e', '\ud83c\udf80', '\ud83c\udf3b', '\ud83c\udf1e', '\u2728', '\ud83d\udc96',
  '\ud83c\udf3a', '\ud83e\udde1', '\ud83d\udc9c', '\ud83c\udf52', '\ud83c\udf53', '\ud83c\udf40',
];

const DRAW_COLORS = ['#ff6b9d', '#00e5ff', '#ffe66d', '#c77dff', '#7bf178', '#ffffff', '#ff4444', '#000000'];

const STAMPS = [
  { label: 'DATE', fn: () => new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) },
  { label: 'TIME', fn: () => new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
  { label: 'FULL', fn: () => new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) },
  { label: 'YEAR', fn: () => String(new Date().getFullYear()) },
  { label: 'RETRO', fn: () => `'${String(new Date().getFullYear()).slice(2)} RETRO BOOTH` },
  { label: 'LOVE', fn: () => 'MADE WITH LOVE' },
  { label: 'XOXO', fn: () => 'XOXO' },
  { label: 'SMILE', fn: () => 'SAY CHEESE!' },
  { label: '#BFF', fn: () => '#BFF' },
  { label: 'VIBE', fn: () => 'GOOD VIBES ONLY' },
];

const STAMP_COLORS = ['#ff6b9d', '#00e5ff', '#ffe66d', '#c77dff', '#7bf178', '#ffffff', '#000000'];

export { BG_COLORS, DEFAULT_STICKERS, DRAW_COLORS, STAMPS, STAMP_COLORS };

export default function EditorToolbar({
  bgColor, onBgChange,
  mode, onModeChange,
  stickerCategories, activeCategory, onCategoryChange,
  selectedSticker, onStickerChange,
  selectedId, onAdjustSticker,
  selectedStamp, onStampChange,
  stampColor, onStampColorChange,
  drawColor, onDrawColorChange,
  drawSize, onDrawSizeChange,
  penType, onPenTypeChange,
  onClearDrawing,
  children,
}) {
  const categories = stickerCategories || [{ id: 'classic', label: 'CLASSIC', type: 'emoji', items: DEFAULT_STICKERS }];
  const currentCat = categories.find(c => c.id === activeCategory) || categories[0];
  return (
    <div className="editor-toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">BG</span>
        <div className="bg-colors">
          {BG_COLORS.map(c => (
            <button
              key={c.value}
              className={`color-swatch ${bgColor === c.value ? 'active' : ''}`}
              style={{ background: c.value }}
              onClick={() => onBgChange(c.value)}
              title={c.name}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-label">MODE</span>
        <div className="mode-toggle">
          <button
            className={`btn btn-filter ${mode === 'sticker' ? 'active' : ''}`}
            onClick={() => onModeChange('sticker')}
          >
            STICKER
          </button>
          <button
            className={`btn btn-filter ${mode === 'stamp' ? 'active' : ''}`}
            onClick={() => onModeChange('stamp')}
          >
            STAMP
          </button>
          <button
            className={`btn btn-filter ${mode === 'draw' ? 'active' : ''}`}
            onClick={() => onModeChange('draw')}
          >
            DRAW
          </button>
        </div>
      </div>

      {mode === 'sticker' && (
        <>
          <div className="toolbar-section">
            <span className="toolbar-label">TAB</span>
            <div className="sticker-tabs">
              {categories.map(c => (
                <button
                  key={c.id}
                  className={`sticker-tab ${activeCategory === c.id ? 'active' : ''}`}
                  onClick={() => onCategoryChange(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="toolbar-section">
            <span className="toolbar-label">PICK</span>
            <div className="sticker-picker">
              {currentCat.items.map((item, i) => {
                const isImage = currentCat.type === 'image';
                const stickerVal = isImage
                  ? { type: 'image', src: '/stickers/' + item }
                  : { type: 'emoji', emoji: item };
                const isActive = isImage
                  ? selectedSticker?.src === stickerVal.src
                  : selectedSticker?.emoji === item;
                return (
                  <button
                    key={i}
                    className={`sticker-btn ${isActive ? 'active' : ''}`}
                    onClick={() => onStickerChange(stickerVal)}
                  >
                    {isImage
                      ? <img src={'/stickers/' + item} alt="" />
                      : item}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="toolbar-section">
            <span className="toolbar-label">EDIT</span>
            <div className="sticker-options">
              <button
                className="btn btn-filter"
                onClick={() => selectedId && onAdjustSticker(selectedId, 'size', 8)}
                disabled={!selectedId}
              >
                SIZE +
              </button>
              <button
                className="btn btn-filter"
                onClick={() => selectedId && onAdjustSticker(selectedId, 'size', -8)}
                disabled={!selectedId}
              >
                SIZE -
              </button>
              <button
                className="btn btn-filter"
                onClick={() => selectedId && onAdjustSticker(selectedId, 'rotation', -15)}
                disabled={!selectedId}
              >
                &#8630; ROT
              </button>
              <button
                className="btn btn-filter"
                onClick={() => selectedId && onAdjustSticker(selectedId, 'rotation', 15)}
                disabled={!selectedId}
              >
                ROT &#8631;
              </button>
            </div>
          </div>
        </>
      )}

      {mode === 'stamp' && (
        <>
          <div className="toolbar-section">
            <span className="toolbar-label">PICK</span>
            <div className="sticker-picker">
              {STAMPS.map((s, i) => (
                <button
                  key={i}
                  className={`btn btn-filter ${selectedStamp === i ? 'active' : ''}`}
                  onClick={() => onStampChange(i)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="toolbar-section">
            <span className="toolbar-label">COLOR</span>
            <div className="draw-colors">
              {STAMP_COLORS.map(c => (
                <button
                  key={c}
                  className={`color-swatch ${stampColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => onStampColorChange(c)}
                />
              ))}
            </div>
          </div>
          <div className="toolbar-section">
            <span className="toolbar-label">EDIT</span>
            <div className="sticker-options">
              <button
                className="btn btn-filter"
                onClick={() => selectedId && onAdjustSticker(selectedId, 'size', 2)}
                disabled={!selectedId}
              >
                SIZE +
              </button>
              <button
                className="btn btn-filter"
                onClick={() => selectedId && onAdjustSticker(selectedId, 'size', -2)}
                disabled={!selectedId}
              >
                SIZE -
              </button>
              <button
                className="btn btn-filter"
                onClick={() => selectedId && onAdjustSticker(selectedId, 'rotation', -15)}
                disabled={!selectedId}
              >
                &#8630; ROT
              </button>
              <button
                className="btn btn-filter"
                onClick={() => selectedId && onAdjustSticker(selectedId, 'rotation', 15)}
                disabled={!selectedId}
              >
                ROT &#8631;
              </button>
            </div>
          </div>
        </>
      )}

      {mode === 'draw' && (
        <div className="toolbar-section">
          <span className="toolbar-label">PEN</span>
          <div className="draw-options">
            <div className="mode-toggle">
              <button
                className={`btn btn-filter ${penType === 'marker' ? 'active' : ''}`}
                onClick={() => onPenTypeChange('marker')}
              >
                MARKER
              </button>
              <button
                className={`btn btn-filter ${penType === 'neon' ? 'active' : ''}`}
                onClick={() => onPenTypeChange('neon')}
              >
                NEON
              </button>
              <button
                className={`btn btn-filter ${penType === 'airbrush' ? 'active' : ''}`}
                onClick={() => onPenTypeChange('airbrush')}
              >
                AIRBRUSH
              </button>
              <button
                className={`btn btn-filter ${penType === 'glitter' ? 'active' : ''}`}
                onClick={() => onPenTypeChange('glitter')}
              >
                GLITTER
              </button>
            </div>
            <div className="draw-colors">
              {DRAW_COLORS.map(c => (
                <button
                  key={c}
                  className={`color-swatch ${drawColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => onDrawColorChange(c)}
                />
              ))}
            </div>
            <div className="draw-size">
              <span className="toolbar-label">SIZE</span>
              <input
                type="range"
                min="4"
                max="40"
                value={drawSize}
                onChange={e => onDrawSizeChange(Number(e.target.value))}
              />
            </div>
            <button className="btn btn-filter" onClick={onClearDrawing}>
              CLEAR
            </button>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
