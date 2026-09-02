(() => {
  'use strict';

  const FROM = 'NukeSimulation.com';
  const TO = 'xrAtlas';

  function replaceText(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || !node.nodeValue) return;
    if (node.nodeValue.includes(FROM)) {
      node.nodeValue = node.nodeValue.split(FROM).join(TO);
    }
  }

  function replaceAttributes(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
    for (const attr of ['title', 'aria-label', 'alt']) {
      const value = el.getAttribute(attr);
      if (value && value.includes(FROM)) {
        el.setAttribute(attr, value.split(FROM).join(TO));
      }
    }
  }

  function apply(root) {
    if (!root) return;
    try { document.title = TO; } catch (_) {}

    if (root.nodeType === Node.TEXT_NODE) {
      replaceText(root);
      return;
    }

    replaceAttributes(root);
    if (root.querySelectorAll) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) replaceText(node);
      root.querySelectorAll('[title],[aria-label],[alt]').forEach(replaceAttributes);
    }
  }

  const run = () => {
    apply(document.documentElement);
    if (!document.documentElement) return;
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') replaceText(record.target);
        for (const node of record.addedNodes || []) apply(node);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true
    });
  };

  if (document.documentElement) run();
  else document.addEventListener('DOMContentLoaded', run, { once: true });
})();
