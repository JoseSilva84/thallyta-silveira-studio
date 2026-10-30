import { randomUUID } from 'node:crypto';

const DEFAULT_TIMEOUT_MS = 15000;

const getPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/@(?:c\.us|s\.whatsapp\.net)$/i, '').replace(/\D/g, '');
  if (!digits) return null;
  return digits.startsWith('55') ? digits : `55${digits}`;
};

const getWahaConfig = () => ({
  enabled: process.env.WAHA_ENABLED !== 'false',
  baseUrl: process.env.WAHA_BASE_URL?.replace(/\/$/, ''),
  apiKey: process.env.WAHA_API_KEY,
  session: process.env.WAHA_SESSION || 'default',
  timeoutMs: getPositiveInteger(process.env.WAHA_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
});

const getZProConfig = () => ({
  enabled: process.env.ZPRO_ENABLED === 'true',
  baseUrl: process.env.ZPRO_BASE_URL?.replace(/\/$/, ''),
  apiId: process.env.ZPRO_API_ID,
  apiToken: process.env.ZPRO_API_TOKEN,
  timeoutMs: getPositiveInteger(process.env.ZPRO_TIMEOUT_MS, DEFAULT_TIMEOUT_MS),
});

const readResponse = async (response) => {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
};

const getErrorDetails = (result, fallback) => {
  const details = result?.message || result?.error || result?.raw || fallback;
  return String(details).slice(0, 1000);
};

const fetchWithTimeout = async (fetchImpl, url, options, timeoutMs, provider) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${provider} excedeu o tempo limite de ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const extractMessageId = (result) => {
  const id = result?.messageId
    || result?.id
    || result?.data?.messageId
    || result?.data?.id
    || result?._data?.id;

  if (!id) return null;
  if (typeof id === 'string' || typeof id === 'number') return String(id);
  return id._serialized || id.id || null;
};

const hasWahaAckError = (result) => {
  const ack = result?.ack ?? result?._data?.ack;
  const ackName = String(result?.ackName || result?._data?.ackName || '').toUpperCase();
  return ack === -1 || ackName === 'ERROR';
};

export const sendViaWaha = async ({ chatId, text, fetchImpl = globalThis.fetch }) => {
  const { enabled, baseUrl, apiKey, session, timeoutMs } = getWahaConfig();
  if (!enabled) throw new Error('WAHA_ENABLED=false');
  if (!baseUrl || !apiKey) {
    throw new Error('WAHA_BASE_URL ou WAHA_API_KEY ausente');
  }

  const phone = normalizePhone(chatId);
  if (!phone) throw new Error('Numero de WhatsApp invalido');

  const checkUrl = new URL(`${baseUrl}/api/contacts/check-exists`);
  checkUrl.searchParams.set('phone', phone);
  checkUrl.searchParams.set('session', session);

  const checkResponse = await fetchWithTimeout(fetchImpl, checkUrl, {
    headers: {
      Accept: 'application/json',
      'X-Api-Key': apiKey,
    },
  }, timeoutMs, 'WAHA');
  const checkResult = await readResponse(checkResponse);

  if (!checkResponse.ok) {
    throw new Error(getErrorDetails(checkResult, `WAHA retornou HTTP ${checkResponse.status} ao validar o numero`));
  }
  if (!checkResult.numberExists || !checkResult.chatId) {
    throw new Error(`O numero ${phone} nao foi encontrado no WhatsApp pela WAHA`);
  }

  const response = await fetchWithTimeout(fetchImpl, `${baseUrl}/api/sendText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ chatId: checkResult.chatId, text, session }),
  }, timeoutMs, 'WAHA');
  const result = await readResponse(response);

  if (!response.ok) {
    throw new Error(getErrorDetails(result, `WAHA retornou HTTP ${response.status}`));
  }
  if (hasWahaAckError(result)) {
    throw new Error('WAHA retornou confirmacao de erro para a mensagem');
  }

  return {
    ...result,
    provider: 'waha',
    providerMessageId: extractMessageId(result),
    resolvedChatId: checkResult.chatId,
  };
};

export const sendViaZPro = async ({ chatId, text, externalKey, fetchImpl = globalThis.fetch }) => {
  const { enabled, baseUrl, apiId, apiToken, timeoutMs } = getZProConfig();
  if (!enabled) throw new Error('ZPRO_ENABLED=false');
  if (!baseUrl || !apiId || !apiToken) {
    throw new Error('ZPRO_BASE_URL, ZPRO_API_ID ou ZPRO_API_TOKEN ausente');
  }

  const phone = normalizePhone(chatId);
  if (!phone) throw new Error('Numero de WhatsApp invalido');

  const response = await fetchWithTimeout(
    fetchImpl,
    `${baseUrl}/v2/api/external/${encodeURIComponent(apiId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        body: text,
        number: phone,
        externalKey: externalKey || randomUUID(),
        isClosed: false,
      }),
    },
    timeoutMs,
    'ZPro',
  );
  const result = await readResponse(response);

  if (!response.ok) {
    throw new Error(getErrorDetails(result, `ZPro retornou HTTP ${response.status}`));
  }

  return {
    ...result,
    provider: 'zpro',
    providerMessageId: extractMessageId(result),
    resolvedChatId: phone,
    ackName: result?.ackName || 'ACCEPTED',
  };
};

export const sendWhatsAppText = async ({ chatId, text, externalKey, fetchImpl = globalThis.fetch }) => {
  if (process.env.WHATSAPP_ENABLED !== 'true') {
    return { skipped: true, reason: 'WHATSAPP_ENABLED=false', provider: null };
  }

  const fallbackEnabled = process.env.WHATSAPP_FALLBACK_ENABLED === 'true';
  let wahaError;

  try {
    const result = await sendViaWaha({ chatId, text, fetchImpl });
    console.log(`WhatsApp aceito pela WAHA para ${result.resolvedChatId}`);
    return result;
  } catch (error) {
    wahaError = error;
    if (!fallbackEnabled) {
      if (error.message?.includes('WAHA_BASE_URL ou WAHA_API_KEY ausente') || error.message === 'WAHA_ENABLED=false') {
        return { skipped: true, reason: error.message, provider: null };
      }
      throw error;
    }
    console.warn(`WAHA indisponivel; tentando fallback ZPro: ${error.message}`);
  }

  try {
    const result = await sendViaZPro({ chatId, text, externalKey, fetchImpl });
    console.log(`WhatsApp aceito pelo ZPro para ${result.resolvedChatId}`);
    return { ...result, fallbackFrom: 'waha', fallbackReason: wahaError.message };
  } catch (zproError) {
    const error = new Error(`Falha no WAHA (${wahaError.message}) e no ZPro (${zproError.message})`);
    error.cause = zproError;
    throw error;
  }
};

