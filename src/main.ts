#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';
import { parse as parseUrl } from 'url';
import * as path from 'path';
import { getArg, getAllArgs, getTranslationDiff, createTranslationPrompt, type Translations } from './utils';

// --- CLI parsing ---
const [,, sourceFile, ...restArgs] = process.argv;

const targetLangs: string[] = getAllArgs(restArgs, '--to');
const apiUrl = getArg(restArgs, '--apiUrl') || 'http://localhost:11434/v1/chat/completions';
const apiKey = getArg(restArgs, '--apiKey') || '';
const model = getArg(restArgs, '--model') || 'gpt-3.5-turbo';
const reasoning = getArg(restArgs, '--reasoning') === 'true'; // default = false
const outDir = getArg(restArgs, '--outDir') || '.';

if (!sourceFile || targetLangs.length === 0) {
  console.error('❌ Usage: node translate-i18n.js en.json --to nl --to fr [--apiUrl] [--apiKey] [--model] [--reasoning true] [--outDir ./dir]');
  process.exit(1);
}

const sourceData: Translations = JSON.parse(readFileSync(sourceFile, 'utf8'));

// --- Translate entire file at once ---
async function translateJson(fullJson: Translations, targetLang: string): Promise<Translations> {
  const prompt = createTranslationPrompt(fullJson, targetLang, reasoning);

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

import { existsSync } from 'fs';


(async () => {
  console.log(`🔍 Loaded ${sourceFile} with ${Object.keys(sourceData).length} keys`);
  console.log(`🌍 Translating to: ${targetLangs.join(', ')}`);
  console.log(`🧠 Model: (${apiUrl}) ${model}, Reasoning: ${reasoning}`);
  console.log(`📂 Output directory: ${outDir}`);

  for (const lang of targetLangs) {
    const outputFile = path.join(outDir, `${lang}.json`);
    let existingData: Translations = {};

    if (existsSync(outputFile)) {
      try {
        existingData = JSON.parse(readFileSync(outputFile, 'utf8'));
      } catch (err) {
        console.warn(`⚠️ Could not read ${outputFile}, continuing with empty translation.`);
      }
    }

    const diff = getTranslationDiff(sourceData, existingData);
    const diffKeys = Object.keys(diff);

    if (diffKeys.length === 0) {
      console.log(`✅ ${lang}.json is up-to-date`);
      continue;
    }

    console.log(`🌐 Translating ${diffKeys.length} new/changed keys for "${lang}"...`);

    try {
      const translated = await translateJson(diff, lang);
      const merged = { ...existingData, ...translated };


      writeFileSync(outputFile, JSON.stringify(merged, null, 2));
      console.log(`✅ Updated: ${outputFile}`);
    } catch (err) {
      console.error(`❌ Failed to translate "${lang}": ${(err as Error).message}`);
    }
  }
})();
