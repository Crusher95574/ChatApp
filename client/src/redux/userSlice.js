// redux/userSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    _id: "",
    name: "",
    email: "",
    profilePic: "",
    token: "",
    onlineUser: [],
    socketConnection: null,
    groups: []  // Add this line for groups
};

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action) => {
            state._id = action.payload._id;
            state.name = action.payload.name;
            state.email = action.payload.email;
            state.profilePic = action.payload.profilePic;
        },
        setToken: (state, action) => {
            state.token = action.payload;
        },
        logout: (state) => {
            state._id = "";
            state.name = "";
            state.email = "";
            state.profilePic = "";
            state.token = "";
            state.socketConnection = null;
            state.groups = [];
        },
        setOnlineUser: (state, action) => {
            state.onlineUser = action.payload;
        },
        setSocketConnection: (state, action) => {
            state.socketConnection = action.payload;
        },
        setGroups: (state, action) => {
            state.groups = action.payload;
        },
        addGroupMessage: (state, action) => {
            const { groupId, message } = action.payload;
            const groupIndex = state.groups.findIndex(group => group._id === groupId);
            if (groupIndex !== -1) {
                state.groups[groupIndex].messages.push(message);
            }
        }

    }
});

export const { setUser, setToken, logout, setOnlineUser, setSocketConnection, setGroups, addGroupMessage } = userSlice.actions;

export default userSlice.reducer;
