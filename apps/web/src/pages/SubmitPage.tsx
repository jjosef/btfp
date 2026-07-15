import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../lib/useCurrentUser.js';
import { api } from '../lib/api.js';
import { QuizDialog } from '../components/QuizDialog.js';

const THING_TYPES = ['plant', 'food', 'medication', 'product', 'activity'];
const PET_TYPES = ['dog', 'cat', 'horse'];

export function SubmitPage() {
  const { user, loading, refresh } = useCurrentUser();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [thingTypeId, setThingTypeId] = useState('plant');
  const [petTypeIds, setPetTypeIds] = useState<string[]>(['dog']);
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (loading) return <div className="mx-auto max-w-xl px-4 py-10 text-neutral-400">Loading…</div>;

  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-800">Sign in to contribute</h1>
        <p className="mt-2 text-neutral-500">
          We ask for a GitHub sign-in so we know a real person with some history is behind each entry.
        </p>
        <a
          href="/api/auth/github"
          className="mt-6 inline-block rounded-full bg-paw-500 px-6 py-3 font-semibold text-white hover:bg-paw-600"
        >
          Sign in with GitHub
        </a>
      </div>
    );
  }

  if (!user.verifiedContributor) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-800">One quick quiz first</h1>
        <p className="mt-2 text-neutral-500">
          Your account needs to clear our pet-safety pop quiz before you can add entries.
        </p>
        <div className="mt-6 flex justify-center">
          <QuizDialog onPassed={refresh} />
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-neutral-800">Thanks! 🐾</h1>
        <p className="mt-2 text-neutral-500">Your submission is in the moderation queue for review.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 rounded-full bg-paw-500 px-6 py-3 font-semibold text-white"
        >
          Back home
        </button>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.submitContribution({
        name,
        thingTypeId,
        petTypes: petTypeIds.map((petTypeId) => ({ petTypeId, severity: 'unknown' })),
        details: { notes },
        source: source || `contributor:${user?.displayName}`,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  function togglePetType(id: string) {
    setPetTypeIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-neutral-800">Add a dangerous thing</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-neutral-700">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-paw-200 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700">Type</label>
          <select
            value={thingTypeId}
            onChange={(e) => setThingTypeId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-paw-200 px-3 py-2 capitalize"
          >
            {THING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700">Dangerous for</label>
          <div className="mt-1 flex gap-3">
            {PET_TYPES.map((pt) => (
              <label key={pt} className="flex items-center gap-1 text-sm capitalize">
                <input
                  type="checkbox"
                  checked={petTypeIds.includes(pt)}
                  onChange={() => togglePetType(pt)}
                />
                {pt}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700">Why is it dangerous?</label>
          <textarea
            required
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-paw-200 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700">Source (optional)</label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Vet, article, personal experience…"
            className="mt-1 w-full rounded-lg border border-paw-200 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-alert-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || petTypeIds.length === 0}
          className="w-full rounded-full bg-paw-500 px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </div>
  );
}
