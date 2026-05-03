const COLORS = [
  "#F97316",
  "#0F766E",
  "#2563EB",
  "#DC2626",
  "#7C3AED",
  "#CA8A04",
  "#DB2777",
  "#0891B2",
];

export function colorFromSeed(seed: string) {
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

export function initialsFromName(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
