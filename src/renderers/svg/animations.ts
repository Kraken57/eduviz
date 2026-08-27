import type { AnimationBinding, PropertyBag, Prop, Keyframe } from '../../ir/types.js'
import type { SvgRenderContext } from './types.js'
import { animate } from './builders.js'
import { resolvePrimitive } from './properties.js'

// ─── CSS Property → SVG Attribute Map (for SMIL) ───────────────────────────

const CSS_ANIMATABLE: Record<string, string> = {
  opacity: 'opacity',
  fill: 'fill',
  stroke: 'stroke',
  'stroke-width': 'stroke-width',
  'font-size': 'font-size',
}

// ─── IR Property → SVG Attribute (for SMIL attributeName) ───────────────────

function irToSvgAttr(irProp: string): string {
  const map: Record<string, string> = {
    radius: 'r',
    x: 'cx',
    y: 'cy',
    width: 'width',
    height: 'height',
    opacity: 'opacity',
    fill: 'fill',
    stroke: 'stroke',
    strokeWidth: 'stroke-width',
    fontSize: 'font-size',
  }
  return map[irProp] ?? irProp
}

// ─── IR Property → CSS Property (for CSS @keyframes) ───────────────────────

const CSS_GEOM_PROPERTIES: Record<string, string> = {
  radius: 'r',
  x: 'cx',
  y: 'cy',
  opacity: 'opacity',
  fill: 'fill',
  stroke: 'stroke',
  strokeWidth: 'stroke-width',
  fontSize: 'font-size',
  r: 'r',
  cx: 'cx',
  cy: 'cy',
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

// ─── Normalize keyframe offsets to 0-1 range ────────────────────────────────

function normalizeOffsets(keyframes: Keyframe[]): Keyframe[] {
  const maxOffset = Math.max(...keyframes.map(k => k.offset))
  if (maxOffset <= 1) return keyframes
  return keyframes.map(k => ({ ...k, offset: k.offset / maxOffset }))
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
      // SMIL animate for CSS-known properties (opacity, fill, stroke, etc.)
      const kf = normalizeOffsets(anim.keyframes)
      const values = kf.map(k => String(resolvePrimitive(k.value) ?? '')).join(';')
      const keyTimes = kf.map(k => String(k.offset)).join(';')

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
      // SMIL animate for geometric properties (radius → r, x → cx, y → cy)
      const smilAttr = irToSvgAttr(key)
      const kf = normalizeOffsets(anim.keyframes)
      const values = kf.map(k => String(resolvePrimitive(k.value) ?? '')).join(';')
      const keyTimes = kf.map(k => String(k.offset)).join(';')

      const smilAttrs: Record<string, string | number> = {
        attributeName: smilAttr,
        values,
        dur: `${anim.duration}s`,
        repeatCount: anim.loop ? 'indefinite' : '1',
      }
      if (keyTimes) smilAttrs['keyTimes'] = keyTimes
      if (anim.delay) smilAttrs['begin'] = `${anim.delay}s`
      const splines = easingToKeySplines(anim.easing)
      if (splines) {
        smilAttrs['calcMode'] = 'spline'
        smilAttrs['keySplines'] = splines
      }
      animElements.push(animate(smilAttrs))

      // Also track for metadata
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

      // Also collect for CSS injection (backup)
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
      // SMIL animate for CSS-known properties
      const kf = normalizeOffsets(binding.keyframes)
      const values = kf.map(k => String(resolvePrimitive(k.value) ?? '')).join(';')
      const keyTimes = kf.map(k => String(k.offset)).join(';')

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
      // SMIL animate for geometric properties
      const entityId = target.split('.')[0] ?? ''
      const irProp = target.split('.')[1] ?? target
      const smilAttr = irToSvgAttr(irProp)

      const kf = normalizeOffsets(binding.keyframes)
      const values = kf.map(k => String(resolvePrimitive(k.value) ?? '')).join(';')
      const keyTimes = kf.map(k => String(k.offset)).join(';')

      const smilAttrs: Record<string, string | number> = {
        attributeName: smilAttr,
        values,
        dur: `${binding.duration}s`,
        repeatCount: binding.loop ? 'indefinite' : '1',
      }
      if (keyTimes) smilAttrs['keyTimes'] = keyTimes
      if (binding.delay) smilAttrs['begin'] = `${binding.delay}s`
      const splines = easingToKeySplines(binding.easing)
      if (splines) {
        smilAttrs['calcMode'] = 'spline'
        smilAttrs['keySplines'] = splines
      }
      animElements.push(animate(smilAttrs))

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
        property: irProp,
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

interface CssAnimEntry {
  entityId: string
  property: string
  keyframes: Keyframe[]
  duration: number
  easing?: string
  loop?: boolean
  delay?: number
}

function sanitizePropertyName(prop: string): string {
  return prop.replace(/[^a-zA-Z0-9]/g, '_')
}

function buildKeyframesCSS(anim: CssAnimEntry): string {
  const animName = `anim_${sanitizePropertyName(anim.entityId)}_${sanitizePropertyName(anim.property)}`
  const cssProp = CSS_GEOM_PROPERTIES[anim.property] ?? anim.property
  const dur = `${anim.duration}s`
  const timing = easingToCSS(anim.easing)
  const iterCount = anim.loop ? 'infinite' : '1'
  const delay = anim.delay ? `${anim.delay}s` : '0s'

  const kf = normalizeOffsets(anim.keyframes)
  const steps = kf.map(k => {
    const pct = Math.round(k.offset * 100)
    const val = k.value
    return `  ${pct}% { ${cssProp}: ${val}; }`
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
