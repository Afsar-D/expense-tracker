import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";

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

const SHARED_DOC_REF = doc(db, "appState", "shared");

// Save data to Firestore
export async function saveToFirebase(data) {
  try {
    await setDoc(SHARED_DOC_REF, { data, lastUpdated: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error("Failed to save to Firebase:", error);
    throw error;
  }
}

// Load data from Firestore
export async function loadFromFirebase() {
  try {
    const docSnap = await getDoc(SHARED_DOC_REF);
    
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

export { db };
