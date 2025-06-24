## 🈯️ i18n Auto-Translator (OpenAI-Compatible)

This is a minimal CLI tool to **automatically translate your `en.json` i18n files** to other languages using an **OpenAI-compatible API** (e.g. [Ollama](https://ollama.com), [LocalAI](https://localai.io), OpenRouter, or OpenAI itself).

---

### 📦 Features

* 🧠 Uses LLMs like `gpt-3.5-turbo`, `mistral`, etc.
* 🔤 Translates all values in a single request per language.
* 🧹 No merging: it **overwrites** the entire output file.
* ⚙️ Configurable model, endpoint, and output directory.
* 🤐 Default mode disables LLM reasoning for faster/more direct translations.
* ✅ Compatible with CI/CD (e.g. GitLab pipelines)

---

### 🚀 Usage

```bash
node translate-i18n.ts en.json \
  --to nl \
  --to fr \
  --apiUrl http://localhost:11434/v1/chat/completions \
  --model mistral:instruct \
  --outDir .src/i18n \
  --reasoning false
```

---

### 📥 CLI Arguments

| Flag          | Description                                         | Default                                      |
| ------------- | --------------------------------------------------- | -------------------------------------------- |
| `en.json`     | Source translation file (required)                  | —                                            |
| `--to`        | Language code to translate to (can repeat)          | —                                            |
| `--apiUrl`    | OpenAI-compatible endpoint                          | `http://localhost:11434/v1/chat/completions` |
| `--apiKey`    | Bearer token (optional, for secured APIs)           | —                                            |
| `--model`     | Model name to use (e.g. `gpt-3.5-turbo`, `mistral`) | `gpt-3.5-turbo`                              |
| `--reasoning` | Whether to allow LLM reasoning (`true` or `false`)  | `false`                                      |
| `--outDir`    | Output directory for translated `.json` files       | `.` (current folder)                         |

---

### 🛠 Output Behavior

* A file like `fr.json` is created in the `--outDir`.
* It contains a **full translation of all keys from `en.json`**.
* Existing files are **overwritten entirely**.

---

### ✅ Example Output

If `en.json` contains:

```json
{
  "common.ok": "OK",
  "common.cancel": "Cancel"
}
```

Then `nl.json` will contain something like:

```json
{
  "common.ok": "OK",
  "common.cancel": "Annuleren"
}
```

---

### 🧪 Works With

* ✅ [Ollama](https://ollama.com) (`http://localhost:11434`)
* ✅ [LocalAI](https://localai.io/)
* ✅ [OpenAI](https://openai.com/)
* ✅ [OpenRouter](https://openrouter.ai/)

---