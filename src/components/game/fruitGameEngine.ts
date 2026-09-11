import type * as PIXI_NS from 'pixi.js';
import { BOMB, FRUITS, randomFruit, type FruitDef } from './gameAssets';

export type GameOverReason = 'bomb' | 'timeout';

export interface FruitGameCallbacks {
  onScoreChange: (score: number) => void;
  onMultiplierChange: (multiplier: number, combo: number) => void;
  /** Fires exactly once, on the very first successful slice. */
  onActivate: () => void;
  onGameOver: (finalScore: number, reason: GameOverReason) => void;
  /** Fires roughly once a second while ACTIVE, for a UI countdown display. */
  onCountdownTick: (secondsLeft: number) => void;
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
  isBomb: boolean;
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

type GameState = 'idle' | 'active';

const GRAVITY = 0.32;
const COMBO_WINDOW_MS = 1100;
const MAX_MULTIPLIER = 12;
const TRAIL_MAX_AGE_MS = 160;
const IDLE_TIMEOUT_MS = 20000;
const BOMB_CHANCE = 0.18;
const MOVE_STALE_MS = 120;

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
  private lastPoint: { x: number; y: number; t: number } | null = null;
  private exclusionRects: DOMRect[] = [];

  private state: GameState = 'idle';
  private score = 0;
  private combo = 0;
  private comboTimer = 0;
  private multiplier = 1;
  private lastSliceTime = 0;
  private lastCountdownSecond = -1;

  private spawnTimer = 0;
  private spawnInterval = 1000;
  private destroyed = false;

  private onPointerMove: (e: PointerEvent) => void;

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

