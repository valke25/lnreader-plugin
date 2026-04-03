
class WordReplacementPlugin extends PluginBase {
  constructor() {
    super();
    this.key = "word_replacements";
    this.replacements = [];
  }

  async onLoad() {
    await this.loadData();
  }

  async loadData() {
    try {
      const data = await this.store.get(this.key);
      this.replacements = Array.isArray(data) ? data : [];
    } catch (e) {
      this.replacements = [];
    }
  }

  async saveData() {
    try {
      await this.store.set(this.key, this.replacements);
    } catch (e) {}
  }

  applyReplacements(text) {
    let output = text;

    this.replacements.forEach(({ from, to }) => {
      if (!from) return;

      const regex = new RegExp(
        from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi"
      );

      output = output.replace(regex, to);
    });

    return output;
  }

  onChapterLoaded(chapterHtml) {
    const container = document.createElement("div");
    container.innerHTML = chapterHtml;

    const walk = (node) => {
      if (node.nodeType === 3) {
        let text = node.nodeValue;

        // Apply replacements
        text = this.applyReplacements(text);

        // **bold**
        text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

        // [bold] (remove brackets, keep bold)
        text = text.replace(/\[(.*?)\]/g, "<strong>$1</strong>");

        const span = document.createElement("span");
        span.innerHTML = text;

        node.replaceWith(span);
      } else {
        node.childNodes.forEach(walk);
      }
    };

    container.childNodes.forEach(walk);

    return container.innerHTML;
  }

  getSettingsComponent() {
    const wrapper = document.createElement("div");

    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    const fromInput = document.createElement("input");
    const toInput = document.createElement("input");
    const addBtn = document.createElement("button");
    const select = document.createElement("select");
    const deleteBtn = document.createElement("button");

    fromInput.placeholder = "Word to replace";
    toInput.placeholder = "Replace with";
    addBtn.textContent = "Add";
    deleteBtn.textContent = "Delete";

    const styleInput = (el) => {
      el.style.padding = "6px";
      el.style.borderRadius = "6px";
      el.style.border = "1px solid #444";
      el.style.background = "#111";
      el.style.color = "white";
    };

    [fromInput, toInput, select].forEach(styleInput);

    addBtn.style.cssText =
      "padding:6px;background:#4CAF50;color:white;border:none;border-radius:6px;";
    deleteBtn.style.cssText =
      "padding:6px;background:#e53935;color:white;border:none;border-radius:6px;";

    const render = () => {
      select.innerHTML = "";
      this.replacements.forEach((r, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = `${r.from} → ${r.to}`;
        select.appendChild(opt);
      });
    };

    addBtn.onclick = async () => {
      const from = fromInput.value.trim();
      const to = toInput.value.trim();

      if (!from) return;

      this.replacements.push({ from, to });
      await this.saveData();

      fromInput.value = "";
      toInput.value = "";

      render();
    };

    deleteBtn.onclick = async () => {
      const index = parseInt(select.value);
      if (isNaN(index)) return;

      this.replacements.splice(index, 1);
      await this.saveData();

      render();
    };

    render();

    wrapper.appendChild(fromInput);
    wrapper.appendChild(toInput);
    wrapper.appendChild(addBtn);
    wrapper.appendChild(select);
    wrapper.appendChild(deleteBtn);

    return wrapper;
  }
}

// Safer export for LNReader compatibility
if (typeof module !== "undefined") {
  module.exports = WordReplacementPlugin;
} else {
  exports.default = WordReplacementPlugin;
}
