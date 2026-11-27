# Linking to a specific Qur'an ayah

Canonical URL format:

`https://mahashemi.github.io/QuranMemorizer/#/surah/{surahNumber}/ayah/{ayahNumber}`

Example: Al-Baqarah 2:255

`https://mahashemi.github.io/QuranMemorizer/#/surah/2/ayah/255`

## Browser integration

After app initialization, browser integrations can use:

- `window.QuranMemorizerLinks.urlForAyah(surah, ayah)`
- `window.QuranMemorizerLinks.elementIdForAyah(surah, ayah)`
- `window.QuranMemorizerLinks.parseUrl(url)`

Rendered ayahs use globally unique IDs such as `ayah-2-255`, with `data-surah` and `data-ayah` attributes. Direct links open and focus the requested ayah without autoplay. The app validates the Surah and ayah against the Quran manifest before navigating.

The HTTPS URL works in GitHub Pages and the Capacitor WebView. Automatically opening the installed Android app from that URL requires separate Android App Links domain verification and the permanent release-signing certificate; until configured, the link remains usable in the browser.
