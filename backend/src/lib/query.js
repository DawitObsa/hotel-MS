export function positivePage(value, fallback = 1, max = 10000) {
  const parsed = Number.parseInt(value, 10);
  return Math.max(1, Math.min(max, Number.isFinite(parsed) ? parsed : fallback));
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
