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

  // Parallax layer roots (slow shift with camera / zoom — mobile-cheap)
  const layerFar = new THREE.Group();
  const layerMid = new THREE.Group();
  const layerNear = new THREE.Group();
  group.add(layerFar);
  group.add(layerMid);
  group.add(layerNear);
  layerFar.add(far);
  layerMid.add(mid);
  layerNear.add(near);
  // dust stays on mid for ecliptic depth
  layerMid.add(dust);

  // --- Decorative far traffic: fast flybys (non-interactive) ---
  const traffic = new THREE.Group();
  traffic.name = 'spaceTraffic';
  group.add(traffic);
  const trafficItems = [];

  const amberMat = (opacity = 0.85) =>
    new THREE.MeshBasicMaterial({
      color: amber,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  const coldMat = (opacity = 0.75) =>
    new THREE.MeshBasicMaterial({
      color: cold,
      transparent: true,
      opacity,
      depthWrite: false,
    });
  const whiteMat = () =>
    new THREE.MeshBasicMaterial({ color: 0xe8eef8, transparent: true, opacity: 0.9, depthWrite: false });
  const darkMat = () =>
    new THREE.MeshBasicMaterial({ color: 0x1a1e28, transparent: true, opacity: 0.92, depthWrite: false });

  function makeComet(tintCold) {
    const g = new THREE.Group();
    const headCol = tintCold ? cold : amber;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(1.4, 8, 6),
      new THREE.MeshBasicMaterial({
        color: headCol,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    g.add(head);
    for (let i = 0; i < 5; i++) {
      const s = 0.85 - i * 0.12;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(s * 0.45, s * 0.45, s * 3.2),
        new THREE.MeshBasicMaterial({
          color: i < 2 ? headCol : (tintCold ? amber : cold),
          transparent: true,
          opacity: 0.6 - i * 0.09,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      box.position.z = 2.2 + i * 1.8;
      g.add(box);
    }
    return g;
  }

  function makeSaucer() {
    const g = new THREE.Group();
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.2, 0.4, 12), coldMat(0.75));
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      coldMat(0.9)
    );
    dome.position.y = 0.4;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.1, 6, 16), amberMat(0.4));
    rim.rotation.x = Math.PI / 2;
    g.add(disk, dome, rim);
    return g;
  }

  function makeRocket() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 6.2, 8), whiteMat());
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.4, 1.3), darkMat());
    stripe.position.x = 0.55;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.6, 8), whiteMat());
    nose.position.y = 3.8;
    for (const sx of [-1, 1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.65), darkMat());
      fin.position.set(sx * 0.95, 1.8, 0);
      g.add(fin);
    }
    const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 6), amberMat(0.65));
    exhaust.position.y = -3.9;
    exhaust.rotation.x = Math.PI;
    g.add(body, stripe, nose, exhaust);
    g.userData.exhaust = exhaust;
    return g;
  }

  /** Straight-line flyby across the sky — visible motion, then recycle. */
  function randFlyby(kind) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const y = (Math.random() - 0.5) * 90;
    const z = -40 - Math.random() * 120;
    const x0 = side * (140 + Math.random() * 80);
    let vx, vy, vz;
    if (kind === 'comet') {
      // Fast diagonal streak
      vx = -side * (55 + Math.random() * 45);
      vy = (Math.random() - 0.5) * 18;
      vz = (Math.random() - 0.5) * 25;
    } else if (kind === 'rocket') {
      // Climb past camera
      vx = (Math.random() - 0.5) * 12;
      vy = 28 + Math.random() * 22;
      vz = -8 - Math.random() * 10;
    } else {
      // Saucer cruise
      vx = -side * (22 + Math.random() * 18);
      vy = Math.sin(Math.random() * 6) * 6;
      vz = (Math.random() - 0.5) * 14;
    }
    return {
      x: x0,
      y: kind === 'rocket' ? -70 - Math.random() * 30 : y,
      z,
      vx,
      vy,
      vz,
      spin: (Math.random() - 0.5) * 1.2,
      phase: Math.random() * Math.PI * 2,
      life: 0,
      maxLife: kind === 'comet' ? 7 + Math.random() * 4 : 10 + Math.random() * 6,
    };
  }

  function placeFlyby(mesh, o) {
    mesh.position.set(o.x, o.y, o.z);
    const len = Math.hypot(o.vx, o.vy, o.vz) || 1;
    mesh.lookAt(o.x + o.vx / len * 8, o.y + o.vy / len * 8, o.z + o.vz / len * 8);
  }

  function spawnTraffic(kind, count) {
    for (let i = 0; i < count; i++) {
      let mesh;
      if (kind === 'comet') mesh = makeComet(i % 2 === 0);
      else if (kind === 'saucer') mesh = makeSaucer();
      else mesh = makeRocket();
      const o = randFlyby(kind);
      // stagger so not all spawn same frame
      o.life = -i * (kind === 'comet' ? 1.2 : 2.5) - Math.random() * 2;
      placeFlyby(mesh, o);
      if (o.life < 0) mesh.visible = false;
      traffic.add(mesh);
      trafficItems.push({ kind, mesh, o });
    }
  }

  spawnTraffic('comet', 3);
  spawnTraffic('saucer', 2);
  spawnTraffic('rocket', 2);

  return {
    group,
    skyMat,
    update(dt, t, opts = {}) {
      skyMat.uniforms.uTime.value = t;
      far.rotation.y += dt * 0.003;
      mid.rotation.y -= dt * 0.005;
      near.rotation.y += dt * 0.008;
      dust.rotation.y += dt * 0.01;

      for (const item of trafficItems) {
        const o = item.o;
        o.life += dt;
        if (o.life < 0) {
          item.mesh.visible = false;
          continue;
        }
        item.mesh.visible = true;
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        o.z += o.vz * dt;
        // saucer gentle bob
        if (item.kind === 'saucer') {
          o.y += Math.sin(t * 1.4 + o.phase) * dt * 4;
        }
        placeFlyby(item.mesh, o);
        item.mesh.rotation.z += o.spin * dt;
        if (item.kind === 'rocket' && item.mesh.userData.exhaust) {
          const pulse = 0.45 + 0.4 * Math.sin(t * 14 + o.phase);
          item.mesh.userData.exhaust.material.opacity = pulse;
          item.mesh.userData.exhaust.scale.setScalar(0.9 + pulse * 0.55);
        }
        if (item.kind === 'comet') {
          item.mesh.scale.setScalar(1.0 + 0.15 * Math.sin(t * 5 + o.phase));
        }
        const farOut =
          o.life > o.maxLife ||
          Math.abs(o.x) > 280 ||
          Math.abs(o.y) > 160 ||
          o.z > 80 ||
          o.z < -260;
        if (farOut) {
          const next = randFlyby(item.kind);
          Object.assign(o, next);
          o.life = -0.4 - Math.random() * 2.5;
          item.mesh.visible = false;
        }
      }

      const z = typeof opts.zoom === 'number' ? opts.zoom : 1;
      const cx = opts.camX || 0;
      const cy = opts.camY || 0;
      const cz = opts.camZ || 0;
      const zoomNudge = (z - 1) * 2.2;
      layerFar.position.set(cx * 0.012, cy * 0.006 + zoomNudge * 0.15, cz * 0.012);
      layerMid.position.set(cx * 0.028, cy * 0.014 + zoomNudge * 0.35, cz * 0.028);
      layerNear.position.set(cx * 0.05, cy * 0.025 + zoomNudge * 0.55, cz * 0.05);
    },
    pulseSun(glowGroup, t) {
      if (!glowGroup) return;
      const breathe = 0.5 + 0.5 * Math.sin(t * 1.35);
      glowGroup.traverse((n) => {
        if (!n.isMesh || !n.material || n.material.opacity == null) return;
        if (n.userData.baseOpacity == null) n.userData.baseOpacity = n.material.opacity;
        const k = n.userData.coronaPulse || 0.08;
        n.material.opacity = Math.min(0.55, n.userData.baseOpacity * (0.92 + breathe * k));
      });
    },
  };
}


