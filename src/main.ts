import { readFileSync, writeFileSync } from 'fs';
import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';
import { parse as parseUrl } from 'url';
import * as path from 'path';

// --- CLI parsing ---
const [,, sourceFile, ...restArgs] = process.argv;

function getArg(name: string): string | null {
  const i = restArgs.indexOf(name);
  return i !== -1 ? restArgs[i + 1] : null;
}

function getAllArgs(name: string): string[] {
  const result: string[] = [];
  let index = restArgs.indexOf(name);
  while (index !== -1) {
    const value = restArgs[index + 1];
    if (value && !value.startsWith('--')) result.push(value);
    index = restArgs.indexOf(name, index + 1);
  }
  return result;
}

const targetLangs: string[] = getAllArgs('--to');
const apiUrl = getArg('--apiUrl') || 'http://localhost:11434/v1/chat/completions';
const apiKey = getArg('--apiKey') || '';
const model = getArg('--model') || 'gpt-3.5-turbo';
const reasoning = getArg('--reasoning') === 'true'; // default = false
const outDir = getArg('--outDir') || '.';

if (!sourceFile || targetLangs.length === 0) {
  console.error('❌ Usage: node translate-i18n.js en.json --to nl --to fr [--apiUrl] [--apiKey] [--model] [--reasoning true] [--outDir ./dir]');
  process.exit(1);
}

type Translations = Record<string, string>;
const sourceData: Translations = JSON.parse(readFileSync(sourceFile, 'utf8'));

// --- Translate entire file at once ---
async function translateJson(fullJson: Translations, targetLang: string): Promise<Translations> {
  let instruction = `
    [no prose]
    [Output only JSON]
    You are a translation assistant. Translate only the values in the following JSON object from English to ${targetLang}. Keep the keys and structure identical. Return valid JSON only. DO NOT PERFORM FORMATTING, PROVIDE RAW JSON TEXT ONLY`;
  if (!reasoning) {
    instruction = '/no-think ' + instruction;
  }

  const prompt = `${instruction}\n\n${JSON.stringify(fullJson, null, 2)}`;

  const body = JSON.stringify({
    model,
    stream: true,
    messages: [{ role: 'user', content: prompt }],
  });

  const { protocol, hostname, port, pathname } = parseUrl(apiUrl);
  const isHttps = protocol === 'https:';
  const requestFn = isHttps ? httpsRequest : httpRequest;

  const options = {
    hostname: hostname || 'localhost',
    port: port || (isHttps ? 443 : 80),
    path: pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
  };

  return new Promise((resolve, reject) => {
    const req = requestFn(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const data = trimmed.replace(/^data:\s*/, '');
            if (data === '[DONE]') return;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content;
              if (delta) raw += delta;
            } catch {
              console.error('⚠️ Could not parse chunk:', data);
            }
          }
        }
      });

      res.on('end', () => {
        try {
          const translated = JSON.parse(raw);
          resolve(translated);
        } catch (err) {
          reject(new Error('Failed to parse final JSON from model: ' + (err as Error).message));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// --- Main ---
(async () => {
  console.log(`🔍 Loaded ${sourceFile} with ${Object.keys(sourceData).length} keys`);
  console.log(`🌍 Translating to: ${targetLangs.join(', ')}`);
  console.log(`🧠 Model: (${apiUrl}) ${model}, Reasoning: ${reasoning}`);
  console.log(`📂 Output directory: ${outDir}`);

  for (const lang of targetLangs) {
    try {
      console.log(`🌐 Translating to "${lang}"...`);
      const translated = await translateJson(sourceData, lang);
      const outputFile = path.join(outDir, `${lang}.json`);
      writeFileSync(outputFile, JSON.stringify(translated, null, 2));
      console.log(`✅ Wrote: ${outputFile}`);
    } catch (err) {
      console.error(`❌ Failed to translate "${lang}": ${(err as Error).message}`);
    }
  }
})();
