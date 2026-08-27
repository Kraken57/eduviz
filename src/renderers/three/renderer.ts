import type { Scene } from '../../ir/types.js'
import * as THREE from 'three'
import type {
  Renderer,
  RendererCapabilities,
  RenderContext,
  RenderResult,
  SceneRequirements,
} from '../../engine/renderer/types.js'
import type { ThreeSceneOutput } from './types.js'
import { rendererCanHandle } from '../../engine/registry/registry.js'
import { preprocessScene } from '../../engine/preprocessing/pipeline.js'
import { validateScene } from '../../ir/validate.js'
import { resolveCameraConfig, validateCameraConfig } from './camera.js'
import { resolveLightingConfig, validateLightingConfig } from './lighting.js'
import { setThreeModule, buildThreeScene, clearMaterialCache } from './scene.js'
import { createSceneAnimations, createEntityAnimations } from './animations.js'
import { buildThreeOutput } from './output.js'

type ThreeModule = typeof import('three')

export class ThreeRenderer implements Renderer {
  readonly info = {
    id: 'three-3d',
    name: 'Three.js 3D Renderer',
    version: '0.1.0',
    description: 'Renders IR scenes as 3D Three.js scenes',
  }

  readonly capabilities: RendererCapabilities = {
    entityTypes: ['shape', 'text', 'group', 'data'],
    relationshipTypes: ['edge', 'containment', 'constraint', 'reference'],
    features: ['3d', 'animations', 'interactions', 'procedural'],
  }

  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return
    setThreeModule(THREE as ThreeModule)
    this.initialized = true
  }

  canRender(_scene: Scene, requirements?: SceneRequirements): boolean {
    return rendererCanHandle(this.capabilities, requirements ?? {
      entityTypes: [],
      relationshipTypes: [],
      features: [],
    })
  }

  async render(context: RenderContext): Promise<RenderResult> {
    const start = Date.now()
    const scene = context.scene
    const warnings: string[] = []

    const validation = validateScene(scene)
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors.map(e => ({
          code: 'VALIDATION_ERROR',
          message: e.message,
          path: e.path,
        })),
        metadata: {
          rendererId: this.info.id,
          renderTimeMs: Date.now() - start,
          warnings: [],
        },
      }
    }

    const preprocessResult = preprocessScene(scene)
    if (!preprocessResult.success) {
      return {
        success: false,
        errors: preprocessResult.errors.map(e => ({
          code: 'PREPROCESS_ERROR',
          message: e,
        })),
        metadata: {
          rendererId: this.info.id,
          renderTimeMs: Date.now() - start,
          warnings: [],
        },
      }
    }

    if (!this.initialized) {
      await this.initialize()
    }

    const cameraConfig = resolveCameraConfig(
      scene.viewport?.camera,
      context.request.options as Record<string, unknown> | undefined,
    )
    warnings.push(...validateCameraConfig(cameraConfig))

    const lightingConfig = resolveLightingConfig(
      context.request.options as Record<string, unknown> | undefined,
    )
    warnings.push(...validateLightingConfig(lightingConfig))

    const { threeScene, objectMap, warnings: buildWarnings } = buildThreeScene(scene)
    warnings.push(...buildWarnings)

    const camera = this.createCamera(cameraConfig, scene)

    threeScene.add(new THREE.AmbientLight(lightingConfig.ambient.color, lightingConfig.ambient.intensity))

    const dirLight = new THREE.DirectionalLight(
      lightingConfig.directional.color,
      lightingConfig.directional.intensity,
    )
    dirLight.position.set(
      lightingConfig.directional.position.x,
      lightingConfig.directional.position.y,
      lightingConfig.directional.position.z,
    )
    threeScene.add(dirLight)

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#444444', 0.3)
    threeScene.add(hemiLight)

    let animationMixer: THREE.AnimationMixer | undefined

    if (scene.animations && scene.animations.length > 0) {
      const clips = createSceneAnimations(scene.animations, objectMap)
      if (clips.length > 0) {
        animationMixer = new THREE.AnimationMixer(threeScene)
        for (const clip of clips) {
          animationMixer.clipAction(clip).play()
        }
      }
    }

    const entityClips = createEntityAnimations(scene.entities, objectMap)
    if (entityClips.length > 0) {
      if (!animationMixer) {
        animationMixer = new THREE.AnimationMixer(threeScene)
      }
      for (const clip of entityClips) {
        animationMixer.clipAction(clip).play()
      }
    }

    const canvas = document.createElement('canvas')
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(
      scene.viewport?.width ?? 800,
      scene.viewport?.height ?? 600,
    )
    renderer.outputColorSpace = THREE.SRGBColorSpace

    renderer.render(threeScene, camera)

    const entityMap: ThreeSceneOutput['entityMap'] = {}
    for (const [id, obj] of objectMap) {
      entityMap[id] = {
        object: obj,
        entityType: (obj.userData?.entityType ?? 'shape') as Scene['entities'][0]['type'],
      }
    }

    const output = buildThreeOutput(
      threeScene,
      camera,
      renderer,
      canvas,
      entityMap,
      warnings,
      animationMixer,
    )

    return {
      success: true,
      output: {
        kind: 'scene',
        data: output,
      },
      errors: [],
      metadata: {
        rendererId: this.info.id,
        renderTimeMs: Date.now() - start,
        warnings,
      },
    }
  }

  async dispose(): Promise<void> {
    clearMaterialCache()
    this.initialized = false
  }

  private createCamera(
    config: { projection: string; fov: number; near: number; far: number; position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number }; zoom: number },
    scene: Scene,
  ): THREE.Camera {
    const width = scene.viewport?.width ?? 800
    const height = scene.viewport?.height ?? 600
    const aspect = width / height

    let camera: THREE.Camera

    if (config.projection === 'orthographic') {
      const halfH = 5 / config.zoom
      const halfW = halfH * aspect
      camera = new THREE.OrthographicCamera(
        -halfW, halfW, halfH, -halfH, config.near, config.far,
      )
    } else {
      camera = new THREE.PerspectiveCamera(config.fov, aspect, config.near, config.far)
    }

    camera.position.set(config.position.x, config.position.y, config.position.z)
    camera.lookAt(config.target.x, config.target.y, config.target.z)

    return camera
  }
}
