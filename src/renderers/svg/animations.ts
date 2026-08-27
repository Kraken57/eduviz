import type { AnimationBinding, PropertyBag, Prop, Keyframe } from '../../ir/types.js'
import type { SvgRenderContext } from './types.js'
import { animate } from './builders.js'
import { resolvePrimitive } from './properties.js'

// ─── CSS Property → SVG Attribute Map ───────────────────────────────────────

const CSS_ANIMATABLE: Record<string, string> = {
  opacity: 'opacity',
  fill: 'fill',
  stroke: 'stroke',
  'stroke-width': 'stroke-width',
  'font-size': 'font-size',
}

// ─── Easing → CSS Timing Function ────────────────────────────────────────────

function easingToCSS(easing?: string): string {
  if (!easing || easing === 'linear') return 'linear'
  const map: Record<string, string> = {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  }
  return map[easing] ?? 'linear'
}

// ─── Easing → SMIL KeySplines ───────────────────────────────────────────────

function easingToKeySplines(easing?: string): string | undefined {
  if (!easing || easing === 'linear') return undefined
  const map: Record<string, string> = {
    easeIn: '0.42 0 1 1',
    easeOut: '0 0 0.58 1',
    easeInOut: '0.42 0 0.58 1',
  }
  return map[easing]
}

// ─── CSS Animation Collection ────────────────────────────────────────────────

export interface CssAnimation {
  entityId: string
  property: string
  keyframes: Keyframe[]
  duration: number
  easing?: string
  loop?: boolean
  delay?: number
}

// ─── Property Animations (per-entity) ───────────────────────────────────────

export function renderPropertyAnimations(
  entityId: string,
  properties: PropertyBag,
  ctx: SvgRenderContext,
): string[] {
  const animElements: string[] = []

  for (const [key, prop] of Object.entries(properties)) {
    if (prop === null || typeof prop !== 'object' || !('anim' in prop)) continue
    const propObj = prop as Prop
    const anim = propObj.anim
    if (!anim) continue

    const svgAttr = CSS_ANIMATABLE[key]
    if (svgAttr) {
      // SMIL animate for CSS-animated properties (opacity, fill, etc.)
      const values = anim.keyframes.map(k => String(resolvePrimitive(k.value) ?? '')).join(';')
      const keyTimes = anim.keyframes.map(k => String(k.offset)).join(';')

      const attrs: Record<string, string | number> = {
        attributeName: svgAttr,
        values,
        dur: `${anim.duration}s`,
        repeatCount: anim.loop ? 'indefinite' : '1',
      }
      if (keyTimes) attrs['keyTimes'] = keyTimes
      if (anim.delay) attrs['begin'] = `${anim.delay}s`
      const splines = easingToKeySplines(anim.easing)
      if (splines) {
        attrs['calcMode'] = 'spline'
        attrs['keySplines'] = splines
      }
      animElements.push(animate(attrs))
    } else {
      // CSS animation for geometric properties (radius, x, y, etc.)
      ctx.animations.push({
        entityId,
        property: key,
        keyframes: anim.keyframes.map(k => ({
          offset: k.offset,
          value: String(resolvePrimitive(k.value) ?? ''),
        })),
        duration: anim.duration,
        easing: anim.easing,
        loop: anim.loop,
        delay: anim.delay,
      })

      // Also collect for CSS injection
      ctx.cssAnimations = ctx.cssAnimations ?? []
      ctx.cssAnimations.push({
        entityId,
        property: key,
        keyframes: anim.keyframes,
        duration: anim.duration,
        easing: anim.easing,
        loop: anim.loop,
        delay: anim.delay,
      })
    }
  }

  return animElements
}

// ─── Animation Bindings (scene-level) ───────────────────────────────────────

export function renderAnimationBindings(
  bindings: AnimationBinding[],
  ctx: SvgRenderContext,
): string[] {
  const animElements: string[] = []

  for (const binding of bindings) {
    const target = binding.target
    const svgAttr = CSS_ANIMATABLE[target]

    if (svgAttr) {
      const values = binding.keyframes.map(k => String(resolvePrimitive(k.value) ?? '')).join(';')
      const keyTimes = binding.keyframes.map(k => String(k.offset)).join(';')

      const attrs: Record<string, string | number> = {
        attributeName: svgAttr,
        values,
        dur: `${binding.duration}s`,
        repeatCount: binding.loop ? 'indefinite' : '1',
      }
      if (keyTimes) attrs['keyTimes'] = keyTimes
      if (binding.delay) attrs['begin'] = `${binding.delay}s`
      const splines = easingToKeySplines(binding.easing)
      if (splines) {
        attrs['calcMode'] = 'spline'
        attrs['keySplines'] = splines
      }
      animElements.push(animate(attrs))
    } else {
      const entityId = target.split('.')[0] ?? ''
      const property = target.split('.')[1] ?? target

      ctx.animations.push({
        entityId,
        property: target,
        keyframes: binding.keyframes.map(k => ({
          offset: k.offset,
          value: String(resolvePrimitive(k.value) ?? ''),
        })),
        duration: binding.duration,
        easing: binding.easing,
        loop: binding.loop,
        delay: binding.delay,
      })

      // Also collect for CSS injection
      ctx.cssAnimations = ctx.cssAnimations ?? []
      ctx.cssAnimations.push({
        entityId,
        property,
        keyframes: binding.keyframes,
        duration: binding.duration,
        easing: binding.easing,
        loop: binding.loop,
        delay: binding.delay,
      })
    }
  }

  return animElements
}

// ─── CSS Keyframe Generation ────────────────────────────────────────────────

function sanitizePropertyName(prop: string): string {
  return prop.replace(/[^a-zA-Z0-9]/g, '_')
}

function buildKeyframesCSS(anim: CssAnimation): string {
  const animName = `anim_${sanitizePropertyName(anim.entityId)}_${sanitizePropertyName(anim.property)}`
  const dur = `${anim.duration}s`
  const timing = easingToCSS(anim.easing)
  const iterCount = anim.loop ? 'infinite' : '1'
  const delay = anim.delay ? `${anim.delay}s` : '0s'

  const steps = anim.keyframes.map(k => {
    const pct = Math.round(k.offset * 100)
    const val = k.value
    return `  ${pct}% { ${anim.property}: ${val}; }`
  }).join('\n')

  return `@keyframes ${animName} {\n${steps}\n}\n.${animName} {\n  animation: ${animName} ${dur} ${timing} ${delay} ${iterCount} both;\n}`
}

export function buildCssAnimationBlock(ctx: SvgRenderContext): string {
  const anims = ctx.cssAnimations
  if (!anims || anims.length === 0) return ''
  const blocks = anims.map(buildKeyframesCSS)
  return `<style>\n${blocks.join('\n\n')}\n</style>`
}

export function getAnimationClassName(entityId: string, property: string): string {
  return `anim_${sanitizePropertyName(entityId)}_${sanitizePropertyName(property)}`
}