    this.onPointerMove = this.handlePointerMove.bind(this);
    // Hover-only controls: no mousedown/press required at all, matches trackpad
    // swipe/hover expectations. Listens on window so it works regardless of
    // z-index stacking, and so it correctly stops the instant the pointer is
    // over real UI (see isExcluded) without needing pointer capture.
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });

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
      [...FRUITS, BOMB].map(async (def) => {
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
    window.removeEventListener('pointermove', this.onPointerMove);
    this.app.ticker.remove(this.update);
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }

  private handlePointerMove(e: PointerEvent) {
    const now = performance.now();
    const p = { x: e.clientX, y: e.clientY, t: now };

    if (this.isExcluded(p.x, p.y)) {
      // Over real UI: break the trail so it never draws across cards, skip slicing.
      this.lastPoint = null;
      return;
    }

    // If the pointer was stationary/away too long (or just entered open space),
    // don't connect this point to a stale one -- avoids a false long slice segment.
    const prev = this.lastPoint && now - this.lastPoint.t < MOVE_STALE_MS ? this.lastPoint : null;
    if (prev) this.checkSliceAlongSegment(prev, p);
    this.lastPoint = p;
    this.trail.push(p);
  }

  private checkSliceAlongSegment(a: { x: number; y: number }, b: { x: number; y: number }) {
    for (const fruit of this.fruits) {
      if (fruit.sliced) continue;
      const dist = pointToSegmentDistance(fruit.view.x, fruit.view.y, a.x, a.y, b.x, b.y);
      if (dist <= fruit.radius) {
        const endedMatch = this.sliceFruit(fruit);
        // A bomb just wiped the board (see endGame) -- the rest of this.fruits from
        // before that point are already-destroyed views, so stop touching them.
        if (endedMatch) return;
      }
    }
  }

  private spawnFruit() {
    const w = this.app.renderer.width / this.app.renderer.resolution;
    const h = this.app.renderer.height / this.app.renderer.resolution;
    const isBomb = Math.random() < BOMB_CHANCE;
    const def = isBomb ? BOMB : randomFruit();

    const dir = Math.floor(Math.random() * 3); // 0 bottom, 1 left, 2 right
    let x = 0, y = 0, vx = 0, vy = 0;

    // Trajectories are derived from real projectile physics (vy = -sqrt(2*g*travel))
    // so the apex height is precise and adapts to the actual viewport size, rather
    // than a fixed speed guess that would arc too low on tall screens.
    if (dir === 0) {
      x = w * (0.1 + Math.random() * 0.8);
      y = h + 40 + def.radius;
      // Apex reaches 80-85% of the screen's height up from the bottom edge.
      const apexY = h * (0.15 + Math.random() * 0.05);
      const travel = y - apexY;
      vx = (Math.random() - 0.5) * 5;
      vy = -Math.sqrt(2 * GRAVITY * travel);
    } else {
      const spawnY = h * (0.55 + Math.random() * 0.35);
      // Apex reaches into the upper-middle band of the screen.
      const apexY = h * (0.15 + Math.random() * 0.25);
      const travel = Math.max(60, spawnY - apexY);
      const vyMag = Math.sqrt(2 * GRAVITY * travel);
      const vxMag = 6 + Math.random() * 3;
      if (dir === 1) {
        x = -40 - def.radius;
        y = spawnY;
        vx = vxMag;
      } else {
        x = w + 40 + def.radius;
        y = spawnY;
        vx = -vxMag;
      }
      vy = -vyMag;
    }

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
      isBomb,
      sliced: false,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
    });
  }

  /** Returns true if this slice ended the match (bomb) -- callers must stop touching any other fruit references from the same batch when that happens, since the board is wiped instantly. */
  private sliceFruit(fruit: ActiveFruit): boolean {
    fruit.sliced = true;
    // Capture position before destroying the view -- PIXI nulls a destroyed
    // DisplayObject's internal transform, so reading .x/.y after destroy() throws.
    const x = fruit.view.x;
    const y = fruit.view.y;
    this.fruitLayer.removeChild(fruit.view);
    fruit.view.destroy({ children: true });
    this.fruits = this.fruits.filter((f) => f !== fruit);

    if (fruit.isBomb) {
      this.spawnParticleBurst(x, y, 0xff5555, 24);
      this.endGame('bomb');
      return true;
    }

    const wasIdle = this.state === 'idle';
    if (wasIdle) {
      this.state = 'active';
      this.callbacks.onActivate();
    }
    this.lastSliceTime = Date.now();

    this.combo += 1;
    this.comboTimer = COMBO_WINDOW_MS;
    this.multiplier = Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.combo / 3));
    this.score += fruit.def.points * this.multiplier;
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onMultiplierChange(this.multiplier, this.combo);

    this.spawnHalves(fruit, x, y);
    this.spawnParticleBurst(x, y, fruit.def.color, 14);
    this.spawnSporeCloud(x, y);
    return false;
  }

  /** Instantly wipes the board and drops back to idle -- no blocking "game over"
   * phase. The host is notified purely so it can flash the final score in the
   * HUD; the very next slice on empty background starts a brand new match. */
  private endGame(reason: GameOverReason) {
    const finalScore = this.score;

    for (const f of this.fruits) { this.fruitLayer.removeChild(f.view); f.view.destroy({ children: true }); }
    for (const p of this.particles) { this.particleLayer.removeChild(p.view); p.view.destroy({ children: true }); }
    this.fruits = [];
    this.particles = [];
    this.trail = [];
    this.lastPoint = null;

    this.state = 'idle';
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.lastCountdownSecond = -1;
    this.callbacks.onScoreChange(this.score);
    this.callbacks.onMultiplierChange(this.multiplier, this.combo);
    this.callbacks.onGameOver(finalScore, reason);
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

    const w = this.app.renderer.width / this.app.renderer.resolution;
    const h = this.app.renderer.height / this.app.renderer.resolution;

    // spawn logic: waves of 2-4 items every 0.8-1.2s, across bottom/left/right
    this.spawnTimer += dtMs;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnInterval = 800 + Math.random() * 400;
      const waveSize = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
      for (let i = 0; i < waveSize; i++) this.spawnFruit();
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

    // 20s inactivity timeout, only once the run is actually active
    if (this.state === 'active') {
      const elapsedMs = Date.now() - this.lastSliceTime;
      const secondsLeft = Math.max(0, Math.ceil((IDLE_TIMEOUT_MS - elapsedMs) / 1000));
      if (secondsLeft !== this.lastCountdownSecond) {
        this.lastCountdownSecond = secondsLeft;
        this.callbacks.onCountdownTick(secondsLeft);
      }
      if (elapsedMs > IDLE_TIMEOUT_MS) {
        this.endGame('timeout');
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
