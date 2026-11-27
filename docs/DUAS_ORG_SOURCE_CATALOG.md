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

The PR #28 feature branch now contains **73 Dua readings and 2 Ziyarat readings**. All are imported and review-required; none should be described as independently verified.

### Duas (73)

| Group / reading | Recitation records | Source / provenance |
|---|---:|---|
| Dua Kumayl | 126 | Duas.org; Arabic, transliteration and English |
| Dua Nudba | 158 | Duas.org; Arabic, transliteration and English |
| Dua Ahad | 80 | Duas.org PDF and source page |
| Dua Jawshan Kabir | 100 sections | Sibtayn International Foundation, 10 linked parts; cross-reference Duas.org |
| Sahifa Sajjadiya | 54 individually named supplications | Thaqalayn CC0 dataset; retain individual source-page attribution |
| Munajat al-Khamsa Ashara | 15 individually named Munajat | Individual Duas.org source pages |

### Ziyarats (2)

| Reading | Recitation records | Source / provenance |
|---|---:|---|
| Ziyarat Ashura | 74 | Thaqalayn CC0 dataset; Duas.org cross-reference |
| Ziyarat Jamia Kabira | 162 | Thaqalayn CC0 dataset; Duas.org cross-reference |

The Thaqalayn source repository commit used for the CC0 imports is `075fe2e9d050bb40bd8147ed516d3592046ebc33`. Source JSON retains source-page URLs, provenance/license metadata, source-pair ranges, Arabic, transliteration and English translation. Dua Ahad and Jawshan Kabir retain their own source-specific attribution rather than being labelled CC0.

### Still to import

- Ziyarat Nahiya al-Muqaddasa (the original visitation text, not the separate martyrs-list variant).
- Dua Alqama / Dua Safwan, as a separate supplication recited after Ziyarat Ashura. It is not part of the Ziyarat Ashura text.

### Verification gate

Automated structural checks now verify that every imported source record has non-empty Arabic, transliteration and English fields. This does **not** prove source completeness, correct tashkeel/punctuation, accurate translation alignment or edition fidelity. Keep every imported reading marked `imported-review-required` until it has been compared against the complete cited source and, where appropriate, an authoritative printed edition. Do not change any existing Quran JSON files.
