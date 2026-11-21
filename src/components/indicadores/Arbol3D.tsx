import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Árbol 3D procedural de la ficha biométrica (SIVU). Recurso ORIGINAL: ramas generadas
 * por algoritmo y texturas de hojas, pasto, corteza y baldosas dibujadas en
 * canvas; no usa modelos ni imágenes de terceros. Esquema ilustrativo, no a
 * escala: la forma no representa las medidas del árbol. La estructura sigue el
 * grupo morfológico de la especie (latifoliada, araucaria, conífera o palmera).
 *
 * - Copa de tarjetas de hojas instanciadas con luz, sombras y viento (shader).
 * - Tronco y raíces orgánicos; plataforma isométrica con pasto.
 * - Zonas por raycasting (copa, tronco, raíces y suelo); arrastrar gira la escena.
 * - Partículas de CO₂ hacia la copa al explorar la captura anual.
 * - El árbol crece al aparecer. Con movimiento reducido no hay animación.
 * - Pausa el render fuera de pantalla o con la pestaña oculta.
 */

export type Zona = "copa" | "tronco" | "raices";

/**
 * Grupo morfológico de la ilustración (no reconstruye el ejemplar):
 * latifoliada (copa ramificada); araucaria en candelabro (A. angustifolia y
 * A. araucana: fuste despejado, verticilos altos con ramas que se curvan hacia
 * arriba y mechones de agujas en las puntas); araucaria piramidal
 * (A. heterophylla y otras: pisos horizontales simétricos de ramillas con
 * agujas), o palmera. Las araucarias usan follaje de agujas, no de hojas.
 */
export type Forma = "latifoliada" | "araucaria" | "araucaria_piramidal" | "palmera";

interface Props {
  semilla: string;
  forma?: Forma;
  zona: Zona | null;
  onZona: (z: Zona | null) => void;
  captura: boolean;
}

function aleatorio(semilla: string) {
  let h = 1779033703 ^ semilla.length;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 3432918353);
  let a = (h << 13) | (h >>> 19);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- Texturas dibujadas en canvas (originales) ---------------- */

