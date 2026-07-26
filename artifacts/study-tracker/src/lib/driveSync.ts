import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { exportData, importData } from '../db/database';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.appdata');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// ── Google Drive Sync Logic ───────────────────────────────────────────────

const SYNC_FILE_NAME = 'atlas_sync.json';

async function getSyncFileId(token: string): Promise<string | null> {
  const url = `https://www.googleapis.com/drive/v3/files?q=name='${SYNC_FILE_NAME}' and 'appDataFolder' in parents and trashed=false&spaces=appDataFolder&fields=files(id)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch sync file list');
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

export async function uploadToDrive(token: string) {
  const dbData = await exportData();
  const fileContent = JSON.stringify(dbData);
  const metadata = {
    name: SYNC_FILE_NAME,
    parents: ['appDataFolder']
  };

  const fileId = await getSyncFileId(token);
  
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([fileContent], { type: 'application/json' }));

  const url = fileId 
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

  const method = fileId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });

  if (!res.ok) {
    throw new Error('Failed to upload data to Google Drive');
  }
}

export async function downloadFromDrive(token: string) {
  const fileId = await getSyncFileId(token);
  if (!fileId) {
    throw new Error('No backup found on Google Drive.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error('Failed to download data from Google Drive');
  }

  const text = await res.text();
  const data = JSON.parse(text);
  
  if (!data.subjects || !data.systems) {
    throw new Error('Invalid backup format on Google Drive');
  }

  await importData(data);
}
