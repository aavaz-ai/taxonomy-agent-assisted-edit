"use client"

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — Scan Overlay (Aurora Edition)
 *
 *    0ms   subtle tint fades in
 *  100ms   WebGL noise field blooms from center (simplex 3D aurora)
 *  100ms   dot matrix grid appears under aurora
 *  400ms   scan line emerges, sweeps L→R with eased timing
 *     —    on complete: white flash pulse, then fade out
 * ───────────────────────────────────────────────────────── */

import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useDialKit } from "dialkit"
import { useTaxonomy } from "@/lib/taxonomy-context"
import { Dithering } from "@paper-design/shaders-react"

/* ── TIMING ─────────────────────────────────────────────── */
const TIMING = {
  overlayFadeIn:   0,
  centerBloom:     100,
  linesEmerge:     400,
}

/* ── DEFAULTS ───────────────────────────────────────────── */
const DEFAULTS = {
  // Ambient tint (light wash — just enough to signal overlay)
  tintOpacity:     0.03,

  // Aurora bloom (WebGL noise field)
  indigoOpacity:   0.12,
  tealOpacity:     0.10,
  goldOpacity:     0.08,
  greenOpacity:    0.06,
  noiseScale:      1.5,
  noiseSpeed:      0.3,
  bloomRadius:     0.7,

  // Dot matrix
  dotSize:         3,
  gridSpacing:     18,
  dotOpacity:      0.06,
  gridRadius:      400,

  // Scan line
  sweepSpeed:      2.5,
  lineOpacity:     0.7,
  glowWidth:       90,

  // Flash
  flashOpacity:    0.15,
}

/* ── SCAN LINE CONFIG ───────────────────────────────────── */
const SCAN = {
  lineWidth:      2,
  trailWidth:     120,
}

/* ── GLSL SHADERS ───────────────────────────────────────── */
const VERT_SRC = `attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`

// Simplex 3D noise (Ashima/webgl-noise, MIT) — shared preamble
const SIMPLEX_NOISE_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`

const AURORA_FRAG = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_indigo;
uniform float u_teal;
uniform float u_gold;
uniform float u_green;
uniform float u_noiseScale;
uniform float u_noiseSpeed;
uniform float u_bloomRadius;
${SIMPLEX_NOISE_GLSL}
void main() {
  vec2 uv = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
  uv.x *= u_resolution.x / u_resolution.y;
  float dist = length(uv);
  float falloff = smoothstep(u_bloomRadius, 0.0, dist);
  float t = u_time * u_noiseSpeed;
  float n1 = snoise(vec3(uv * u_noiseScale, t));
  float n2 = snoise(vec3(uv * u_noiseScale * 1.7 + 3.0, t * 0.8));
  float n3 = snoise(vec3(uv * u_noiseScale * 0.6 + 7.0, t * 1.2));
  vec3 color = vec3(0.0);
  color += u_indigo * vec3(0.31, 0.27, 0.78) * smoothstep(-0.2, 0.4, n1);
  color += u_teal   * vec3(0.18, 0.63, 0.63) * smoothstep(-0.1, 0.5, n2);
  color += u_gold   * vec3(0.78, 0.63, 0.24) * smoothstep(0.0, 0.6, n3);
  color += u_green  * vec3(0.24, 0.71, 0.47) * smoothstep(-0.3, 0.3, n1 * n2);
  float maxOpacity = max(max(u_indigo, u_teal), max(u_gold, u_green));
  gl_FragColor = vec4(color * falloff, falloff * maxOpacity);
}
`