export function createSunGlow(amber = 0xe8a04a, cold = 0x6b8cff) {
  const g = new THREE.Group();
  const shell = (scale, opacity, color, seg = 20, pulse = 0.08) => {
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
    m.userData.baseOpacity = opacity;
    m.userData.coronaPulse = pulse;
    return m;
  };
  // Soft corona shells + faint ring planes (grow-from-center via group scale)
  g.add(shell(19, 0.3, amber, 28, 0.1));
  g.add(shell(23, 0.14, amber, 22, 0.12));
  g.add(shell(28, 0.07, amber, 18, 0.14));
  g.add(shell(34, 0.035, 0xffc078, 16, 0.16));
  g.add(shell(40, 0.018, cold, 14, 0.1));

  const ring = (inner, outer, opacity, color, tiltX = -Math.PI / 2) => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 48),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    m.rotation.x = tiltX;
    m.userData.baseOpacity = opacity;
    m.userData.coronaPulse = 0.18;
    return m;
  };
  g.add(ring(22, 26, 0.08, amber));
  g.add(ring(30, 36, 0.045, cold));
  return g;
}


/** Scale / brighten sun glow shells for persistent wave growth. */
export function growSun(glowGroup, scale = 1) {
  if (!glowGroup) return;
  // Scale is applied by caller on the whole group (uniform). Here: brightness only.
  // Keep baseOpacity = grown resting opacity so corona pulse does not erase wave growth.
  glowGroup.traverse((n) => {
    if (n.isMesh && n.material && n.material.opacity != null) {
      if (n.userData.origOpacity == null) {
        n.userData.origOpacity = n.userData.baseOpacity ?? n.material.opacity;
      }
      const grown = Math.min(0.5, n.userData.origOpacity * (0.9 + (scale - 1) * 0.45));
      n.userData.baseOpacity = grown;
      n.material.opacity = grown;
    }
  });
}
