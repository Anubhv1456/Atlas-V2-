/**
 * Web Worker for Off-Thread Encryption/Decryption with Stream/Progress Support.
 * Uses Web Crypto API in worker context (`self.crypto.subtle`).
 */

// Helper functions for Hex conversion inside Worker
function bufToHex(buf: Uint8Array | ArrayBuffer): string {
  const arr = new Uint8Array(buf);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function deriveKeyWorker(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await self.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return self.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

self.onmessage = async (e: MessageEvent) => {
  const { id, action, plainText, passphrase, payload } = e.data;

  try {
    if (action === 'encrypt') {
      self.postMessage({ id, status: 'progress', progress: 10, stage: 'Deriving PBKDF2 key (100k rounds)...' });

      const salt = self.crypto.getRandomValues(new Uint8Array(16));
      const iv = self.crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKeyWorker(passphrase, salt);

      self.postMessage({ id, status: 'progress', progress: 50, stage: 'Encrypting payload with AES-256-GCM...' });

      const enc = new TextEncoder();
      const encryptedBuffer = await self.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as any },
        key,
        enc.encode(plainText)
      );

      self.postMessage({ id, status: 'progress', progress: 90, stage: 'Encoding payload...' });

      const result = {
        _encrypted: true as const,
        v: 1,
        salt: bufToHex(salt),
        iv: bufToHex(iv),
        data: bufToHex(encryptedBuffer),
      };

      self.postMessage({ id, status: 'success', result, progress: 100 });
    } else if (action === 'decrypt') {
      self.postMessage({ id, status: 'progress', progress: 10, stage: 'Deriving PBKDF2 key (100k rounds)...' });

      if (!payload || !payload._encrypted) {
        throw new Error('Invalid encrypted payload format.');
      }

      const salt = hexToBuf(payload.salt);
      const iv = hexToBuf(payload.iv);
      const encryptedData = hexToBuf(payload.data);

      const key = await deriveKeyWorker(passphrase, salt);

      self.postMessage({ id, status: 'progress', progress: 50, stage: 'Decrypting payload...' });

      const decryptedBuffer = await self.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as any },
        key,
        encryptedData as any
      );

      const dec = new TextDecoder();
      const text = dec.decode(decryptedBuffer);

      self.postMessage({ id, status: 'success', result: text, progress: 100 });
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (err: any) {
    self.postMessage({
      id,
      status: 'error',
      error: err.message || 'Worker cryptographic operation failed.',
    });
  }
};
