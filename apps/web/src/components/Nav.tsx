import { Link } from 'react-router-dom';
import { useCurrentUser } from '../lib/useCurrentUser.js';

export function Nav() {
  const { user } = useCurrentUser();

  return (
    <header className="sticky top-0 z-10 border-b border-paw-200 bg-paw-50/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-extrabold text-paw-600">
          <span aria-hidden>🐾</span>
          badthingsforpets
        </Link>
        <div className="flex items-center gap-4 text-sm font-semibold text-paw-600">
          <Link to="/submit" className="hover:underline">
            Add a thing
          </Link>
          {user?.verifiedContributor && (
            <Link to="/moderation" className="hover:underline">
              Moderation
            </Link>
          )}
          {user ? (
            <span className="rounded-full bg-paw-100 px-3 py-1 text-paw-600">Hi, {user.displayName}</span>
          ) : (
            <a
              href="/api/auth/github"
              className="rounded-full bg-paw-500 px-3 py-1 text-white hover:bg-paw-600"
            >
              Sign in
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}
