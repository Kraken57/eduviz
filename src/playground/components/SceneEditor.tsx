import { useState } from 'react'

interface SceneEditorProps {
  initialJSON: string
  onRender: (json: string) => void
  onRegenerate: () => void
  onCancel: () => void
  isRendering: boolean
}

export function SceneEditor({ initialJSON, onRender, onRegenerate, onCancel, isRendering }: SceneEditorProps) {
  const [json, setJson] = useState(initialJSON)
  const [isValid, setIsValid] = useState(true)
  const [parseError, setParseError] = useState<string | null>(null)

  const handleChange = (value: string) => {
    setJson(value)
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed === 'object' && parsed !== null && 'entities' in parsed) {
        setIsValid(true)
        setParseError(null)
      } else {
        setIsValid(false)
        setParseError('Missing required "entities" array')
      }
    } catch (err) {
      setIsValid(false)
      setParseError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  const handleRender = () => {
    if (isValid) {
      onRender(json)
    }
  }

  return (
    <div style={{
      padding: '12px',
      borderTop: '1px solid #333',
      background: '#0d1117',
    }}>
      <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '6px', fontWeight: 600 }}>
        Scene JSON
        {isValid
          ? <span style={{ color: '#3fb950', marginLeft: '8px' }}>Valid</span>
          : <span style={{ color: '#f85149', marginLeft: '8px' }}>Invalid</span>
        }
      </div>
      {parseError && (
        <div style={{
          fontSize: '11px', color: '#f85149', marginBottom: '6px',
          padding: '4px 8px', background: '#1c1017', borderRadius: '4px',
          fontFamily: 'ui-monospace, monospace',
        }}>
          {parseError}
        </div>
      )}
      <textarea
        value={json}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        style={{
          width: '100%',
          height: '200px',
          padding: '8px',
          border: '1px solid #30363d',
          borderRadius: '6px',
          background: '#161b22',
          color: '#c9d1d9',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '11px',
          lineHeight: '1.5',
          resize: 'vertical',
          boxSizing: 'border-box',
          tabSize: 2,
        }}
      />
      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
        <button
          className="btn"
          onClick={handleRender}
          disabled={!isValid || isRendering}
          style={{ flex: 1, background: isValid ? '#238636' : undefined, color: isValid ? 'white' : undefined, borderColor: isValid ? '#2ea043' : undefined }}
        >
          {isRendering ? 'Rendering...' : 'Render'}
        </button>
        <button
          className="btn"
          onClick={onRegenerate}
          disabled={isRendering}
        >
          Regenerate
        </button>
        <button
          className="btn"
          onClick={onCancel}
          disabled={isRendering}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
