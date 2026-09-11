# Sound effects (not wired in yet)

Sound is not implemented in the current build. To add it:

1. Drop `.mp3`/`.wav` files here, e.g. `slice.mp3`, `bomb.mp3`, `gameover.mp3`.
2. In `src/components/game/fruitGameEngine.ts`, create an `Audio` instance per sound (e.g. `new Audio('/game-assets/sounds/slice.mp3')`) and call `.play()` at the matching moment (a slice in `sliceFruit()`, the bomb branch in `sliceFruit()`, and `endGame()`).
3. Wrap each `.play()` call in a try/catch (or handle the rejected promise) — browsers block autoplay until the user has interacted with the page, and a missing file should never throw an uncaught error.
