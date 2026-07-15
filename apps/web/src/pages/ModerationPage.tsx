import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface PendingContribution {
  PK: string;
  SK: string;
  thingId?: string;
  contributorId: string;
  payload: { name?: string; thingTypeId?: string };
  createdAt: string;
}

export function ModerationPage() {
  const [items, setItems] = useState<PendingContribution[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .listPendingContributions()
      .then((data) => setItems(data as PendingContribution[]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(item: PendingContribution) {
    const thingId = item.PK.replace('THING#', '');
    await fetch(`/api/contributions/${thingId}/${encodeURIComponent(item.SK)}/approve`, {
      method: 'POST',
      credentials: 'include',
    });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-neutral-800">Moderation queue</h1>
      {loading ? (
        <p className="mt-4 text-neutral-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-neutral-400">Nothing pending. 🎉</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.SK} className="rounded-cozy border border-paw-200 bg-white p-4">
              <p className="font-semibold text-neutral-800">{item.payload.name}</p>
              <p className="text-sm text-neutral-500 capitalize">{item.payload.thingTypeId}</p>
              <button
                onClick={() => approve(item)}
                className="mt-2 rounded-full bg-leaf-400 px-4 py-1.5 text-sm font-semibold text-white hover:bg-leaf-600"
              >
                Approve
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
