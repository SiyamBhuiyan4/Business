export interface FruitDef {
  key: string;
  emoji: string;
  color: number;
  points: number;
  radius: number;
  /** Drop a matching image here to replace the emoji placeholder -- see public/game-assets/fruits/README.md */
  spritePath: string;
}

export const FRUITS: FruitDef[] = [
  { key: 'shiitake', emoji: '\u{1F344}', color: 0x8d5a3b, points: 10, radius: 42, spritePath: '/game-assets/fruits/shiitake.png' },
  { key: 'portobello', emoji: '\u{1F344}', color: 0x5c4033, points: 15, radius: 48, spritePath: '/game-assets/fruits/portobello.png' },
  { key: 'enoki', emoji: '\u{1F344}', color: 0xf3e9d2, points: 8, radius: 28, spritePath: '/game-assets/fruits/enoki.png' },
  { key: 'oyster', emoji: '\u{1F344}', color: 0xcbb9a8, points: 10, radius: 40, spritePath: '/game-assets/fruits/oyster.png' },
];

/** Slicing this ends the run instantly. */
export const BOMB: FruitDef = {
  key: 'bomb',
  emoji: '\u{1F4A3}',
  color: 0x1a1a1a,
  points: 0,
  radius: 40,
  spritePath: '/game-assets/fruits/bomb.png',
};

export function randomFruit(): FruitDef {
  return FRUITS[Math.floor(Math.random() * FRUITS.length)];
}
