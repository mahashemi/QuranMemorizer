# Chunked content format

Quran, Duas, and Ziyarats use the same generated-content pattern:

1. A small collection-level `manifest.json` lists available texts and their metadata.
2. Each text has its own folder and a `manifest.json` describing its ordered reading units.
3. Text payloads are split into small JSON arrays. The loader requests only the chunk containing the current reading position, then loads adjacent chunks as the reader moves.

## Folder layout

```text
data/
  quran/
    all_suras.json  # canonical source; never modified by chunk generation
    chunked/
      manifest.json
      chapter_2/
        manifest.json
        ayat_001_010.json
        ayat_011_020.json
  duas/
    manifest.json
    dua_kumayl/
      manifest.json
      segments_001_010.json
      segments_011_020.json
  ziyarats/
    manifest.json
    ziyarat_jamia_kabira/
      manifest.json
      segments_001_010.json
```

## Per-text manifest

A per-text manifest contains:

- `version`: schema version, currently `1`
- `id`: stable text identifier
- `title`: display title
- `kind`: `quran-surah`, `dua`, or `ziyarat`
- `recordCount`: total ordered reading units
- `chunkSize`: target maximum units per chunk
- `chunks`: ordered entries with inclusive `start`, `end`, and payload `file`

Example:

```json
{
  "version": 1,
  "id": "dua-kumayl",
  "title": "Dua Kumayl",
  "kind": "dua",
  "recordCount": 24,
  "chunkSize": 10,
  "chunks": [
    { "start": 1, "end": 10, "file": "segments_001_010.json" },
    { "start": 11, "end": 20, "file": "segments_011_020.json" },
    { "start": 21, "end": 24, "file": "segments_021_024.json" }
  ]
}
```

## Reading-unit boundaries

- Qur'an records are Ayahs; generated Quran chunks contain at most 10 Ayahs.
- Dua and Ziyarat records are logical reading units chosen from the verified source structure. Prefer complete paragraphs, numbered sections, or meaningful passages.
- Never split a sentence or passage merely to fill a chunk.
- Preserve every source field and its original ordering. Chunk generation is a build transformation; it must not rewrite canonical source files.
- The final chunk may contain fewer than 10 records.

## Adding a Dua or Ziyarat

When verified source text is added, represent it as an ordered array of complete reading-unit objects and pass that array to the shared `chunkRecords` / `createContentManifest` helpers in `scripts/content-chunks.mjs`. Keep source metadata and translations on each record; the manifest describes chunk boundaries only.

The Qur'an reader consumes `data/quran/chunked/manifest.json`, per-Surah manifests, and chunk payloads. The generated directory is committed to version control. Run `npm run generate:quran-chunks` only when the canonical Quran source intentionally changes; ordinary builds copy the committed files without regenerating them. The same manifest and record format is ready for the Dua and Ziyarat readers when their canonical source data is added.
