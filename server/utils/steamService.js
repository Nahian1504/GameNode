const axios = require("axios");
const NodeCache = require("node-cache");

const steamCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

const STEAM_API_BASE = "http://api.steampowered.com";
const STEAM_API_KEY = process.env.STEAM_API_KEY;


const steamRequest = async (url) => {
  try {
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Steam API error: ${error.response.status} — ${error.response.statusText}`);
    } else if (error.code === "ECONNABORTED") {
      throw new Error("Steam API request timed out");
    } else {
      throw new Error(`Steam API unreachable: ${error.message}`);
    }
  }
};


const getOwnedGames = async (steamId) => {
  const cacheKey = `owned_games_${steamId}`;
  const cached = steamCache.get(cacheKey);

  if (cached) {
    console.log(`Cache hit for owned games: ${steamId}`);
    return cached;
  }

  const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`;

  const data = await steamRequest(url);
  const games = data?.response?.games || [];

  // Store in cache
  steamCache.set(cacheKey, games);
  console.log(`Fetched ${games.length} games for Steam ID: ${steamId}`);

  return games;
};


const getCurrentPlayerCount = async (appId) => {
  const cacheKey = `player_count_${appId}`;
  const cached = steamCache.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const url = `${STEAM_API_BASE}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}&key=${STEAM_API_KEY}`;

  const data = await steamRequest(url);
  const count = data?.response?.player_count || 0;

  // Cache player counts for 5 minutes 
  steamCache.set(cacheKey, count, 300);

  return count;
};


const getPlayerSummary = async (steamId) => {
  const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`;

  const data = await steamRequest(url);
  const players = data?.response?.players || [];

  if (players.length === 0) {
    throw new Error("Steam ID not found");
  }

  const player = players[0];
  if (player.communityvisibilitystate !== 3) {
    throw new Error("Steam profile is private. Please make it public to use GameNode.");
  }

  return player;
};


const getGameNews = async (appId, count = 5) => {
  const cacheKey = `news_${appId}_${count}`;
  const cached = steamCache.get(cacheKey);

  if (cached) return cached;

  const url = `${STEAM_API_BASE}/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=${count}&maxlength=500&key=${STEAM_API_KEY}`;

  const data = await steamRequest(url);
  const news = data?.appnews?.newsitems || [];

  steamCache.set(cacheKey, news, 900); 
  return news;
};

const clearUserCache = (steamId) => {
  steamCache.del(`owned_games_${steamId}`);
};

module.exports = {
  getOwnedGames,
  getCurrentPlayerCount,
  getPlayerSummary,
  getGameNews,
  clearUserCache,
};
