import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  connectFirestoreEmulator
} from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  connectAuthEmulator
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

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Sign in anonymously
export async function initializeUser() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return auth.currentUser;
  } catch (error) {
    console.error("Failed to sign in anonymously:", error);
    throw error;
  }
}

// Save data to Firestore
export async function saveToFirebase(data) {
  try {
    const user = await initializeUser();
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, { data, lastUpdated: new Date() });
    return true;
  } catch (error) {
    console.error("Failed to save to Firebase:", error);
    throw error;
  }
}

// Load data from Firestore
export async function loadFromFirebase() {
  try {
    const user = await initializeUser();
    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);
    
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
