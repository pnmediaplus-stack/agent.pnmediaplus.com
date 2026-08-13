import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const indexPath = path.resolve(process.cwd(), 'src/lib/ai-providers/index.ts');

test('provider registry is fail-closed', () => {
  const source = fs.readFileSync(indexPath, 'utf8');

  assert.match(source, /PROVIDER_NOT_SUPPORTED/);
  assert.doesNotMatch(source, /Fallback to Universal OpenAI Adapter/i);
  assert.doesNotMatch(source, /return openaiAdapter;/);
});

test('provider registry still declares the supported adapters explicitly', () => {
  const source = fs.readFileSync(indexPath, 'utf8');

  assert.match(source, /'openai':\s*openaiAdapter/);
  assert.match(source, /'fal_ai':\s*falAiAdapter/);
});
