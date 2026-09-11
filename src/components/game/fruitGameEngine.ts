import type * as PIXI_NS from 'pixi.js';
import { FRUITS, randomFruit, type FruitDef } from './gameAssets';

export interface FruitGameCallbacks {
  onScoreChange: (score: number) => void;
  onMultiplierChange: (multiplier: number, combo: number) => void;
}

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

interface ActiveFruit {
  view: PIXI_NS.Container;
  def: FruitDef;
  vx: number;
  vy: number;
  radius: number;
  sliced: boolean;
  rotationSpeed: number;
}

interface Particle {
  view: PIXI_NS.Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  /** Grows in scale as it fades, for a soft spore-cloud puff instead of a sharp flying speck. */
  expands?: boolean;
}

const GRAVITY = 0.32;
const COMBO_WINDOW_MS = 1100;
const MAX_MULTIPLIER = 12;
const TRAIL_MAX_AGE_MS = 160;

export class FruitSliceEngine {
  private PIXI: typeof PIXI_NS;
  private app: PIXI_NS.Application;
  private callbacks: FruitGameCallbacks;
  private fruitLayer: PIXI_NS.Container;
  private particleLayer: PIXI_NS.Container;
  private trailGraphics: PIXI_NS.Graphics;
  private trailGlow: PIXI_NS.Graphics;

  private textureCache: Map<string, PIXI_NS.Texture> = new Map();
  private fruits: ActiveFruit[] = [];
  private particles: Particle[] = [];
  private trail: TrailPoint[] = [];
  private pointerDown = false;
  private lastPoint: { x: number; y: number } | null = null;
  private exclusionRects: DOMRect[] = [];

  private score = 0;
  private combo = 0;
  private comboTimer = 0;
  private multiplier = 1;

  private spawnTimer = 0;
  private spawnInterval = 950;
  private elapsedMs = 0;
  private destroyed = false;

  private onDown: (e: PointerEvent) => void;
  private onMove: (e: PointerEvent) => void;
  private onUp: (e: PointerEvent) => void;

