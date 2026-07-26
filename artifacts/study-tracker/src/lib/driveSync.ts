import { exportData, importData } from '../db/database';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

let authStateListener: ((user: any, token: string) => void) | null = null;
let authFailureListener: (() => void) | null = null;

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  authStateListener = onAuthSuccess || null;
  authFailureListener = onAuthFailure || null;
  
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      const userData = {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid
      };
      if (authStateListener) authStateListener(userData, 'firebase-token');
    } else {
      if (authFailureListener) authFailureListener();
    }
  });

  return () => {
    authStateListener = null;
    authFailureListener = null;
    unsubscribe();
  };
};

export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    
    const user = {
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
      uid: result.user.uid
    };

    if (authStateListener) authStateListener(user, 'firebase-token');
    
    return { user, accessToken: 'firebase-token' };
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
  if (authFailureListener) authFailureListener();
};

export const getAccessToken = async (): Promise<string | null> => {
  return auth.currentUser ? 'firebase-token' : null;
};

// ── Firebase Firestore Backup Logic ───────────────────────────────────────────────

export async function uploadToDrive(token: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to backup.");
  
  const dbData = await exportData();
  
  try {
    const backupRef = doc(db, 'backups', user.uid);
    await setDoc(backupRef, {
      data: JSON.stringify(dbData),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Backup error:", error);
    throw new Error("Failed to upload backup to cloud. Ensure Firestore database is created and security rules allow access.");
  }
}

export async function downloadFromDrive(token: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be logged in to restore.");

  try {
    const backupRef = doc(db, 'backups', user.uid);
    const backupSnap = await getDoc(backupRef);
    
    if (!backupSnap.exists()) {
      throw new Error('No backup found on cloud.');
    }
    
    const dataString = backupSnap.data().data;
    const data = JSON.parse(dataString);
    
    if (!data.subjects || !data.systems) {
      throw new Error('Invalid backup format.');
    }

    await importData(data);
  } catch (error: any) {
    console.error("Restore error:", error);
    throw new Error(error.message || "Failed to download backup from cloud.");
  }
}
