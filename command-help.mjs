export const commands = [
  {
    name: "skins",
    syntax: "/skins",
    example: "/skins",
    description:
      "Abre a loja de visuais. Compre e equipe skins compatíveis sem mudar os atributos do equipamento.",
    category: "Jogador",
    aliases: [],
  },
  {
    name: "loja",
    syntax: "/loja",
    example: "/loja",
    description:
      "Abre a loja premium, seu saldo de coins e Meus premiums. Compre e ative os itens pela loja.",
    category: "Jogador",
    aliases: ["premium", "shop"],
  },
  {
    name: "coins",
    syntax: "/coins [ID] QUANTIA",
    example: "/coins bielbt 1000",
    description:
      "Adiciona coins à conta pelo ID de login. Sem ID, adiciona para você. Saldo único para todas as classes, salvo no servidor.",
    category: "Personagem",
    admin: true,
    aliases: ["addcoins", "adicionarcoins"],
  },
  {
    name: "ajuda",
    syntax: "/ajuda",
    example: "/ajuda",
    description: "Abre este guia. Feche pelo X ou pela tecla Esc.",
    category: "Jogador",
    aliases: ["help"],
  },
  {
    name: "habilidades",
    syntax: "/habilidades",
    example: "/habilidades",
    description:
      "Abre o livro FREEston Tale com as 16 habilidades da classe, inclusive bloqueadas. Mostra as 16 habilidades da sua classe. Aprenda com Mestre Verkan em Ricarten ou Mestre Raymon em Pillai.",
    category: "Jogador",
    aliases: ["skills"],
  },
  {
    name: "pos",
    syntax: "/pos",
    example: "/pos",
    description: "Mostra o mapa e suas coordenadas.",
    category: "Jogador",
  },
  {
    name: "salvar",
    syntax: "/salvar",
    example: "/salvar",
    description: "Salva seu personagem na conta.",
    category: "Jogador",
  },
  {
    name: "drops",
    syntax: "/drops",
    example: "/drops",
    description: "Consulta as regras de drop deste mundo.",
    category: "Jogador",
  },
  {
    name: "equipar",
    syntax: "/equipar",
    example: "/equipar",
    description: "Monta o conjunto endgame da classe e maximiza as habilidades.",
    category: "Personagem",
    admin: true,
  },
  {
    name: "nivel",
    syntax: "/nivel N",
    example: "/nivel 50",
    description: "Define o nível do personagem entre 1 e 150.",
    category: "Personagem",
    admin: true,
    aliases: ["setlevel"],
  },
  {
    name: "ouro",
    syntax: "/ouro QUANTIA",
    example: "/ouro 100000",
    description: "Define o total de ouro.",
    category: "Personagem",
    admin: true,
    aliases: ["gold"],
  },
  {
    name: "atributo",
    syntax: "/atributo NOME VALOR",
    example: "/atributo str 300",
    description: "Define str, spi, tal, dex ou health (1–999).",
    category: "Personagem",
    admin: true,
  },
  {
    name: "curar",
    syntax: "/curar",
    example: "/curar",
    description: "Recupera HP, MP e resistência.",
    category: "Personagem",
    admin: true,
    aliases: ["heal"],
  },
  {
    name: "deus",
    syntax: "/deus on|off",
    example: "/deus on",
    description: "Liga ou desliga invencibilidade.",
    category: "Personagem",
    admin: true,
  },
  {
    name: "tp",
    syntax: "/tp MAPA ou X Z",
    example: "/tp Ricarten",
    description: "Viaja pelo nome/ID do mapa ou pelas coordenadas. /mapas lista destinos.",
    category: "Mundo",
    admin: true,
    aliases: ["field", "move", "teleport", "teleportar", "teletransportar", "mapa"],
  },
  {
    name: "voar",
    syntax: "/voar on|off|ALTURA",
    example: "/voar 200",
    description: "Voa pelo cenário. /voar off pousa em terreno válido.",
    category: "Mundo",
    admin: true,
  },
  {
    name: "subir",
    syntax: "/subir [ALTURA]",
    example: "/subir 50",
    description: "Aumenta a altura durante o voo.",
    category: "Mundo",
    admin: true,
  },
  {
    name: "descer",
    syntax: "/descer [ALTURA]",
    example: "/descer 50",
    description: "Reduz a altura durante o voo.",
    category: "Mundo",
    admin: true,
  },
  {
    name: "invisivel",
    syntax: "/invisivel on|off",
    example: "/invisivel on",
    description: "Oculta seu personagem e interrompe a agressão dos monstros.",
    category: "Mundo",
    admin: true,
  },
  {
    name: "velocidade",
    syntax: "/velocidade 1–10",
    example: "/velocidade 3",
    description: "Define a velocidade GM. Segure Shift ao andar.",
    category: "Mundo",
    admin: true,
    aliases: ["speed"],
  },
  {
    name: "monstro",
    syntax: "/monstro NOME",
    example: "/monstro Valento",
    description: "Invoca um monstro real perto de você. Use /monstros para pesquisar.",
    category: "Mundo",
    admin: true,
  },
  {
    name: "congelar",
    syntax: "/congelar on|off",
    example: "/congelar on",
    description: "Suspende ou retoma a agressão dos monstros.",
    category: "Mundo",
    admin: true,
  },
  {
    name: "limpar",
    syntax: "/limpar",
    example: "/limpar",
    description: "Remove monstros do cenário sem conceder recompensas.",
    category: "Mundo",
    admin: true,
  },
  {
    name: "renascer",
    syntax: "/renascer",
    example: "/renascer",
    description: "Restaura os monstros presentes na sessão.",
    category: "Mundo",
    admin: true,
  },
  {
    name: "criar",
    syntax: "/criar NOME [QUANTIDADE]",
    example: "/criar Anel do Valento 2",
    description: "Cria itens na bolsa por nome ou código. /itens pesquisa o catálogo.",
    category: "Itens",
    admin: true,
    aliases: ["item"],
  },
  {
    name: "additem",
    syntax: "/AddItem CÓDIGO [CLASSE] [AGING]",
    example: "/AddItem WA130 1 20",
    description:
      "Compatibilidade com o comando citado na ajuda original. Classe de 1 a 11 e aging até +20, nas peças compatíveis.",
    category: "Itens",
    admin: true,
  },
  {
    name: "itens",
    syntax: "/itens BUSCA",
    example: "/itens Valento",
    description: "Pesquisa nomes e códigos de itens.",
    category: "Consultas",
  },
  {
    name: "monstros",
    syntax: "/monstros BUSCA",
    example: "/monstros Valento",
    description: "Pesquisa nomes, índices e níveis dos monstros.",
    category: "Consultas",
  },
  {
    name: "mapas",
    syntax: "/mapas [BUSCA]",
    example: "/mapas Jardim",
    description: "Lista os destinos por nome e ID.",
    category: "Consultas",
  },
  {
    name: "classe",
    syntax: "/classe ID",
    example: "/classe 7",
    description: "Troca de classe. Cada classe tem seu próprio progresso. /classes lista os IDs.",
    category: "Personagem",
    admin: true,
  },
  {
    name: "gm",
    syntax: "/gm",
    example: "/gm",
    description: "Consulta os modos administrativos ativos.",
    category: "Diagnóstico",
    admin: true,
  },
  {
    name: "diagnostico",
    syntax: "/diagnostico",
    example: "/diagnostico",
    description: "Mostra o estado da sessão e os erros recentes.",
    category: "Diagnóstico",
  },
  {
    name: "reconectar",
    syntax: "/reconectar",
    example: "/reconectar",
    description: "Salva e reabre a sessão da conta.",
    category: "Diagnóstico",
  },
];
export function canonicalCommand(name) {
  const key = String(name)
    .replace(/^\//, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return commands.find((c) => c.name === key || c.aliases?.includes(key))?.name ?? key;
}
export function openCommandHelp({ isAdmin, onUse }) {
  document.querySelector("#local-command-help")?.dispatchEvent(new Event("dismiss-help"));
  if (!document.querySelector("#command-help-style")) {
    const style = document.createElement("style");
    style.id = "command-help-style";
    style.textContent = `
  #local-command-help{box-sizing:border-box;width:min(940px,94vw);max-height:88vh;border:1px solid #a78b52;border-radius:16px;padding:0;background:#141a18;color:#e7e6db;box-shadow:0 24px 100px #000b;font:14px/1.5 system-ui;overflow:hidden}#local-command-help::backdrop{background:#0009;backdrop-filter:blur(3px)}
  #local-command-help *{box-sizing:border-box}#local-command-help header{padding:24px 28px 16px;background:linear-gradient(120deg,#28362b,#191f1b);border-bottom:1px solid #4a5140}#local-command-help h2{margin:3px 0;font:600 28px Georgia,serif;color:#f0dfad}#local-command-help p{margin:4px 0;color:#b9c4b4}#local-command-help .help-eyebrow{letter-spacing:.15em;font-size:10px;color:#c9b474;text-transform:uppercase}#local-command-help .help-close{position:absolute;right:16px;top:16px;border:1px solid #65705c;border-radius:8px;background:#ffffff0b;color:#e4e9df;font-size:23px;width:38px;height:38px;cursor:pointer}
  #local-command-help .help-tools{padding:16px 28px;display:flex;gap:12px;background:#1b231e}#local-command-help input{flex:1;min-width:0;background:#101612;color:#fff;border:1px solid #53624d;border-radius:8px;padding:11px 14px;font:inherit}#local-command-help select{background:#263225;color:#e9efde;border:1px solid #53624d;border-radius:8px;padding:8px}#local-command-help .help-results{padding:4px 28px 24px;overflow:auto;max-height:55vh}#local-command-help h3{font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:#b8c6a3;margin:24px 0 12px}#local-command-help .help-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#local-command-help article{border:1px solid #3b493a;background:#1e2820;border-radius:10px;padding:15px}#local-command-help code{color:#f0d38a;font:600 13px ui-monospace,monospace;overflow-wrap:anywhere}#local-command-help article p{font-size:12px;margin:8px 0 12px}#local-command-help small{display:block;color:#97a58b;font-size:10px;margin-bottom:8px}#local-command-help .help-use{background:#344c30;border:1px solid #66845a;border-radius:6px;color:#e0ead5;padding:6px 10px;cursor:pointer;font:12px system-ui}#local-command-help footer{padding:12px 28px;border-top:1px solid #3b493a;font-size:11px;color:#aebda4}#local-command-help button:focus-visible{outline:2px solid #d8bf7c;outline-offset:3px}@media(max-width:600px){#local-command-help header,#local-command-help .help-tools,#local-command-help .help-results{padding-left:16px;padding-right:16px}#local-command-help .help-grid{grid-template-columns:1fr}#local-command-help h2{font-size:23px}#local-command-help .help-results{max-height:52vh}}`;
    document.head.append(style);
  }
  const previous = document.activeElement,
    dialog = document.createElement("dialog");
  dialog.id = "local-command-help";
  dialog.setAttribute("aria-labelledby", "command-help-title");
  const header = document.createElement("header"),
    eyebrow = document.createElement("div");
  eyebrow.className = "help-eyebrow";
  eyebrow.textContent = isAdmin ? "Guia do administrador" : "Guia do aventureiro";
  const title = document.createElement("h2");
  title.id = "command-help-title";
  title.textContent = "Comandos & ajuda";
  const intro = document.createElement("p");
  intro.textContent = "Encontre um comando e preencha o chat com um exemplo.";
  const close = document.createElement("button");
  close.className = "help-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "Fechar ajuda");
  header.append(eyebrow, title, intro, close);
  const tools = document.createElement("div");
  tools.className = "help-tools";
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Buscar comando, ação ou exemplo…";
  search.setAttribute("aria-label", "Buscar comandos");
  const filter = document.createElement("select");
  filter.setAttribute("aria-label", "Categoria");
  const visible = commands.filter((c) => isAdmin || !c.admin);
  for (const name of ["Todas", ...new Set(visible.map((c) => c.category))]) {
    const o = document.createElement("option");
    o.textContent = name;
    filter.append(o);
  }
  tools.append(search, filter);
  const results = document.createElement("div");
  results.className = "help-results";
  const footer = document.createElement("footer");
  footer.textContent = "Enter envia o comando no chat. Esc ou × fecha este guia completamente.";
  let removed = false;
  const dismiss = () => {
    if (removed) return;
    removed = true;
    dialog.close();
    dialog.remove();
    if (previous?.isConnected) previous.focus();
  };
  close.onclick = dismiss;
  dialog.addEventListener("dismiss-help", dismiss);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    dismiss();
  });
  dialog.addEventListener("close", dismiss);
  for (const type of [
    "keydown",
    "keyup",
    "pointerdown",
    "pointerup",
    "mousedown",
    "mouseup",
    "click",
    "wheel",
    "touchstart",
    "touchend",
  ])
    dialog.addEventListener(type, (e) => e.stopPropagation());
  function draw() {
    results.replaceChildren();
    const q = search.value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const entries = visible.filter(
      (c) =>
        (filter.value === "Todas" || c.category === filter.value) &&
        `${c.syntax} ${c.description} ${c.aliases ?? ""}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(q),
    );
    if (!entries.length) {
      const p = document.createElement("p");
      p.textContent = "Nenhum comando encontrado. Tente outra palavra.";
      results.append(p);
    }
    for (const category of new Set(entries.map((c) => c.category))) {
      const h = document.createElement("h3");
      h.textContent = category;
      const grid = document.createElement("div");
      grid.className = "help-grid";
      for (const c of entries.filter((c) => c.category === category)) {
        const card = document.createElement("article"),
          code = document.createElement("code"),
          text = document.createElement("p"),
          use = document.createElement("button");
        code.textContent = c.syntax;
        text.textContent =
          c.name === "habilidades" && isAdmin
            ? c.description +
              " Para testes GM: /habilidades liberar maximiza somente a classe atual."
            : c.description;
        use.textContent = "Preencher chat";
        use.className = "help-use";
        use.onclick = () => {
          dismiss();
          onUse(c.example);
        };
        card.append(code, text);
        if (c.aliases?.length) {
          const aliases = document.createElement("small");
          aliases.textContent = "Também aceita: " + c.aliases.map((a) => "/" + a).join(" · ");
          card.append(aliases);
        }
        card.append(use);
        grid.append(card);
      }
      results.append(h, grid);
    }
  }
  search.oninput = draw;
  filter.onchange = draw;
  dialog.append(header, tools, results, footer);
  document.body.append(dialog);
  draw();
  dialog.showModal();
  search.focus();
  return dialog;
}
