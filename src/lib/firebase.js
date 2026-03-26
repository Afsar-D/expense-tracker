import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBENwDxdZP3IQYu6wL7XiopjH4kDPS_sOQ",
  authDomain: "expense-tracker-000-1.firebaseapp.com",
  projectId: "expense-tracker-000-1",
  storageBucket: "expense-tracker-000-1.firebasestorage.app",
  messagingSenderId: "383494619637",
  appId: "1:383494619637:web:0cc1f278b0bf5b9e18e0bc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

function getUserStateDoc(uid) {
  return doc(db, "users", uid, "app", "state");
}

export function subscribeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}

function getCurrentUserOrThrow() {
  if (!auth.currentUser) {
    throw new Error("Authentication required.");
  }

  return auth.currentUser;
}

// Save data to Firestore
export async function saveToFirebase(data) {
  try {
    const user = getCurrentUserOrThrow();
    const docRef = getUserStateDoc(user.uid);
    await setDoc(docRef, { data, lastUpdated: new Date().toISOString() }, { merge: true });
    return true;
  } catch (error) {
    console.error("Failed to save to Firebase:", error);
    throw error;
  }
}

// Load data from Firestore
export async function loadFromFirebase() {
  try {
    const user = getCurrentUserOrThrow();
    const docRef = getUserStateDoc(user.uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data().data;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Failed to load from Firebase:", error);
    throw error;
  }
}

export { auth, db };
