# Linking to a specific Qur'an ayah

Canonical URL format:

`https://mahashemi.github.io/QuranMemorizer/#/surah/{surahNumber}/ayah/{ayahNumber}`

Example: Al-Baqarah 2:255

`https://mahashemi.github.io/QuranMemorizer/#/surah/2/ayah/255`

## Use it from another app

The linking app only needs numeric Surah and Ayah values:

```js
const surah = 2;
const ayah = 255;
const url = 'https://mahashemi.github.io/QuranMemorizer/#/surah/' + surah + '/ayah/' + ayah;
// Open url in a browser or share it as a normal HTTPS link.
```

## HTML section IDs

Every rendered ayah has a globally unique element ID and machine-readable attributes:

```html
<article id="ayah-2-255" data-surah="2" data-ayah="255">...</article>
```

Inside the reader page, a plain anchor can target it:

```html
<a href="#ayah-2-255">Al-Baqarah 2:255</a>
```

After app initialization, browser integrations can also use:

- `window.QuranMemorizerLinks.urlForAyah(surah, ayah)`
- `window.QuranMemorizerLinks.elementIdForAyah(surah, ayah)`
- `window.QuranMemorizerLinks.parseUrl(url)`

## Behavior

- Direct links open the requested Surah and scroll to the requested ayah.
- The target ayah is highlighted; direct links do not autoplay audio.
- Selecting another ayah updates the address bar to the canonical route.
- Fragment routing works on GitHub Pages and in the Capacitor WebView; no server-side rewrite is required.
- Surah and ayah values are validated against the Qur'an data before navigation.

## Android

The HTTPS URL is the cross-platform canonical link and remains usable in a browser. Automatically opening the installed Android app from that HTTPS URL is a separate Android App Links setup requiring domain verification and the permanent release-signing certificate. Until that is configured, Android may open the link in the browser. The HTTPS URL remains the integration contract; do not depend on an unverified custom scheme.