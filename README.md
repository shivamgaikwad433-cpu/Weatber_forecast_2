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

No package installation or build step is needed for local static use. Double-click `index.html` or serve this directory with a static server. On local hosts, `config.js` is loaded before `script.js`; the Vercel deployment instead uses the serverless API function.

## Deployment

### GitHub Pages

1. Create a repository and add the source files, excluding `config.js` (the `.gitignore` already excludes it).
2. In the repository settings, enable Pages for the branch and folder containing `index.html`.
3. This project currently routes hosted requests through Vercel’s `/api/weather` function. To use GitHub Pages instead, add a GitHub-compatible serverless proxy or change the app to use a browser-visible restricted key.

### Netlify

1. Import the repository or drag the project folder into Netlify Drop.
2. Set the publish directory to the project root; no build command is required.
3. This project currently routes hosted requests through Vercel’s `/api/weather` function. To use Netlify instead, add a Netlify Function or change the app to use a browser-visible restricted key.

### Vercel

This project includes `vercel.json` and a serverless proxy at `api/weather.js`. Select **Other** as the framework preset, leave the build and install commands blank, and use `.` as the output directory. In Vercel Project Settings → Environment Variables, add `OPENWEATHERMAP_API_KEY` with your OpenWeatherMap key for Production, Preview, and Development as needed. Redeploy after changing the variable. The browser calls the same-origin function, and the function reads the key from its server environment.

For local development, `config.js` is still used when opening the app directly or serving it with Live Server. To exercise the Vercel function locally, install the Vercel CLI and run `vercel dev` after linking the project and setting its environment variable; Vercel's default local port is 3000.

## Screenshots

Add a captured dashboard image at `screenshots/dashboard-placeholder.png`, or update the image link above to the image filename you choose.

## Future improvements

- Add request throttling and tune caching around the serverless proxy.
- Add saved favorite locations and richer city disambiguation.
- Add precipitation probability, UV index, and severe-weather notifications.
- Add automated browser checks and translated labels.

## Notes

The API key supplied in the interview brief is placed in the ignored local `config.js`. The included `config.example.js` contains only a placeholder. API usage is subject to OpenWeatherMap account access and rate limits.
