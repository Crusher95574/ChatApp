import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FaTimes } from "react-icons/fa";
import { setGroups } from '../redux/userSlice';
import UserSearchCard from './UserSearchCard';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../context/SocketContext'; // Import useSocket hook

const AddGroup = ({ onClose }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [profilePic, setProfilePic] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const groups = useSelector(state => state.user.groups);
    const socketConnection = useSocket(); // Use useSocket hook instead of useSelector
    const dispatch = useDispatch();

    useEffect(() => {
        const fetchAllUsers = async () => {
            const URL = `${process.env.REACT_APP_BACKEND_URL}/api/users`;
            try {
                const response = await axios.get(URL);
                setAllUsers(response.data.data);
            } catch (error) {
                toast.error(error?.response?.data?.message || 'Error fetching users');
            }
        };
        fetchAllUsers();
    }, []);

    const handleCreateGroup = () => {
        if (!groupName || selectedUsers.length === 0) {
            toast.error("Please provide a group name and select at least one user.");
            return;
        }

        const groupData = {
            name: groupName,
            members: selectedUsers.map(user => user._id),
            profilePic
        };

        socketConnection.emit('create-group', groupData);
    };

    const handleUserSelection = (user) => {
        setSelectedUsers((prevSelected) => {
            if (prevSelected.find(u => u._id === user._id)) {
                return prevSelected.filter(u => u._id !== user._id);
            }
            return [...prevSelected, user];
        });
    };

    useEffect(() => {
        socketConnection.on('group-created', (newGroup) => {
            console.log('Group created:', newGroup);
            dispatch(setGroups([...groups, newGroup]));
            onClose();
        });

        return () => {
            socketConnection.off('group-created');
        };
    }, [socketConnection, dispatch, groups, onClose]);

    return (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-10'>
            <div className='bg-white p-6 rounded-lg'>
                <div className='flex justify-between items-center mb-4'>
                    <h4 className='font-medium text-lg'>Create Group</h4>
                    <button onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                <input
                    type="text"
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className='w-full p-2 border border-gray-300 rounded mb-4'
                />
                <input
                    type="text"
                    placeholder="Group Profile Picture URL"
                    value={profilePic}
                    onChange={(e) => setProfilePic(e.target.value)}
                    className='w-full p-2 border border-gray-300 rounded mb-4'
                />
                <h5 className='font-medium text-md mb-2'>Select Users</h5>
                <div className='max-h-64 overflow-y-auto'>
                    {allUsers.map(user => (
                        <div
                            key={user._id}
                            className={`flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer ${selectedUsers.includes(user) ? 'bg-gray-200' : ''}`}
                            onClick={() => handleUserSelection(user)}
                        >
                            <UserSearchCard key={user._id} user={user} onUserSelect={handleUserSelection} />
                        </div>
                    ))}
                </div>
                <button
                    onClick={handleCreateGroup}
                    className='mt-4 bg-blue-500 text-white p-2 rounded-md w-full'
                >
                    Create Group
                </button>
            </div>
        </div>
    );
};

export default AddGroup;
