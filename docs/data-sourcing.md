# Data sourcing

## Current seed

`data/seed/source/dog-toxicity-dataset.json` — ASPCA-derived toxic/non-toxic plant lists
plus a compiled foods/medications list (see its own `metadata` block for exact sources and
scrape date). Transformed by `data/seed/src/transform.ts` into `plant`, `food`, and
`medication` Things, each tagged with the pet types they're dangerous to (`dog`, plus
`cat`/`horse` where the source noted it).

## Expanding coverage

Deliberately **not** proposing broad automated scraping here — most veterinary/poison-control
sites have terms of service around reuse, and scraped data needs a human to sanity-check
before it reaches a "this might hurt your pet" database. Candidate sources to manually
review and curate from, same pattern as the current dataset (attribute the source, keep the
disclaimer, respect robots.txt/ToS):

- Pet Poison Helpline's toxin list (foods, plants, household chemicals)
- ASPCA's cat-specific toxic plant list (current dataset is dog-focused)
- CPSC recall database, filtered for pet toys/products
- FDA pet food and pet medication recalls
- Manufacturer safety notices for collars/harnesses/leashes (less standardized — likely
  needs case-by-case sourcing rather than a single feed)

## Community contributions feed the same pipeline

Once approved (see [verification-flow.md](verification-flow.md)), a contribution becomes a
regular `Thing` with `source` set to `contributor:<id>` instead of a citation — same shape,
same table, same search index. No separate "user-generated" tier.