function texturaHojas(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const rnd = aleatorio("hojas-sivu");
  // Ramillete de hojas puntiagudas en escala de grises: el color lo pone cada instancia.
  const hoja = (x: number, y: number, ang: number, l: number, w: number, tono: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    const grad = g.createLinearGradient(-w, 0, w, 0);
    grad.addColorStop(0, `rgb(${tono - 40},${tono - 40},${tono - 40})`);
    grad.addColorStop(0.5, `rgb(${tono},${tono},${tono})`);
    grad.addColorStop(1, `rgb(${tono - 60},${tono - 60},${tono - 60})`);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 0);
    g.bezierCurveTo(w, -l * 0.25, w * 0.8, -l * 0.75, 0, -l);
    g.bezierCurveTo(-w * 0.8, -l * 0.75, -w, -l * 0.25, 0, 0);
    g.fill();
    g.strokeStyle = `rgba(60,60,60,0.35)`;
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(0, -2);
    g.lineTo(0, -l * 0.9);
    g.stroke();
    g.restore();
  };
  for (let i = 0; i < 16; i++) {
    const ang = (rnd() - 0.5) * 2.6;
    const r = 30 + rnd() * 70;
    const x = 128 + Math.sin(ang) * r * 0.6;
    const y = 200 - Math.cos(ang) * r * 0.5;
    hoja(x, y, ang + (rnd() - 0.5) * 0.6, 46 + rnd() * 26, 15 + rnd() * 8, 190 + Math.round(rnd() * 60));
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Ramilla de araucaria: eje central con escamas y agujas apretadas a ambos lados (escala de grises). */
function texturaAgujas(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  const rnd = aleatorio("agujas-sivu");
  g.lineCap = "round";
  // Eje
  g.strokeStyle = "rgb(150,150,150)";
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(64, 252);
  g.quadraticCurveTo(60, 128, 64, 6);
  g.stroke();
  // Agujas: cortas, rígidas, inclinadas hacia la punta; más cortas arriba.
  for (let i = 0; i < 150; i++) {
    const t = rnd();
    const y = 250 - t * 240;
    const x = 64 + Math.sin(t * 3) * 2;
    const lado = rnd() > 0.5 ? 1 : -1;
    const largo = (1 - t * 0.55) * (16 + rnd() * 12);
    const ang = lado * (0.55 + rnd() * 0.45);
    const tono = 150 + Math.round(rnd() * 100);
    g.strokeStyle = `rgb(${tono},${tono},${tono})`;
    g.lineWidth = 3 + rnd() * 2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.sin(ang) * largo, y - Math.cos(ang) * largo);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function texturaPasto(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const g = c.getContext("2d")!;
  const rnd = aleatorio("pasto-sivu");
  for (let i = 0; i < 22; i++) {
    const x = 14 + rnd() * 100;
    const h = 120 + rnd() * 130;
    const curva = (rnd() - 0.5) * 50;
    const w = 4 + rnd() * 5;
    const tono = 170 + Math.round(rnd() * 80);
    const grad = g.createLinearGradient(0, 256, 0, 256 - h);
    grad.addColorStop(0, `rgb(${tono - 90},${tono - 90},${tono - 90})`);
    grad.addColorStop(1, `rgb(${tono},${tono},${tono})`);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x - w, 256);
    g.quadraticCurveTo(x + curva * 0.4, 256 - h * 0.5, x + curva, 256 - h);
    g.quadraticCurveTo(x + curva * 0.4 + w * 0.5, 256 - h * 0.5, x + w, 256);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texturaBaldosas(): THREE.CanvasTexture {
  // Superficie de pasto pintada: verde claro con manchas suaves y algunas hojas caídas.
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  const rnd = aleatorio("base-sivu");
  g.fillStyle = "#a3d47c";
  g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 70; k++) {
    const x = rnd() * 512;
    const y = rnd() * 512;
    const r = 18 + rnd() * 40;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    const claro = rnd() > 0.5;
    rg.addColorStop(0, claro ? "rgba(196,232,150,0.55)" : "rgba(120,180,90,0.35)");
    rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  for (let k = 0; k < 14; k++) {
    g.save();
    g.translate(rnd() * 512, rnd() * 512);
    g.rotate(rnd() * Math.PI * 2);
    g.fillStyle = rnd() > 0.5 ? "rgba(214,196,96,0.85)" : "rgba(196,176,80,0.8)";
    g.beginPath();
    g.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function texturaCorteza(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const g = c.getContext("2d")!;
  const rnd = aleatorio("corteza-sivu");
  g.fillStyle = "#9c968b";
  g.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * 64;
    const l = 70 + Math.round(rnd() * 60);
    g.strokeStyle = `rgba(${l},${Math.round(l * 0.72)},${Math.round(l * 0.48)},0.55)`;
    g.lineWidth = 1 + rnd() * 2.5;
    g.beginPath();
    g.moveTo(x, rnd() * 256);
    g.lineTo(x + (rnd() - 0.5) * 6, rnd() * 256);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------------- Viento en el vertex shader (hojas y pasto) ---------------- */

function conViento(mat: THREE.Material, amplitud: number, uTime: { value: number }) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 ip = vec3(instanceMatrix[3]);
  float w = sin(uTime * 1.5 + ip.x * 1.3 + ip.y * 0.9) * ${amplitud.toFixed(3)} + sin(uTime * 2.6 + ip.z * 1.9) * ${(amplitud * 0.45).toFixed(3)};
  transformed.x += w * (0.6 + position.y);
  transformed.z += w * 0.5 * (0.6 + position.y);
#endif`
    );
  };
}

/* ---------------- Escena ---------------- */

interface Escena {
  setZona: (z: Zona | null) => void;
  setCaptura: (v: boolean) => void;
  dispose: () => void;
}

function crearEscena(host: HTMLDivElement, semilla: string, forma: Forma, onZona: (z: Zona | null) => void): Escena | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camara.position.set(13, 10.5, 13);
  camara.lookAt(0, 4.3, 0);

  // Luz cálida desde arriba a la izquierda, como el resto de las ilustraciones de SIVU.
  scene.add(new THREE.HemisphereLight(0xfff8e8, 0xc9dcaa, 1.45));
  scene.add(new THREE.AmbientLight(0xfff6e0, 0.38));
  const sol = new THREE.DirectionalLight(0xfff1d6, 2.4);
  sol.position.set(-9, 17, 8);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.camera.left = -9;
  sol.shadow.camera.right = 9;
  sol.shadow.camera.top = 13;
  sol.shadow.camera.bottom = -4;
  sol.shadow.camera.far = 40;
  sol.shadow.bias = -0.0006;
  sol.shadow.radius = 4;
  scene.add(sol);

  const rnd = aleatorio(semilla);
  const uTime = { value: 0 };
  const raiz = new THREE.Group();
  scene.add(raiz);
  // El árbol se dibuja más grande que la plataforma, como protagonista.
  const ESCALA = 1.55;
  const arbol = new THREE.Group();
  arbol.scale.setScalar(ESCALA);
  raiz.add(arbol);
  const texturas = [texturaHojas(), texturaPasto(), texturaBaldosas(), texturaCorteza(), texturaAgujas()];
  const [texHojas, texPasto, texBaldosas, texCorteza, texAgujas] = texturas;
  const esAraucaria = forma === "araucaria" || forma === "araucaria_piramidal";
  // Dirección de crecimiento de cada punta (solo araucarias): orienta las ramillas de agujas.
  const direcciones: THREE.Vector3[] = [];

  // Base isométrica limpia: pasto pintado arriba y tierra clara a los lados.
  const ladoMat = new THREE.MeshStandardMaterial({ color: 0xc8ad84, roughness: 0.95 });
  const ladoMat2 = new THREE.MeshStandardMaterial({ color: 0xb0956c, roughness: 0.95 });
  const topeMat = new THREE.MeshStandardMaterial({ map: texBaldosas, roughness: 0.95 });
  const plataforma = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.42, 4.6), [ladoMat, ladoMat2, topeMat, ladoMat, ladoMat2, ladoMat]);
  plataforma.position.y = -0.21;
  plataforma.receiveShadow = true;
  raiz.add(plataforma);

  // Ramas: recursión con segmentos que se adelgazan
  const geomRamas: THREE.BufferGeometry[] = [];
  const puntas: THREE.Vector3[] = [];
  const arriba = new THREE.Vector3(0, 1, 0);
  const segmento = (a: THREE.Vector3, b: THREE.Vector3, ra: number, rb: number) => {
    const largo = a.distanceTo(b);
    const geo = new THREE.CylinderGeometry(rb, ra, largo, 9, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(arriba, b.clone().sub(a).normalize());
    geo.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    geomRamas.push(geo);
  };
  const largoTronco = 1.65 + rnd() * 0.3;
  const rama = (inicio: THREE.Vector3, dir: THREE.Vector3, largo: number, radio: number, nivel: number) => {
    const pasos = nivel === 0 ? 5 : 3;
    let p = inicio.clone();
    let d = dir.clone();
    let r = radio;
    for (let i = 0; i < pasos; i++) {
      d.add(new THREE.Vector3((rnd() - 0.5) * 0.35, 0.12, (rnd() - 0.5) * 0.35)).normalize();
      const q = p.clone().add(d.clone().multiplyScalar(largo / pasos));
      const r2 = r * (nivel === 0 ? 0.9 : 0.8);
      segmento(p, q, r, r2);
      if (nivel >= 1 && i >= 1) puntas.push(q.clone());
      p = q;
      r = r2;
    }
    if (nivel >= 4 || r < 0.035) {
      puntas.push(p);
      return;
    }
    const hijos = nivel === 0 ? 5 : 2 + (rnd() > 0.5 ? 1 : 0);
    for (let k = 0; k < hijos; k++) {
      const az = (k / hijos) * Math.PI * 2 + rnd() * 1.2;
      // El primer hijo sigue casi vertical (eje central): copa redonda, no en sombrilla.
      const incl = k === 0 ? 0.12 + rnd() * 0.15 : (nivel === 0 ? 1.12 : 0.65) + rnd() * 0.3;
      const nd = new THREE.Vector3(Math.cos(az) * Math.sin(incl), Math.cos(incl), Math.sin(az) * Math.sin(incl)).add(d.clone().multiplyScalar(0.5)).normalize();
      rama(p, nd, largo * (nivel === 0 ? 1.05 : 0.7), r * (nivel === 0 ? 0.62 : 0.72), nivel + 1);
    }
    if (nivel >= 2) puntas.push(p);
  };
  // Fuste recto por segmentos (araucaria, conífera y palmera).
  const fuste = (alto: number, r0: number, r1: number, inclinacion = 0) => {
    const n = 7;
    let p = new THREE.Vector3(0, 0, 0);
    const lean = new THREE.Vector3(inclinacion, 0, inclinacion * 0.4);
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n;
      const q = new THREE.Vector3(lean.x * t * t * alto, alto * t, lean.z * t * t * alto);
      segmento(p, q, r0 + (r1 - r0) * (i / n), r0 + (r1 - r0) * t);
      p = q;
    }
    return p;
  };
  if (forma === "araucaria") {
    // Fuste largo y despejado; verticilos solo en lo alto, con ramas que salen casi horizontales y se curvan hacia arriba: copa plana en candelabro.
    const alto = 3.9 + rnd() * 0.3;
    const cima = fuste(alto, 0.24, 0.09);
    const niveles = 5;
    for (let v = 0; v < niveles; v++) {
      const y = alto - 0.9 + v * 0.2;
      const nRamas = 6;
      const largo = 1.55 - v * 0.2;
      for (let k = 0; k < nRamas; k++) {
        const az = (k / nRamas) * Math.PI * 2 + v * 0.55 + rnd() * 0.3;
        const ini = new THREE.Vector3(0, y, 0);
        const codo = new THREE.Vector3(Math.cos(az) * largo, y + 0.18 + rnd() * 0.08, Math.sin(az) * largo);
        segmento(ini, codo, 0.075, 0.045);
        const punta = new THREE.Vector3(codo.x * 1.08, alto + 0.2 + rnd() * 0.15, codo.z * 1.08);
        segmento(codo, punta, 0.045, 0.02);
        // Mechones de agujas solo en el extremo curvado de cada rama, mirando hacia arriba y afuera.
        const afuera = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
        for (const t of [0.55, 0.8, 1]) {
          puntas.push(codo.clone().lerp(punta, t));
          direcciones.push(afuera.clone().multiplyScalar(0.95).add(new THREE.Vector3(0, 1, 0)).normalize());
        }
      }
    }
    puntas.push(cima);
    direcciones.push(new THREE.Vector3(0, 1, 0));
  } else if (forma === "araucaria_piramidal") {
    // Pisos horizontales y simétricos: verticilos regulares de 5 ramas que se acortan hacia la punta.
    const alto = 4.6 + rnd() * 0.4;
    const cima = fuste(alto, 0.28, 0.05);
    const desde = 0.9;
    for (let y = desde, v = 0; y < alto - 0.2; y += 0.34, v++) {
      const f = 1 - (y - desde) / (alto - desde);
      const largo = 0.25 + 1.55 * f;
      const nRamas = 5;
      for (let k = 0; k < nRamas; k++) {
        const az = (k / nRamas) * Math.PI * 2 + v * 0.63;
        const ini = new THREE.Vector3(0, y, 0);
        const fin = new THREE.Vector3(Math.cos(az) * largo, y - 0.08 * f, Math.sin(az) * largo);
        segmento(ini, fin, 0.05 * (0.4 + f), 0.015);
        const afuera = new THREE.Vector3(Math.cos(az), -0.12, Math.sin(az)).normalize();
        for (let j = 1; j <= 4; j++) {
          puntas.push(ini.clone().lerp(fin, 0.2 + (0.8 * j) / 4));
          direcciones.push(afuera);
        }
      }
    }
    puntas.push(cima);
    direcciones.push(new THREE.Vector3(0, 1, 0));
  } else if (forma === "palmera") {
    // Estípite grueso sin ramas y corona de frondas arqueadas.
    const alto = 3.9 + rnd() * 0.4;
    const cima = fuste(alto, 0.34, 0.3, 0.05);
    const nFrondas = 15;
    for (let k = 0; k < nFrondas; k++) {
      const az = (k / nFrondas) * Math.PI * 2 + rnd() * 0.2;
      const subida = 0.35 + rnd() * 0.5;
      const largo = 1.9 + rnd() * 0.4;
      let prev = cima.clone();
      for (let j = 1; j <= 8; j++) {
        const t = j / 8;
        const q = new THREE.Vector3(cima.x + Math.cos(az) * largo * t, cima.y + subida * t - 1.25 * t * t, cima.z + Math.sin(az) * largo * t);
        segmento(prev, q, 0.035 * (1 - t) + 0.01, 0.035 * (1 - t) + 0.008);
        puntas.push(q.clone());
        prev = q;
      }
    }
  } else {
    rama(new THREE.Vector3(0, 0, 0), arriba.clone(), largoTronco, 0.4, 0);
  }

  const cortezaMat = new THREE.MeshStandardMaterial({ map: texCorteza, color: 0xe2dccf, roughness: 0.9 });
  const tronco = new THREE.Mesh(mergeGeometries(geomRamas), cortezaMat);
  tronco.castShadow = true;
  tronco.receiveShadow = true;
  arbol.add(tronco);

  // Raíces: ensanchamiento de la base que se hunde en las baldosas
  const geomRaices: THREE.BufferGeometry[] = [];
  const nRaices = 6;
  for (let k = 0; k < nRaices; k++) {
    const az = (k / nRaices) * Math.PI * 2 + rnd() * 0.5;
    const a = new THREE.Vector3(Math.cos(az) * 0.12, 0.42, Math.sin(az) * 0.12);
    // Las palmeras no tienen contrafuertes: base más recogida.
    const alcance = forma === "palmera" ? 0.42 : 0.75;
    const b = new THREE.Vector3(Math.cos(az) * (alcance + rnd() * 0.3), -0.06, Math.sin(az) * (alcance + rnd() * 0.3));
    const largo = a.distanceTo(b);
    const geo = new THREE.CylinderGeometry(0.03, 0.15, largo, 7);
    const q = new THREE.Quaternion().setFromUnitVectors(arriba, b.clone().sub(a).normalize());
    geo.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    geomRaices.push(geo);
  }
  const raicesMat = new THREE.MeshStandardMaterial({ map: texCorteza, color: 0xd6cfc0, roughness: 0.9 });
  const raices = new THREE.Mesh(mergeGeometries(geomRaices), raicesMat);
  raices.castShadow = true;
  raices.receiveShadow = true;
  arbol.add(raices);

  // Copa: tarjetas de hojas alrededor de cada punta, más claras arriba y al lado del sol
  const estilo =
    forma === "palmera"
      ? { porPunta: 6, disp: [0.32, 0.12, 0.32], esc: [0.38, 0.22] }
      : forma === "araucaria"
        ? { porPunta: Math.max(7, Math.round(900 / Math.max(1, puntas.length))), disp: [0.16, 0.1, 0.16], esc: [0.4, 0.22] }
        : forma === "araucaria_piramidal"
          ? { porPunta: Math.max(5, Math.round(1100 / Math.max(1, puntas.length))), disp: [0.18, 0.05, 0.18], esc: [0.42, 0.22] }
          : { porPunta: Math.max(14, Math.round(1500 / Math.max(1, puntas.length))), disp: [1.3, 1.0, 1.3], esc: [0.75, 0.55] };
  const porPunta = estilo.porPunta;
  // Relleno de la copa: hojas extra en el contorno, sobre todo en los bordes y abajo.
  const RELLENO = 0;
  const total = puntas.length * porPunta + RELLENO;
  const texCopa = esAraucaria ? texAgujas : texHojas;
  const hojasMat = new THREE.MeshLambertMaterial({ map: texCopa, alphaTest: 0.42, side: THREE.DoubleSide });
  const hojasProf = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texCopa, alphaTest: 0.42 });
  conViento(hojasMat, movimientoReducido ? 0 : 0.035, uTime);
  conViento(hojasProf, movimientoReducido ? 0 : 0.035, uTime);
  // Araucarias: ramillas alargadas que nacen en la punta (base en el origen); latifoliadas: ramilletes centrados.
  const geoCopa = esAraucaria ? new THREE.PlaneGeometry(0.42, 1).translate(0, 0.5, 0) : new THREE.PlaneGeometry(1, 1).translate(0, 0.35, 0);
  const hojas = new THREE.InstancedMesh(geoCopa, hojasMat, total);
  hojas.customDepthMaterial = hojasProf;
  hojas.castShadow = true;
  hojas.receiveShadow = true;
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  // Rampa de verdes luminosa: la parte en sombra queda en verdes medios, no casi negros.
  // Araucarias: verde azulado oscuro de conífera, claramente distinto del verde de las latifoliadas.
  const claro = new THREE.Color(esAraucaria ? "#8db592" : forma === "palmera" ? "#c3e08a" : "#d6ec9e");
  const medio = new THREE.Color(esAraucaria ? "#5c8c6c" : forma === "palmera" ? "#93c25f" : "#a2cf68");
  const oscuro = new THREE.Color(esAraucaria ? "#3d6a55" : forma === "palmera" ? "#6f9f4a" : "#7aad52");
  const sombra = new THREE.Color(esAraucaria ? "#2b5244" : forma === "palmera" ? "#5b8a40" : "#649a49");
  const yMax = Math.max(...puntas.map((p) => p.y));
  const yMin = Math.min(...puntas.map((p) => p.y));
  let idx = 0;
  const eje = new THREE.Vector3(0, 1, 0);
  const colocar = (pos: THREE.Vector3, s: number, dir?: THREE.Vector3) => {
    if (dir) {
      // Ramilla orientada en la dirección de crecimiento, con un giro aleatorio sobre su eje.
      const d = dir.clone().add(new THREE.Vector3((rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.35, (rnd() - 0.5) * 0.5)).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(eje, d);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(eje, rnd() * Math.PI * 2));
      m.compose(pos, q, new THREE.Vector3(s, s, s));
    } else {
      const e = new THREE.Euler(rnd() * Math.PI, rnd() * Math.PI * 2, rnd() * Math.PI);
      m.compose(pos, new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(s, s, s));
    }
    hojas.setMatrixAt(idx, m);
    // Luz: altura relativa y orientación hacia el sol (-x, +z).
    const alto = THREE.MathUtils.clamp((pos.y - yMin) / Math.max(0.1, yMax - yMin), 0, 1);
    const sol = THREE.MathUtils.clamp(0.5 + (-pos.x * 0.12 + pos.z * 0.1), 0, 1);
    const l = THREE.MathUtils.clamp(alto * 0.55 + sol * 0.35 + 0.12 + (rnd() - 0.5) * 0.25, 0, 1);
    if (l > 0.66) col.copy(medio).lerp(claro, (l - 0.66) / 0.34);
    else if (l > 0.33) col.copy(oscuro).lerp(medio, (l - 0.33) / 0.33);
    else col.copy(sombra).lerp(oscuro, l / 0.33);
    hojas.setColorAt(idx, col);
    idx++;
  };
  puntas.forEach((p, i) => {
    for (let k = 0; k < porPunta; k++) {
      const off = new THREE.Vector3((rnd() - 0.5) * estilo.disp[0], (rnd() - 0.55) * estilo.disp[1], (rnd() - 0.5) * estilo.disp[2]);
      colocar(p.clone().add(off), estilo.esc[0] + rnd() * estilo.esc[1], esAraucaria ? direcciones[i] : undefined);
    }
  });
  // Contorno de la copa (elipsoide de las puntas): más hojas abajo y en los costados.
  const cx = puntas.reduce((a, p) => a + p.x, 0) / puntas.length;
  const cz = puntas.reduce((a, p) => a + p.z, 0) / puntas.length;
  const rx = Math.max(...puntas.map((p) => Math.abs(p.x - cx))) + 0.7;
  const rz = Math.max(...puntas.map((p) => Math.abs(p.z - cz))) + 0.7;
  const cy = (yMax + yMin) / 2;
  const ry = (yMax - yMin) / 2 + 0.75;
  for (let k = 0; k < RELLENO; k++) {
    const t = rnd() * Math.PI * 2;
    const y = -1 + 1.55 * Math.pow(rnd(), 1.35); // sesgo hacia abajo y al ecuador
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const f = 0.8 + rnd() * 0.22;
    colocar(new THREE.Vector3(cx + Math.cos(t) * r * rx * f, cy + y * ry * f, cz + Math.sin(t) * r * rz * f), 0.7 + rnd() * 0.5);
  }
  hojas.instanceMatrix.needsUpdate = true;
  if (hojas.instanceColor) hojas.instanceColor.needsUpdate = true;
  arbol.add(hojas);

  // Pocas matas de pasto, solo en las esquinas de la base: sin ruido visual.
  const pastoMat = new THREE.MeshLambertMaterial({ map: texPasto, alphaTest: 0.5, side: THREE.DoubleSide });
  conViento(pastoMat, movimientoReducido ? 0 : 0.04, uTime);
  const geoMata = mergeGeometries([new THREE.PlaneGeometry(0.5, 0.42).translate(0, 0.21, 0), new THREE.PlaneGeometry(0.5, 0.42).translate(0, 0.21, 0).rotateY(Math.PI / 2)]);
  const nMatas = 14;
  const pasto = new THREE.InstancedMesh(geoMata, pastoMat, nMatas);
  for (let k = 0; k < nMatas; k++) {
    const esquina = k % 4;
    const sx = esquina % 2 ? 1 : -1;
    const sz = esquina < 2 ? 1 : -1;
    const x = sx * (1.4 + rnd() * 0.7);
    const z = sz * (1.4 + rnd() * 0.7);
    const sc = 0.7 + rnd() * 0.6;
    m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rnd() * Math.PI, 0)), new THREE.Vector3(sc, sc, sc));
    pasto.setMatrixAt(k, m);
    pasto.setColorAt(k, col.set(rnd() > 0.5 ? "#86c862" : "#9fd474"));
  }
  pasto.receiveShadow = true;
  raiz.add(pasto);

  // Partículas de CO₂ (conceptuales, no cuantitativas): se acercan lentamente a la copa
  // y desaparecen con un destello verde tenue. En reposo son pocas y tenues; al explorar
  // la captura anual se intensifican levemente.
  const nP = 64;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(nP * 3);
  const pAlfa = new Float32Array(nP);
  const pTam = new Float32Array(nP);
  const pDest = new Float32Array(nP);
  const pVida = new Float32Array(nP);
  const pRitmo = new Float32Array(nP);
  const pIni: THREE.Vector3[] = [];
  const pFin: THREE.Vector3[] = [];
  const copaC = new THREE.Vector3(cx, cy, cz).multiplyScalar(ESCALA);
  for (let k = 0; k < nP; k++) {
    const t = rnd() * Math.PI * 2;
    const r = 6.5 + rnd() * 2.5;
    pIni.push(new THREE.Vector3(Math.cos(t) * r, copaC.y + (rnd() - 0.45) * 6, Math.sin(t) * r));
    // Destino: un punto del contorno de la copa, del lado de donde viene la partícula.
    const d = new THREE.Vector3(Math.cos(t + (rnd() - 0.5) * 0.8), (rnd() - 0.4) * 0.9, Math.sin(t + (rnd() - 0.5) * 0.8)).normalize();
    pFin.push(new THREE.Vector3(copaC.x + d.x * rx * ESCALA * 0.8, copaC.y + d.y * ry * ESCALA * 0.8, copaC.z + d.z * rz * ESCALA * 0.8));
    pVida[k] = rnd();
    pRitmo[k] = 0.8 + rnd() * 0.4;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("aAlfa", new THREE.BufferAttribute(pAlfa, 1));
  pGeo.setAttribute("aTam", new THREE.BufferAttribute(pTam, 1));
  pGeo.setAttribute("aDest", new THREE.BufferAttribute(pDest, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uDpr: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute float aAlfa;
      attribute float aTam;
      attribute float aDest;
      uniform float uDpr;
      varying float vAlfa;
      varying float vDest;
      void main() {
        vAlfa = aAlfa;
        vDest = aDest;
        gl_PointSize = aTam * uDpr * 2.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying float vAlfa;
      varying float vDest;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float nucleo = 1.0 - smoothstep(0.0, 0.5, d);
        vec3 viaje = vec3(0.52, 0.80, 0.58);
        vec3 destello = vec3(0.42, 0.88, 0.52);
        gl_FragColor = vec4(mix(viaje, destello, vDest), nucleo * nucleo * vAlfa);
      }`,
  });
  const particulas = new THREE.Points(pGeo, pMat);
  particulas.frustumCulled = false;
  scene.add(particulas);
  let intensidad = 0;

  // Tamaño y cámara ortográfica: encuadre automático de la escena (árbol + plataforma).
  camara.updateMatrixWorld();
  raiz.updateMatrixWorld(true);
  const vista = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  const incluir = (v: THREE.Vector3, margen = 0) => {
    const c = v.clone().applyMatrix4(camara.matrixWorldInverse);
    vista.minX = Math.min(vista.minX, c.x - margen);
    vista.maxX = Math.max(vista.maxX, c.x + margen);
    vista.minY = Math.min(vista.minY, c.y - margen);
    vista.maxY = Math.max(vista.maxY, c.y + margen);
  };
  // Silueta real: esquinas de la plataforma y centro de cada hoja (con el tamaño de la hoja).
  for (const x of [-1.5, 1.5]) for (const z of [-1.5, 1.5]) for (const y of [-0.5, 0]) incluir(new THREE.Vector3(x, y, z));
  const mi = new THREE.Matrix4();
  for (let k = 0; k < total; k += 3) {
    hojas.getMatrixAt(k, mi);
    incluir(new THREE.Vector3().setFromMatrixPosition(mi).applyMatrix4(arbol.matrixWorld), 0.55 * ESCALA);
  }
  const ajustar = () => {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    const aspecto = w / h;
    // Margen: 16 % arriba (título) y 7 % abajo (pista).
    let alto = (vista.maxY - vista.minY) / 0.78;
    let ancho = (vista.maxX - vista.minX) / 0.92;
    if (ancho / alto > aspecto) alto = ancho / aspecto;
    else ancho = alto * aspecto;
    const cx = (vista.minX + vista.maxX) / 2;
    const base = vista.minY - alto * 0.05;
    camara.left = cx - ancho / 2;
    camara.right = cx + ancho / 2;
    camara.bottom = base;
    camara.top = base + alto;
    camara.updateProjectionMatrix();
    pedirRender();
  };

  // Zonas
  const ray = new THREE.Raycaster();
  const puntero = new THREE.Vector2();
  let zonaActual: Zona | null = null;
  const zonaDe = (obj: THREE.Object3D): Zona => (obj === hojas ? "copa" : obj === tronco ? "tronco" : "raices");
  const aplicarZona = (z: Zona | null) => {
    const brillo = (mat: THREE.MeshStandardMaterial | THREE.MeshLambertMaterial, on: boolean, off: boolean, tinte: number) => {
      mat.emissive.setHex(on ? tinte : 0x000000);
      mat.emissiveIntensity = on ? 0.32 : 0;
      mat.color.multiplyScalar(1); // conserva el color base
      (mat as THREE.Material).opacity = 1;
      mat.userData.base ??= mat.color.clone();
      mat.color.copy(mat.userData.base as THREE.Color).multiplyScalar(off ? 0.55 : 1);
    };
    brillo(hojasMat, z === "copa", z !== null && z !== "copa", 0x2f7a3c);
    brillo(cortezaMat, z === "tronco", z !== null && z !== "tronco", 0x6a3e1c);
    brillo(raicesMat, z === "raices", z !== null && z !== "raices", 0x6a3e1c);
    brillo(topeMat, z === "raices", z !== null && z !== "raices", 0x3a4a20);
    brillo(pastoMat, z === "raices", z !== null && z !== "raices", 0x2f7a3c);
    pedirRender();
  };
  const objetivos = [hojas, tronco, raices, plataforma, pasto];
  const zonaEn = (ev: PointerEvent): Zona | null => {
    const r = renderer.domElement.getBoundingClientRect();
    puntero.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(puntero, camara);
    const hit = ray.intersectObjects(objetivos, false)[0];
    return hit ? zonaDe(hit.object) : null;
  };

  // Arrastrar para girar (con inercia); tocar para fijar una zona
  let arrastrando = false;
  let movido = 0;
  let ultimoX = 0;
  let velocidad = 0;
  let pausaAuto = 0;
  const el = renderer.domElement;
  el.style.touchAction = "pan-y";
  const alBajar = (ev: PointerEvent) => {
    arrastrando = true;
    movido = 0;
    ultimoX = ev.clientX;
    el.setPointerCapture(ev.pointerId);
  };
  const alMover = (ev: PointerEvent) => {
    if (arrastrando) {
      const dx = ev.clientX - ultimoX;
      ultimoX = ev.clientX;
      movido += Math.abs(dx);
      raiz.rotation.y += dx * 0.008;
      velocidad = dx * 0.008;
      pausaAuto = 4;
      pedirRender();
      return;
    }
    const z = zonaEn(ev);
    el.style.cursor = z ? "pointer" : "grab";
    if (z !== zonaActual) {
      zonaActual = z;
      onZona(z);
    }
  };
  const alSubir = (ev: PointerEvent) => {
    if (arrastrando && movido < 5) {
      const z = zonaEn(ev);
      zonaActual = z;
      onZona(z);
    }
    arrastrando = false;
  };
  const alSalir = () => {
    if (!arrastrando && zonaActual) {
      zonaActual = null;
      onZona(null);
    }
  };
  el.addEventListener("pointerdown", alBajar);
  el.addEventListener("pointermove", alMover);
  el.addEventListener("pointerup", alSubir);
  el.addEventListener("pointerleave", alSalir);

  // Bucle: solo mientras está visible
  let visible = true;
  let captura = false;
  let crecer = movimientoReducido ? 1 : 0;
  let raf = 0;
  let pendiente = false;
  const reloj = new THREE.Clock();
  const inicio = performance.now();
  let ultimoCuadro = inicio;
  const pedirRender = () => {
    if (!raf) raf = requestAnimationFrame(cuadro);
    pendiente = true;
  };
  const animando = () => !movimientoReducido && visible && !document.hidden;
  function cuadro() {
    raf = 0;
    const dt = Math.min(reloj.getDelta(), 0.05);
    // Si la animación no corre (pestaña oculta o fuera de pantalla), el árbol no queda a medio crecer.
    if (!animando() && crecer < 1) {
      crecer = 1;
      raiz.scale.setScalar(1);
    }
    if (!movimientoReducido) {
      uTime.value += dt;
      if (crecer < 1) {
        // Por tiempo real (no por cuadro): termina en 0,9 s aunque haya pocos cuadros.
        crecer = Math.min(1, (performance.now() - inicio) / 900);
        const k = 1 + 2.2 * Math.pow(crecer - 1, 3) + 1.2 * Math.pow(crecer - 1, 2); // easeOutBack
        raiz.scale.setScalar(Math.max(0.001, k));
      }
      if (!arrastrando) {
        velocidad *= 0.94;
        raiz.rotation.y += velocidad;
        if (pausaAuto > 0) pausaAuto -= dt;
        else raiz.rotation.y += dt * 0.04;
      }
      // Partículas: en reposo, pocas, lentas y tenues; al explorar la captura, algo más.
      // Transición por tiempo real (~0,6 s), independiente de los cuadros por segundo.
      const ahora = performance.now();
      const dtReal = Math.min((ahora - ultimoCuadro) / 1000, 0.5);
      ultimoCuadro = ahora;
      intensidad += ((captura ? 1 : 0) - intensidad) * Math.min(1, dtReal * 3.5);
      const activas = Math.round(nP * (0.16 + 0.84 * intensidad));
      const duracion = 7.5 - 3.3 * intensidad;
      const brillo = 0.32 + 0.68 * intensidad;
      for (let k = 0; k < nP; k++) {
        pVida[k] = (pVida[k] + (dt * pRitmo[k]) / duracion) % 1;
        const v = pVida[k];
        const ease = 1 - Math.pow(1 - v, 2.2);
        const p = pIni[k].clone().lerp(pFin[k], Math.min(1, ease / 0.9));
        pPos[k * 3] = p.x;
        pPos[k * 3 + 1] = p.y + Math.sin((v + k) * 5) * 0.06;
        pPos[k * 3 + 2] = p.z;
        let alfa = v < 0.18 ? v / 0.18 : 1;
        let tam = 7.5;
        let dest = 0;
        if (v > 0.86) {
          const f = (v - 0.86) / 0.14;
          dest = 1;
          tam = 7.5 + 10 * Math.sin(f * Math.PI);
          alfa = (1 - f) * (0.7 + 0.6 * Math.sin(f * Math.PI));
        }
        pAlfa[k] = k < activas ? alfa * brillo * 0.85 : 0;
        pTam[k] = tam;
        pDest[k] = dest;
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.aAlfa.needsUpdate = true;
      pGeo.attributes.aTam.needsUpdate = true;
      pGeo.attributes.aDest.needsUpdate = true;
    } else {
      raiz.scale.setScalar(1);
      for (let k = 0; k < nP; k++) {
        const p = pIni[k].clone().lerp(pFin[k], 0.6);
        pPos.set([p.x, p.y, p.z], k * 3);
        pAlfa[k] = captura && k < nP / 3 ? 0.45 : 0;
        pTam[k] = 6.5;
        pDest[k] = 0;
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.aAlfa.needsUpdate = true;
      pGeo.attributes.aTam.needsUpdate = true;
      pGeo.attributes.aDest.needsUpdate = true;
    }
    renderer.render(scene, camara);
    pendiente = false;
    if (animando()) raf = requestAnimationFrame(cuadro);
  }

  const ro = new ResizeObserver(ajustar);
  ro.observe(host);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) pedirRender();
  });
  io.observe(host);
  const alCambiarVisibilidad = () => !document.hidden && pedirRender();
  document.addEventListener("visibilitychange", alCambiarVisibilidad);
  ajustar();
  void pendiente;

  return {
    setZona: (z) => {
      zonaActual = z;
      aplicarZona(z);
    },
    setCaptura: (v) => {
      captura = v;
      pedirRender();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      el.removeEventListener("pointerdown", alBajar);
      el.removeEventListener("pointermove", alMover);
      el.removeEventListener("pointerup", alSubir);
      el.removeEventListener("pointerleave", alSalir);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        mats.forEach((mt) => mt.dispose());
      });
      texturas.forEach((t) => t.dispose());
      renderer.dispose();
      el.remove();
    },
  };
}

export function Arbol3D({ semilla, forma = "latifoliada", zona, onZona, captura }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const escena = useRef<Escena | null>(null);
  const cb = useRef(onZona);
  const [sinWebgl, setSinWebgl] = useState(false);
  useEffect(() => {
    cb.current = onZona;
  }, [onZona]);
  useEffect(() => {
    const e = crearEscena(host.current!, semilla, forma, (z) => cb.current(z));
    if (!e) setSinWebgl(true);
    escena.current = e;
    return () => {
      e?.dispose();
      escena.current = null;
    };
  }, [semilla, forma]);
  useEffect(() => escena.current?.setZona(zona), [zona]);
  useEffect(() => escena.current?.setCaptura(captura), [captura]);
  return (
    <div ref={host} className="a3d">
      {sinWebgl && <p className="a3d__aviso">Este dispositivo no permite mostrar el árbol en 3D.</p>}
    </div>
  );
}
