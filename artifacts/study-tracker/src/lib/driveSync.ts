import { exportData, importData } from '../db/database';

const CLIENT_ID = '983844880865-imtckeuh0e5a7t0ongkg2ofe3gelbtmi.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

const STORAGE_USER_KEY = 'atlas_google_user';
const STORAGE_TOKEN_KEY = 'atlas_google_token';
const STORAGE_EXPIRY_KEY = 'atlas_google_token_expiry';

let tokenClient: any = null;
let accessToken: string | null = null;
let tokenExpiry: number = 0;
let currentUser: any = null;

let authStateListener: ((user: any, token: string) => void) | null = null;
let authFailureListener: (() => void) | null = null;

// Helper to save session to localStorage
function saveSession(user: any, token: string, expiresInSeconds: number = 3600) {
  currentUser = user;
  accessToken = token;
  tokenExpiry = Date.now() + (expiresInSeconds - 60) * 1000; // 1 min buffer

  try {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_EXPIRY_KEY, String(tokenExpiry));
  } catch (err) {
    console.error('Failed to save auth session to localStorage:', err);
  }
}

// Helper to clear session from localStorage
function clearSession() {
  currentUser = null;
  accessToken = null;
  tokenExpiry = 0;

  try {
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_EXPIRY_KEY);
  } catch (err) {
    console.error('Failed to clear auth session from localStorage:', err);
  }
}

// Helper to restore session from localStorage
function restoreSession(): { user: any; token: string | null } {
  if (currentUser) {
    return { user: currentUser, token: accessToken };
  }

  try {
    const rawUser = localStorage.getItem(STORAGE_USER_KEY);
    const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
    const storedExpiry = localStorage.getItem(STORAGE_EXPIRY_KEY);

    if (rawUser) {
      currentUser = JSON.parse(rawUser);
      if (storedToken) {
        const exp = Number(storedExpiry || '0');
        if (exp > Date.now()) {
          accessToken = storedToken;
          tokenExpiry = exp;
        } else {
          // Token expired, but user profile is kept
          accessToken = null;
          tokenExpiry = 0;
        }
      }
      return { user: currentUser, token: accessToken };
    }
  } catch (err) {
    console.error('Error restoring auth session:', err);
  }

  return { user: null, token: null };
}

const loadGis = () => {
  return new Promise<void>((resolve) => {
    if (window.google && window.google.accounts) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
};

const setupTokenClient = async () => {
  await loadGis();
  if (!tokenClient && window.google?.accounts?.oauth2) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (response: any) => {
        if (response.error !== undefined) {
          console.error('GIS token error:', response);
          if (authFailureListener) authFailureListener();
          return;
        }
        const token = response.access_token;
        const expiresIn = response.expires_in ? Number(response.expires_in) : 3600;

        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          const user = {
            displayName: data.name,
            email: data.email,
            photoURL: data.picture,
            uid: data.sub
          };

          saveSession(user, token, expiresIn);

          if (authStateListener) authStateListener(currentUser, accessToken!);
        } catch (err) {
          console.error('Error fetching user info', err);
          if (authFailureListener) authFailureListener();
        }
      },
    });
  }
};

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  authStateListener = onAuthSuccess || null;
  authFailureListener = onAuthFailure || null;

  // Restore existing session immediately if available
  const { user, token } = restoreSession();
  if (user && authStateListener) {
    authStateListener(user, token || '');
  }

  setupTokenClient().then(() => {
    // If we have a user but token is expired or missing, try silent token prompt
    if (user && !token && tokenClient) {
      try {
        tokenClient.requestAccessToken({ prompt: '' });
      } catch {
        // Silent request failed; user can re-auth when backing up
      }
    }
  });

  return () => {
    authStateListener = null;
    authFailureListener = null;
  };
};

export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  await setupTokenClient();
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google Identity Services client failed to load.'));
      return;
    }

    tokenClient.callback = async (response: any) => {
      if (response.error !== undefined) {
        reject(new Error(response.error_description || response.error));
        return;
      }
      const token = response.access_token;
      const expiresIn = response.expires_in ? Number(response.expires_in) : 3600;

      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const user = {
          displayName: data.name,
          email: data.email,
          photoURL: data.picture,
          uid: data.sub
        };

        saveSession(user, token, expiresIn);

        if (authStateListener) authStateListener(currentUser, accessToken!);
        resolve({ user: currentUser, accessToken: accessToken! });
      } catch (err) {
        reject(err);
      }
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

export const googleSignOut = async () => {
  if (accessToken) {
    try {
      window.google?.accounts?.oauth2?.revoke(accessToken, () => {});
    } catch {
      // ignore
    }
  }
  clearSession();
  if (authFailureListener) authFailureListener();
};

export const getAccessToken = async (): Promise<string | null> => {
  restoreSession();
  if (accessToken && tokenExpiry > Date.now()) {
    return accessToken;
  }

  // If we have currentUser but token is expired or missing, try requesting silently
  if (currentUser && tokenClient) {
    return new Promise((resolve) => {
      const prevCallback = tokenClient.callback;
      tokenClient.callback = (response: any) => {
        tokenClient.callback = prevCallback;
        if (response && response.access_token) {
          const token = response.access_token;
          const expiresIn = response.expires_in ? Number(response.expires_in) : 3600;
          saveSession(currentUser, token, expiresIn);
          resolve(token);
        } else {
          resolve(null);
        }
      };
      try {
        tokenClient.requestAccessToken({ prompt: '' });
      } catch {
        tokenClient.callback = prevCallback;
        resolve(null);
      }
    });
  }

  return accessToken;
};

// ── Google Drive API Backup Logic ───────────────────────────────────────────────

const BACKUP_FILENAME = 'atlas_backup.json';

async function findBackupFileId(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${BACKUP_FILENAME}'`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to search Google Drive");
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

export async function uploadToDrive(token: string) {
  const { user } = restoreSession();
  if (!user && !currentUser) throw new Error("Must be logged in to backup.");
  
  const dbData = await exportData();
  const fileContent = JSON.stringify(dbData);
  const metadata = {
    name: BACKUP_FILENAME,
    parents: ['appDataFolder']
  };

  let fileId = await findBackupFileId(token);

  if (!fileId) {
    // Create the file metadata
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });
    
    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error?.message || "Failed to create file in Google Drive");
    }
    const createData = await createRes.json();
    fileId = createData.id;
  }

  // Upload the file content (media)
  const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: fileContent
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(err.error?.message || "Failed to upload file content to Google Drive");
  }
}

export async function downloadFromDrive(token: string) {
  const { user } = restoreSession();
  if (!user && !currentUser) throw new Error("Must be logged in to restore.");
  
  const fileId = await findBackupFileId(token);
  if (!fileId) {
    throw new Error('No backup found on Google Drive.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to download from Google Drive.");
  }

  const data = await res.json();
  if (!data.subjects || !data.systems) {
    throw new Error('Invalid backup format received from Cloud.');
  }

  await importData(data);
}
