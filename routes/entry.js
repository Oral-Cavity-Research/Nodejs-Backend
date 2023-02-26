const router = require("express").Router();
const { authenticateToken } = require("../middleware/auth");
const TeleConEntry = require("../models/TeleConEntry");

// router.post("/add", authenticateToken, async (req, res) => {
//     try {
//         const newEntry = new TeleConEntry({
//             patient_id: req.body.patient_id,
            
//         })
//     } catch (error) {
        
//     }
// })