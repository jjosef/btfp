import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PetType, Thing } from '@btfp/shared-types';
import { api } from '../lib/api.js';
import { ThingCard } from '../components/ThingCard.js';
import { PetTypeSelect } from '../components/PetTypeSelect.js';

const PAGE_SIZE = 24;

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const petType = params.get('petType') ?? '';

  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [things, setThings] = useState<Thing[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    api
      .listPetTypes()
      .then(setPetTypes)
      .catch(() => setPetTypes([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .listThings({ q: q || undefined, petType: petType || undefined })
      .then((results) => {
        setThings(results);
        setVisibleCount(PAGE_SIZE);
      })
      .catch(() => setThings([]))
      .finally(() => setLoading(false));
  }, [q, petType]);

  const visibleThings = things.slice(0, visibleCount);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="text-center">
        <h1 className="text-4xl font-extrabold text-neutral-800">
          Is it safe for your <span className="text-paw-500">pet</span>? 🐶🐱🐴
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-500">
          Search foods, plants, medications, and more that could be dangerous for your pet.
        </p>

        <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setParams((prev) => setParam(prev, 'q', e.target.value))}
            placeholder="Search e.g. chocolate, aloe, ibuprofen…"
            className="flex-1 rounded-full border border-paw-200 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-paw-400"
          />
          <PetTypeSelect
            petTypes={petTypes}
            value={petType}
            onChange={(value) => setParams((prev) => setParam(prev, 'petType', value))}
          />
        </div>
      </section>

      <section className="mt-10">
        {loading ? (
          <p className="text-center text-neutral-400">Fetching the facts…</p>
        ) : (
          <>
            {things.length === 0 ? (
              <p className="text-center text-neutral-400">
                Nothing found — try a different search.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleThings.map((thing) => (
                  <ThingCard key={thing.id} thing={thing} />
                ))}
              </div>
            )}
            {visibleCount < things.length && (
              <button
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="mx-auto mt-6 block rounded-full border border-paw-300 px-6 py-2 text-sm font-semibold text-paw-600 hover:bg-paw-50"
              >
                Load more ({things.length - visibleCount} more)
              </button>
            )}
            <Link
              to={`/submit${q ? `?name=${encodeURIComponent(q)}` : ''}`}
              className="mx-auto mt-8 block max-w-sm rounded-cozy border border-dashed border-paw-300 bg-white px-4 py-3 text-center text-sm font-semibold text-paw-600 hover:bg-paw-50"
            >
              Can't find it? Add it →
            </Link>
          </>
        )}
      </section>
    </div>
  );
}

function setParam(prev: URLSearchParams, key: string, value: string): URLSearchParams {
  const next = new URLSearchParams(prev);
  if (value) next.set(key, value);
  else next.delete(key);
  return next;
}
