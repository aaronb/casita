const adjectives = [
  "swift", "bright", "calm", "bold", "keen",
  "warm", "cool", "fair", "glad", "wise",
  "quick", "neat", "pure", "safe", "vast",
  "wild", "free", "deep", "slim", "tall",
  "brave", "deft", "fond", "hale", "kind",
  "live", "mild", "rare", "true", "young",
  "apt", "dry", "fit", "lush", "pert",
  "rosy", "snug", "tidy", "wry", "zesty",
];

const nouns = [
  "fox", "owl", "elk", "jay", "bee",
  "ant", "ram", "cod", "emu", "yak",
  "cat", "dog", "bat", "hen", "ray",
  "eel", "koi", "pug", "asp", "cub",
  "ape", "bug", "cow", "doe", "fly",
  "gnu", "hog", "ibis", "kit", "lynx",
  "newt", "orca", "pike", "rook", "seal",
  "toad", "vole", "wasp", "wren", "zebu",
];

export function generateName(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}`;
}
