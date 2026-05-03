const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");
const { protect } = require("../middleware/authMiddleware");
const { validateComplaintBody, validateStatusUpdate } = require("../middleware/complaintValidation");
const { generateComplaintResolution } = require("../utils/genAIService");

// Submit a complaint 
router.post("/", protect, validateComplaintBody, async (req, res, next) => {
  try {
    const { category, description } = req.body;

    // Call GenAI for resolution 
    let aiResponse = null;
    try {
      aiResponse = await generateComplaintResolution(category, description);
    } catch (aiError) {
      console.error("GenAI complaint resolution failed:", aiError.message);
      // Complaint still saved without AI response
      aiResponse = "We have received your complaint and our team will look into it. Thank you for bringing this to our attention.";
    }

    // Save complaint to DB 
    const complaint = await Complaint.create({
      userId: req.user._id,
      category,
      description,
      aiResponse,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Complaint submitted successfully.",
      complaint: {
        _id: complaint._id,
        category: complaint.category,
        description: complaint.description,
        aiResponse: complaint.aiResponse,
        status: complaint.status,
        createdAt: complaint.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Complaint history
router.get("/mine", protect, async (req, res, next) => {
  try {
    const complaints = await Complaint.getByUser(req.user._id);
    res.status(200).json({
      success: true,
      complaints,
      total: complaints.length,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", protect, validateStatusUpdate, async (req, res, next) => {
  try {
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      userId: req.user._id, 
    });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found.",
      });
    }

    if (req.body.status === "resolved") {
      complaint.resolve();
    } else {
      complaint.escalate();
    }

    await complaint.save();

    res.status(200).json({
      success: true,
      message: `Complaint marked as ${req.body.status}.`,
      complaint,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
