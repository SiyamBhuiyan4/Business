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
  { key: 'mango', emoji: '\u{1F96D}', color: 0xffb703, points: 10, radius: 42, spritePath: '/game-assets/fruits/mango.png' },
  { key: 'coconut', emoji: '\u{1F965}', color: 0x8d6e63, points: 15, radius: 46, spritePath: '/game-assets/fruits/coconut.png' },
  { key: 'pineapple', emoji: '\u{1F34D}', color: 0xffd60a, points: 20, radius: 48, spritePath: '/game-assets/fruits/pineapple.png' },
  { key: 'kiwi', emoji: '\u{1F95D}', color: 0x9ccc65, points: 10, radius: 36, spritePath: '/game-assets/fruits/kiwi.png' },
  { key: 'papaya', emoji: '\u{1F348}', color: 0xff8fa3, points: 12, radius: 42, spritePath: '/game-assets/fruits/papaya.png' },
  { key: 'litchi', emoji: '\u{1F352}', color: 0xe63946, points: 8, radius: 28, spritePath: '/game-assets/fruits/litchi.png' },
  { key: 'dates', emoji: '\u{1F330}', color: 0x6f4e37, points: 8, radius: 26, spritePath: '/game-assets/fruits/dates.png' },
];

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
