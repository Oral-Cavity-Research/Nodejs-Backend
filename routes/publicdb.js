const express = require("express");
const router = express.Router();
const Image = require("../models/Image");

router.get("/filterimages", async (req, res) => {
  try {
    const { category } = req.query;

    //store the filteredImages here
    let filteredImages;

    if (category !== "all") {
      filteredImages = await Image.find({
        category,
      });
    } else {
      filteredImages = await Image.find();
    }

    return res.status(200).json({ status: "success", data: filteredImages });
  } catch (err) {
    return res.status(404).json({ status: err, message: "Unknown category!" });
  }
});

module.exports = router;
