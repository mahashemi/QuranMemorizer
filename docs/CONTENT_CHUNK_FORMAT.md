# Chunked content format

Quran, Duas, and Ziyarats share one reading-unit and manifest convention while remaining separate content domains.

## Folder layout

```text
data/
  quran/
    all_suras.json  # canonical source; never modified by Dua/Ziyarat work
    chunked/
      manifest.json
      chapter_2/
        manifest.json
        ayat_001_010.json
  duas/
    manifest.json
    source/
      dua-kumayl.json
    dua-kumayl/
      manifest.json
      segments_001_010.json
  ziyarats/
    manifest.json
    source/
      ziyarat-ashura.json
    ziyarat-ashura/
      manifest.json
      segments_001_010.json
```

## Collection manifest

Each collection has a small `manifest.json`:

```json
{
  "version": 1,
  "collection": "duas",
  "texts": [
    {
      "id": "dua-kumayl",
      "title": "Dua Kumayl",
      "arabicTitle": "دعاء كميل",
      "description": "A supplication attributed to Imam Ali (a).",
      "occasion": "Commonly recited on Thursday nights",
      "attribution": "Attribution statement, with source qualification",
      "source": { "title": "Source edition", "url": "https://example.org/source" },
      "manifest": "dua-kumayl/manifest.json"
    }
  ]
}
```

IDs are stable lowercase slugs. Manifest paths must be relative to the collection directory and must not traverse outside it.

## Per-text manifest

A per-text manifest contains:

- `version`: schema version, currently `1`
- `id`: stable text identifier
- `title`: display title
- `kind`: `dua` or `ziyarat`
- `recordCount`: total ordered reading units
- `chunkSize`: target maximum units per chunk
- `chunks`: ordered entries with inclusive `start`, `end`, and payload `file`

Each source file in `data/duas/source/` or `data/ziyarats/source/` contains metadata and an ordered `records` array. Each record represents a complete sentence, paragraph, or meaningful passage and may contain `arabic_text`, `transliteration`, `english_text`, `urdu_text`, `persian_text`, and source-specific notes. Preserve original punctuation, tashkeel, ordering, and translation alignment.

## Chunk boundaries

- Quran records are Ayahs; the existing Quran generator uses ten-Ayah chunks.
- Dua and Ziyarat records are complete logical reading units. Never split a sentence or passage merely to fill a chunk.
- The generator groups up to ten already-curated records per payload. A final chunk may contain fewer than ten.
- All source metadata and translation fields are retained in the generated records.
- The canonical Quran source `data/quran/all_suras.json` is not read or rewritten by the Dua/Ziyarat generator.

## Generate and deploy

Run `npm run generate:readings` after adding or editing canonical Dua/Ziyarat source JSON. Commit both source JSON and generated manifests/chunks. Ordinary web and Android builds copy the committed data; they do not regenerate content during every build. This keeps deployments deterministic and makes Android include the same offline-ready JSON files as the website.

The existing `scripts/content-chunks.mjs` primitives are shared by Quran, Dua, and Ziyarat generation. `scripts/content-catalog.mjs` validates collection manifests and provides stable `#/dua/{id}/section/{n}` and `#/ziyarat/{id}/section/{n}` routes. Existing Quran routes remain unchanged.
