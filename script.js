/* SkyCast keeps API work, app state, rendering, and small helpers in one closure. */
(() => {
  'use strict';

  const API_ROOT = 'https://api.openweathermap.org/data/2.5';
  const GEO_ROOT = 'https://api.openweathermap.org/geo/1.0';
  // Production requests go through Vercel so the API key stays on the server.
  const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
  const useVercelApi = location.protocol !== 'file:' && (!localHost || location.port === '3000' || new URLSearchParams(location.search).get('api') === 'vercel');
  // `typeof` safely handles Vercel deployments where the local config file is absent.
  const browserApiKey = typeof API_KEY === 'undefined' ? '' : API_KEY;
  const DEFAULT_CITY = 'Pune';
  const state = { unit: 'metric', current: null, forecast: null, city: null, suggestions: [], timer: null, lightMode: false };
  const el = (id) => document.getElementById(id);
  const searchInput = el('city-search');
  const suggestionsBox = el('suggestions');

  // Turn API or browser errors into short, actionable messages.
  function explainError(error) {
    if (error.name === 'TypeError') return 'Could not reach OpenWeatherMap. Check your internet connection and try again.';
    if (error.status === 401) return 'Your OpenWeatherMap API key is missing or invalid. Check config.js locally or OPENWEATHERMAP_API_KEY in Vercel.';
    if (error.status === 404) return 'We couldn’t find that city. Check the spelling or choose a suggestion.';
    if (error.status === 429) return 'Weather requests are temporarily limited. Please wait a moment and try again.';
    if (error.status === 503) return 'The weather service is not configured. Add OPENWEATHERMAP_API_KEY in Vercel project settings.';
    if (error.code === 1) return 'Location access was denied. Allow location access in your browser settings, or search for a city.';
    if (error.code === 2 || error.code === 3) return 'We couldn’t get your location. Check device location settings or search for a city.';
    return error.message || 'Something went wrong while loading the weather. Please try again.';
  }

  async function request(url) {
    const response = await fetch(useVercelApi ? createProxyUrl(url) : url);
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.message || 'Weather service returned an error.');
      error.status = response.status;
      throw error;
    }
    return result;
  }

  // Convert known OpenWeatherMap URLs into a same-origin Vercel Function request.
  function createProxyUrl(openWeatherUrl) {
    const original = new URL(openWeatherUrl);
    const endpointByPath = {
      '/data/2.5/weather': 'current',
      '/data/2.5/forecast': 'forecast',
      '/geo/1.0/direct': 'geocode',
      '/geo/1.0/reverse': 'reverse'
    };
    const endpoint = endpointByPath[original.pathname];
    if (!endpoint) throw new Error('Unsupported weather request.');

    const proxyUrl = new URL('/api/weather', location.origin);
    proxyUrl.searchParams.set('endpoint', endpoint);
    original.searchParams.forEach((value, key) => {
      if (key !== 'appid') proxyUrl.searchParams.set(key, value);
    });
    return proxyUrl;
  }

  // OpenWeatherMap keys can take a little while to activate after creation.
  function checkApiKey() {
    if (useVercelApi) return;
    if (!browserApiKey || browserApiKey === 'YOUR_OPENWEATHERMAP_API_KEY') {
      const error = new Error('Add your OpenWeatherMap key to config.js, then reload the page.');
      error.status = 401;
      throw error;
    }
  }

  async function getCoordinates(city) {
    checkApiKey();
    const places = await request(`${GEO_ROOT}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${browserApiKey}`);
    if (!places.length) { const error = new Error('City not found.'); error.status = 404; throw error; }
    return places[0];
  }

  async function getWeather(lat, lon) {
    checkApiKey();
    return request(`${API_ROOT}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${browserApiKey}`);
  }

  async function getForecast(lat, lon) {
    checkApiKey();
    return request(`${API_ROOT}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${browserApiKey}`);
  }

  // Load both endpoints together, then render from their shared coordinates.
  async function loadCity(place, remember = true) {
    setLoading(true);
    clearError();
    try {
      const [current, forecast] = await Promise.all([getWeather(place.lat, place.lon), getForecast(place.lat, place.lon)]);
      state.current = current;
      state.forecast = forecast;
      state.city = place;
      renderCurrent(current);
      renderForecast(forecast);
      updateTheme(current);
      if (remember) saveRecent({ name: current.name, country: current.sys.country, lat: current.coord.lat, lon: current.coord.lon });
      searchInput.value = '';
      setLoading(false);
    } catch (error) {
      setLoading(false);
      showError(explainError(error));
    }
  }

  function setLoading(loading) {
    el('weather-content').setAttribute('aria-busy', String(loading));
    if (loading) { el('description').textContent = 'Loading weather…'; el('hourly-list').replaceChildren(makeSkeleton('hourly-skeleton')); el('daily-list').replaceChildren(makeSkeleton('daily-skeleton')); }
  }
  function makeSkeleton(className) { const node = document.createElement('div'); node.className = `skeleton ${className}`; return node; }
  function showError(message) { const box = el('status-message'); box.textContent = message; box.hidden = false; box.classList.add('error'); }
  function clearError() { const box = el('status-message'); box.hidden = true; box.classList.remove('error'); box.textContent = ''; }

  function temperature(value) { return `${Math.round(state.unit === 'metric' ? value : value * 9 / 5 + 32)}°`; }
  function windSpeed(value) { return `${Math.round(state.unit === 'metric' ? value * 3.6 : value * 2.237)} ${state.unit === 'metric' ? 'km/h' : 'mph'}`; }
  function visibility(value) { return `${(value / (state.unit === 'metric' ? 1000 : 1609.34)).toFixed(1)} ${state.unit === 'metric' ? 'km' : 'mi'}`; }
  function localDate(timestamp, offset, options) { return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(new Date((timestamp + offset) * 1000)); }
  function weatherEmoji(id, iconCode) {
    if (iconCode && iconCode.endsWith('n') && (id < 800 || id === 800)) return id === 800 ? '🌙' : ({2:'⛈️',3:'🌧️',5:'🌧️',6:'🌨️',7:'🌫️'}[Math.floor(id / 100)] || '☁️');
    if (id >= 200 && id < 300) return '⛈️'; if (id >= 300 && id < 600) return '🌧️'; if (id >= 600 && id < 700) return '🌨️'; if (id >= 700 && id < 800) return '🌫️'; if (id === 800) return '☀️'; return '⛅';
  }

  function renderCurrent(data) {
    const offset = data.timezone;
    el('current-heading').textContent = `${data.name}, ${data.sys.country}`;
    el('local-date').textContent = localDate(data.dt, offset, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
    el('local-time').textContent = `${localDate(data.dt, offset, { hour: 'numeric', minute: '2-digit' })} local time`;
    el('temperature').textContent = temperature(data.main.temp);
    el('feels-like').textContent = temperature(data.main.feels_like);
    el('description').textContent = data.weather[0].description;
    el('weather-icon').textContent = weatherEmoji(data.weather[0].id, data.weather[0].icon);
    el('weather-icon').setAttribute('aria-label', data.weather[0].description);
    el('humidity').textContent = `${data.main.humidity}%`;
    el('wind').textContent = windSpeed(data.wind.speed);
    el('pressure').textContent = `${data.main.pressure} hPa`;
    el('visibility').textContent = visibility(data.visibility);
    el('sunrise').textContent = localDate(data.sys.sunrise, offset, { hour: 'numeric', minute: '2-digit' });
    el('sunset').textContent = localDate(data.sys.sunset, offset, { hour: 'numeric', minute: '2-digit' });
  }

  function renderForecast(data) {
    const points = data.list.slice(0, 8);
    const hourly = el('hourly-list'); hourly.replaceChildren();
    points.forEach((point, index) => {
      const item = document.createElement('div'); item.className = 'hourly-item';
      const time = document.createElement('span'); time.textContent = index === 0 ? 'Now' : localDate(point.dt, data.city?.timezone || state.current.timezone, { hour: 'numeric' });
      const icon = document.createElement('span'); icon.className = 'hour-icon'; icon.textContent = weatherEmoji(point.weather[0].id, point.weather[0].icon); icon.setAttribute('aria-hidden', 'true');
      const temp = document.createElement('strong'); temp.textContent = temperature(point.main.temp);
      item.append(time, icon, temp); hourly.append(item);
    });
    drawChart(points);

    const days = new Map();
    data.list.forEach((point) => {
      const key = localDate(point.dt, state.current.timezone, { year:'numeric', month:'2-digit', day:'2-digit' });
      if (!days.has(key)) days.set(key, []);
      days.get(key).push(point);
    });
    const daily = [...days.values()].slice(0, 5);
    const list = el('daily-list'); list.replaceChildren();
    daily.forEach((items, index) => {
      const noon = items.find((item) => new Date((item.dt + state.current.timezone) * 1000).getUTCHours() === 12) || items[Math.floor(items.length / 2)];
      const highs = items.map((item) => item.main.temp_max); const lows = items.map((item) => item.main.temp_min);
      const card = document.createElement('div'); card.className = 'daily-item';
      const day = document.createElement('span'); day.className = 'day'; day.textContent = index === 0 ? 'Today' : localDate(noon.dt, state.current.timezone, { weekday:'short' });
      const icon = document.createElement('span'); icon.className = 'day-icon'; icon.textContent = weatherEmoji(noon.weather[0].id, noon.weather[0].icon); icon.setAttribute('aria-hidden','true');
      const hi = document.createElement('strong'); hi.textContent = temperature(Math.max(...highs));
      const range = document.createElement('span'); range.className='range'; range.textContent = `Low ${temperature(Math.min(...lows))}`;
      card.append(day, icon, hi, range); list.append(card);
    });
  }

  // Small canvas chart keeps the app dependency-free while showing the same hourly data.
  function drawChart(points) {
    const canvas = el('temperature-chart'); const box = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, box.width * ratio); canvas.height = Math.max(1, box.height * ratio);
    const context = canvas.getContext('2d'); context.scale(ratio, ratio);
    const width = box.width; const height = box.height; const temps = points.map((point) => point.main.temp);
    const low = Math.min(...temps) - 2; const high = Math.max(...temps) + 2;
    const xy = temps.map((value, index) => ({ x: index * width / Math.max(1, temps.length - 1), y: height - 12 - ((value - low) / Math.max(1, high - low)) * (height - 24) }));
    const color = getComputedStyle(document.body).getPropertyValue('--accent').trim();
    context.beginPath(); xy.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
    context.strokeStyle = color; context.lineWidth = 2; context.lineCap = 'round'; context.stroke();
    xy.forEach((point) => { context.beginPath(); context.arc(point.x, point.y, 3, 0, Math.PI * 2); context.fillStyle = color; context.fill(); });
  }

  function updateTheme(data) {
    const condition = data.weather[0].id; const night = data.weather[0].icon.endsWith('n');
    let theme = 'clear';
    if (night && condition === 800) theme = 'night';
    else if (condition >= 200 && condition < 300) theme = 'thunder';
    else if (condition >= 300 && condition < 600) theme = 'rain';
    else if (condition >= 600 && condition < 700) theme = 'snow';
    else if (condition >= 700 && condition < 800) theme = 'mist';
    else if (condition >= 801) theme = 'clouds';
    if (night && theme === 'clear') theme = 'night';
    document.body.className = `theme-${theme}${state.lightMode ? ' light-mode' : ''}`;
  }

  function refreshUnits() { if (state.current) renderCurrent(state.current); if (state.forecast) renderForecast(state.forecast); }
  function saveRecent(place) {
    const old = JSON.parse(localStorage.getItem('skycast-recent') || '[]');
    const recent = [place, ...old.filter((item) => !(item.name === place.name && item.country === place.country))].slice(0, 5);
    localStorage.setItem('skycast-recent', JSON.stringify(recent));
    localStorage.setItem('skycast-last-place', JSON.stringify(place));
    renderRecent();
  }
  function renderRecent() {
    const recent = JSON.parse(localStorage.getItem('skycast-recent') || '[]');
    const row = el('recent-row'); const list = el('recent-list'); list.replaceChildren(); row.hidden = recent.length === 0;
    recent.forEach((place) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'recent-chip'; button.textContent = `${place.name}, ${place.country}`; button.addEventListener('click', () => loadCity(place)); list.append(button); });
  }

  async function findSuggestions(query) {
    if (query.trim().length < 2) { closeSuggestions(); return; }
    try {
      checkApiKey();
      const places = await request(`${GEO_ROOT}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${browserApiKey}`);
      state.suggestions = places; suggestionsBox.replaceChildren();
      places.forEach((place, index) => {
        const option = document.createElement('button'); option.type = 'button'; option.className = 'suggestion-option'; option.setAttribute('role','option'); option.setAttribute('aria-selected','false'); option.id = `suggestion-${index}`;
        option.textContent = `${place.name}${place.state ? `, ${place.state}` : ''}, ${place.country}`;
        option.addEventListener('click', () => { closeSuggestions(); loadCity(place); }); suggestionsBox.append(option);
      });
      suggestionsBox.hidden = !places.length; searchInput.setAttribute('aria-expanded', String(Boolean(places.length)));
    } catch (error) { if (error.status === 401) showError(explainError(error)); }
  }
  function closeSuggestions() { suggestionsBox.hidden = true; searchInput.setAttribute('aria-expanded','false'); }
  function debounce(callback, delay) { return (...args) => { clearTimeout(state.timer); state.timer = setTimeout(() => callback(...args), delay); }; }

  el('search-form').addEventListener('submit', async (event) => {
    event.preventDefault(); const city = searchInput.value.trim(); if (!city) { searchInput.focus(); return; }
    closeSuggestions(); setLoading(true); clearError();
    try { const place = await getCoordinates(city); await loadCity(place); }
    catch (error) { setLoading(false); showError(explainError(error)); }
  });
  searchInput.addEventListener('input', debounce((event) => findSuggestions(event.target.value), 350));
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSuggestions();
    if (event.key === 'ArrowDown' && !suggestionsBox.hidden) { event.preventDefault(); suggestionsBox.querySelector('[role="option"]')?.focus(); }
  });
  suggestionsBox.addEventListener('keydown', (event) => { if (event.key === 'Escape') { closeSuggestions(); searchInput.focus(); } });
  document.addEventListener('click', (event) => { if (!el('search-form').contains(event.target)) closeSuggestions(); });
  document.querySelectorAll('.unit-button').forEach((button) => button.addEventListener('click', () => {
    state.unit = button.dataset.unit; document.querySelectorAll('.unit-button').forEach((item) => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); }); refreshUnits();
  }));
  el('theme-toggle').addEventListener('click', () => {
    state.lightMode = !state.lightMode; localStorage.setItem('skycast-light-mode', String(state.lightMode));
    document.body.classList.toggle('light-mode', state.lightMode); el('theme-toggle').setAttribute('aria-label', state.lightMode ? 'Switch to dark mode' : 'Switch to light mode'); el('theme-toggle').firstElementChild.textContent = state.lightMode ? '☀' : '☾'; if (state.forecast) drawChart(state.forecast.list.slice(0,8));
  });
  el('location-button').addEventListener('click', () => {
    if (!navigator.geolocation) { showError('Your browser does not support location. Search for a city instead.'); return; }
    setLoading(true); clearError();
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try { checkApiKey(); const places = await request(`${GEO_ROOT}/reverse?lat=${coords.latitude}&lon=${coords.longitude}&limit=1&appid=${browserApiKey}`); if (!places.length) throw new Error('Could not identify your location.'); await loadCity(places[0]); }
      catch (error) { setLoading(false); showError(explainError(error)); }
    }, (error) => { setLoading(false); showError(explainError(error)); }, { timeout: 10000, maximumAge: 300000 });
  });

  // Restore preferences and last place; Pune is used for a first-time visitor.
  state.lightMode = localStorage.getItem('skycast-light-mode') === 'true';
  if (state.lightMode) { document.body.classList.add('light-mode'); el('theme-toggle').setAttribute('aria-label','Switch to dark mode'); el('theme-toggle').firstElementChild.textContent = '☀'; }
  renderRecent();
  const lastPlace = JSON.parse(localStorage.getItem('skycast-last-place') || 'null');
  // Save the last selected place separately from the five recent search shortcuts.
  loadCity(lastPlace || { name: DEFAULT_CITY, lat: 18.5204, lon: 73.8567 });
})();
