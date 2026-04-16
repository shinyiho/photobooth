export default function PreviewActions({ onUndo, onRedo, canUndo, canRedo, onDownload, onClose, mode, selectedId, onAdjustSticker }) {
  const sizeStep = mode === 'stamp' ? 2 : 8;
  const showEdit = mode === 'sticker' || mode === 'stamp';
  return (
    <div className="preview-actions">
      <div className="preview-actions-row">
        <button className="btn btn-filter preview-actions-undo" onClick={onUndo} disabled={!canUndo}>UNDO</button>
        <button className="btn btn-filter preview-actions-undo" onClick={onRedo} disabled={!canRedo}>REDO</button>
        <button className="btn btn-download" onClick={onDownload}>PRINT</button>
      </div>
      {showEdit && (
        <div className="preview-actions-row preview-actions-edit">
          <button className="btn btn-filter btn-icon" onClick={() => selectedId && onAdjustSticker(selectedId, 'size', sizeStep)} disabled={!selectedId}>+</button>
          <button className="btn btn-filter btn-icon" style={{ paddingBottom: '4px' }} onClick={() => selectedId && onAdjustSticker(selectedId, 'size', -sizeStep)} disabled={!selectedId}>−</button>
          <button className="btn btn-filter btn-icon" onClick={() => selectedId && onAdjustSticker(selectedId, 'rotation', -15)} disabled={!selectedId}>&#8630;</button>
          <button className="btn btn-filter btn-icon" onClick={() => selectedId && onAdjustSticker(selectedId, 'rotation', 15)} disabled={!selectedId}>&#8631;</button>
        </div>
      )}
    </div>
  );
}
