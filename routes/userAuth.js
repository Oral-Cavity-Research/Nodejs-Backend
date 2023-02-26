const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { User, Reviewer } = require("../models/User");
const Request = require("../models/Request");
const bcrypt = require("bcrypt");
const {
  generateRefreshToken,
  setTokenCookie,
  refreshToken,
  revokeToken,
  authenticateToken,
} = require("../middleware/auth");

// user sign up
// add to request list
router.post("/signup", async (req, res) => {
  try {
    const reqReg = await Request.findOne({ reg_no: req.body.reg_no });
    const reqEmail = await Request.findOne({ email: req.body.email });

    const userRegno = await User.findOne({ reg_no: req.body.reg_no });
    const userEmail = await User.findOne({ email: req.body.email });

    const reviewerRegno = await Reviewer.findOne({ reg_no: req.body.reg_no });
    const reviewerEmail = await Reviewer.findOne({ email: req.body.email });

    if (userRegno || reviewerRegno) {
      return res
        .status(401)
        .json({ message: "The Reg No is already registered" });
    }

    if (userEmail || reviewerEmail) {
      return res
        .status(401)
        .json({ message: "Email address is already registered" });
    }

    if (reqReg || reqEmail) {
      return res
        .status(200)
        .json({ message: "A request for registration already exists." });
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);

      const newUserRequest = new Request({
        reg_no: req.body.reg_no,
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
        hospital: req.body.hospital,
        designation: req.body.designation,
        contact_no: req.body.contact_no,
      });
      const userRequest = await newUserRequest.save();
      const savedUserRequest = await Request.findOne({
        _id: userRequest._id,
        reg_no: req.body.reg_no,
        email: req.body.email,
      });
      const { password, ...others } = savedUserRequest._doc;
      others["message"] =
        "Request is sent successfully. You will receive an Email on acceptance";
      return res.status(200).json(others);
    }
  } catch (error) {
    res.status(500).json(error);
    console.log(error);
  }
});

// sign in
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    const reviewer = await Reviewer.findOne({ email: req.body.email });

    if (!user || !reviewer)
      return res.status(400).json({ message: "Wrong credentials!" });
    
    const validate = await bcrypt.compare(req.body.password, user.password);
    if (!validate)
      return res.status(400).json({ message: "Wrong credentials!" });

    const accessToken = jwt.sign(
      { sub: user.email, role: user.role },
      process.env.ACCESS_SECRET,
      { expiresIn: process.env.REFRESH_TIME }
    );
    const refreshToken = generateRefreshToken(user, req.ip);
    await refreshToken.save();

    setTokenCookie(res, refreshToken.token);

    // send the user data and refresh, access tokens
    const { password, ...others } = user._doc;
    // others["access_token"] = accessToken;
    others["message"] = "Successfuly logged in";
    res.status(200).json({
      accessToken: { token: accessToken, expiry: process.env.REFRESH_TIME },
      ref: user,
      others,
    });
  } catch (error) {
    // console.log(error)
    res.status(500).json(error);
  }
});

router.post("/refreshToken", async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token)
    return res
      .status(400)
      .json({ success: false, message: "Token is required" });

  const ipAddress = req.ip;

  refreshToken(token, ipAddress)
    .then(({ accessToken, refreshToken, ref }) => {
      setTokenCookie(res, refreshToken);
      res.json({
        success: true,
        message: "Refresh token successful",
        ref: ref,
        accessToken: { token: accessToken, expiry: process.env.REFRESH_TIME },
      });
    })
    .catch((err) => {
      // console.log(err);
      res.status(400).json({ success: false, message: err.message });
    });
});

router.post("/revokeToken", authenticateToken, async (req, res) => {
  const token = req.body.accessToken || req.cookies.refreshToken;
  const ipAddress = req.ip;

  if (!token)
    return res
      .status(400)
      .json({ success: false, message: "Token is required" });

  if (!req.ownsToken(token))
    return res.status(403).json({
      success: false,
      message: "You are not authorized to revoke this token",
    });

  revokeToken(token, ipAddress)
    .then(() => res.json({ success: true, message: "Token revoked" }))
    .catch((err) =>
      res.status(400).json({ success: false, message: err.message })
    );
});

module.exports = router;
