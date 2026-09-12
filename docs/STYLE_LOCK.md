# SYZYGY — the locked style

> Observatory instruments of a dead future civilisation: brass and obsidian bodies with bone-pale inlays, matte metal finish, engraved graduations, no neon — archaeology of the future, not cyberpunk.

| role | hex | where it belongs |
|---|---|---|
| amber sun | `0xe8a04a` | dying sun core, warm filaments, alignment ghost |
| cold star | `0x6b8cff` | dead-star light, ice dust, lock beams |
| brass | `0xb08d57` | relic shells, craft hull, oculus rings |
| brass dark | `0x7a5c38` | recessed metal, shadowed fittings |
| obsidian | `0x1a1a1e` | void panels, hollow interiors, ecliptic plate |
| bone | `0xe6dcc8` | inlays, tick marks, pale ribs |
| ember deep | `0x8b3a1a` | sun corona near collapse |
| void black | `0x0b0b10` | sky bowl, far background |

## Fixed decisions
- Metres. Dying sun is 40 m diameter. Cartographer craft is 2.0 m long. Typical relic is 4–8 m across. Gravity bell is 6 m tall. Orrery useful radius ~120 m.
- Base at y = 0, centred on x and z, front faces +Z.
- Flat colours with sensible roughness; surfaces are applied at load time.
- Material names from the contract's list, not a shortened one: `metal` (brass / craft / rings), `stone` (obsidian panels), `ground` (ecliptic dust plate if needed). Prefer `metal` for almost everything readable.
- No glyphs / printed text anywhere (recipe limit). Signage = lit shape and silhouette only.
- Always two colour temperatures in frame: amber + cold.
