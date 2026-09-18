import * as THREE from 'three';

/** Lightweight spatial VFX — trails, meteors, pulses, warp, bursts. */
export function createVfx(scene, { amber = 0xe8a04a, cold = 0x6b8cff } = {}) {
  const root = new THREE.Group();
  root.name = 'vfx';
  scene.add(root);

  // --- craft ion trail ---
  const TRAIL_N = 96;
  const trailPos = new Float32Array(TRAIL_N * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  const trail = new THREE.Line(
    trailGeo,
    new THREE.LineBasicMaterial({
      color: amber,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 2,
    })
  );
  root.add(trail);
  let trailI = 0;
  let lastCraft = new THREE.Vector3();

  // sparkle points along trail
  const SPARK_N = 80;
  const sparkPos = new Float32Array(SPARK_N * 3);
  const sparkLife = new Float32Array(SPARK_N);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      color: cold,
      size: 1.4,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  root.add(sparks);
  let sparkI = 0;

  // --- shooting stars ---
  const meteors = [];
  function spawnMeteor() {
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      (Math.random() - 0.3) * 0.4,
      Math.random() - 0.5
    ).normalize();
    const start = dir.clone().multiplyScalar(180 + Math.random() * 80);
    const vel = new THREE.Vector3(-dir.y, dir.z * 0.2, dir.x)
      .normalize()
      .multiplyScalar(40 + Math.random() * 50);
    const geo = new THREE.BufferGeometry().setFromPoints([
      start.clone(),
      start.clone().add(vel.clone().normalize().multiplyScalar(-12)),
    ]);
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    root.add(line);
    meteors.push({ line, pos: start, vel, life: 0.9 + Math.random() * 0.5 });
  }

  // --- pulse rings (alignment / lock) ---
  const rings = [];
  function pulseRing(origin, color, maxR = 40) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1.1, 48),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    mesh.position.copy(origin);
    mesh.lookAt(0, 0, 0);
    root.add(mesh);
    rings.push({ mesh, t: 0, maxR, color });
  }

  // --- warp streaks (during beam travel) ---
  const WARP_N = 60;
  const warpPos = new Float32Array(WARP_N * 6); // 2 verts each as separate lines — use one LineSegments
  const warpGeo = new THREE.BufferGeometry();
  // LineSegments needs 2*N points
  const warpPts = new Float32Array(WARP_N * 2 * 3);
  warpGeo.setAttribute('position', new THREE.BufferAttribute(warpPts, 3));
  const warp = new THREE.LineSegments(
    warpGeo,
    new THREE.LineBasicMaterial({
      color: cold,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  warp.visible = false;
  root.add(warp);
  let warping = false;
  let warpDir = new THREE.Vector3(0, 0, 1);

  // --- lock burst particles ---
  const BURST_N = 120;
  const burstPos = new Float32Array(BURST_N * 3);
  const burstVel = [];
  const burstGeo = new THREE.BufferGeometry();
  burstGeo.setAttribute('position', new THREE.BufferAttribute(burstPos, 3));
  const burst = new THREE.Points(
    burstGeo,
    new THREE.PointsMaterial({
      color: amber,
      size: 2.2,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  root.add(burst);
  let burstT = 0;

  // solar flare wisps around sun
  const flares = [];
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 8, 6),
      new THREE.MeshBasicMaterial({
        color: amber,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    root.add(f);
    flares.push({
      mesh: f,
      a: Math.random() * Math.PI * 2,
      b: Math.random() * Math.PI,
      speed: 0.3 + Math.random() * 0.5,
      r: 22 + Math.random() * 10,
    });
  }


  // --- geometric shatter (boxes/cones, no textures) ---
  const shards = [];
  function shatterAt(origin, color = amber, count = 18, speed = 1) {
    for (let i = 0; i < count; i++) {
      const isCone = i % 3 === 0;
      const mesh = new THREE.Mesh(
        isCone
          ? new THREE.ConeGeometry(0.35, 1.1, 5)
          : new THREE.BoxGeometry(0.5 + Math.random() * 0.7, 0.25, 0.4 + Math.random() * 0.5),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? color : cold,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      mesh.position.copy(origin);
      const vel = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.2,
        Math.random() - 0.5
      ).normalize().multiplyScalar((18 + Math.random() * 35) * speed);
      const spin = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
      root.add(mesh);
      shards.push({ mesh, vel, spin, life: 0.65 + Math.random() * 0.45 });
    }
  }

  function nearMissBurst(origin) {
    for (let i = 0; i < 10; i++) {
      sparkI = (sparkI + 1) % SPARK_N;
      sparkPos[sparkI * 3] = origin.x + (Math.random() - 0.5) * 6;
      sparkPos[sparkI * 3 + 1] = origin.y + (Math.random() - 0.5) * 6;
      sparkPos[sparkI * 3 + 2] = origin.z + (Math.random() - 0.5) * 6;
      sparkLife[sparkI] = 0.7;
    }
    sparkGeo.attributes.position.needsUpdate = true;
  }

  let meteorCD = 2;

  return {
    update(dt, { craftPos, speed = 0, alignT = 0, sunScale = 1, heat = false, bonus = false } = {}) {
      // trail
      if (craftPos) {
        if (craftPos.distanceToSquared(lastCraft) > 0.18) {
          trailI = (trailI + 1) % TRAIL_N;
          trailPos[trailI * 3] = craftPos.x;
          trailPos[trailI * 3 + 1] = craftPos.y;
          trailPos[trailI * 3 + 2] = craftPos.z;
          trailGeo.attributes.position.needsUpdate = true;
          // reorder for continuous line: write from oldest
          const ordered = new Float32Array(TRAIL_N * 3);
          for (let i = 0; i < TRAIL_N; i++) {
            const src = ((trailI + 1 + i) % TRAIL_N) * 3;
            ordered[i * 3] = trailPos[src];
            ordered[i * 3 + 1] = trailPos[src + 1];
            ordered[i * 3 + 2] = trailPos[src + 2];
          }
          trailGeo.attributes.position.array.set(ordered);
          trailGeo.attributes.position.needsUpdate = true;
          lastCraft.copy(craftPos);

          if (speed > 8) {
            sparkI = (sparkI + 1) % SPARK_N;
            sparkPos[sparkI * 3] = craftPos.x + (Math.random() - 0.5) * 1.5;
            sparkPos[sparkI * 3 + 1] = craftPos.y + (Math.random() - 0.5) * 1.5;
            sparkPos[sparkI * 3 + 2] = craftPos.z + (Math.random() - 0.5) * 1.5;
            sparkLife[sparkI] = 1;
            sparkGeo.attributes.position.needsUpdate = true;
          }
        }
      }

      for (let i = 0; i < SPARK_N; i++) {
        if (sparkLife[i] > 0) {
          sparkLife[i] -= dt * 1.8;
          if (sparkLife[i] <= 0) {
            sparkPos[i * 3 + 1] = -9999;
            sparkGeo.attributes.position.needsUpdate = true;
          }
        }
      }
      sparks.material.opacity = 0.35 + Math.min(1, speed / 40) * 0.5;

      // alignment / HEAT orbit trail (amber when heat streak)
      trail.material.opacity = 0.5 + alignT * 0.4 + (heat ? 0.25 : 0);
      if (heat) trail.material.color.setHex(amber);
      else trail.material.color.setHex(alignT > 0.6 ? cold : amber);

      // meteors (denser during micro-bonus)
      meteorCD -= dt;
      if (meteorCD <= 0) {
        spawnMeteor();
        if (bonus) spawnMeteor();
        meteorCD = bonus ? (0.45 + Math.random() * 0.9) : (1.8 + Math.random() * 3.5);
      }
      if (bonus) {
        sparks.material.opacity = Math.min(1, (sparks.material.opacity || 0.5) + 0.15);
        sparks.material.size = 1.8;
      } else {
        sparks.material.size = 1.4;
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life -= dt;
        m.pos.addScaledVector(m.vel, dt);
        const tip = m.pos;
        const tail = m.pos.clone().addScaledVector(m.vel, -0.25);
        const arr = m.line.geometry.attributes.position.array;
        arr[0] = tip.x; arr[1] = tip.y; arr[2] = tip.z;
        arr[3] = tail.x; arr[4] = tail.y; arr[5] = tail.z;
        m.line.geometry.attributes.position.needsUpdate = true;
        m.line.material.opacity = Math.max(0, m.life);
        if (m.life <= 0) {
          root.remove(m.line);
          m.line.geometry.dispose();
          meteors.splice(i, 1);
        }
      }

      // rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.t += dt;
        const u = r.t / 1.1;
        const sc = 1 + u * r.maxR;
        r.mesh.scale.set(sc, sc, sc);
        r.mesh.material.opacity = Math.max(0, 0.75 * (1 - u));
        if (u >= 1) {
          root.remove(r.mesh);
          r.mesh.geometry.dispose();
          rings.splice(i, 1);
        }
      }

      // flares
      for (const f of flares) {
        f.a += dt * f.speed;
        const rr = f.r * sunScale;
        f.mesh.position.set(
          Math.cos(f.a) * Math.sin(f.b) * rr,
          Math.cos(f.b) * rr * 0.6,
          Math.sin(f.a) * Math.sin(f.b) * rr
        );
        f.mesh.material.opacity = 0.08 + 0.1 * (0.5 + 0.5 * Math.sin(f.a * 3));
        f.mesh.scale.setScalar(sunScale * (1.2 + 0.4 * Math.sin(f.a * 2)));
      }


      // shards
      for (let i = shards.length - 1; i >= 0; i--) {
        const sh = shards[i];
        sh.life -= dt;
        sh.mesh.position.addScaledVector(sh.vel, dt);
        sh.vel.y -= 12 * dt;
        sh.mesh.rotation.x += sh.spin.x * dt;
        sh.mesh.rotation.y += sh.spin.y * dt;
        sh.mesh.material.opacity = Math.max(0, sh.life * 1.5);
        if (sh.life <= 0) {
          root.remove(sh.mesh);
          sh.mesh.geometry.dispose();
          shards.splice(i, 1);
        }
      }

      // warp
      if (warping) {
        const arr = warp.geometry.attributes.position.array;
        for (let i = 0; i < WARP_N; i++) {
          const side = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          )
            .cross(warpDir)
            .normalize()
            .multiplyScalar(8 + Math.random() * 35);
          const along = warpDir.clone().multiplyScalar(-20 - Math.random() * 120);
          const p0 = side.clone().add(along);
          const p1 = p0.clone().addScaledVector(warpDir, 8 + Math.random() * 28);
          const o = i * 6;
          arr[o] = p0.x; arr[o + 1] = p0.y; arr[o + 2] = p0.z;
          arr[o + 3] = p1.x; arr[o + 4] = p1.y; arr[o + 5] = p1.z;
        }
        warp.geometry.attributes.position.needsUpdate = true;
        warp.material.opacity = 0.55;
      }

      // burst
      if (burstT > 0) {
        burstT -= dt;
        const arr = burst.geometry.attributes.position.array;
        for (let i = 0; i < BURST_N; i++) {
          const v = burstVel[i];
          arr[i * 3] += v.x * dt;
          arr[i * 3 + 1] += v.y * dt;
          arr[i * 3 + 2] += v.z * dt;
          v.multiplyScalar(0.98);
        }
        burst.geometry.attributes.position.needsUpdate = true;
        burst.material.opacity = Math.max(0, burstT / 1.2);
      }
    },

    setAlignHeat(t) {
      // 0..1 — called each frame when two tethered
      // handled in update via alignT
    },

    startWarp(dir) {
      warping = true;
      warpDir.copy(dir).normalize();
      warp.visible = true;
      warp.position.set(0, 0, 0);
    },

    stopWarp() {
      warping = false;
      warp.visible = false;
      warp.material.opacity = 0;
    },

    lockBurst(origin, color = amber) {
      pulseRing(origin, color, 55);
      pulseRing(origin, cold, 35);
      burst.material.color.setHex(color);
      burst.material.opacity = 1;
      burstT = 1.2;
      for (let i = 0; i < BURST_N; i++) {
        const dir = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize();
        const spd = 20 + Math.random() * 55;
        burstVel[i] = dir.multiplyScalar(spd);
        burstPos[i * 3] = origin.x;
        burstPos[i * 3 + 1] = origin.y;
        burstPos[i * 3 + 2] = origin.z;
      }
      burst.geometry.attributes.position.needsUpdate = true;
    },

    pulseAt(origin, color = cold) {
      pulseRing(origin, color, 28);
    },
    shatterAt,
    nearMissBurst,

    /** Cinematic KO: big flash rings + dense shatter + debris burst (budget-aware). */
    systemBoom(origin = new THREE.Vector3()) {
      pulseRing(origin, amber, 120);
      pulseRing(origin, cold, 90);
      pulseRing(origin, amber, 70);
      // geometric shatter — larger shards, longer life, outward punch
      const N = 48;
      for (let i = 0; i < N; i++) {
        const isCone = i % 3 === 0;
        const big = i < 12;
        const mesh = new THREE.Mesh(
          isCone
            ? new THREE.ConeGeometry(big ? 1.1 : 0.45, big ? 2.4 : 1.2, 5)
            : new THREE.BoxGeometry(
                (big ? 1.4 : 0.55) + Math.random() * 0.9,
                big ? 0.55 : 0.3,
                (big ? 1.2 : 0.45) + Math.random() * 0.7
              ),
          new THREE.MeshBasicMaterial({
            color: i % 3 === 0 ? amber : i % 3 === 1 ? cold : 0xe6dcc8,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          })
        );
        mesh.position.copy(origin);
        const vel = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() * 0.85,
          Math.random() - 0.5
        ).normalize().multiplyScalar(32 + Math.random() * 55);
        const spin = new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12
        );
        root.add(mesh);
        shards.push({ mesh, vel, spin, life: 0.9 + Math.random() * 0.55 });
      }
      // particle debris burst
      burst.material.color.setHex(amber);
      burst.material.opacity = 1;
      burst.material.size = 3.4;
      burstT = 1.8;
      for (let i = 0; i < BURST_N; i++) {
        const dir = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.35,
          Math.random() - 0.5
        ).normalize();
        burstVel[i] = dir.multiplyScalar(35 + Math.random() * 80);
        burstPos[i * 3] = origin.x;
        burstPos[i * 3 + 1] = origin.y;
        burstPos[i * 3 + 2] = origin.z;
      }
      burst.geometry.attributes.position.needsUpdate = true;
      // spark fill
      for (let i = 0; i < SPARK_N; i++) {
        sparkPos[i * 3] = origin.x + (Math.random() - 0.5) * 30;
        sparkPos[i * 3 + 1] = origin.y + (Math.random() - 0.5) * 20;
        sparkPos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 30;
        sparkLife[i] = 0.8 + Math.random() * 0.6;
      }
      sparkGeo.attributes.position.needsUpdate = true;
    },
  };
}
