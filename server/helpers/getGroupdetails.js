const { GroupModel } = require("../models/Group");

const getGroupdetails = async (currentUserId) => {
    if (currentUserId) {
        // Fetch user groups
        const userGroups = await GroupModel.find({ 'members': currentUserId })
            .populate('members', '-password')
            .populate('messages');

        const conversation = userGroups.map((conv) => {
            const countUnseenMsg = conv?.messages?.reduce((prev, curr) => {
                const msgByUserId = curr?.msgByUserId?.toString();

                if (msgByUserId !== currentUserId) {
                    // Check if seenBy array includes currentUserId
                    if (Array.isArray(curr?.seenBy) && curr.seenBy.includes(currentUserId)) {
                        return prev;
                    } else {
                        return prev + 1;
                    }
                } else {
                    return prev;
                }

            }, 0);
            return {
                _id: conv?._id,
                name: conv?.name,
                profilePic: conv?.profilePic,
                unseenMsg: countUnseenMsg,
                lastMsg: conv.messages[conv?.messages?.length - 1]
            }
        })

        return conversation
    } else {
        return []
    }
}

module.exports = getGroupdetails