  constructor(container: HTMLElement, PIXI: typeof PIXI_NS, callbacks: FruitGameCallbacks) {
    this.PIXI = PIXI;
    this.callbacks = callbacks;

    this.app = new PIXI.Application({
      resizeTo: window,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    container.appendChild(this.app.view as unknown as Node);

    this.fruitLayer = new PIXI.Container();
    this.particleLayer = new PIXI.Container();
    this.trailGlow = new PIXI.Graphics();
    this.trailGraphics = new PIXI.Graphics();
    this.trailGlow.filters = [new PIXI.BlurFilter(10)];

    this.app.stage.addChild(this.fruitLayer, this.particleLayer, this.trailGlow, this.trailGraphics);

    const handlers = this.createPointerHandlers();
    this.onDown = handlers.onDown;
    this.onMove = handlers.onMove;
    this.onUp = handlers.onUp;
    // Listen on window (not the canvas) so slicing correctly stops the instant the
    // pointer crosses into a real UI element sitting visually above the canvas,
    // and cleanly resumes once it re-enters empty background space.
    window.addEventListener('pointerdown', this.onDown, { passive: true });
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerup', this.onUp, { passive: true });
    window.addEventListener('pointercancel', this.onUp, { passive: true });

    this.app.ticker.add(this.update);
  }

  start() {
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onMultiplierChange(this.multiplier, this.combo);
    void this.preloadTextures();
  }

  /** Called by the host component whenever real UI element positions change (mount, resize, scroll, DOM updates). */
  setExclusionZones(rects: DOMRect[]) {
    this.exclusionRects = rects;
  }

  private isExcluded(x: number, y: number): boolean {
    for (const r of this.exclusionRects) {
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
    }
    return false;
  }

  /** Loads any real sprite art dropped into public/game-assets/fruits/. Missing files are skipped silently -- those fruits keep using the emoji + color-circle placeholder. */
  private async preloadTextures() {
    await Promise.all(
      FRUITS.map(async (def) => {
        try {
          const head = await fetch(def.spritePath, { method: 'HEAD' });
          if (!head.ok) return;
          const texture = await this.PIXI.Assets.load(def.spritePath);
          if (!this.destroyed) this.textureCache.set(def.key, texture);
        } catch {
          // No custom art for this fruit yet -- placeholder stays in use.
        }
      })
    );
  }

  destroy() {
    this.destroyed = true;
    window.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    this.app.ticker.remove(this.update);
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }

  private createPointerHandlers() {
    const onDown = (e: PointerEvent) => {
      if (this.isExcluded(e.clientX, e.clientY)) return; // started on real UI -- ignore this gesture entirely
      this.pointerDown = true;
      this.lastPoint = { x: e.clientX, y: e.clientY };
      this.trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    };
    const onMove = (e: PointerEvent) => {
      if (!this.pointerDown) return;
      const p = { x: e.clientX, y: e.clientY };
      if (this.isExcluded(p.x, p.y)) {
        // Over a real UI element: break the trail so it never draws across cards,
        // and skip slice detection there entirely.
        this.lastPoint = null;
        return;
      }
      if (this.lastPoint) this.checkSliceAlongSegment(this.lastPoint, p);
      this.lastPoint = p;
      this.trail.push({ ...p, t: performance.now() });
    };
    const onUp = () => {
      this.pointerDown = false;
      this.lastPoint = null;
    };
    return { onDown, onMove, onUp };
  }

  private checkSliceAlongSegment(a: { x: number; y: number }, b: { x: number; y: number }) {
    for (const fruit of this.fruits) {
      if (fruit.sliced) continue;
      const dist = pointToSegmentDistance(fruit.view.x, fruit.view.y, a.x, a.y, b.x, b.y);
      if (dist <= fruit.radius) {
        this.sliceFruit(fruit);
      }
    }
  }

  private spawnFruit() {
    const w = this.app.renderer.width / this.app.renderer.resolution;
    const h = this.app.renderer.height / this.app.renderer.resolution;
    const def = randomFruit();

    // Classic upward toss from the bottom edge, arcing back down under gravity.
    const x = w * (0.1 + Math.random() * 0.8);
    const y = h + def.radius + 50;
    const vx = (Math.random() - 0.5) * 5;
    const vy = -(9 + Math.random() * 4);

    const view = this.createFruitVisual(def);
    view.x = x;
    view.y = y;
    this.fruitLayer.addChild(view);

    this.fruits.push({
      view,
      def,
      vx,
      vy,
      radius: def.radius,
      sliced: false,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
    });
  }

  private sliceFruit(fruit: ActiveFruit) {
    fruit.sliced = true;
    // Capture position before destroying the view -- PIXI nulls a destroyed
    // DisplayObject's internal transform, so reading .x/.y after destroy() throws.
    const x = fruit.view.x;
    const y = fruit.view.y;
    this.fruitLayer.removeChild(fruit.view);
    fruit.view.destroy({ children: true });
    this.fruits = this.fruits.filter((f) => f !== fruit);

    this.combo += 1;
    this.comboTimer = COMBO_WINDOW_MS;
    this.multiplier = Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.combo / 3));
    this.score += fruit.def.points * this.multiplier;
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onMultiplierChange(this.multiplier, this.combo);

    this.spawnHalves(fruit, x, y);
    this.spawnParticleBurst(x, y, fruit.def.color, 14);
    this.spawnSporeCloud(x, y);
  }

  /** Soft, slow-expanding puffs to sell the "spores releasing" moment on a mushroom slice. */
  private spawnSporeCloud(x: number, y: number) {
    const PIXI = this.PIXI;
    for (let i = 0; i < 4; i++) {
      const g = new PIXI.Graphics();
      const r = 6 + Math.random() * 5;
      g.beginFill(0xf5f0e6, 0.35);
      g.drawCircle(0, 0, r);
      g.endFill();
      g.x = x + (Math.random() - 0.5) * 20;
      g.y = y + (Math.random() - 0.5) * 20;
      this.particleLayer.addChild(g);
      this.particles.push({
        view: g,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.6 - Math.random() * 0.6,
        life: 0,
        maxLife: 900 + Math.random() * 400,
        expands: true,
      });
    }
  }

  private spawnHalves(fruit: ActiveFruit, x: number, y: number) {
    for (const dir of [-1, 1]) {
      const half = this.createFruitVisual(fruit.def, 0.72);
      half.x = x;
      half.y = y;
      half.alpha = 0.95;
      this.particleLayer.addChild(half);
      const vx = dir * (2 + Math.random() * 2.5);
      const vy = -(2 + Math.random() * 2);
      this.particles.push({
        view: half as unknown as PIXI_NS.Graphics,
        vx,
        vy,
        life: 0,
        maxLife: 650,
      });
    }
  }

