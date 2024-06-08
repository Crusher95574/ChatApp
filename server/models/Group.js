// models/GroupModel.js
const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
    text: {
        type: String,
        default: ""
    },
    imageUrl: {
        type: String,
        default: ""
    },
    videoUrl: {
        type: String,
        default: ""
    },
    seenBy: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    msgByUserId: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
});

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    profilePic: {
        type: String,
        default: ""
    },
    members: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    messages: [{
        type: mongoose.Schema.ObjectId,
        ref: 'GroupMessage'
    }]
}, {
    timestamps: true
});

const GroupMessageModel = mongoose.model('GroupMessage', groupMessageSchema);
const GroupModel = mongoose.model('Group', groupSchema);

module.exports = {
    GroupMessageModel,
    GroupModel
};
