export function watchRelease(ctx) {
  let current = ctx.revision,
    checking = false;
  async function check() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const response = await fetch("/api/local/build", { cache: "no-store" });
      if (!response.ok) return;
      const build = await response.json();
      if (!current) {
        current = build.revision;
        return;
      }
      if (build.revision === current || document.querySelector("#ft-update")) return;
      const box = document.createElement("aside"),
        text = document.createElement("span"),
        button = document.createElement("button");
      box.id = "ft-update";
      box.setAttribute("role", "status");
      text.textContent = "VelluM Priston Tale: atualização disponível. Seu progresso será salvo.";
      button.textContent = "Salvar e atualizar";
      button.onclick = async () => {
        button.disabled = true;
        try {
          await ctx.save();
          location.reload();
        } catch (e) {
          text.textContent = "Falha ao salvar: " + e.message;
          button.disabled = false;
        }
      };
      box.append(text, button);
      document.body.append(box);
    } finally {
      checking = false;
    }
  }
  const timer = setInterval(() => check().catch(() => {}), 30000);
  document.addEventListener("visibilitychange", () => check().catch(() => {}));
  return { check, dispose: () => clearInterval(timer) };
}

