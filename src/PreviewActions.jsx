export default function PreviewActions({ onUndo, onRedo, canUndo, canRedo, onDownload, onClose }) {
  return (
    <div className="preview-actions">
      <button
        className="btn btn-filter"
        onClick={onUndo}
        disabled={!canUndo}
      >
        UNDO
      </button>
      <button
        className="btn btn-filter"
        onClick={onRedo}
        disabled={!canRedo}
      >
        REDO
      </button>
      <button className="btn btn-download" onClick={onDownload}>
        PRINT
      </button>
      <button className="btn btn-filter" onClick={onClose}>
        CLOSE
      </button>
    </div>
  );
}
