export function specializationRule(code, table) {
  if (table[code]) return { rule: table[code], source: code };
  // New item tiers missing in the public table inherit a family rule locally.
  const sameFamily = Object.keys(table)
    .filter((key) => key.slice(0, 3) === code.slice(0, 3))
    .sort((a, b) => Number(b.slice(2)) - Number(a.slice(2)));
  const source = sameFamily[0];
  return source ? { rule: table[source], source } : null;
}

export function effectiveSpecialization(items, job, level) {
  const out = {};
  for (const item of items) {
    if ((item.spec & 65535) !== job) continue;
    for (const [key, value] of Object.entries(item.specBonus ?? {})) {
      if (!Number.isFinite(value)) continue;
      const amount = ["damage", "attackRating"].includes(key)
        ? value > 0
          ? Math.floor(level / value)
          : 0
        : value;
      out[key] = (out[key] ?? 0) + amount;
    }
  }
  return out;
}