const DEPTH_SCAN_FRAG = `
precision mediump float;
#define TWO_PI 6.28318530718
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scanSpeed;
uniform float u_colorIntensity;
uniform float u_depthNoiseScale;
uniform float u_grainIntensity;
uniform float u_bloomRadius;
${SIMPLEX_NOISE_GLSL}

float rand(float v) { return fract(sin(v) * 43758.5453123); }
float rand2(vec2 t) { return fract(sin(dot(t, vec2(12.9898, 78.233))) * 43758.5453123); }
float rand3(vec3 t) { return fract(sin(dot(t, vec3(12.9898, 78.233, 12.9898))) * 43758.5453123); }

vec2 lensDistort(vec2 uv, float power, float radInc) {
  float theta = atan(uv.y, uv.x);
  float radius = length(uv);
  radius = pow(radius, power) * radInc;
  uv.x = radius * cos(theta);
  uv.y = radius * sin(theta);
  return 0.5 * (uv + 1.0);
}

float streamLine(vec2 uv, float rows, float height, float sm) {
  vec2 uvs = uv * vec2(1.0, rows);
  float d = abs(0.5 - fract(uvs.y));
  return smoothstep(height - sm * 0.5, height + sm * 0.5, d);
}

float rect(vec2 uv, vec2 len, float sm) {
  float dx = abs(uv.x - 0.5);
  float dy = abs(uv.y - 0.5);
  return (1.0 - smoothstep(len.x - sm, len.x + sm, dx))
       * (1.0 - smoothstep(len.y - sm, len.y + sm, dy));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  uv = lensDistort(uv * 2.0 - 1.0, 1.1, 1.1);

  // Wave distortion
  float nLines = 100.0;
  vec2 iuv = floor(uv * nLines) / nLines;
  float amp = 0.00025 + rand(u_time) * 0.001;
  float wave = sin(TWO_PI * 20.0 * (iuv.y + u_time + rand(iuv.y) * 0.5 + 0.5)) * amp;
  uv.x += wave;
  uv.x += sin(TWO_PI * 0.75 * uv.y + u_time) * 0.005;

  // Depth from layered simplex noise
  float depth = snoise(vec3(uv * u_depthNoiseScale, u_time * 0.08)) * 0.4
              + snoise(vec3(uv * u_depthNoiseScale * 2.3 + 5.0, u_time * 0.05)) * 0.35
              + snoise(vec3(uv * u_depthNoiseScale * 0.7 + 11.0, u_time * 0.12)) * 0.25;
  depth = depth * 0.5 + 0.5; // normalize to 0-1

  // Depth slicing — sweeping target
  float cycleTime = 4.0 / u_scanSpeed;
  float target = 1.0 - fract(u_time / cycleTime);

  vec3 depthSlice = vec3(0.0);
  float smoothing = 0.05;
  float thickness = 0.125;
  for (int i = 0; i < 2; i++) {
    float fi = float(i) / 2.0;
    float ti = fract(fi + target) * pow(depth, 0.05);
    float df1 = smoothstep((ti - thickness * 0.5) - smoothing, (ti - thickness * 0.5) + smoothing, 1.0 - depth);
    float df2 = smoothstep((ti + thickness * 0.5) - smoothing, (ti + thickness * 0.5) + smoothing, 1.0 - depth);
    depthSlice += vec3(df1 - df2);
  }

  // Grain
  float grain = rand2(fract(uv * u_time)) * u_grainIntensity;

  // Stream lines
  vec2 nuv = uv + vec2(0.0, fract(u_time * 0.1));
  float sLines = clamp(streamLine(nuv, 2.0, 0.2, 0.25), 0.85, 1.0);
  vec2 nuvT = uv + vec2(0.0, fract(u_time * 0.15));
  float sLinesThick = clamp(streamLine(nuvT, 80.0, 0.15, 0.01), 0.85, 1.0);

  // Fine dot matrix — dense tiny dots that read as noise
  float dotCols = 200.0;
  float dotRatio = u_resolution.x / u_resolution.y;
  vec2 dotCr = vec2(dotCols, dotCols / dotRatio);
  vec2 dotGuv = uv * dotCr;
  vec2 dotFuv = fract(dotGuv) - 0.5;
  float dotDist = length(dotFuv);
  float dotMask = 1.0 - smoothstep(0.08, 0.12, dotDist);
  vec2 dotGiuv = floor(dotGuv);
  float dotFlicker = step(rand3(vec3(dotGiuv, floor(mod(u_time, 1000.0)))), 0.35);
  vec3 gridOverlay = vec3(dotMask * dotFlicker) * 0.2;

  // Teal core with iridescent shift
  vec3 tealBase = vec3(0.18, 0.48, 0.48);       // #2D7A7A brand teal
  vec3 cyanShift = vec3(0.12, 0.72, 0.68);      // cyan magic
  vec3 emeraldShift = vec3(0.15, 0.62, 0.38);   // emerald
  vec3 warmGold = vec3(0.65, 0.52, 0.25);       // warm accent

  // Iridescent blend driven by depth + noise
  float iridescence = sin(depth * 6.28 + u_time * 0.3) * 0.5 + 0.5;
  vec3 baseColor = mix(tealBase, cyanShift, iridescence * 0.6);
  baseColor = mix(baseColor, emeraldShift, smoothstep(0.4, 0.7, depth) * 0.3);
  baseColor += warmGold * smoothstep(0.6, 0.9, depthSlice.r) * 0.15;

  vec3 RGB = baseColor * pow(depthSlice.r, 1.3) * u_colorIntensity;

  // Circular containment with organic edge
  vec2 center = gl_FragCoord.xy / u_resolution.xy - 0.5;
  center.x *= u_resolution.x / u_resolution.y; // aspect correction
  float radialDist = length(center);
  float circleMask = smoothstep(u_bloomRadius * 0.5, u_bloomRadius * 0.15, radialDist);
  // Organic edge wobble from noise
  float edgeNoise = snoise(vec3(normalize(center) * 3.0, u_time * 0.2)) * 0.08;
  circleMask = smoothstep(0.0, 0.1, circleMask + edgeNoise);

  float falloff = 1.0;

  vec3 finalColor = (RGB + vec3(grain) + gridOverlay) * sLines * sLinesThick;
  float alpha = max(depthSlice.r * 0.9, grain * 0.3 + length(gridOverlay) * 0.5) * falloff * circleMask;
  gl_FragColor = vec4(finalColor * falloff * circleMask, alpha);
}
`

