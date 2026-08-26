import type { AnimationBinding, PropertyBag, Prop } from '../../ir/types.js'
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
      const values = anim.keyframes.map(k => String(resolvePrimitive(k.value) ?? '')).join(';')
      const keyTimes = anim.keyframes.map(k => String(k.offset / (anim.duration || 1))).join(';')

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
      const keyTimes = binding.keyframes.map(k => String(k.offset / (binding.duration || 1))).join(';')

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
      ctx.animations.push({
        entityId: target.split('.')[0] ?? '',
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
    }
  }

  return animElements
}
