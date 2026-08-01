/**
 * Client-Side Encryption Utilities using Web Worker + Web Crypto API (AES-GCM + PBKDF2).
 * Operates off the main thread in a Dedicated Web Worker to avoid blocking UI rendering.
 */

export interface EncryptedPayload {
  _encrypted: true;
  v: number;
  salt: string;
  iv: string;
  data: string;
}

export interface ProgressCallback {
  (progress: number, stage: string): void;
}

// Fallback functions if Web Worker is unavailable in environment
async function deriveKeyMain(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

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

// Singleton Web Worker instance
let workerInstance: Worker | null = null;
let msgRequestId = 0;

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || !window.Worker) {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./crypto.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      workerInstance = null;
    }
  }
  return workerInstance;
}

/**
 * Off-thread Encrypt client data via Web Worker (with automatic main-thread fallback).
 */
export async function encryptClientData(
  plainText: string,
  passphrase: string,
  onProgress?: ProgressCallback
): Promise<EncryptedPayload> {
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Encryption passphrase cannot be empty.');
  }

  const worker = getWorker();

  if (worker) {
    return new Promise((resolve, reject) => {
      const id = ++msgRequestId;

      const handleMessage = (e: MessageEvent) => {
        if (e.data?.id !== id) return;

        if (e.data.status === 'progress') {
          if (onProgress) {
            onProgress(e.data.progress, e.data.stage);
          }
        } else if (e.data.status === 'success') {
          worker.removeEventListener('message', handleMessage);
          resolve(e.data.result);
        } else if (e.data.status === 'error') {
          worker.removeEventListener('message', handleMessage);
          reject(new Error(e.data.error || 'Worker encryption failed.'));
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ id, action: 'encrypt', plainText, passphrase });
    });
  }

  // Fallback to main thread
  if (onProgress) onProgress(20, 'Deriving PBKDF2 key...');
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyMain(passphrase, salt);

  if (onProgress) onProgress(60, 'Encrypting data...');
  const enc = new TextEncoder();
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  return {
    _encrypted: true,
    v: 1,
    salt: bufToHex(salt),
    iv: bufToHex(iv),
    data: bufToHex(encryptedBuffer),
  };
}

/**
 * Off-thread Decrypt client data via Web Worker (with automatic main-thread fallback).
 */
export async function decryptClientData(
  payload: EncryptedPayload,
  passphrase: string,
  onProgress?: ProgressCallback
): Promise<string> {
  if (!payload || !payload._encrypted) {
    throw new Error('Invalid encrypted payload structure.');
  }
  if (!passphrase || passphrase.trim().length === 0) {
    throw new Error('Decryption passphrase required.');
  }

  const worker = getWorker();

  if (worker) {
    return new Promise((resolve, reject) => {
      const id = ++msgRequestId;

      const handleMessage = (e: MessageEvent) => {
        if (e.data?.id !== id) return;

        if (e.data.status === 'progress') {
          if (onProgress) {
            onProgress(e.data.progress, e.data.stage);
          }
        } else if (e.data.status === 'success') {
          worker.removeEventListener('message', handleMessage);
          resolve(e.data.result);
        } else if (e.data.status === 'error') {
          worker.removeEventListener('message', handleMessage);
          reject(new Error(e.data.error || 'Worker decryption failed.'));
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ id, action: 'decrypt', payload, passphrase });
    });
  }

  // Fallback to main thread
  if (onProgress) onProgress(20, 'Deriving PBKDF2 key...');
  const salt = hexToBuf(payload.salt);
  const iv = hexToBuf(payload.iv);
  const encryptedData = hexToBuf(payload.data);

  const key = await deriveKeyMain(passphrase, salt);

  if (onProgress) onProgress(60, 'Decrypting data...');
  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch {
    throw new Error('Failed to decrypt data. Incorrect passphrase or corrupted payload.');
  }
}

/**
 * Utility to check if a parsed JSON object is an encrypted payload.
 */
export function isEncryptedPayload(obj: any): obj is EncryptedPayload {
  return (
    obj &&
    typeof obj === 'object' &&
    obj._encrypted === true &&
    typeof obj.salt === 'string' &&
    typeof obj.iv === 'string' &&
    typeof obj.data === 'string'
  );
}
