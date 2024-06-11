import React, { useEffect, useState } from 'react';
import { IoChatbubbleEllipses } from "react-icons/io5";
import { FaUserPlus } from "react-icons/fa";
import { NavLink, useNavigate } from 'react-router-dom';
import { BiLogOut } from "react-icons/bi";
import Avatar from './Avatar';
import { useDispatch, useSelector } from 'react-redux';
import EditUserDetails from './EditUserDetails';
import { FiArrowUpLeft } from "react-icons/fi";
import SearchUser from './SearchUser';
import { FaImage, FaVideo, FaUserGroup } from "react-icons/fa6";
import { logout } from '../redux/userSlice';
import AddGroup from './AddGroup';
import { useSocket } from '../context/SocketContext';

const Sidebar = () => {
    const user = useSelector(state => state.user);
    const [editUserOpen, setEditUserOpen] = useState(false);
    const [allUser, setAllUser] = useState([]);
    const [openSearchUser, setOpenSearchUser] = useState(false);
    const [addGroup, setAddGroup] = useState(false);
    const socket = useSocket();
    const [groups, setGroup] = useState([]);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        if (socket) {
            socket.emit('sidebar', user._id);
            socket.emit('grp', user._id);

            const handleConversation = (data) => {
                const conversationUserData = data.map((conversationUser) => {
                    if (conversationUser.sender._id === conversationUser.receiver._id) {
                        return { ...conversationUser, userDetails: conversationUser.sender };
                    } else if (conversationUser.receiver._id !== user._id) {
                        return { ...conversationUser, userDetails: conversationUser.receiver };
                    } else {
                        return { ...conversationUser, userDetails: conversationUser.sender };
                    }
                });
                setAllUser(conversationUserData);
            };

            const handleGroups = (data) => setGroup(data);

            const handleGroupUpdated = (updatedGroup) => {
                setGroup(prevGroups =>
                    prevGroups.map(group => group._id === updatedGroup._id ? updatedGroup : group)
                );
            };

            const handleGroupMessagesSeen = ({ groupId }) => {
                setGroup(prevGroups =>
                    prevGroups.map(group =>
                        group._id === groupId ? { ...group, unseenMsg: 0 } : group
                    )
                );
            };

            // Handle new group messages
            const handleNewGroupMessage = ({ groupId, lastMsg, memberId }) => {

                setGroup(prevGroups =>
                    prevGroups.map(group =>
                        group._id === groupId
                            ? {
                                ...group,
                                lastMsg,
                                unseenMsg: memberId === user._id ? group.unseenMsg : (group.unseenMsg || 0) + 1
                            }
                            : group
                    )
                );
            };


            socket.on('conversation', handleConversation);
            socket.on('grps', handleGroups);
            socket.on('group-updated', handleGroupUpdated);
            socket.on('group-messages-seen', handleGroupMessagesSeen);
            socket.on('new-group-message', handleNewGroupMessage);  // Listen for new group messages

            return () => {
                socket.off('conversation', handleConversation);
                socket.off('grps', handleGroups);
                socket.off('group-updated', handleGroupUpdated);
                socket.off('group-messages-seen', handleGroupMessagesSeen);
                socket.off('new-group-message', handleNewGroupMessage);  // Cleanup
            };
        }
    }, [socket, user._id]);

    const handleLogout = () => {
        dispatch(logout());
        navigate("/email");
        localStorage.clear();
    };
    return (
        <div className='w-full h-full grid grid-cols-[48px,1fr] bg-white'>
            <div className='bg-slate-100 w-12 h-full rounded-tr-lg rounded-br-lg py-5 text-slate-600 flex flex-col justify-between'>
                <div>
                    <NavLink className={({ isActive }) => `w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded ${isActive && "bg-slate-200"}`} title='chat'>
                        <IoChatbubbleEllipses size={20} />
                    </NavLink>

                    <div title='add friend' onClick={() => setOpenSearchUser(true)} className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded'>
                        <FaUserPlus size={20} />
                    </div>
                    <div title='add group' onClick={() => setAddGroup(true)} className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded'>
                        <FaUserGroup size={20} />
                    </div>
                </div>

                <div className='flex flex-col items-center'>
                    <button className='mx-auto' title={user.name} onClick={() => setEditUserOpen(true)}>
                        <Avatar
                            width={40}
                            height={40}
                            name={user.name}
                            imageUrl={user.profilePic}
                            userId={user._id}
                        />
                    </button>
                    <button title='logout' className='w-12 h-12 flex justify-center items-center cursor-pointer hover:bg-slate-200 rounded' onClick={handleLogout}>
                        <span className='-ml-2'>
                            <BiLogOut size={20} />
                        </span>
                    </button>
                </div>
            </div>

            <div className='w-full'>
                <div className='h-16 flex items-center'>
                    <h2 className='text-xl font-bold p-4 text-slate-800'>Messages</h2>
                </div>
                <div className='bg-slate-200 p-[0.5px]'></div>

                <div className='h-[calc(100vh-65px)] overflow-x-hidden overflow-y-auto scrollbar'>
                    {
                        allUser.length === 0 && groups.length === 0 && (
                            <div className='mt-12'>
                                <div className='flex justify-center items-center my-4 text-slate-500'>
                                    <FiArrowUpLeft size={50} />
                                </div>
                                <p className='text-lg text-center text-slate-400'>Explore users and groups to start a conversation with.</p>
                            </div>
                        )
                    }

                    {
                        allUser.map((conv) => (
                            <NavLink to={"/" + conv.userDetails._id} key={conv._id + conv.userDetails._id} className='flex items-center gap-2 py-3 px-2 border border-transparent hover:border-primary rounded hover:bg-slate-100 cursor-pointer'>
                                <div>
                                    <Avatar
                                        imageUrl={conv.userDetails.profilePic}
                                        name={conv.userDetails.name}
                                        width={40}
                                        height={40}
                                    />
                                </div>
                                <div>
                                    <h3 className='text-ellipsis line-clamp-1 font-semibold text-base'>{conv.userDetails.name}</h3>
                                    <div className='text-slate-500 text-xs flex items-center gap-1'>
                                        <div className='flex items-center gap-1'>
                                            {
                                                conv.lastMsg?.imageUrl && (
                                                    <div className='flex items-center gap-1'>
                                                        <span><FaImage /></span>
                                                        {!conv.lastMsg?.text && <span>Image</span>}
                                                    </div>
                                                )
                                            }
                                            {
                                                conv.lastMsg?.videoUrl && (
                                                    <div className='flex items-center gap-1'>
                                                        <span><FaVideo /></span>
                                                        {!conv.lastMsg?.text && <span>Video</span>}
                                                    </div>
                                                )
                                            }
                                        </div>
                                        <p className='text-ellipsis line-clamp-1'>{conv.lastMsg?.text}</p>
                                    </div>
                                </div>
                                {
                                    Boolean(conv.unseenMsg) && (
                                        <p className='text-xs w-6 h-6 flex justify-center items-center ml-auto p-1 bg-primary text-white font-semibold rounded-full'>{conv.unseenMsg}</p>
                                    )
                                }
                            </NavLink>
                        ))
                    }

                    {groups.map((group) => (
                        <NavLink to={"/group/" + group._id} key={group._id + group.name} className='flex items-center gap-2 py-3 px-2 border border-transparent hover:border-primary rounded hover:bg-slate-100 cursor-pointer'>
                            <div>
                                <Avatar
                                    imageUrl={group.profilePic}
                                    name={group.name}
                                    width={40}
                                    height={40}
                                />
                            </div>
                            <div>
                                <h3 className='text-ellipsis line-clamp-1 font-semibold text-base'>{group.name}</h3>
                                <div className='text-slate-500 text-xs flex items-center gap-1'>
                                    <p className='text-ellipsis line-clamp-1'>{group.lastMsg?.text}</p>
                                </div>
                            </div>
                            {
                                Boolean(group.unseenMsg) && (
                                    <p className='text-xs w-6 h-6 flex justify-center items-center ml-auto p-1 bg-primary text-white font-semibold rounded-full'>{group.unseenMsg}</p>
                                )
                            }
                        </NavLink>
                    ))}
                </div>
            </div>

            {editUserOpen && (
                <EditUserDetails onClose={() => setEditUserOpen(false)} user={user} />
            )}

            {openSearchUser && (
                <SearchUser onClose={() => setOpenSearchUser(false)} />
            )}

            {addGroup && (
                <AddGroup onClose={() => setAddGroup(false)} />
            )}
        </div>
    );
};

export default Sidebar;

