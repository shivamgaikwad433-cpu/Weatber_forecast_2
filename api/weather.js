// Vercel serverless proxy: the browser never receives the OpenWeatherMap key.
const OPENWEATHER_ENDPOINTS = {
  current: 'https://api.openweathermap.org/data/2.5/weather',
  forecast: 'https://api.openweathermap.org/data/2.5/forecast',
  geocode: 'https://api.openweathermap.org/geo/1.0/direct',
  reverse: 'https://api.openweathermap.org/geo/1.0/reverse'
};

const ALLOWED_PARAMETERS = ['lat', 'lon', 'q', 'limit', 'units'];

module.exports = async function weatherHandler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ message: 'Only GET requests are supported.' });
  }

  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) {
    return response.status(503).json({ message: 'OPENWEATHERMAP_API_KEY is missing from the Vercel environment.' });
  }

  const endpoint = request.query.endpoint;
  const openWeatherEndpoint = OPENWEATHER_ENDPOINTS[endpoint];
  if (!openWeatherEndpoint) {
    return response.status(400).json({ message: 'Unknown weather endpoint.' });
  }

  const url = new URL(openWeatherEndpoint);
  ALLOWED_PARAMETERS.forEach((parameter) => {
    const value = request.query[parameter];
    if (typeof value === 'string') url.searchParams.set(parameter, value);
  });
  url.searchParams.set('appid', apiKey);

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();
    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return response.status(upstream.status).json(data);
  } catch {
    return response.status(502).json({ message: 'Could not reach the OpenWeatherMap service.' });
  }
};
