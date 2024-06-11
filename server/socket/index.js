const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');
const UserModel = require('../models/userModel');
const { ConversationModel, MessageModel } = require('../models/ConversationModel');
const { GroupModel, GroupMessageModel } = require('../models/Group')
const getConversation = require('../helpers/getConversation');
const getGroupdetails = require('../helpers/getGroupdetails.js')
const client = require('../redis/redis');
const createGroupMessage = require('../helpers/getGroupMessages.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
    }
});

const onlineUser = new Set();

io.on('connection', async (socket) => {
    try {
        const token = socket.handshake.auth.token;

        // Get current user details
        const user = await getUserDetailsFromToken(token);

        if (!user || user.logout) {
            socket.disconnect();
            return;
        }

        socket.join(user?._id?.toString());
        onlineUser.add(user?._id?.toString());
        io.emit('onlineUser', Array.from(onlineUser));

        socket.on('message-page', async (userId) => {
            const cacheKey = `user-details:${userId}`;
            let userDetails = await client.get(cacheKey);

            if (userDetails) {
                userDetails = JSON.parse(userDetails);
            } else {
                userDetails = await UserModel.findById(userId)
                if (userDetails) {
                    await client.set(cacheKey, JSON.stringify(userDetails), 'EX', 86400);
                }
            }

            const payload = {
                _id: userDetails?._id,
                name: userDetails?.name,
                email: userDetails?.email,
                profilePic: userDetails?.profilePic,
                online: onlineUser.has(userId)
            };
            socket.emit('message-user', payload);

            const conversationCacheKey = `conversation:${user?._id}:${userId}`;
            let conversationMessages = [];

            const keyType = await client.type(conversationCacheKey);

            if (keyType !== 'list') {
                await client.del(conversationCacheKey);
            } else {
                conversationMessages = await client.lrange(conversationCacheKey, 0, -1);
            }

            if (conversationMessages.length > 0) {
                const messages = await Promise.all(conversationMessages.map(async messageId => {
                    const messageCacheKey = `message:${messageId}`;
                    let message = await client.get(messageCacheKey);
                    if (!message) {
                        message = await MessageModel.findById(messageId);
                        if (message) {
                            await client.set(messageCacheKey, JSON.stringify(message));
                            await client.expire(messageCacheKey, 86400); // Set expiry time to 24 hours (86400 seconds)
                        }
                    } else {
                        message = JSON.parse(message);
                    }
                    return message;
                }));

                socket.emit('message', messages);
            } else {
                const conversation = await ConversationModel.findOne({
                    "$or": [
                        { sender: user?._id, receiver: userId },
                        { sender: userId, receiver: user?._id }
                    ]
                }).populate('messages').sort({ updatedAt: -1 });

                conversationMessages = conversation?.messages || [];

                if (conversationMessages.length > 0) {
                    const messageIds = conversationMessages.map(message => message._id.toString());
                    await Promise.all(messageIds.map(async messageId => {
                        const messageCacheKey = `message:${messageId}`;
                        const message = await MessageModel.findById(messageId);
                        if (message) {
                            await client.set(messageCacheKey, JSON.stringify(message));
                            await client.expire(messageCacheKey, 86400); // Set expiry time to 24 hours (86400 seconds)
                        }
                    }));
                    await client.rpush(conversationCacheKey, messageIds);
                    await client.expire(conversationCacheKey, 86400);
                }

                socket.emit('message', conversationMessages);
            }
        });

        socket.on('new message', async (data) => {
            let conversation = await ConversationModel.findOne({
                "$or": [
                    { sender: data?.sender, receiver: data?.receiver },
                    { sender: data?.receiver, receiver: data?.sender }
                ]
            });

            if (!conversation) {
                const createConversation = await ConversationModel({
                    sender: data?.sender,
                    receiver: data?.receiver
                });
                conversation = await createConversation.save();
            }

            const message = new MessageModel({
                text: data.text,
                imageUrl: data.imageUrl,
                videoUrl: data.videoUrl,
                msgByUserId: data?.msgByUserId,
            });
            const saveMessage = await message.save();

            await ConversationModel.updateOne({ _id: conversation?._id }, {
                "$push": { messages: saveMessage?._id }
            });

            const conversationCacheKeySender = `conversation:${data?.sender}:${data?.receiver}`;
            const conversationCacheKeyReceiver = `conversation:${data?.receiver}:${data?.sender}`;

            const keyTypeSender = await client.type(conversationCacheKeySender);
            if (keyTypeSender !== 'list') {
                await client.del(conversationCacheKeySender);
            }

            const keyTypeReceiver = await client.type(conversationCacheKeyReceiver);
            if (keyTypeReceiver !== 'list') {
                await client.del(conversationCacheKeyReceiver);
            }

            await client.rpush(conversationCacheKeySender, saveMessage._id.toString());
            await client.rpush(conversationCacheKeyReceiver, saveMessage._id.toString());
            await client.expire(conversationCacheKeySender, 86400);
            await client.expire(conversationCacheKeyReceiver, 86400);

            const messageCacheKey = `message:${saveMessage._id}`;
            await client.set(messageCacheKey, JSON.stringify(saveMessage));
            await client.expire(messageCacheKey, 86400); // Set expiry time to 24 hours (86400 seconds)

            const conversationMessagesSender = await client.lrange(conversationCacheKeySender, 0, -1);
            const conversationMessagesReceiver = await client.lrange(conversationCacheKeyReceiver, 0, -1);

            const messagesSender = await Promise.all(conversationMessagesSender.map(async messageId => {
                const message = await client.get(`message:${messageId}`);
                return JSON.parse(message);
            }));

            const messagesReceiver = await Promise.all(conversationMessagesReceiver.map(async messageId => {
                const message = await client.get(`message:${messageId}`);
                return JSON.parse(message);
            }));

            io.to(data?.sender).emit('message', messagesSender);
            io.to(data?.receiver).emit('message', messagesReceiver);

            const conversationSender = await getConversation(data?.sender);
            const conversationReceiver = await getConversation(data?.receiver);

            io.to(data?.sender).emit('conversation', conversationSender);
            io.to(data?.receiver).emit('conversation', conversationReceiver);
        });


        socket.on('sidebar', async (currentUserId) => {
            const cacheKey = `conversation:${currentUserId}`;
            let conversation = await client.get(cacheKey);

            if (conversation) {
                conversation = JSON.parse(conversation);
            } else {
                conversation = await getConversation(currentUserId);
                await client.set(cacheKey, JSON.stringify(conversation), 'EX', 86400);
            }

            socket.emit('conversation', conversation);

        });


        socket.on('seen', async (msgByUserId) => {
            let conversation = await ConversationModel.findOne({
                "$or": [
                    { sender: user?._id, receiver: msgByUserId },
                    {
                        sender: msgByUserId, receiver: user
                            ?._id
                    }
                ]
            });

            const conversationMessageId = conversation?.messages || [];

            await MessageModel.updateMany(
                { _id: { "$in": conversationMessageId }, msgByUserId: msgByUserId },
                { "$set": { seen: true } }
            );

            const conversationSender = await getConversation(user?._id?.toString());
            const conversationReceiver = await getConversation(msgByUserId);

            io.to(user?._id?.toString()).emit('conversation', conversationSender);
            io.to(msgByUserId).emit('conversation', conversationReceiver);
        });




        // Group chat handlers

        const updateUserGroupsCache = async (userId) => {
            const cacheKey = `user-groups:${userId}`;
            const userGroups = await getGroupdetails(userId)
            await client.set(cacheKey, JSON.stringify(userGroups), 'EX', 86400); // Cache for 24 hours
        };

        socket.on('create-group', async (groupData) => {
            try {
                const group = new GroupModel({
                    name: groupData.name,
                    members: groupData.members,
                    profilePic: groupData.profilePic
                });

                const savedGroup = await group.save();

                // Cache the newly created group in Redis
                const groupCacheKey = `group-details:${savedGroup._id}`;
                await client.set(groupCacheKey, JSON.stringify(savedGroup), 'EX', 86400); // Cache for 24 hours

                // Update the user groups cache for each member
                await Promise.all(groupData.members.map(memberId => updateUserGroupsCache(memberId)));

                // Emit a 'group-created' event to inform connected clients about the new group
                io.emit('group-created', savedGroup);

            } catch (error) {
                console.error('Error creating group:', error);
            }
        });

        socket.on('grp', async (currentUserId) => {
            try {
                if (!currentUserId) {
                    throw new Error('Current user ID is missing');
                }

                const cacheKey = `user-groups:${currentUserId}`;
                let userGroups = await client.get(cacheKey);

                if (userGroups) {
                    userGroups = JSON.parse(userGroups);
                } else {
                    userGroups = await getGroupdetails(currentUserId)

                    // Cache the fetched user groups in Redis
                    if (userGroups) {
                        await client.set(cacheKey, JSON.stringify(userGroups), 'EX', 86400); // Cache for 24 hours
                    }
                }

                // Emit the user groups to the client
                io?.to(currentUserId)?.emit('grps', userGroups);

            } catch (error) {
                console.error('Error fetching groups for user:', error);
            }
        });

        socket.on('group-page', async (groupId) => {
            const cacheKey = `group-details:${groupId}`;
            let groupDetails = await client.get(cacheKey);

            if (groupDetails) {
                groupDetails = JSON.parse(groupDetails);
            } else {
                groupDetails = await GroupModel.findById(groupId).populate('members', '-password').populate('messages');
                if (groupDetails) {
                    await client.set(cacheKey, JSON.stringify(groupDetails), 'EX', 86400);
                }
            }
            socket.emit('group-details', groupDetails);
        });

        socket.on('new group message', async (data) => {
            try {
                if (!data.groupId || !data.sender) {
                    throw new Error('groupId and sender are required');
                }

                const group = await GroupModel.findById(data.groupId);
                if (!group) {
                    console.log('Group not found');
                    return;
                }

                const savedMessage = await createGroupMessage({
                    text: data.text,
                    imageUrl: data.imageUrl,
                    videoUrl: data.videoUrl,
                    msgByUserId: data.sender
                });

                group.messages.push(savedMessage._id);
                await group.save();

                io.to(data.groupId).emit('group-message', savedMessage);

                group.members.forEach(member => {
                    // if (member._id.toString() !== data.sender.toString()) {
                    io.to(member._id.toString()).emit('new-group-message', {
                        groupId: data.groupId,
                        lastMsg: savedMessage,
                        memberId: data.sender
                    });
                    //}
                });

                const groupCacheKey = `group-details:${data.groupId}`;
                let groupDetails = await client.get(groupCacheKey);

                if (groupDetails) {
                    groupDetails = JSON.parse(groupDetails);
                    groupDetails.messages.push(savedMessage); // Add the new message to the cache
                    await client.set(groupCacheKey, JSON.stringify(groupDetails), 'EX', 86400); // Update the cache
                } else {
                    const updatedGroupDetails = await GroupModel.findById(data.groupId).populate('members', '-password').populate('messages');
                    await client.set(groupCacheKey, JSON.stringify(updatedGroupDetails), 'EX', 86400); // Create the cache if it doesn't exist
                }

                // Update the user-groups cache for each member
                const memberUpdatePromises = group.members.map(async member => {
                    const userGroupsCacheKey = `user-groups:${member._id.toString()}`;
                    const userGroups = await getGroupdetails(member._id.toString());
                    await client.set(userGroupsCacheKey, JSON.stringify(userGroups), 'EX', 86400);
                });
                await Promise.all(memberUpdatePromises);

            } catch (error) {
                console.error('Error creating group message:', error);
            }
        });


        socket.on('add-users-to-group', async ({ groupId, userIds }) => {
            try {
                const group = await GroupModel.findById(groupId);
                if (!group) {
                    socket.emit('error', { message: 'Group not found' });
                    return;
                }

                const usersToAdd = userIds.filter(userId => !group.members.includes(userId));
                group.members.push(...usersToAdd);
                await group.save();

                const updatedGroup = await GroupModel.findById(groupId).populate('members', '-password').populate('messages');
                io.to(groupId).emit('group-updated', updatedGroup);

                const groupCacheKey = `group-details:${groupId}`;
                await client.set(groupCacheKey, JSON.stringify(updatedGroup), 'EX', 86400);

                // Update the user groups cache for each added member
                await Promise.all(usersToAdd.map(memberId => updateUserGroupsCache(memberId)));

            } catch (error) {
                console.error('Error adding users to group:', error);
                socket.emit('error', { message: 'An error occurred while adding users to the group' });
            }
        });

        socket.on('user-leave-group', async ({ groupId, userId }) => {
            try {
                const group = await GroupModel.findById(groupId).populate('members', '-password').populate('messages');
                if (!group) {
                    socket.emit('error', { message: 'Group not found' });
                    return;
                }

                const userIndex = group.members.findIndex(member => member._id.toString() === userId);
                if (userIndex === -1) {
                    socket.emit('error', { message: 'You are not a member of this group' });
                    return;
                }

                group.members.splice(userIndex, 1);
                await group.save();

                socket.emit('left-group', { groupId });
                io.to(groupId).emit('group-updated', group);

                const groupCacheKey = `group-details:${groupId}`;
                await client.set(groupCacheKey, JSON.stringify(group), 'EX', 86400);

                // Update the user groups cache for the user who left
                await updateUserGroupsCache(userId);

            } catch (error) {
                console.error('Error leaving group:', error);
                socket.emit('error', { message: 'An error occurred while leaving the group' });
            }
        });

        socket.on('seen-group', async (data, ack) => {
            try {
                const { groupId, userId } = data;

                // Ensure groupId and userId are provided and valid
                if (!groupId || !userId) {
                    throw new Error('Group ID or User ID is missing');
                }

                // Convert groupId to string if it's not already
                const validGroupId = typeof groupId === 'string' ? groupId : groupId.toString();

                // Find the group based on the groupId
                const group = await GroupModel.findById(validGroupId);

                // Ensure group exists
                if (!group) {
                    throw new Error('Group not found');
                }

                // Check if the user is a member of the group
                if (!group.members.includes(userId)) {
                    throw new Error('User is not a member of the group');
                }

                // Update the seenBy field of group messages for the specified user
                await GroupMessageModel.updateMany(
                    { _id: { $in: group.messages }, seenBy: { $ne: userId } },
                    { $addToSet: { seenBy: userId } }
                );

                // Update Redis cache for the group messages
                const groupCacheKey = `group-details:${validGroupId}`;
                const groupDetails = await client.get(groupCacheKey);

                if (groupDetails) {
                    const parsedGroupDetails = JSON.parse(groupDetails);
                    parsedGroupDetails.messages = parsedGroupDetails.messages.map(message => {
                        if (!message.seenBy.includes(userId)) {
                            message.seenBy.push(userId);
                        }
                        return message;
                    });

                    await client.set(groupCacheKey, JSON.stringify(parsedGroupDetails), 'EX', 86400);
                }

                // Emit event to notify the user that group messages have been seen
                io.to(userId).emit('group-messages-seen', { groupId: validGroupId });

                // Acknowledge the client that the operation was successful
                if (ack) ack({ status: 'success' });
            } catch (error) {
                console.error('Error marking group messages as seen:', error);

                // Emit an error event or acknowledge with error
                if (ack) {
                    ack({ status: 'error', message: error.message });
                } else {
                    socket.emit('error', { message: error.message });
                }
            }
        });




        socket.on('join-group', async (groupId) => {
            socket.join(groupId);
        });

        socket.on('leave-group', async (groupId) => {
            socket.leave(groupId);
        });

        socket.on('disconnect', () => {
            onlineUser.delete(user?._id?.toString());
            console.log('disconnect user ', socket.id);
        });
    } catch (error) {
        console.error("Error in socket connection:", error);
        socket.disconnect();
    }
});

module.exports = {
    app,
    server
};
