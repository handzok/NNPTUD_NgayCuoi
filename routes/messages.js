let express = require("express");
let router = express.Router();
let messageController = require("../controllers/messages");
let userController = require("../controllers/users");
let { CheckLogin } = require("../utils/authHandler");
let { uploadImage } = require("../utils/uploadHandler");
let mongoose = require("mongoose");

// ROUTE 1: GET / - Lấy danh sách conversations
router.get("/", CheckLogin, async function (req, res, next) {
  try {
    let currentUser = req.user._id;
    let conversations =
      await messageController.GetConversationsList(currentUser);
    res.send(conversations);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// ROUTE 2: GET /:userID - Lấy lịch sử chat với userID
router.get("/:userID", CheckLogin, async function (req, res, next) {
  try {
    let currentUser = req.user._id;
    let targetUser = req.params.userID;

    // Validate userID
    if (!mongoose.Types.ObjectId.isValid(targetUser)) {
      return res.status(400).send({ message: "Invalid userID" });
    }

    // Kiểm tra user có tồn tại không
    let checkUser = await userController.GetUserById(targetUser);
    if (!checkUser) {
      return res.status(404).send({ message: "User not found" });
    }

    // Không cho phép chat với chính mình
    if (currentUser.toString() === targetUser) {
      return res.status(400).send({ message: "Cannot chat with yourself" });
    }

    let messages = await messageController.GetConversation(
      currentUser,
      targetUser,
    );
    res.send(messages);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// ROUTE 3: POST /:userID - Gửi message đến userID
router.post(
  "/:userID",
  CheckLogin,
  uploadImage.single("file"),
  async function (req, res, next) {
    try {
      let currentUser = req.user._id;
      let targetUser = req.params.userID;

      // Validate userID
      if (!mongoose.Types.ObjectId.isValid(targetUser)) {
        return res.status(400).send({ message: "Invalid userID" });
      }

      // Kiểm tra user có tồn tại không
      let checkUser = await userController.GetUserById(targetUser);
      if (!checkUser) {
        return res.status(404).send({ message: "User not found" });
      }

      // Không cho phép gửi message cho chính mình
      if (currentUser.toString() === targetUser) {
        return res
          .status(400)
          .send({ message: "Cannot send message to yourself" });
      }

      let type, text;

      // Xác định type và text
      if (req.file) {
        // Có file được upload
        type = "file";
        text = req.file.path;
      } else {
        // Không có file, lấy text từ body
        type = "text";
        text = req.body.text;

        // Validate text không rỗng
        if (!text || text.trim() === "") {
          return res.status(400).send({ message: "Text cannot be empty" });
        }
      }

      // Tạo message
      let newMessage = await messageController.CreateMessage(
        currentUser,
        targetUser,
        type,
        text,
      );

      res.send(newMessage);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  },
);

module.exports = router;
