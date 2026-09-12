import * as THREE from 'three';

/** Dense starfield + nebula sky + sun corona for spatial immersion. */
export function createSpaceBackdrop(scene, { amber = 0xe8a04a, cold = 0x6b8cff } = {}) {
  const group = new THREE.Group();
  group.name = 'spacefx';

  // Nebula sky (inside of large sphere)
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAmber: { value: new THREE.Color(amber) },
      uCold: { value: new THREE.Color(cold) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      varying vec3 vPos;
      uniform float uTime;
      uniform vec3 uAmber;
      uniform vec3 uCold;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
          f.z);
      }
      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.05;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 n = normalize(vPos);
        float neb = fbm(n * 2.6 + vec3(uTime * 0.012, 0.0, uTime * 0.009));
        float neb2 = fbm(n * 5.0 - vec3(uTime * 0.02, 0.4, 0.0));
        float dark = smoothstep(0.55, 0.15, neb);
        float band = smoothstep(0.42, 0.82, neb);
        float hot = smoothstep(0.62, 0.95, neb * 0.7 + neb2 * 0.5);
        vec3 col = mix(vec3(0.008, 0.01, 0.02), vec3(0.03, 0.04, 0.08), 1.0 - dark);
        col = mix(col, uCold * 0.42, band * (1.0 - hot));
        col = mix(col, uAmber * 0.38, hot * (0.45 + 0.55 * clamp(n.y + 0.2, 0.0, 1.0)));
        col *= 0.55 + 0.45 * dark; // deeper voids
        float poles = pow(abs(n.y), 1.6);
        col += uCold * 0.06 * poles;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(480, 32, 24), skyMat);
  group.add(sky);

  function starLayer(count, radius, size, color, opacity) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.cos(phi);
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color,
        size,
        transparent: true,
        opacity,
        depthWrite: false,
        sizeAttenuation: true,
      })
    );
    group.add(pts);
    return pts;
  }

  const far = starLayer(1800, 420, 1.1, 0xffffff, 0.85);
  const mid = starLayer(700, 300, 1.8, cold, 0.55);
  const near = starLayer(200, 220, 2.6, amber, 0.35);

  // Soft ecliptic dust volume
  const dustPos = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 130;
    dustPos[i * 3] = Math.cos(a) * r;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 18;
    dustPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: amber,
      size: 0.9,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  group.add(dust);

  scene.add(group);

  return {
    group,
    skyMat,
    update(dt, t) {
      skyMat.uniforms.uTime.value = t;
      far.rotation.y += dt * 0.003;
      mid.rotation.y -= dt * 0.005;
      near.rotation.y += dt * 0.008;
      dust.rotation.y += dt * 0.01;
    },
  };
}

export function createSunGlow(amber = 0xe8a04a) {
  const g = new THREE.Group();
  const shell = (scale, opacity, color, seg = 20) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(scale, seg, Math.max(10, seg - 4)),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    return m;
  };
  // Tight amber corona only — one star, nothing floating above it
  g.add(shell(19, 0.3, amber, 28));
  g.add(shell(23, 0.14, amber, 22));
  g.add(shell(28, 0.07, amber, 18));
  g.add(shell(34, 0.03, 0xffc078, 16));
  return g;
}


/** Scale / brighten sun glow shells for persistent wave growth. */
export function growSun(glowGroup, scale = 1) {
  if (!glowGroup) return;
  // Scale is applied by caller on the whole group (uniform). Here: brightness only.
  glowGroup.traverse((n) => {
    if (n.isMesh && n.material && n.material.opacity != null) {
      if (!n.userData.baseOpacity) n.userData.baseOpacity = n.material.opacity;
      n.material.opacity = Math.min(0.5, n.userData.baseOpacity * (0.9 + (scale - 1) * 0.45));
    }
  });
}
