const words = {
  anel: "ring",
  aneis: "ring",
  armadura: "armor",
  botas: "boots",
  bota: "boots",
  luvas: "gauntlets",
  luva: "gauntlets",
  bracelete: "bracelets",
  braceletes: "bracelets",
  amuleto: "amulet",
  escudo: "shield",
  espada: "sword",
  machado: "axe",
  lanca: "spear",
  foice: "scythe",
  arco: "bow",
  cajado: "staff",
  varinha: "wand",
  adaga: "dagger",
  garra: "talon",
  martelo: "hammer",
  pocao: "potion",
  pocoes: "potion",
  colar: "amulet",
  traje: "costume",
};
export function normalizeName(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w && !["do", "da", "de", "dos", "das", "the", "of"].includes(w))
    .map((w) => words[w] ?? w)
    .sort()
    .join(" ");
}
export function resolveName(entries, query) {
  if (!query.trim()) throw Error("Informe um nome ou código.");
  const key = normalizeName(query),
    code = query.trim().toLowerCase();
  const ids = entries.filter((e) => String(e.code ?? e.id).toLowerCase() === code);
  if (ids.length === 1) return ids[0];
  const exact = entries.filter((e) => normalizeName(e.name) === key);
  const matches = exact.length
    ? exact
    : entries.filter((e) =>
        key.split(" ").every((token) =>
          normalizeName(e.name)
            .split(" ")
            .some((w) => w.startsWith(token)),
        ),
      );
  if (matches.length === 1) return matches[0];
  if (!matches.length)
    throw Error(`Não encontrado: ${query}. Consulte /itens, /monstros ou /mapas.`);
  throw Error(
    `Nome ambíguo; informe o nome completo ou código: ${matches
      .slice(0, 12)
      .map((e) => `${e.name} [${e.code ?? e.id}]`)
      .join("; ")}${matches.length > 12 ? "; …" : ""}`,
  );
}
