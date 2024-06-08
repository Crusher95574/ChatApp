const { GroupMessageModel } = require('../models/Group');

// Example code to create a GroupMessage
const createGroupMessage = async (groupMessageData) => {
    try {
        // Ensure that msgByUserId is provided
        if (!groupMessageData.msgByUserId) {
            throw new Error('msgByUserId is required');
        }

        // Create a new GroupMessage document
        const groupMessage = new GroupMessageModel({
            text: groupMessageData.text,
            imageUrl: groupMessageData.imageUrl,
            videoUrl: groupMessageData.videoUrl,
            msgByUserId: groupMessageData.msgByUserId // Ensure that msgByUserId is provided here
        });

        // Save the GroupMessage document
        const savedGroupMessage = await groupMessage.save();

        return savedGroupMessage;
    } catch (error) {
        // Handle error
        console.error('Error creating GroupMessage:', error);
        throw error; // Rethrow the error to handle it elsewhere
    }
}

module.exports = createGroupMessage
