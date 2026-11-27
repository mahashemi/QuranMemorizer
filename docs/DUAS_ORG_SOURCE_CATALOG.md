# Duas.org source catalogue

Primary cross-check and discovery catalogue for the Dua and Ziyarat reading library: https://www.duas.org/

Some complete texts currently imported into the feature branch use the structured [Thaqalayn public-page dataset](https://github.com/adeeb10abbas/shia-library-json), which declares CC0 1.0 Universal. Its source URLs point to individual Thaqalayn public pages. Preserve both the exact source-page URL and the dataset license/provenance in every imported reading. Do not assume that a source import has been independently verified against a printed edition.

Duas.org explicitly asks reusers to extend due credit. Preserve a source link and attribution on every imported reading. Keep source text, transliteration, and translation as separate fields; never silently normalize or rewrite the Arabic source. Record edition/variant notes when multiple versions are offered.

## Initial requested readings

| Collection | Reading ID | Duas.org source |
|---|---|---|
| Duas | dua-kumayl | https://www.duas.org/kumayl-desktop.htm (line-by-line Arabic, transliteration, English); https://www.duas.org/ereaderpdfs/Kumayl2.pdf |
| Duas | dua-nudba | https://www.duas.org/dua-nudbah.html |
| Duas | dua-ahad | https://www.duas.org/dua-ahad.html; https://www.duas.org/ereaderpdfs/Ahad2.pdf |
| Duas | dua-jawshan-kabir | https://www.duas.org/mobile/ramadan-dua-jawshan-kabeer.html |
| Duas | dua-alqama | https://www.duas.org/alqama.htm |
| Ziyarats | ziyarat-nahiya | https://www.duas.org/ziaratnahiya.htm |
| Duas | sahifa-sajjadiya | https://www.duas.org/sajjadiya/sajjadiya-desktop-index.htm; individual supplications are linked from the index |
| Ziyarats | ziyarat-nahiya | https://www.duas.org/ziaratnahiya.htm; https://www.duas.org/pdfs/ziarat%20nahiya2.pdf |
| Ziyarats | ziyarat-ashura | https://www.duas.org/ashura/z_ashura.htm; https://www.duas.org/ereaderpdfs/ziarat_ashura3.pdf |
| Ziyarats | ziyarat-alqama | https://www.duas.org/dua-alqama-after-ziyarat-ashura-imam-husain.html |
| Ziyarats | ziyarat-jamia-kabira | https://www.duas.org/ziyarat-jamia-kabira.html |

## Related indexes

- Main Dua index: https://www.duas.org/index.htm
- Ziyarat index: https://www.duas.org/ziyarat.html
- Iraq Ziyarat index: https://www.duas.org/ziyaratiraq.htm
- Sahifa Sajjadiya index: https://www.duas.org/sajjadiya/sajjadiya-desktop-index.htm

## Import and verification requirements

1. Import full source text only; do not treat an index, commentary, audio transcript excerpt, or a partial PDF extraction as a complete reading.
2. Keep recitation boundaries meaningful: prefer full stops and clear sentence endings, use commas/semicolons for natural pauses, and split at وَ only when it introduces a distinct phrase. A recitation record is never an arbitrary storage slice. Generated storage chunks default to 30 complete records (configurable 1–250) and remain independent of recitation boundaries.
3. Preserve Arabic exactly as published, including diacritics and punctuation. Store transliteration and translation separately when present.
4. Record the source URL and any edition/translation attribution with each reading.
5. For Sahifa Sajjadiya, import all supplications and the fifteen Munajat as distinct, named readings; do not create a summary in place of the full text.
6. Validate source pair counts, first/last passages, sequence continuity, Arabic/transliteration/translation presence, and text continuity against the source before marking a reading complete.
7. Do not change any existing Quran JSON files.


## Import status (2026-11-27)

The following complete source records have been imported to the PR #28 feature branch from the CC0 Thaqalayn dataset. They are **imported, not yet independently reviewed or approved as verified editions**.

| Reading | Source pairs | Recitation records | Storage chunks |
|---|---:|---:|---:|
| Dua Kumayl | 250 | 126 | 5 |
| Dua Nudba | 222 | 158 | 6 |
| Ziyarat Ashura | 140 | 74 | 3 |
| Ziyarat Jamia Kabira | 412 | 162 | 6 |

Source repository commit: `075fe2e9d050bb40bd8147ed516d3592046ebc33`. Each source JSON retains the original source page, CC0 license metadata, source pair range for each recitation record, Arabic, transliteration, and English translation. Review the Arabic, punctuation, translation alignment, and completeness against the linked source pages before marking any reading verified.

Imported on the feature branch: Dua Ahad, Dua Jawshan Kabir, Dua Alqama (191 recitation segments), Ziyarat Nahiya al-Muqaddasa (481 recitation segments), all 54 individually named Sahifa supplications, and all 15 individually named Munajat. The two new readings remain `imported-review-required` pending source-level verification.


## Reuse terms and editorial caveat

Duas.org states on its [About Us page](https://www.duas.org/mobile/about-us.html) that its content may be freely used and appreciates a reference to the site. The same page warns that Arabic text, punctuation, transliteration and translations may contain errors, and that verifying authenticity or chains of narrators is beyond its scope. The importer preserves this attribution and keeps both new readings review-required.

For Ziyarat Nahiya, the online source separates Arabic, transliteration and English into phrase-level rows. Two split rows were joined to maintain alignment: the English continuation at source pairs 99–100 was appended to the preceding translation, and the Arabic-only continuation at 421–422 was appended to the preceding Arabic phrase (its transliteration and English translation already covered both rows). The final Arabic-only chain-of-transmission note is not part of the recitation and is excluded. This yields 481 repeatable recitation segments covering 483 source phrase rows. Dua Alqama contains 191 aligned phrase rows and is kept as a separate Dua, not appended to Ziyarat Ashura.


## Reproducing the two phrase imports

The source importer is retained at `scripts/import-duas-org-readings.mjs`. To refresh the two source files and regenerate offline manifests/chunks manually:

```sh
npm install --no-save --no-package-lock cheerio@1.1.2
node scripts/import-duas-org-readings.mjs
node scripts/build-readings.mjs
npm test
```

The importer intentionally checks the Duas.org HTML phrase counts and the two split-row positions before writing any file. If the source page changes, it stops rather than silently misaligning Arabic, transliteration and English.
