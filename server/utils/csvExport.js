const generateCSV = (entries) => {
  const headers = ["Rank", "Player Name", "Game", "Score", "Notes", "Date"];
  const rows = entries.map((entry, index) => [
    index + 1,
    `"${(entry.playerName || "").replace(/"/g, '""')}"`,
    `"${(entry.game || "").replace(/"/g, '""')}"`,
    entry.score,
    `"${(entry.notes || "").replace(/"/g, '""')}"`,
    entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US") : "",
  ]);

  const csvLines = [headers.join(","), ...rows.map((r) => r.join(","))];
  return csvLines.join("\n");
};

module.exports = { generateCSV };
