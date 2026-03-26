import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import HomePage from "./pages/HomePage";
import EventPage from "./pages/EventPage";
import { initializeUser } from "./lib/firebase";

function App() {
  useEffect(() => {
    // Initialize Firebase on app startup
    initializeUser().catch(error => {
      console.warn("Firebase initialization failed:", error);
      // App still works with localStorage if Firebase fails
    });
  }, []);

  return (
    <>
      <div className="aurora aurora-a"></div>
      <div className="aurora aurora-b"></div>
      <div className="mesh"></div>

      <main className="app-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/event/:id" element={<EventPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
