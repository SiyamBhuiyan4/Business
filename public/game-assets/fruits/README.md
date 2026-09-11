# Mushroom sprite assets

Drop PNG images here to replace the built-in emoji placeholders — no code changes needed.

The engine tries to load each file below; if a file is missing, it silently falls back to a colored circle + emoji instead.

| File | Mushroom |
|---|---|
| `shiitake.png` | Shiitake |
| `portobello.png` | Portobello |
| `morel.png` | Morel |
| `chanterelle.png` | Chanterelle |
| `enoki.png` | Enoki |
| `oyster.png` | Oyster |
| `amanita.png` | Fly Agaric (Amanita) |
| `toxic.png` | Toxic mushroom (instant game over if sliced) |

**Guidelines:**
- Square PNG, transparent background, ~256x256px.
- Keep the mushroom centered and filling most of the frame — it gets scaled to fit its in-game radius automatically.
- To add a brand-new variety (not just replace an existing one), add an entry to `FRUITS` in `src/components/game/gameAssets.ts` with a `key`, `emoji` fallback, `color`, `points`, `radius`, and a `spritePath` pointing at a new file here.

Texture loading is already wired in: on game start, the engine checks whether each file above actually exists and loads it if so (see `preloadTextures` in `src/components/game/fruitGameEngine.ts`). Drop in a PNG and reload the page — no code changes needed.
