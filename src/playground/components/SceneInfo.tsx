import type { Example } from '../examples/index.js'
import type { RenderResult } from '../../engine/renderer/types'
import type { SvgSceneOutput } from '../../renderers/svg/types'

interface Props {
  example: Example
  result: RenderResult | null
  svgOutput: SvgSceneOutput | null
}

export function SceneInfo({ example, result, svgOutput }: Props) {
  return (
    <div className="info-panel">
      <h3>{example.title}</h3>
      <p>{example.description}</p>
      <div className="meta">
        <span>Entities: {example.scene.entities.length}</span>
        {example.scene.relationships && (
          <span>Relationships: {example.scene.relationships.length}</span>
        )}
        {example.scene.animations && (
          <span>Animations: {example.scene.animations.length}</span>
        )}
        {result && (
          <span>Status: {result.success ? 'Success' : 'Failed'}</span>
        )}
        {svgOutput && svgOutput.entityMap && (
          <span>Rendered: {Object.keys(svgOutput.entityMap).length} elements</span>
        )}
      </div>
      {svgOutput && svgOutput.warnings.length > 0 && (
        <div className="warnings">
          {svgOutput.warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      )}
    </div>
  )
}
