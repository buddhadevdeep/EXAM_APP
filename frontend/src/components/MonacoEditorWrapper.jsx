import React, { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { FaCopy, FaPaste, FaUndo, FaRedo, FaCompress, FaExpand, FaAlignLeft } from 'react-icons/fa';

const MonacoEditorWrapper = ({ value, onChange, readOnly = false }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordWrap, setWordWrap] = useState('on');
  const [editorInstance, setEditorInstance] = useState(null);

  const handleEditorDidMount = (editor) => {
    setEditorInstance(editor);
    if (value !== undefined && value !== null) {
      editor.setValue(value);
    }
  };

  React.useEffect(() => {
    if (editorInstance && value !== undefined && value !== null) {
      if (editorInstance.getValue() !== value) {
        editorInstance.setValue(value);
      }
    }
  }, [value, editorInstance]);

  const copyToClipboard = () => {
    if (editorInstance) {
      navigator.clipboard.writeText(editorInstance.getValue());
      alert('Code copied to clipboard!');
    }
  };

  const pasteFromClipboard = async () => {
    if (editorInstance && !readOnly) {
      const text = await navigator.clipboard.readText();
      const position = editorInstance.getPosition();
      editorInstance.executeEdits('my-source', [{
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: text,
        forceMoveMarkers: true
      }]);
    }
  };

  const handleUndo = () => {
    if (editorInstance && !readOnly) {
      editorInstance.trigger('keyboard', 'undo', null);
    }
  };

  const handleRedo = () => {
    if (editorInstance && !readOnly) {
      editorInstance.trigger('keyboard', 'redo', null);
    }
  };

  return (
    <div className={`card glass-card p-3 mb-4 ${isFullscreen ? 'position-fixed top-0 start-0 w-100 h-100 z-3' : ''}`}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-bold">SQL Query Editor</span>
        <div className="btn-group btn-group-sm">
          <button className="btn btn-outline-secondary" title="Copy" onClick={copyToClipboard}>
            <FaCopy />
          </button>
          {!readOnly && (
            <>
              <button className="btn btn-outline-secondary" title="Paste" onClick={pasteFromClipboard}>
                <FaPaste />
              </button>
              <button className="btn btn-outline-secondary" title="Undo" onClick={handleUndo}>
                <FaUndo />
              </button>
              <button className="btn btn-outline-secondary" title="Redo" onClick={handleRedo}>
                <FaRedo />
              </button>
            </>
          )}
          <button 
            className={`btn ${wordWrap === 'on' ? 'btn-secondary' : 'btn-outline-secondary'}`} 
            title="Toggle Word Wrap" 
            onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
          >
            <FaAlignLeft />
          </button>
          <button 
            className="btn btn-outline-secondary" 
            title="Toggle Fullscreen" 
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>
      <div style={{ height: isFullscreen ? 'calc(100vh - 100px)' : '300px' }}>
        <MonacoEditor
          height="100%"
          language="sql"
          theme="vs-dark"
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly,
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: wordWrap,
            lineNumbers: 'on',
            automaticLayout: true
          }}
        />
      </div>
    </div>
  );
};

export default MonacoEditorWrapper;