export function ScanOverlay() {
  const { scanState, scanAnimMode } = useTaxonomy()
  const [stage, setStage] = useState(0)
  const [previewMode, setPreviewMode] = useState(false)
  const [previewComplete, setPreviewComplete] = useState(false)

  /* ── DialKit controls ─────────────────────────────────── */
  const params = useDialKit("Scan Animation", {
    triggers: {
      playFull:        { type: "action" as const, label: "Play full sequence" },
      showTint:        { type: "action" as const, label: "Stage 1 — Dark wash" },
      showBloom:       { type: "action" as const, label: "Stage 2 — Aurora bloom" },
      showScanLine:    { type: "action" as const, label: "Stage 3 — Scan line" },
      showComplete:    { type: "action" as const, label: "Complete flash" },
      stop:            { type: "action" as const, label: "Stop preview" },
    },
    ambientTint: {
      opacity:         [DEFAULTS.tintOpacity, 0, 0.15],
    },
    auroraBloom: {
      indigoOpacity:   [DEFAULTS.indigoOpacity, 0, 0.4],
      tealOpacity:     [DEFAULTS.tealOpacity, 0, 0.4],
      goldOpacity:     [DEFAULTS.goldOpacity, 0, 0.4],
      greenOpacity:    [DEFAULTS.greenOpacity, 0, 0.4],
      noiseScale:      [DEFAULTS.noiseScale, 0.5, 4],
      noiseSpeed:      [DEFAULTS.noiseSpeed, 0.1, 1],
      bloomRadius:     [DEFAULTS.bloomRadius, 0.2, 1],
    },
    dotMatrix: {
      dotSize:         [DEFAULTS.dotSize, 1, 8],
      gridSpacing:     [DEFAULTS.gridSpacing, 8, 40],
      dotOpacity:      [DEFAULTS.dotOpacity, 0, 0.3],
      gridRadius:      [DEFAULTS.gridRadius, 100, 600],
    },
    scanLine: {
      sweepSpeed:      [DEFAULTS.sweepSpeed, 0.5, 6],
      lineOpacity:     [DEFAULTS.lineOpacity, 0, 1],
      glowWidth:       [DEFAULTS.glowWidth, 20, 150],
    },
    depthScan: {
      scanSpeed:       [0.39, 0.2, 3.0],
      colorIntensity:  [1.86, 0.3, 3.0],
      depthNoiseScale: [0.5, 0.5, 5.0],
      grainIntensity:  [0.3, 0, 0.3],
      bloomRadius:     [1.45, 0.2, 2.0],
    },
    flash: {
      flashOpacity:    [DEFAULTS.flashOpacity, 0, 0.3],
    },
    resetDefaults:   { type: "action" as const, label: "Reset to defaults" },
  }, {
    onAction: (action: string) => {
      if (action === "resetDefaults") {
        window.location.reload()
      }
      if (action === "triggers.stop") {
        setPreviewMode(false)
        setPreviewComplete(false)
        setStage(0)
      }
      if (action === "triggers.showTint") {
        setPreviewMode(true)
        setPreviewComplete(false)
        setStage(1)
      }
      if (action === "triggers.showBloom") {
        setPreviewMode(true)
        setPreviewComplete(false)
        setStage(2)
      }
      if (action === "triggers.showScanLine") {
        setPreviewMode(true)
        setPreviewComplete(false)
        setStage(3)
      }
      if (action === "triggers.showComplete") {
        setPreviewMode(true)
        setPreviewComplete(true)
        setStage(3)
      }
      if (action === "triggers.playFull") {
        setPreviewMode(true)
        setPreviewComplete(false)
        setStage(0)
        const timers: NodeJS.Timeout[] = []
        timers.push(setTimeout(() => setStage(1), TIMING.overlayFadeIn))
        timers.push(setTimeout(() => setStage(2), TIMING.centerBloom))
        timers.push(setTimeout(() => setStage(3), TIMING.linesEmerge))
        timers.push(setTimeout(() => {
          setPreviewComplete(true)
        }, 4000))
        timers.push(setTimeout(() => {
          setPreviewMode(false)
          setPreviewComplete(false)
          setStage(0)
        }, 5500))
      }
    },
  })

  /* ── Stage sequencing (real scan — skipped during preview) ── */
  useEffect(() => {
    if (previewMode) return
    if (scanState.status !== "scanning") {
      setStage(0)
      return
    }

    setStage(0)
    const timers: NodeJS.Timeout[] = []

    timers.push(setTimeout(() => setStage(1), TIMING.overlayFadeIn))
    timers.push(setTimeout(() => setStage(2), TIMING.centerBloom))
    timers.push(setTimeout(() => setStage(3), TIMING.linesEmerge))

    return () => timers.forEach(clearTimeout)
  }, [scanState.status, previewMode])

  const isScanning = previewMode || scanState.status === "scanning"
  const isComplete = previewComplete || scanState.status === "complete"
  const isVisible = isScanning || isComplete

  /* ── WebGL Aurora Noise Field ─────────────────────────────── */
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<{
    gl: WebGLRenderingContext | WebGL2RenderingContext
    program: WebGLProgram
    uniforms: Record<string, WebGLUniformLocation | null>
    raf: number
    startTime: number
  } | null>(null)

  const showBloom = stage >= 2 && !isComplete

  useEffect(() => {
    if (!showBloom) {
      if (glRef.current) {
        cancelAnimationFrame(glRef.current.raf)
        const ext = glRef.current.gl.getExtension("WEBGL_lose_context")
        if (ext) ext.loseContext()
        glRef.current = null
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl")
    if (!gl) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      return s
    }

    const fragSrc = scanAnimMode === "depthScan" ? DEPTH_SCAN_FRAG : AURORA_FRAG
    const uniformNames = scanAnimMode === "depthScan"
      ? ["u_resolution", "u_time", "u_scanSpeed", "u_colorIntensity", "u_depthNoiseScale", "u_grainIntensity", "u_bloomRadius"]
      : ["u_resolution", "u_time", "u_indigo", "u_teal", "u_gold", "u_green", "u_noiseScale", "u_noiseSpeed", "u_bloomRadius"]

    const vs = compile(gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc)
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, "a_pos")
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const uniforms: Record<string, WebGLUniformLocation | null> = {}
    for (const name of uniformNames) {
      uniforms[name] = gl.getUniformLocation(prog, name)
    }

    const startTime = performance.now() / 1000
    glRef.current = { gl, program: prog, uniforms, raf: 0, startTime }

    const render = () => {
      if (!glRef.current) return
      const { gl: g, uniforms: u, startTime: st } = glRef.current

      g.clearColor(0, 0, 0, 0)
      g.clear(g.COLOR_BUFFER_BIT)
      g.uniform2f(u.u_resolution, canvas.width, canvas.height)
      g.uniform1f(u.u_time, performance.now() / 1000 - st)

      if (scanAnimMode === "depthScan") {
        g.uniform1f(u.u_scanSpeed, params.depthScan.scanSpeed)
        g.uniform1f(u.u_colorIntensity, params.depthScan.colorIntensity)
        g.uniform1f(u.u_depthNoiseScale, params.depthScan.depthNoiseScale)
        g.uniform1f(u.u_grainIntensity, params.depthScan.grainIntensity)
        g.uniform1f(u.u_bloomRadius, params.depthScan.bloomRadius)
      } else {
        g.uniform1f(u.u_indigo, params.auroraBloom.indigoOpacity)
        g.uniform1f(u.u_teal, params.auroraBloom.tealOpacity)
        g.uniform1f(u.u_gold, params.auroraBloom.goldOpacity)
        g.uniform1f(u.u_green, params.auroraBloom.greenOpacity)
        g.uniform1f(u.u_noiseScale, params.auroraBloom.noiseScale)
        g.uniform1f(u.u_noiseSpeed, params.auroraBloom.noiseSpeed)
        g.uniform1f(u.u_bloomRadius, params.auroraBloom.bloomRadius)
      }

      g.drawArrays(g.TRIANGLE_STRIP, 0, 4)
      glRef.current!.raf = requestAnimationFrame(render)
    }

    glRef.current.raf = requestAnimationFrame(render)

    return () => {
      window.removeEventListener("resize", resize)
      if (glRef.current) {
        cancelAnimationFrame(glRef.current.raf)
        const ext = glRef.current.gl.getExtension("WEBGL_lose_context")
        if (ext) ext.loseContext()
        glRef.current = null
      }
    }
  }, [showBloom, scanAnimMode]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Dot matrix CSS ─────────────────────────────────────── */
  const dotMatrixStyle = useMemo(() => ({
    backgroundImage: `radial-gradient(circle, rgba(45, 122, 122, ${params.dotMatrix.dotOpacity}) ${params.dotMatrix.dotSize / 2}px, transparent ${params.dotMatrix.dotSize / 2}px)`,
    backgroundSize: `${params.dotMatrix.gridSpacing}px ${params.dotMatrix.gridSpacing}px`,
    maskImage: `radial-gradient(circle ${params.dotMatrix.gridRadius}px at 50% 50%, black 0%, transparent 100%)`,
    WebkitMaskImage: `radial-gradient(circle ${params.dotMatrix.gridRadius}px at 50% 50%, black 0%, transparent 100%)`,
  }), [params.dotMatrix.dotSize, params.dotMatrix.gridSpacing, params.dotMatrix.dotOpacity, params.dotMatrix.gridRadius])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", visualDuration: 0.3, bounce: 0 }}
        >
          {/* Layer 1: Subtle ambient tint */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: stage >= 1 ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            style={{
              background: `rgba(45, 122, 122, ${params.ambientTint.opacity})`,
            }}
          />

          {/* Layer 2: Aurora/DepthScan bloom — WebGL simplex noise field */}
          {showBloom && scanAnimMode !== "dithering" && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
              }}
            >
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />
            </motion.div>
          )}

          {/* Layer 2 alt: Paper Dithering shader */}
          {showBloom && scanAnimMode === "dithering" && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
              }}
            >
              <Dithering
                speed={0.84}
                shape="simplex"
                type="random"
                size={0.5}
                scale={3}
                colorFront="#4A9B8B66"
                colorBack="#00000000"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              />
            </motion.div>
          )}

          {/* Layer 2b: Dot matrix grid */}
          {stage >= 2 && !isComplete && scanAnimMode !== "dithering" && (
            <motion.div
              className="absolute inset-0"
              style={dotMatrixStyle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            />
          )}

          {/* Layer 3: Scan line — L→R sweep with eased timing */}
          {stage >= 3 && !isComplete && scanAnimMode !== "depthScan" && scanAnimMode !== "dithering" && (
            <motion.div
              className="absolute inset-y-0"
              style={{ width: SCAN.lineWidth + params.scanLine.glowWidth + SCAN.trailWidth }}
              initial={{ left: "-10%", opacity: 0 }}
              animate={{ left: ["-10%", "110%"], opacity: params.scanLine.lineOpacity }}
              transition={{
                left: {
                  duration: params.scanLine.sweepSpeed,
                  ease: [0.25, 0.1, 0.25, 1],
                  repeat: Infinity,
                  repeatDelay: 0.3,
                },
                opacity: { duration: 0.2 },
              }}
            >
              {/* Trail — gradient with aurora hues */}
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: SCAN.trailWidth,
                  background: `linear-gradient(90deg, transparent, rgba(80, 70, 200, 0.03), rgba(45, 160, 160, 0.05), rgba(200, 160, 60, 0.03))`,
                }}
              />
              {/* Glow — wider, blue/teal halo */}
              <div
                className="absolute inset-y-0"
                style={{
                  left: SCAN.trailWidth,
                  width: params.scanLine.glowWidth,
                  background: `linear-gradient(90deg, rgba(80, 70, 200, 0.06), rgba(45, 160, 160, 0.12), rgba(80, 70, 200, 0.06))`,
                }}
              />
              {/* Line — teal core with color glow */}
              <div
                className="absolute inset-y-0"
                style={{
                  left: SCAN.trailWidth + params.scanLine.glowWidth / 2,
                  width: SCAN.lineWidth,
                  background: `rgba(45, 122, 122, ${params.scanLine.lineOpacity})`,
                  boxShadow: `0 0 8px rgba(45, 160, 160, 0.3), 0 0 20px rgba(80, 70, 200, 0.15)`,
                }}
              />
            </motion.div>
          )}

          {/* Layer 4: Complete flash — soft teal pulse */}
          {isComplete && (
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: params.flash.flashOpacity * 2 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              style={{ background: `rgba(45, 122, 122, ${params.flash.flashOpacity})` }}
            />
          )}

          {/* Progress pill — pulsing dot only, no percentage */}
          {!isComplete && stage >= 1 && (
            <motion.div
              className="absolute top-3 right-3 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5 shadow-sm"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", visualDuration: 0.3, bounce: 0.15 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#2D7A7A] animate-pulse" />
              <span className="text-xs font-medium text-[#2D7A7A]">Scanning</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
