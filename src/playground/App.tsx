import { useState, useCallback, useEffect, useRef } from 'react'
import { VisualizationEngine } from '../engine/engine'
import { SvgRenderer } from '../renderers/svg/renderer'
import { mountSvg, unmountSvg } from '../renderers/svg/adapter'
import type { SvgSceneOutput } from '../renderers/svg/types'
import type { Scene } from '../ir/types'
import type { RenderResult } from '../engine/renderer/types'
import { examples } from './examples/index'
import { ExampleSelector } from './components/ExampleSelector'
import { VisualizationPanel } from './components/VisualizationPanel'
import { SceneInfo } from './components/SceneInfo'

const engine = new VisualizationEngine()
engine.register(new SvgRenderer())

export default function App() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [result, setResult] = useState<RenderResult | null>(null)
  const [svgOutput, setSvgOutput] = useState<SvgSceneOutput | null>(null)
  const [svgString, setSvgString] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentExample = examples[selectedIndex]

  const renderScene = useCallback(async (scene: Scene) => {
    try {
      setError(null)
      const renderResult = await engine.render({ scene, target: 'svg-2d' })
      setResult(renderResult)

      if (renderResult.success && renderResult.output?.kind === 'scene') {
        const output = renderResult.output.data as SvgSceneOutput
        setSvgOutput(output)
        setSvgString(output.svg)
      } else {
        setSvgOutput(null)
        setSvgString('')
        if (renderResult.errors.length > 0) {
          setError(renderResult.errors.map((e) => e.message).join('; '))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSvgOutput(null)
      setResult(null)
      setSvgString('')
    }
  }, [])

  useEffect(() => {
    renderScene(currentExample.scene)
  }, [selectedIndex, currentExample, renderScene])

  useEffect(() => {
    if (containerRef.current && svgString) {
      unmountSvg(containerRef.current)
      mountSvg(svgString, containerRef.current)
    }
  }, [svgString])

  return (
    <div className="app">
      <header className="header">
        <h1>EduViz Playground</h1>
        <span className="badge">Phase 5</span>
      </header>
      <div className="main">
        <aside className="sidebar">
          <h2>Examples</h2>
          <ExampleSelector
            examples={examples}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />
        </aside>
        <div className="content">
          <VisualizationPanel
            containerRef={containerRef}
            result={result}
            svgOutput={svgOutput}
            error={error}
            onReRender={() => renderScene(currentExample.scene)}
          />
          <SceneInfo example={currentExample} result={result} svgOutput={svgOutput} />
        </div>
      </div>
    </div>
  )
}
