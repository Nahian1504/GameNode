// Enriches favorite game entries with name, cover art, and playtime from the UserGame DB collection
const { UserGame } = require("../models/Game");

const enrichFavorites = async (userId, games) => {
  if (!games || games.length === 0) return [];

  const appIds = games.map((g) => g.appId);

  // Fetch all UserGame records for this user matching the appIds
  const userGames = await UserGame.find({ userId, appId: { $in: appIds } });

  // Builds a lookup map: appId → UserGame
  const gameMap = {};
  userGames.forEach((ug) => { gameMap[ug.appId] = ug; });

  return games.map((entry) => {
    const ug = gameMap[entry.appId];
    return {
      appId:          entry.appId,
      addedAt:        entry.addedAt,
      // Enriched fields — null if game not yet synced from Steam
      name:           ug?.name || null,
      playtimeHours:  ug ? Math.round((ug.playtimeForever / 60) * 10) / 10 : 0,
      headerImageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${entry.appId}/header.jpg`,
      imgIconUrl:     ug?.imgIconUrl || null,
    };
  });
};

module.exports = { enrichFavorites };
