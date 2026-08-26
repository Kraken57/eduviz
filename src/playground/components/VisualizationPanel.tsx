import type { RefObject } from 'react'
import type { RenderResult } from '../../engine/renderer/types'
import type { SvgSceneOutput } from '../../renderers/svg/types'

interface Props {
  containerRef: RefObject<HTMLDivElement | null>
  result: RenderResult | null
  svgOutput: SvgSceneOutput | null
  error: string | null
  onReRender: () => void
}

export function VisualizationPanel({ containerRef, result, svgOutput, error, onReRender }: Props) {
  if (error) {
    return (
      <div className="visualization">
        <div className="error">
          <div className="message">Render Error: {error}</div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="visualization">
        <div className="empty-state">Select an example to visualize</div>
      </div>
    )
  }

  return (
    <div className="visualization">
      <div className="toolbar">
        <div className="info">
          {result.metadata.rendererId && (
            <span>Renderer: {result.metadata.rendererId}</span>
          )}
          <span>Time: {result.metadata.renderTimeMs}ms</span>
          {svgOutput && (
            <span>Size: {svgOutput.width}x{svgOutput.height}</span>
          )}
          {svgOutput && svgOutput.warnings.length > 0 && (
            <span>Warnings: {svgOutput.warnings.length}</span>
          )}
        </div>
        <div className="actions">
          <button className="btn" onClick={onReRender}>Re-render</button>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#fafafa', overflow: 'auto' }}>
        <div ref={containerRef} />
      </div>
    </div>
  )
}
