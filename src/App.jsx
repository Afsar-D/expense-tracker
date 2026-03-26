import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import EventPage from "./pages/EventPage";

function App() {
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
