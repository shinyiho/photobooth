const BG_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#1a1a2e' },
  { name: 'Pink', value: '#ffb6c1' },
  { name: 'Lavender', value: '#e6e6fa' },
  { name: 'Mint', value: '#b2f5ea' },
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
  children,
}) {
  const categories = stickerCategories || [{ id: 'classic', label: 'CLASSIC', type: 'emoji', items: DEFAULT_STICKERS }];
  const currentCat = categories.find(c => c.id === activeCategory) || categories[0];
  return (
    <div className="editor-toolbar">
      {children}

      <div className="toolbar-divider" />

      <div className="toolbar-section toolbar-section-bg">
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

      <div className="toolbar-divider" />

      <div className="toolbar-tabs">
        <button
          className={`toolbar-tab ${mode === 'sticker' ? 'active' : ''}`}
          onClick={() => onModeChange('sticker')}
        >STICKER</button>
        <button
          className={`toolbar-tab ${mode === 'stamp' ? 'active' : ''}`}
          onClick={() => onModeChange('stamp')}
        >STAMP</button>
        <button
          className={`toolbar-tab ${mode === 'draw' ? 'active' : ''}`}
          onClick={() => onModeChange('draw')}
        >DRAW</button>
      </div>

      <div className="toolbar-tab-content">
      {mode === 'sticker' && (
        <>
          <div className="toolbar-section">
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
            <div className="sticker-picker">
              {currentCat.items.map((item, i) => {
                const isImage = currentCat.type === 'image';
                const stickerVal = isImage
                  ? { type: 'image', src: import.meta.env.BASE_URL + 'stickers/' + item }
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
                      ? <img src={import.meta.env.BASE_URL + 'stickers/' + item} alt="" />
                      : item}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {mode === 'stamp' && (
        <>
          <div className="toolbar-section">

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
        </>
      )}

      {mode === 'draw' && (
        <div className="toolbar-section">

          <div className="draw-options">
            <div className="mode-toggle">
              {['marker', 'neon', 'airbrush', 'glitter'].map(p => (
                <button
                  key={p}
                  className={`btn btn-filter ${penType === p ? 'active' : ''}`}
                  onClick={() => onPenTypeChange(p)}
                >
                  {p.toUpperCase()}
                </button>
              ))}
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
              <input
                type="range"
                min="4"
                max="40"
                value={drawSize}
                onChange={e => onDrawSizeChange(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}
      </div>

    </div>
  );
}
