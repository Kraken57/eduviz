import { useState, useCallback, useEffect, useRef } from 'react'
import { VisualizationEngine } from '../engine/engine'
import { SvgRenderer } from '../renderers/svg/renderer'
import { ThreeRenderer } from '../renderers/three/renderer'
import { mountSvg, unmountSvg } from '../renderers/svg/adapter'
import type { SvgSceneOutput } from '../renderers/svg/types'
import type { ThreeSceneOutput } from '../renderers/three/types'
import type { Scene } from '../ir/types'
import type { RenderResult } from '../engine/renderer/types'
import { examples, type Example } from './examples/index'
import { examples3D } from './examples/three3d'
import { ExampleSelector } from './components/ExampleSelector'
import { VisualizationPanel } from './components/VisualizationPanel'
import { ThreePanel } from './components/ThreePanel'
import { SceneInfo } from './components/SceneInfo'

type RendererMode = '2d' | '3d'

const engine = new VisualizationEngine()
engine.register(new SvgRenderer())
engine.register(new ThreeRenderer())

const examples3DFormatted: Example[] = examples3D.map(s => ({
  title: s.meta.title ?? 'Untitled',
  description: s.meta.description ?? '',
  tags: s.meta.tags ?? [],
  scene: s,
}))

export default function App() {
  const [rendererMode, setRendererMode] = useState<RendererMode>('2d')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [result, setResult] = useState<RenderResult | null>(null)
  const [svgOutput, setSvgOutput] = useState<SvgSceneOutput | null>(null)
  const [svgString, setSvgString] = useState<string>('')
  const [threeOutput, setThreeOutput] = useState<ThreeSceneOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentExamples = rendererMode === '2d' ? examples : examples3DFormatted
  const currentExample = currentExamples[selectedIndex]

  const renderScene = useCallback(async (scene: Scene, mode: RendererMode) => {
    try {
      setError(null)
      const target = mode === '3d' ? 'three-3d' : 'svg-2d'
      const renderResult = await engine.render({ scene, target })
      setResult(renderResult)

      if (mode === '3d') {
        setThreeOutput(null)
        setSvgOutput(null)
        setSvgString('')
        if (renderResult.success && renderResult.output?.kind === 'scene') {
          setThreeOutput(renderResult.output.data as ThreeSceneOutput)
        } else if (renderResult.errors.length > 0) {
          setError(renderResult.errors.map((e) => e.message).join('; '))
        }
      } else {
        setThreeOutput(null)
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSvgOutput(null)
      setResult(null)
      setSvgString('')
      setThreeOutput(null)
    }
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [rendererMode])

  useEffect(() => {
    if (currentExample) {
      renderScene(currentExample.scene, rendererMode)
    }
  }, [selectedIndex, currentExample, rendererMode, renderScene])

  useEffect(() => {
    if (containerRef.current && svgString && rendererMode === '2d') {
      unmountSvg(containerRef.current)
      mountSvg(svgString, containerRef.current)
    }
  }, [svgString, rendererMode])

  const handleModeChange = (mode: RendererMode) => {
    setRendererMode(mode)
    setThreeOutput(null)
    setSvgOutput(null)
    setSvgString('')
  }

  return (
    <div className="app">
      <header className="header">
        <h1>EduViz Playground</h1>
        <div className="mode-toggle">
          <button
            className={`btn btn-mode${rendererMode === '2d' ? ' active' : ''}`}
            onClick={() => handleModeChange('2d')}
          >
            2D SVG
          </button>
          <button
            className={`btn btn-mode${rendererMode === '3d' ? ' active' : ''}`}
            onClick={() => handleModeChange('3d')}
          >
            3D Three.js
          </button>
        </div>
      </header>
      <div className="main">
        <aside className="sidebar">
          <h2>{rendererMode === '3d' ? '3D Examples' : 'Examples'}</h2>
          <ExampleSelector
            examples={currentExamples}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
          />
        </aside>
        <div className="content">
          {rendererMode === '3d' ? (
            <ThreePanel threeOutput={threeOutput} error={error} />
          ) : (
            <VisualizationPanel
              containerRef={containerRef}
              result={result}
              svgOutput={svgOutput}
              error={error}
              onReRender={() => currentExample && renderScene(currentExample.scene, rendererMode)}
            />
          )}
          {currentExample && <SceneInfo example={currentExample} result={result} svgOutput={svgOutput} />}
        </div>
      </div>
    </div>
  )
}
