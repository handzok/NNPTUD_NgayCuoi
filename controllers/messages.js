let messageModel = require("../schemas/messages");
let mongoose = require("mongoose");

module.exports = {
  // Lấy lịch sử chat giữa 2 users
  GetConversation: async function (user1, user2) {
    return await messageModel
      .find({
        isDeleted: false,
        $or: [
          { from: user1, to: user2 },
          { from: user2, to: user1 },
        ],
      })
      .sort({ createdAt: 1 })
      .populate("from", "username fullName avatarUrl")
      .populate("to", "username fullName avatarUrl");
  },

  // Tạo message mới
  CreateMessage: async function (from, to, type, text) {
    let newMessage = new messageModel({
      from: from,
      to: to,
      messageContent: {
        type: type,
        text: text,
      },
    });
    await newMessage.save();
    return await messageModel
      .findById(newMessage._id)
      .populate("from", "username fullName avatarUrl")
      .populate("to", "username fullName avatarUrl");
  },

  // Lấy danh sách conversations (message cuối cùng với mỗi user)
  GetConversationsList: async function (userId) {
    try {
      // Convert string to ObjectId nếu cần
      let userObjectId = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;

      let conversations = await messageModel.aggregate([
        {
          $match: {
            isDeleted: false,
            $or: [{ from: userObjectId }, { to: userObjectId }],
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $addFields: {
            otherUser: {
              $cond: {
                if: { $eq: ["$from", userObjectId] },
                then: "$to",
                else: "$from",
              },
            },
          },
        },
        {
          $group: {
            _id: "$otherUser",
            lastMessage: { $first: "$$ROOT" },
          },
        },
        {
          $sort: { "lastMessage.createdAt": -1 },
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userInfo",
          },
        },
        {
          $unwind: "$userInfo",
        },
        {
          $match: {
            "userInfo.isDeleted": false,
          },
        },
        {
          $project: {
            _id: 0,
            userId: "$_id",
            username: "$userInfo.username",
            fullName: "$userInfo.fullName",
            avatarUrl: "$userInfo.avatarUrl",
            lastMessage: {
              type: "$lastMessage.messageContent.type",
              text: "$lastMessage.messageContent.text",
              createdAt: "$lastMessage.createdAt",
              from: "$lastMessage.from",
            },
          },
        },
      ]);

      return conversations;
    } catch (error) {
      throw error;
    }
  },
};
