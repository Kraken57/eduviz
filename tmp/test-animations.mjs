// Quick smoke test for all 2D SVG animation types
import { SvgRenderer } from '../dist/renderers/svg/renderer.js'

const renderer = new SvgRenderer()

async function test(name, scene) {
  const r = await renderer.render({ scene })
  if (!r.success) {
    console.log(`FAIL ${name}: ${r.errors.map(e=>e.message).join('; ')}`)
    return
  }
  const svg = r.output.data.svg
  const hasSMIL = svg.includes('<animate')
  const hasCSS = svg.includes('@keyframes')
  // Check animate elements are inside their parent (not in a <g> wrapper)
  const outsideAnimate = svg.match(/<\/(circle|rect|ellipse|polygon|line|text)><animate/)
  const insideAnimate = svg.match(/<(circle|rect|ellipse|polygon|line|text)[^>]*><animate/)
  const status = hasSMIL && hasCSS && !outsideAnimate ? 'OK' : 'WARN'
  console.log(`${status} ${name} | SMIL:${hasSMIL} CSS:${hasCSS} Inside:${!!insideAnimate} Outside:${!!outsideAnimate}`)
}

async function run() {
  // 1. Circle radius pulse
  await test('circle-radius', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'c',type:'shape',properties:{shape:'circle',x:400,y:300,
      radius:{value:50,anim:{keyframes:[{offset:0,value:30},{offset:1,value:80}],duration:2,loop:true}},
      fill:'#4A90D9'}}]
  })

  // 2. Circle x position
  await test('circle-x', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'c',type:'shape',properties:{shape:'circle',y:300,radius:30,fill:'#e74c3c',
      x:{value:100,anim:{keyframes:[{offset:0,value:100},{offset:1,value:700}],duration:3,loop:true}}}}]
  })

  // 3. Circle y position
  await test('circle-y', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'c',type:'shape',properties:{shape:'circle',x:400,radius:30,fill:'#2ecc71',
      y:{value:100,anim:{keyframes:[{offset:0,value:100},{offset:1,value:500}],duration:2,loop:true}}}}]
  })

  // 4. Rect width
  await test('rect-width', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'r',type:'shape',properties:{shape:'rect',x:400,y:300,height:60,fill:'#9b59b6',
      width:{value:100,anim:{keyframes:[{offset:0,value:50},{offset:1,value:300}],duration:2,loop:true}}}}]
  })

  // 5. Rect height
  await test('rect-height', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'r',type:'shape',properties:{shape:'rect',x:400,y:300,width:100,fill:'#f39c12',
      height:{value:60,anim:{keyframes:[{offset:0,value:30},{offset:1,value:200}],duration:2,loop:true}}}}]
  })

  // 6. Rect x+y bounce
  await test('rect-xy', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'r',type:'shape',properties:{shape:'rect',width:80,height:50,fill:'#1abc9c',
      x:{value:100,anim:{keyframes:[{offset:0,value:100},{offset:1,value:600}],duration:3,loop:true}},
      y:{value:300,anim:{keyframes:[{offset:0,value:100},{offset:0.5,value:500},{offset:1,value:100}],duration:3,loop:true}}}}]
  })

  // 7. Ellipse rx+ry
  await test('ellipse', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'e',type:'shape',properties:{shape:'ellipse',x:400,y:300,fill:'#3498db',
      radius:{value:50,anim:{keyframes:[{offset:0,value:30},{offset:1,value:80}],duration:2,loop:true}},
      height:{value:30,anim:{keyframes:[{offset:0,value:20},{offset:1,value:60}],duration:2,loop:true}}}}]
  })

  // 8. Opacity fade
  await test('opacity', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'c',type:'shape',properties:{shape:'circle',x:400,y:300,radius:50,fill:'#e74c3c',
      opacity:{value:1,anim:{keyframes:[{offset:0,value:0.2},{offset:0.5,value:1},{offset:1,value:0.2}],duration:2,loop:true}}}}]
  })

  // 9. Fill color
  await test('fill-color', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'c',type:'shape',properties:{shape:'circle',x:400,y:300,radius:50,
      fill:{value:'#FF0000',anim:{keyframes:[{offset:0,value:'#FF0000'},{offset:0.5,value:'#0000FF'},{offset:1,value:'#FF0000'}],duration:3,loop:true}}}}]
  })

  // 10. Multi-property (position + size + color + opacity)
  await test('multi-props', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'c',type:'shape',properties:{shape:'circle',
      x:{value:200,anim:{keyframes:[{offset:0,value:200},{offset:1,value:600}],duration:4,loop:true}},
      y:{value:300,anim:{keyframes:[{offset:0,value:100},{offset:0.5,value:500},{offset:1,value:100}],duration:4,loop:true}},
      radius:{value:30,anim:{keyframes:[{offset:0,value:20},{offset:0.5,value:50},{offset:1,value:20}],duration:2,loop:true}},
      opacity:{value:1,anim:{keyframes:[{offset:0,value:0.5},{offset:1,value:1}],duration:2,loop:true}},
      fill:{value:'#e74c3c',anim:{keyframes:[{offset:0,value:'#e74c3c'},{offset:1,value:'#3498db'}],duration:4,loop:true}}}}]
  })

  // 11. Text opacity
  await test('text-opacity', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'t',type:'text',properties:{text:'Hello',x:400,y:300,fontSize:24,fill:'#333',
      opacity:{value:1,anim:{keyframes:[{offset:0,value:0},{offset:1,value:1}],duration:2,loop:true}}}}]
  })

  // 12. Text font-size
  await test('text-fontsize', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'t',type:'text',properties:{text:'Growing',x:400,y:300,fill:'#333',
      fontSize:{value:16,anim:{keyframes:[{offset:0,value:12},{offset:1,value:48}],duration:2,loop:true}}}}]
  })

  // 13. Text position
  await test('text-position', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'t',type:'text',properties:{text:'Moving',fontSize:20,fill:'#333',
      x:{value:100,anim:{keyframes:[{offset:0,value:100},{offset:1,value:600}],duration:3,loop:true}},
      y:{value:300,anim:{keyframes:[{offset:0,value:100},{offset:0.5,value:500},{offset:1,value:100}],duration:3,loop:true}}}}]
  })

  // 14. Data chart line
  await test('data-line', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[{id:'d',type:'data',properties:{data:[[0,0],[100,50],[200,30],[300,70],[400,20]],
      stroke:'#e74c3c',strokeWidth:2,fill:'none',
      opacity:{value:1,anim:{keyframes:[{offset:0,value:0.3},{offset:1,value:1}],duration:2,loop:true}}}}]
  })

  // 15. Connection/edge
  await test('edge', {
    meta:{version:'1.0'}, viewport:{width:800,height:600},
    entities:[
      {id:'n1',type:'shape',properties:{shape:'circle',x:200,y:300,radius:30,fill:'#3498db'}},
      {id:'n2',type:'shape',properties:{shape:'circle',x:600,y:300,radius:30,fill:'#e74c3c'}}
    ],
    relationships:[{type:'edge',from:'n1',to:'n2',label:'connects'}]
  })

  console.log('\n--- 2D SVG tests complete ---')
}
run()
