/**
 * Retry-aware fetch for cold-start services (Render free tier).
 * On 502/503/504 or network error, waits and retries up to MAX_RETRIES times
 * with increasing delays to let the service wake up.
 */

const fetch = require('node-fetch').default || require('node-fetch');

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 15_000;

async function retryFetch(url, options = {}, retries = MAX_RETRIES) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout || 60_000);

      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);

      if (response.ok) return response;

      const status = response.status;
      if ((status === 502 || status === 503 || status === 504) && attempt < retries) {
        const delay = INITIAL_DELAY_MS * (attempt + 1);
        console.log(`Service cold-starting (${status}), retry ${attempt + 1}/${retries} in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
      const isNetworkError = err.name === 'FetchError' || err.name === 'AbortError' || err.code === 'ECONNREFUSED' || err.message?.includes('socket hang up') || err.message?.includes('ECONNRESET');
      if (isNetworkError && attempt < retries) {
        const delay = INITIAL_DELAY_MS * (attempt + 1);
        console.log(`Service unreachable (${err.message}), retry ${attempt + 1}/${retries} in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

module.exports = { retryFetch };
