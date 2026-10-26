# SkyCast — Weather Dashboard

SkyCast is a responsive, real-time weather dashboard built with plain HTML, CSS, and browser JavaScript. It uses OpenWeatherMap for current conditions, geocoding, and the five-day forecast, and stores small preferences in the browser.

![SkyCast dashboard screenshot](screenshots/dashboard-placeholder.png)

## Features

- Search cities by name, press Enter, or choose a debounced autocomplete suggestion.
- Load Pune on a first visit, remember the most recently viewed city, and offer five recent city shortcuts.
- Use browser location when permission is available.
- Show current conditions, local time, feels-like temperature, humidity, wind, pressure, visibility, sunrise, and sunset.
- Show a three-hour interval forecast for the next 24 hours, a lightweight canvas temperature chart, and daily high/low cards.
- Switch units instantly between Celsius and Fahrenheit, or switch between light and dark mode.
- Change the background to match the weather condition and day/night state.
- Explain missing keys, invalid keys, missing cities, rate limits, network errors, and location permission errors.
- Use semantic landmarks, labelled controls, keyboard focus styles, live status messages, and reduced-motion support.

## Tech stack

- HTML5 for page structure
- CSS3 for responsive layout, glass styling, themes, and motion
- Vanilla JavaScript for API requests, rendering, storage, and the canvas chart
- OpenWeatherMap Current Weather, 5 Day / 3 Hour Forecast, and Geocoding APIs

## Setup

1. Create a free account at [OpenWeatherMap](https://openweathermap.org/) and generate an API key from your account dashboard. Newly generated keys can take a little while to activate.
2. Copy `config.example.js` to `config.js` in the project folder.
3. Replace `YOUR_OPENWEATHERMAP_API_KEY` in `config.js` with your key. Keep `config.js` local: it is listed in `.gitignore` and should not be committed or published.
4. Open `index.html` directly, or use VS Code Live Server / another static HTTP server. The browser must have internet access to retrieve weather data and the optional Google Font.

The application detects an absent or placeholder key and shows instructions on screen. If the key is rejected, check that it was copied correctly and has activated.

## Run

No package installation or build step is needed. Double-click `index.html` or serve this directory with a static server. `config.js` is loaded before `script.js`; do not rename either file without updating `index.html`.

## Deployment

### GitHub Pages

1. Create a repository and add the source files, excluding `config.js` (the `.gitignore` already excludes it).
2. In the repository settings, enable Pages for the branch and folder containing `index.html`.
3. Since a browser-only app cannot keep a key secret, put a restricted public key in the deployed `config.js` only if you accept that visitors can inspect it. Configure key restrictions and usage limits with the provider where available. For a production deployment, proxy API requests through a serverless function and keep the key in its environment variables.

### Netlify

1. Import the repository or drag the project folder into Netlify Drop.
2. Set the publish directory to the project root; no build command is required.
3. A static deployment needs a browser-visible key. As with GitHub Pages, use provider restrictions for a demo or move API calls to a serverless function for production.

## Screenshots

Add a captured dashboard image at `screenshots/dashboard-placeholder.png`, or update the image link above to the image filename you choose.

## Future improvements

- Move the API key behind a small serverless proxy and add response caching.
- Add saved favorite locations and richer city disambiguation.
- Add precipitation probability, UV index, and severe-weather notifications.
- Add automated browser checks and translated labels.

## Notes

The API key supplied in the interview brief is placed in the ignored local `config.js`. The included `config.example.js` contains only a placeholder. API usage is subject to OpenWeatherMap account access and rate limits.
