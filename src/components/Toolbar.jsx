import './Toolbar.scss';

export function Toolbar() {
  return (
    <div className="toolbar">
      <div className="toolbar-left" data-tauri-drag-region></div>
      <div className="toolbar-center" data-tauri-drag-region></div>
      <div className="toolbar-right" data-tauri-drag-region></div>
    </div>
  );
}
