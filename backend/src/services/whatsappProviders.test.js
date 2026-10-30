import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { sendWhatsAppText } from './whatsappProviders.js';

const ENV_KEYS = [
  'WHATSAPP_ENABLED',
  'WHATSAPP_FALLBACK_ENABLED',
  'WAHA_ENABLED',
  'WAHA_BASE_URL',
  'WAHA_API_KEY',
  'WAHA_SESSION',
  'WAHA_TIMEOUT_MS',
  'ZPRO_ENABLED',
  'ZPRO_BASE_URL',
  'ZPRO_API_ID',
  'ZPRO_API_TOKEN',
  'ZPRO_TIMEOUT_MS',
];

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.WHATSAPP_ENABLED = 'true';
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

test('usa WAHA como provedor principal quando ele responde', async () => {
  process.env.WAHA_BASE_URL = 'https://waha.example.com';
  process.env.WAHA_API_KEY = 'waha-secret';
  process.env.WHATSAPP_FALLBACK_ENABLED = 'true';
  process.env.ZPRO_ENABLED = 'true';
  process.env.ZPRO_BASE_URL = 'https://zpro.example.com';
  process.env.ZPRO_API_ID = 'api-id';
  process.env.ZPRO_API_TOKEN = 'zpro-secret';

  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('check-exists')) {
      return jsonResponse({ numberExists: true, chatId: '5588999999999@c.us' });
    }
    return jsonResponse({ id: 'waha-message-id', ack: 1 });
  };

  const result = await sendWhatsAppText({
    chatId: '5588999999999@c.us',
    text: 'Teste',
    fetchImpl,
  });

  assert.equal(result.provider, 'waha');
  assert.equal(result.providerMessageId, 'waha-message-id');
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.url.startsWith('https://waha.example.com')));
});

test('usa ZPro quando WAHA esta indisponivel', async () => {
  process.env.WAHA_BASE_URL = 'https://waha.example.com';
  process.env.WAHA_API_KEY = 'waha-secret';
  process.env.WHATSAPP_FALLBACK_ENABLED = 'true';
  process.env.ZPRO_ENABLED = 'true';
  process.env.ZPRO_BASE_URL = 'https://zpro.example.com/';
  process.env.ZPRO_API_ID = 'agenda-thallyta';
  process.env.ZPRO_API_TOKEN = 'zpro-secret';

  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).startsWith('https://waha.example.com')) {
      return jsonResponse({ message: 'Sessao desconectada' }, 503);
    }
    return jsonResponse({ messageId: 'zpro-message-id' });
  };

  const result = await sendWhatsAppText({
    chatId: '(88) 99999-9999',
    text: 'Resumo do agendamento',
    externalKey: 'booking-123',
    fetchImpl,
  });

  assert.equal(result.provider, 'zpro');
  assert.equal(result.providerMessageId, 'zpro-message-id');
  assert.equal(result.fallbackFrom, 'waha');
  assert.equal(calls[1].url, 'https://zpro.example.com/v2/api/external/agenda-thallyta');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer zpro-secret');
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    body: 'Resumo do agendamento',
    number: '5588999999999',
    externalKey: 'booking-123',
    isClosed: false,
  });
});

test('usa ZPro diretamente quando WAHA nao esta configurado', async () => {
  process.env.WAHA_ENABLED = 'false';
  process.env.WHATSAPP_FALLBACK_ENABLED = 'true';
  process.env.ZPRO_ENABLED = 'true';
  process.env.ZPRO_BASE_URL = 'https://zpro.example.com';
  process.env.ZPRO_API_ID = 'api-id';
  process.env.ZPRO_API_TOKEN = 'zpro-secret';

  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    return jsonResponse({ id: 'zpro-id' });
  };

  const result = await sendWhatsAppText({ chatId: '88999999999', text: 'Teste', fetchImpl });

  assert.equal(result.provider, 'zpro');
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes('/v2/api/external/api-id'));
});

test('retorna erro combinado quando os dois provedores falham', async () => {
  process.env.WAHA_BASE_URL = 'https://waha.example.com';
  process.env.WAHA_API_KEY = 'waha-secret';
  process.env.WHATSAPP_FALLBACK_ENABLED = 'true';
  process.env.ZPRO_ENABLED = 'true';
  process.env.ZPRO_BASE_URL = 'https://zpro.example.com';
  process.env.ZPRO_API_ID = 'api-id';
  process.env.ZPRO_API_TOKEN = 'zpro-secret';

  const fetchImpl = async (url) => String(url).includes('waha')
    ? jsonResponse({ message: 'WAHA offline' }, 503)
    : jsonResponse({ message: 'Canal ZPro desconectado' }, 409);

  await assert.rejects(
    () => sendWhatsAppText({ chatId: '5588999999999', text: 'Teste', fetchImpl }),
    /Falha no WAHA \(WAHA offline\) e no ZPro \(Canal ZPro desconectado\)/,
  );
});

test('nao chama provedores quando WhatsApp esta desativado', async () => {
  process.env.WHATSAPP_ENABLED = 'false';
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return jsonResponse({});
  };

  const result = await sendWhatsAppText({ chatId: '5588999999999', text: 'Teste', fetchImpl });

  assert.equal(result.skipped, true);
  assert.equal(calls, 0);
});

