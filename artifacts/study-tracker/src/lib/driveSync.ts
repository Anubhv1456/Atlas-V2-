import { exportData, importData } from '../db/database';

const CLIENT_ID = '983844880865-imtckeuh0e5a7t0ongkg2ofe3gelbtmi.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

let tokenClient: any;
let accessToken: string | null = null;
let currentUser: any = null;

let authStateListener: ((user: any, token: string) => void) | null = null;
let authFailureListener: (() => void) | null = null;

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

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  authStateListener = onAuthSuccess || null;
  authFailureListener = onAuthFailure || null;
  
  loadGis().then(() => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (response: any) => {
        if (response.error !== undefined) {
          throw response;
        }
        accessToken = response.access_token;
        // Fetch user info
        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          const data = await res.json();
          currentUser = {
            displayName: data.name,
            email: data.email,
            photoURL: data.picture,
            uid: data.sub
          };
          if (authStateListener) authStateListener(currentUser, accessToken!);
        } catch (err) {
          console.error('Error fetching user info', err);
          if (authFailureListener) authFailureListener();
        }
      },
    });
  });

  return () => {
    authStateListener = null;
    authFailureListener = null;
  };
};

export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  if (!tokenClient) await loadGis();
  return new Promise((resolve, reject) => {
    tokenClient.callback = async (response: any) => {
      if (response.error !== undefined) {
        reject(response.error);
        return;
      }
      accessToken = response.access_token;
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const data = await res.json();
        currentUser = {
          displayName: data.name,
          email: data.email,
          photoURL: data.picture,
          uid: data.sub
        };
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
    window.google?.accounts?.oauth2?.revoke(accessToken, () => {});
  }
  accessToken = null;
  currentUser = null;
  if (authFailureListener) authFailureListener();
};

export const getAccessToken = async (): Promise<string | null> => {
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
  if (!currentUser) throw new Error("Must be logged in to backup.");
  
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
  if (!currentUser) throw new Error("Must be logged in to restore.");
  
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
