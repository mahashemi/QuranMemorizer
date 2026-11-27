# Chunked content and recitation format

Quran, Duas, and Ziyarats share one reader-unit and manifest convention while remaining separate content domains. Storage pagination and recitation/memorisation boundaries are deliberately independent.

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
      segments_001_030.json
  ziyarats/
    manifest.json
    source/
      ziyarat-ashura.json
    ziyarat-ashura/
      manifest.json
      segments_001_030.json
```

## Canonical source JSON

Each source file in `data/duas/source/` or `data/ziyarats/source/` contains metadata and an ordered `records` array. Each record is a complete, meaningful reading/recitation unit—normally a sentence, stanza, paragraph, or short passage—not an arbitrary fixed number of words or lines.

Recommended record shape:

```json
{
  "id": "passage-001",
  "sequence": 1,
  "arabic_text": "النَّصُّ الْعَرَبِيُّ",
  "transliteration": "Transliteration, if supplied and verified",
  "english_text": "Aligned English translation",
  "urdu_text": "Aligned Urdu translation, if verified",
  "persian_text": "Aligned Persian translation, if verified",
  "recitation_segment": {
    "id": "opening",
    "title": "Opening passage",
    "group": "opening",
    "repeatable": true,
    "suggested_repetitions": 3,
    "pause_after": true
  },
  "source_note": "Edition/page/section note where applicable"
}
```

Do not fabricate missing translations or transliteration. Keep source wording, Arabic spelling, tashkeel, punctuation, sequence, and alignment intact. Segment boundaries should follow the prayer's literary and recitational structure. A longer passage may be split at a natural pause; a refrain or repeated response may be its own practice unit when that reflects the source.

## Recitation and memorisation model

- Every record is independently addressable and can be selected for focused listening, recording, and repetition.
- `recitation_segment.id` groups one or more records into a learner-friendly memorisation unit. It is independent of storage chunk boundaries.
- The reader should support play/replay, record, playback of the user's recording, repeat count, and previous/next segment navigation without losing the full-reading position.
- Where the same refrain occurs repeatedly, preserve each occurrence in the canonical sequence. A future practice mode may loop a selected occurrence or a whole segment.
- Recording metadata and audio blobs belong in the user's local recording store, keyed by collection, reading ID, and record/segment ID; do not embed recordings in source JSON.
- Never split a meaningful passage just to satisfy a chunk-size limit.

## Storage chunks and manifests

Each source may set `storageChunkSize` (integer 1–250); the default is 30 records. This controls only the number of complete records placed in a JSON payload. It does not control recitation segmentation. Choose a larger or smaller value based on actual payload size and loading performance. The generated per-reading manifest records the chosen chunk size and ordered ranges.

The collection manifest lists each reading and its per-reading manifest. Stable IDs are lowercase slugs; manifest paths are relative to the collection directory and must not traverse outside it.

## Generate and deploy

Run `npm run generate:readings` after adding or editing canonical source JSON. Commit both source JSON and generated manifests/chunks. Ordinary web and Android builds copy committed data; they do not fetch Duas.org or regenerate content during every build. This keeps deployments deterministic and makes Android include the same offline-ready JSON files as the website.

The Dua/Ziyarat generator does not read or rewrite `data/quran/all_suras.json`. Existing Quran routes and data remain unchanged.
