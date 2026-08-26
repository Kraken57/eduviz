import { useState, useCallback, useEffect, useRef } from 'react'
import { VisualizationEngine } from '../engine/engine'
import { SvgRenderer } from '../renderers/svg/renderer'
import { ThreeRenderer } from '../renderers/three/renderer'
import { mountSvg, unmountSvg } from '../renderers/svg/adapter'
import type { SvgSceneOutput } from '../renderers/svg/types'
import type { ThreeSceneOutput } from '../renderers/three/types'
import type { Scene } from '../ir/types'
import type { RenderResult } from '../engine/renderer/types'
import type { DSLGenerationResult } from '../ai/types'

type GenLogEntry = { time: string; type: 'status' | 'stream' | 'done' | 'error'; message: string }
import { generateScene, generateSceneStream } from '../ai/extractor'
import { setOllamaConfig, checkHealth } from '../ai/ollama-client'
import { examples, type Example } from './examples/index'
import { examples3D } from './examples/three3d'
import { ExampleSelector } from './components/ExampleSelector'
import { VisualizationPanel } from './components/VisualizationPanel'
import { ThreePanel } from './components/ThreePanel'
import { SceneInfo } from './components/SceneInfo'

type RendererMode = '2d' | '3d'
type AppMode = 'browse' | 'generate'

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
  const [appMode, setAppMode] = useState<AppMode>('browse')
  const [rendererMode, setRendererMode] = useState<RendererMode>('2d')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [result, setResult] = useState<RenderResult | null>(null)
  const [svgOutput, setSvgOutput] = useState<SvgSceneOutput | null>(null)
  const [svgString, setSvgString] = useState<string>('')
  const [threeOutput, setThreeOutput] = useState<ThreeSceneOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [genResult, setGenResult] = useState<DSLGenerationResult | null>(null)
  const [ollamaStatus, setOllamaStatus] = useState<'unknown' | 'ok' | 'error'>('unknown')
  const [genLogs, setGenLogs] = useState<GenLogEntry[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)
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
    if (appMode === 'browse' && currentExample) {
      renderScene(currentExample.scene, rendererMode)
    }
  }, [selectedIndex, currentExample, rendererMode, renderScene, appMode])

  useEffect(() => {
    if (containerRef.current && svgString && rendererMode === '2d') {
      unmountSvg(containerRef.current)
      mountSvg(svgString, containerRef.current)
    }
  }, [svgString, rendererMode])

  useEffect(() => {
    if (appMode === 'generate' && genResult) {
      renderScene(genResult.scene, rendererMode)
    }
  }, [genResult, rendererMode, renderScene, appMode])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [genLogs])

  const handleModeChange = (mode: RendererMode) => {
    setRendererMode(mode)
    setThreeOutput(null)
    setSvgOutput(null)
    setSvgString('')
  }

  const handleAppModeChange = (mode: AppMode) => {
    setAppMode(mode)
    setError(null)
    setGenResult(null)
    setGenLogs([])
    if (mode === 'browse') {
      setQuestion('')
    }
  }

  const pushLog = (type: GenLogEntry['type'], message: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setGenLogs((prev) => [...prev, { time, type, message }])
  }

  const handleCheckHealth = async () => {
    pushLog('status', 'Checking Ollama connection...')
    const health = await checkHealth()
    setOllamaStatus(health.ok ? 'ok' : 'error')
    if (health.ok) {
      pushLog('done', `Connected to Ollama (model: ${health.model ?? 'unknown'})`)
    } else {
      pushLog('error', health.error?.message ?? 'Connection failed')
    }
  }

  const handleGenerateStream = async () => {
    if (!question.trim()) return
    setIsGenerating(true)
    setError(null)
    setGenResult(null)
    setGenLogs([])

    pushLog('status', `Sending prompt to Ollama (${question.trim().length} chars)...`)
    const t0 = Date.now()

    let tokenCount = 0
    try {
      for await (const event of generateSceneStream({ question: question.trim() })) {
        if (event.type === 'start') {
          pushLog('status', 'Model generating...')
        } else if (event.type === 'chunk') {
          tokenCount++
          const preview = event.text.length > 60 ? event.text.slice(0, 60) + '...' : event.text
          pushLog('stream', `[${tokenCount}] ${preview}`)
        } else if (event.type === 'end') {
          const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
          pushLog('done', `Generation complete (${elapsed}s, ${tokenCount} tokens)`)
        } else if (event.type === 'error') {
          pushLog('error', event.message)
        }
        if (event.result) {
          setGenResult(event.result)
          pushLog('status', `Parsed via: ${event.result.parseMethod} — ${event.result.scene.entities.length} entities`)
          pushLog('done', `Scene rendered successfully`)
        }
      }
      setOllamaStatus('ok')
    } catch (err) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
      const aiErr = err as { code?: string; message?: string }
      pushLog('error', `${aiErr.message ?? String(err)} (${elapsed}s)`)
      setError(aiErr.message ?? String(err))
      if (aiErr.code === 'CONNECTION_REFUSED') {
        setOllamaStatus('error')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    handleGenerateStream()
  }

  return (
    <div className="app">
      <header className="header">
        <h1>EduViz Playground</h1>
        <div className="mode-toggle">
          <button
            className={`btn btn-mode${appMode === 'browse' ? ' active' : ''}`}
            onClick={() => handleAppModeChange('browse')}
          >
            Browse
          </button>
          <button
            className={`btn btn-mode${appMode === 'generate' ? ' active' : ''}`}
            onClick={() => handleAppModeChange('generate')}
          >
            Generate
          </button>
        </div>
        {appMode === 'browse' && (
          <div className="mode-toggle" style={{ marginLeft: '12px' }}>
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
        )}
      </header>
      <div className="main">
        <aside className="sidebar">
          {appMode === 'browse' ? (
            <>
              <h2>{rendererMode === '3d' ? '3D Examples' : 'Examples'}</h2>
              <ExampleSelector
                examples={currentExamples}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
              />
            </>
          ) : (
            <>
              <h2>AI Generate</h2>
              <div style={{ padding: '12px' }}>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: '#999' }}>
                  Status: {ollamaStatus === 'ok' ? 'Connected' : ollamaStatus === 'error' ? 'Disconnected' : 'Unknown'}
                </div>
                <button
                  className="btn"
                  onClick={handleCheckHealth}
                  disabled={isGenerating}
                  style={{ marginBottom: '12px', fontSize: '12px' }}
                >
                  Check Ollama
                </button>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Describe what you want to visualize..."
                  style={{
                    width: '100%',
                    height: '120px',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                    fontSize: '13px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleGenerate()
                    }
                  }}
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button
                    className="btn"
                    onClick={handleGenerateStream}
                    disabled={isGenerating || !question.trim()}
                    style={{ flex: 1 }}
                  >
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                  <button
                    className="btn"
                    onClick={() => { setGenLogs([]); setGenResult(null); setError(null) }}
                    disabled={isGenerating}
                    style={{ fontSize: '12px' }}
                  >
                    Clear
                  </button>
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
                  Ctrl+Enter to generate
                </div>
                {genLogs.length > 0 && (
                  <div style={{
                    marginTop: '12px',
                    background: '#1a1a2e',
                    border: '1px solid #333',
                    borderRadius: '6px',
                    padding: '8px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '11px',
                    lineHeight: '1.5',
                  }}>
                    {genLogs.map((entry, i) => (
                      <div key={i} style={{ color: entry.type === 'error' ? '#f44336' : entry.type === 'done' ? '#4caf50' : entry.type === 'stream' ? '#64b5f6' : '#aaa' }}>
                        <span style={{ color: '#555' }}>{entry.time}</span>{' '}
                        {entry.type === 'status' && <span style={{ color: '#ffa726' }}>● </span>}
                        {entry.type === 'stream' && <span style={{ color: '#64b5f6' }}>▸ </span>}
                        {entry.type === 'done' && <span style={{ color: '#4caf50' }}>✔ </span>}
                        {entry.type === 'error' && <span style={{ color: '#f44336' }}>✖ </span>}
                        {entry.message}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                )}
              </div>
            </>
          )}
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
              onReRender={() => {
                if (appMode === 'generate' && genResult) {
                  renderScene(genResult.scene, rendererMode)
                } else if (currentExample) {
                  renderScene(currentExample.scene, rendererMode)
                }
              }}
            />
          )}
          {appMode === 'browse' && currentExample && (
            <SceneInfo example={currentExample} result={result} svgOutput={svgOutput} />
          )}
          {appMode === 'generate' && genResult && (
            <div style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
              AI-generated scene: {genResult.scene.meta.title ?? 'Untitled'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
