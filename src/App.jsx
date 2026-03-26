import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import EventPage from "./pages/EventPage";
import { signInWithGoogle, signOutUser, subscribeAuthState } from "./lib/firebase";
import { clearLocalStateCache } from "./lib/storage";

function App() {
  const [authUser, setAuthUser] = useState(undefined);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      setAuthUser(user || null);
      setAuthError("");
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setAuthError("");
      await signInWithGoogle();
    } catch (error) {
      setAuthError(error?.message || "Sign in failed.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      clearLocalStateCache();
      setAuthError("");
    } catch (error) {
      setAuthError(error?.message || "Sign out failed.");
    }
  };

  if (authUser === undefined) {
    return (
      <main className="app-shell">
        <section className="panel glass">
          <h2>Checking access...</h2>
        </section>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="app-shell">
        <section className="panel glass">
          <h2>Sign In Required</h2>
          <p className="subhead">Only authorized users can open or edit events.</p>
          <button className="btn primary" type="button" onClick={handleSignIn}>
            Sign in with Google
          </button>
          {authError && <p className="subhead">{authError}</p>}
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="aurora aurora-a"></div>
      <div className="aurora aurora-b"></div>
      <div className="mesh"></div>

      <main className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Secure Access</p>
            <p className="subhead">Signed in as {authUser.email || "Google user"}</p>
          </div>
          <button className="btn ghost" type="button" onClick={handleSignOut}>
            Sign Out
          </button>
        </header>
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
