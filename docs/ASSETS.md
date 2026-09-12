# SYZYGY — asset briefs (form, not function)

Style sentence (reuse verbatim for every generate):
> Observatory instruments of a dead future civilisation: brass and obsidian bodies with bone-pale inlays, matte metal finish, engraved graduations, no neon — archaeology of the future, not cyberpunk.

Generate via 404 recipe: reference (or form paragraph) → 3 independent candidates → verify → pick by eye.
Expect JSON beside each asset for size.

## 1. dying_sun
**Height:** 40 m (sphere diameter). File: `dying_sun.js`
Form: large sphere core with thin concentric torus shells (2–3), irregular outer corona built from short cones and flattened spheres clustered on the surface; one deep crack as a recessed box wedge. Warm amber dominant, ember in recesses.
expect: `{ "height": 40, "tolerance": 0.2 }`

## 2. cartographer_craft
**Length:** 2.0 m. File: `cartographer_craft.js`
Form: flattened capsule / lathe hull, forward oculus as a short cylinder with inner ring, two thin side vanes (boxes), rear cluster of three small cylinders; bone tick marks as tiny boxes on the hull. Front +Z.
expect: `{ "width": 1.2, "height": 0.7, "depth": 2.0, "tolerance": 0.25 }`

## 3. hollow_moon
**Across:** 6 m. File: `hollow_moon.js`
Form: sphere shell with a large circular opening (open cylinder / lathe bowl), inner ribs as thin tori, one brass collar around the rim with bone inlays.
expect: `{ "width": 6, "height": 6, "tolerance": 0.25 }`

## 4. broken_ring
**Across:** 8 m. File: `broken_ring.js`
Form: torus with a 60–90° gap; gap edges thickened; three shard plates (thin boxes / extrudes) floating just off the break. Mostly brass with obsidian inner face.
expect: `{ "width": 8, "height": 1.2, "tolerance": 0.25 }`

## 5. fossil_comet
**Length:** 7 m. File: `fossil_comet.js`
Form: elongated lathe nucleus, rear spray of tapered cones (frozen tail), surface pitted with small sphere recesses. Front +Z = head.
expect: `{ "width": 2.5, "height": 2.5, "depth": 7.0, "tolerance": 0.25 }`

## 6. neutron_heart
**Across:** 5 m. File: `neutron_heart.js`
Form: dense thick torus with a nested smaller torus; outer band of short radial cylinders (fins). Cold-star accent on fins, brass body.
expect: `{ "width": 5, "height": 2.2, "tolerance": 0.25 }`

## 7. gravity_bell
**Height:** 6 m. File: `gravity_bell.js`
Form: inverted lathe bell / cone stack, hollow underside (DoubleSide), hanging axis as a thin cylinder through the crown, bone rim ticks.
expect: `{ "width": 4, "height": 6, "tolerance": 0.25 }`

## 8. observatory_oculus
**Height:** 5 m. File: `observatory_oculus.js`
Form: vertical cylinder tube with flared brass rings top and bottom, inner dark cylinder, side bracket (boxes) suggesting a mount; one thin crosshair of boxes inside the aperture — silhouette only, no glyphs.
expect: `{ "width": 3, "height": 5, "tolerance": 0.25 }`
