import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBz2j8EH7IzmLBt-HrZV4ObgnsxMAkZp6A",
  authDomain: "atlas-neetpg.firebaseapp.com",
  projectId: "atlas-neetpg",
  storageBucket: "atlas-neetpg.firebasestorage.app",
  messagingSenderId: "489304490472",
  appId: "1:489304490472:web:f836f2763786f019e7e45d",
  measurementId: "G-DF4M63Z2BH"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// analytics is optional, guard it so it doesn't break if blocked by adblock
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  // Ignore
}
export { analytics };