  private spawnParticleBurst(x: number, y: number, color: number, count: number) {
    const PIXI = this.PIXI;
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      const r = 2 + Math.random() * 4;
      g.beginFill(color, 0.9);
      g.drawCircle(0, 0, r);
      g.endFill();
      g.x = x;
      g.y = y;
      this.particleLayer.addChild(g);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        view: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 420 + Math.random() * 200,
      });
    }
  }

  private update = (delta: number) => {
    if (this.destroyed) return;
    const dt = delta; // pixi ticker delta ~1 at 60fps
    const dtMs = this.app.ticker.deltaMS;
    this.elapsedMs += dtMs;

    const w = this.app.renderer.width / this.app.renderer.resolution;
    const h = this.app.renderer.height / this.app.renderer.resolution;

    // spawn logic, ramps up slowly
    this.spawnTimer += dtMs;
    const difficultyFactor = Math.max(0.55, 1 - this.elapsedMs / 120000);
    if (this.spawnTimer >= this.spawnInterval * difficultyFactor) {
      this.spawnTimer = 0;
      this.spawnFruit();
    }

    // combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dtMs;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.multiplier = 1;
        this.callbacks.onMultiplierChange(this.multiplier, this.combo);
      }
    }

    // fruit physics
    for (const fruit of [...this.fruits]) {
      fruit.vy += GRAVITY * dt;
      fruit.view.x += fruit.vx * dt;
      fruit.view.y += fruit.vy * dt;
      fruit.view.rotation += fruit.rotationSpeed * dt;

      const margin = fruit.radius * 3;
      const offscreen = fruit.view.x < -margin || fruit.view.x > w + margin || fruit.view.y > h + margin;
      if (offscreen) {
        this.fruitLayer.removeChild(fruit.view);
        fruit.view.destroy({ children: true });
        this.fruits = this.fruits.filter((f) => f !== fruit);
      }
    }

    // particles
    for (const p of [...this.particles]) {
      p.life += dtMs;
      p.vy += GRAVITY * 0.5 * dt;
      p.view.x += p.vx * dt;
      p.view.y += p.vy * dt;
      const lifePct = p.life / p.maxLife;
      p.view.alpha = Math.max(0, 1 - lifePct);
      if (p.expands) p.view.scale.set(1 + lifePct * 2.2);
      if (p.life >= p.maxLife) {
        this.particleLayer.removeChild(p.view);
        p.view.destroy({ children: true });
        this.particles = this.particles.filter((x) => x !== p);
      }
    }

    // trail
    const now = performance.now();
    this.trail = this.trail.filter((pt) => now - pt.t < TRAIL_MAX_AGE_MS);
    this.drawTrail();
  };

  private drawTrail() {
    this.trailGraphics.clear();
    this.trailGlow.clear();
    if (this.trail.length < 2) return;
    const now = performance.now();

    for (let i = 1; i < this.trail.length; i++) {
      const prev = this.trail[i - 1];
      const cur = this.trail[i];
      const age = (now - cur.t) / TRAIL_MAX_AGE_MS;
      const alpha = Math.max(0, 1 - age);
      const width = Math.max(1, 7 * alpha);

      this.trailGlow.lineStyle({ width: width * 2.2, color: 0x7dd3fc, alpha: alpha * 0.55, cap: this.PIXI.LINE_CAP.ROUND, join: this.PIXI.LINE_JOIN.ROUND });
      this.trailGlow.moveTo(prev.x, prev.y);
      this.trailGlow.lineTo(cur.x, cur.y);

      this.trailGraphics.lineStyle({ width, color: 0xffffff, alpha, cap: this.PIXI.LINE_CAP.ROUND, join: this.PIXI.LINE_JOIN.ROUND });
      this.trailGraphics.moveTo(prev.x, prev.y);
      this.trailGraphics.lineTo(cur.x, cur.y);
    }
  }

  /** Uses real sprite art from the texture cache when available, otherwise a color-circle + emoji placeholder. */
  private createFruitVisual(def: FruitDef, scale = 1): PIXI_NS.Container {
    const PIXI = this.PIXI;
    const container = new PIXI.Container();
    const radius = def.radius * scale;
    const texture = this.textureCache.get(def.key);

    if (texture) {
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      const size = Math.max(texture.width, texture.height) || 1;
      sprite.scale.set((radius * 2) / size);
      container.addChild(sprite);
      return container;
    }

    const bg = new PIXI.Graphics();
    bg.beginFill(def.color, 0.92);
    bg.lineStyle({ width: 2, color: 0xffffff, alpha: 0.35 });
    bg.drawCircle(0, 0, radius);
    bg.endFill();
    container.addChild(bg);

    const text = new PIXI.Text(def.emoji, { fontSize: radius * 1.5, align: 'center' });
    text.anchor.set(0.5);
    container.addChild(text);

    return container;
  }
}

function pointToSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}
