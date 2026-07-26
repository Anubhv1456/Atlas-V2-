import { exportData, importData } from '../db/database';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

declare global {
  interface Window {
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

let cachedAccessToken: string | null = null;
let cachedUser: any = null;
let authStateListener: ((user: any, token: string) => void) | null = null;
let authFailureListener: (() => void) | null = null;

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  authStateListener = onAuthSuccess || null;
  authFailureListener = onAuthFailure || null;
  
  try {
    const savedToken = localStorage.getItem('google_access_token');
    const savedUser = localStorage.getItem('google_user');
    
    if (savedToken && savedUser) {
      cachedAccessToken = savedToken;
      cachedUser = JSON.parse(savedUser);
      if (authStateListener) authStateListener(cachedUser, cachedAccessToken!);
    } else {
      if (authFailureListener) authFailureListener();
    }
  } catch (e) {
    if (authFailureListener) authFailureListener();
  }

  return () => {
    authStateListener = null;
    authFailureListener = null;
  };
};

export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.appdata');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    
    if (!token) throw new Error("Could not get Google Access Token");
    
    const user = {
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
    };

    cachedAccessToken = token;
    cachedUser = user;
    
    localStorage.setItem('google_access_token', token);
    localStorage.setItem('google_user', JSON.stringify(user));

    if (authStateListener) authStateListener(user, token);
    
    return { user, accessToken: token };
  } catch (err: any) {
    throw new Error(err.message || "Failed to sign in with Google");
  }
};

export const googleSignOut = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Firebase Signout error:", err);
  }
  cachedAccessToken = null;
  cachedUser = null;
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_user');
  if (authFailureListener) authFailureListener();
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
    if (res.status === 401) {
      // Token expired or revoked
      await googleSignOut();
      throw new Error('Session expired. Please sign out and sign in again.');
    }
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
