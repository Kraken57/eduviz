export { SvgRenderer } from './svg/renderer.js'
export type {
  SvgSceneOutput,
  SvgAnimationMeta,
  EntityRenderEntry,
  ViewportConfig,
} from './svg/types.js'
export { mountSvg, unmountSvg, getSvgElement, parseSvgString } from './svg/adapter.js'

export { ThreeRenderer } from './three/renderer.js'
export type {
  ThreeSceneOutput,
  ThreeCameraConfig,
  ThreeLightingConfig,
} from './three/types.js'
