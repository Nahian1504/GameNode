const express = require("express");
const router = express.Router();
const Favorite = require("../models/Favorite");
const { protect } = require("../middleware/authMiddleware");
const { validateFavoritesBody, validateFavoritesParam } = require("../middleware/favoritesValidation");
const { enrichFavorites } = require("../utils/favoritesEnrichment");


router.get("/", protect, async (req, res, next) => {
  try {
    const doc = await Favorite.findOne({ userId: req.user._id });
    if (!doc || doc.games.length === 0) {
      return res.status(200).json({ success: true, favorites: [], total: 0 });
    }
    const enriched = await enrichFavorites(req.user._id, doc.games);
    res.status(200).json({ success: true, favorites: enriched, total: enriched.length });
  } catch (error) { next(error); }
});


router.post("/", protect, validateFavoritesBody, async (req, res, next) => {
  try {
    const { appId } = req.body;
    let doc = await Favorite.findOne({ userId: req.user._id });
    if (!doc) doc = new Favorite({ userId: req.user._id, games: [] });

    try { doc.addGame(appId); }
    catch (err) { return res.status(409).json({ success: false, message: err.message }); }

    await doc.save();
    res.status(201).json({ success: true, message: "Game added to favorites.", favorite: { appId, addedAt: new Date() } });
  } catch (error) { next(error); }
});


router.delete("/:appId", protect, validateFavoritesParam, async (req, res, next) => {
  try {
    const { appId } = req.params;
    const doc = await Favorite.findOne({ userId: req.user._id });
    if (!doc) return res.status(404).json({ success: false, message: "Favorites list not found." });

    try { doc.removeGame(appId); }
    catch (err) { return res.status(404).json({ success: false, message: err.message }); }

    await doc.save();
    res.status(200).json({ success: true, message: "Game removed from favorites.", appId });
  } catch (error) { next(error); }
});

module.exports = router;
