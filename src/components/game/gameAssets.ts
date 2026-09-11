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
  { key: 'morel', emoji: '\u{1F344}', color: 0xa47551, points: 20, radius: 38, spritePath: '/game-assets/fruits/morel.png' },
  { key: 'chanterelle', emoji: '\u{1F344}', color: 0xe8a33d, points: 12, radius: 34, spritePath: '/game-assets/fruits/chanterelle.png' },
  { key: 'enoki', emoji: '\u{1F344}', color: 0xf3e9d2, points: 8, radius: 28, spritePath: '/game-assets/fruits/enoki.png' },
  { key: 'oyster', emoji: '\u{1F344}', color: 0xcbb9a8, points: 10, radius: 40, spritePath: '/game-assets/fruits/oyster.png' },
  { key: 'amanita', emoji: '\u{1F344}', color: 0xd7263d, points: 25, radius: 44, spritePath: '/game-assets/fruits/amanita.png' },
];

/** Toxic mushroom -- slicing it ends the game instantly, same role a "bomb" plays in classic slicing games. */
export const BOMB: FruitDef = {
  key: 'toxic',
  emoji: '\u{2620}\u{FE0F}',
  color: 0x4a1a5c,
  points: 0,
  radius: 40,
  spritePath: '/game-assets/fruits/toxic.png',
};

export function randomFruit(): FruitDef {
  return FRUITS[Math.floor(Math.random() * FRUITS.length)];
}
