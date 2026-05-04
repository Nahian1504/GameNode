const { UserGame } = require("../models/Game");
const Achievement = require("../models/Achievement");

const getUserContextForAssistant = async (userId) => {
  // Top 3 games by playtime
  const topGames = await UserGame.find({ userId })
    .sort({ playtimeForever: -1 })
    .limit(3)
    .lean();

  // Total library size and playtime
  const allGames = await UserGame.find({ userId }).lean();
  const totalGames = allGames.length;
  const totalPlaytimeHours = Math.round(allGames.reduce((sum, g) => sum + (g.playtimeForever || 0), 0) / 60);

  // Recent achievements across all games
  const achievementDocs = await Achievement.find({ userId }).lean();
  const recentAchievements = achievementDocs
    .flatMap((d) => d.achievements.filter((a) => a.achieved && a.unlockTime > 0)
     .map((a) => ({ name: a.displayName || a.apiName, game: d.appId, unlockedAt: a.unlockTime })))
    .sort((a, b) => b.unlockedAt - a.unlockedAt)
    .slice(0, 5);

  return {
    topGames: topGames.map((g) => ({
      name: g.name,
      hours: Math.round(g.playtimeForever / 60),
      appId: g.appId,
    })),
    totalGames,
    totalPlaytimeHours,
    recentAchievements,
  };
};

module.exports = { getUserContextForAssistant };
