import { Route, Routes } from 'react-router-dom';
import { Nav } from './components/Nav.js';
import { Footer } from './components/Footer.js';
import { HomePage } from './pages/HomePage.js';
import { ThingDetailPage } from './pages/ThingDetailPage.js';
import { SubmitPage } from './pages/SubmitPage.js';
import { ModerationPage } from './pages/ModerationPage.js';

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-paw-50/40">
      <Nav />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* :slug is cosmetic only — ThingDetailPage looks up strictly by
              :id, so a missing/stale/wrong slug still resolves correctly. */}
          <Route path="/things/:id/:slug?" element={<ThingDetailPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/moderation" element={<ModerationPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
