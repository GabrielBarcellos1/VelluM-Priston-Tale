// Replace visible product labels, preserving bundled code and attribution notices.
export function brandInterface(root = document.body) {
  const product = /Zephira(?:\s*World|\s+LAN\s*\d+)?/gi;
  const update = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.parentElement?.closest("script,style,code,pre,[data-preserve-attribution]")) return;
      const next = node.nodeValue.replace(product, "FREEston Tale");
      if (next !== node.nodeValue) node.nodeValue = next;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) update(walk.currentNode);
    }
  };
  update(root);
  const observer = new MutationObserver((changes) => {
    for (const change of changes) {
      if (change.type === "characterData") update(change.target);
      else for (const child of change.addedNodes) update(child);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true });
  return observer;
}
