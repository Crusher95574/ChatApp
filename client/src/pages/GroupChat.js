import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Avatar from '../components/Avatar';
import { FaAngleLeft, FaPlus, FaImage, FaVideo } from "react-icons/fa6";
import { IoClose } from 'react-icons/io5';
import { IoMdSend } from 'react-icons/io';
import moment from 'moment';
import uploadFile from '../helpers/uploadFile';
import backgroundImage from '../assets/wallpaper.jpg';
import Loading from '../components/Loading';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const GroupChat = () => {
    const { groupId } = useParams();
    const socket = useSocket();
    const user = useSelector(state => state.user);
    const [message, setMessage] = useState({
        text: "",
        imageUrl: "",
        videoUrl: ""
    });
    const [group, setGroupMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const currentMessage = useRef(null);
    const [openImageVideoUpload, setOpenImageVideoUpload] = useState(false);
    const [addUserOpen, setAddUserOpen] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (currentMessage.current) {
            currentMessage.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [group?.messages]);

    const getUserById = (userId) => {
        return group.members.find(member => member._id === userId);
    };


    useEffect(() => {
        const handleGroupDetails = (data) => {
            setGroupMessage(data);
        };

        const handleGroupMessage = (data) => {
            setGroupMessage(prevGroup => ({
                ...prevGroup,
                messages: [...prevGroup.messages, data]
            }));
        };

        const handleLeftGroup = ({ groupId }) => {
            navigate('/'); // Redirect to home page after leaving the group
        };

        const handleGroupUpdated = (updatedGroup) => {
            setGroupMessage(updatedGroup);
        };

        if (socket) {
            socket.emit('join-group', groupId);
            socket.emit('group-page', groupId);

            socket.on('group-details', handleGroupDetails);
            socket.on('group-message', handleGroupMessage);
            socket.on('left-group', handleLeftGroup);
            socket.on('group-updated', handleGroupUpdated);


            socket.emit('seen-group', { groupId, userId: user._id });

            return () => {
                socket.emit('leave-group', groupId);
                socket.off('group-details', handleGroupDetails);
                socket.off('group-message', handleGroupMessage);
                socket.off('left-group', handleLeftGroup);
                socket.off('group-updated', handleGroupUpdated);
            };
        }
    }, [socket, groupId, user._id, navigate]);

    useEffect(() => {
        const fetchAllUsers = async () => {
            const URL = `${process.env.REACT_APP_BACKEND_URL}/api/users`;
            try {
                const response = await axios.get(URL);
                setUsers(response.data.data);
            } catch (error) {
                toast.error(error?.response?.data?.message || 'Error fetching users');
            }
        };
        fetchAllUsers();
    }, []);

    const randomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    const handleUploadImageVideoOpen = () => {
        setOpenImageVideoUpload(prev => !prev);
    };

    const handleUploadImage = async (e) => {
        const file = e.target.files[0];
        setLoading(true);
        const uploadPhoto = await uploadFile(file);
        setLoading(false);
        setOpenImageVideoUpload(false);
        setMessage(prev => ({ ...prev, imageUrl: uploadPhoto.url }));
    };

    const handleClearUploadImage = () => {
        setMessage(prev => ({ ...prev, imageUrl: "" }));
    };

    const handleUploadVideo = async (e) => {
        const file = e.target.files[0];
        setLoading(true);
        const uploadPhoto = await uploadFile(file);
        setLoading(false);
        setOpenImageVideoUpload(false);
        setMessage(prev => ({ ...prev, videoUrl: uploadPhoto.url }));
    };

    const handleClearUploadVideo = () => {
        setMessage(prev => ({ ...prev, videoUrl: "" }));
    };

    const handleOnChange = (e) => {
        const { value } = e.target;
        setMessage(prev => ({ ...prev, text: value }));
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.text || message.imageUrl || message.videoUrl) {
            if (socket) {
                socket.emit('new group message', {
                    sender: user._id,
                    groupId,
                    text: message.text,
                    imageUrl: message.imageUrl,
                    videoUrl: message.videoUrl,
                });
                setMessage({
                    text: "",
                    imageUrl: "",
                    videoUrl: ""
                });
            }
        }
    };

    const handleAddUserOpen = () => {
        setAddUserOpen(prev => !prev);
    };

    const handleSelectUser = (userId) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(prev => prev.filter(id => id !== userId));
        } else {
            setSelectedUsers(prev => [...prev, userId]);
        }
    };

    const handleAddUsers = () => {
        if (selectedUsers.length > 0) {
            socket.emit('add-users-to-group', {
                groupId,
                userIds: selectedUsers
            });
            setAddUserOpen(false);
            setSelectedUsers([]);
        }
    };

    const handleLeaveGroup = () => {
        if (socket) {
            socket.emit('user-leave-group', { groupId, userId: user._id });
        }
    };

    return (
        <div style={{ backgroundImage: `url(${backgroundImage})` }} className='bg-no-repeat bg-cover'>
            <header className='sticky top-0 h-16 bg-white flex justify-between items-center px-4'>
                <div className='flex items-center gap-4'>
                    <Link to={"/"} className='lg:hidden'>
                        <FaAngleLeft size={25} />
                    </Link>
                    <div>
                        <Avatar
                            width={50}
                            height={50}
                            imageUrl={group?.profilePic}
                            name={group?.name}
                            userId={group?._id}
                        />
                    </div>
                    <div>
                        <h3 className='font-semibold text-lg my-0 text-ellipsis line-clamp-1'>{group?.name}</h3>
                        <p className='-my-2 text-sm text-slate-400'>Group Chat</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleAddUserOpen} className='flex justify-center items-center w-11 h-11 rounded-full hover:bg-primary hover:text-white'>
                        <FaPlus size={20} />
                    </button>
                    <button onClick={handleLeaveGroup} className="flex justify-center items-center w-11 h-11 rounded-full hover:bg-primary hover:text-white">
                        Leave
                    </button>
                </div>
            </header>

            <section className='h-[calc(100vh-128px)] overflow-x-hidden overflow-y-scroll scrollbar relative bg-slate-200 bg-opacity-50'>
                <div className='flex flex-col gap-2 py-2 mx-2' ref={currentMessage}>
                    {group?.messages?.map((msg, index) => {
                        //   console.log('Message ID:', msg._id); // Debugging line
                        return (
                            <div key={msg._id} className={`p-1 py-1 rounded w-fit max-w-[280px] md:max-w-sm lg:max-w-md ${user._id === msg?.msgByUserId ? "ml-auto bg-teal-100" : "bg-white"}`}>
                                <div className='w-full relative'>
                                    <div className='px-2'>
                                        <span style={{ fontWeight: 'bold', color: randomColor() }}>
                                            {getUserById(msg.msgByUserId)?.name}
                                        </span>
                                    </div>
                                    <div className='px-2'>
                                        {msg.text}
                                    </div>
                                </div>
                                <div className='w-full relative'>
                                    {msg?.imageUrl && (<img src={msg?.imageUrl} className='w-full h-full object-scale-down' />)}
                                    {msg?.videoUrl && (<video src={msg.videoUrl} className='w-full h-full object-scale-down' controls />)}
                                </div>
                                <div className='w-full relative'>
                                    <p className='text-xs ml-auto w-fit'>{moment(msg.createdAt).format('hh:mm')}</p>
                                </div>
                            </div>
                        );
                    })}

                </div>

                {message.imageUrl && (
                    <div className='w-full h-full sticky bottom-0 bg-slate-700 bg-opacity-30 flex justify-center items-center rounded overflow-hidden'>
                        <div className='w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600' onClick={handleClearUploadImage}>
                            <IoClose size={30} />
                        </div>
                        <div className='bg-white p-3'>
                            <img src={message.imageUrl} alt='uploadImage' className='aspect-square w-full h-full max-w-sm m-2 object-scale-down' />
                        </div>
                    </div>
                )}
                {message.videoUrl && (
                    <div className='w-full h-full sticky bottom-0 bg-slate-700 bg-opacity-30 flex justify-center items-center rounded overflow-hidden'>
                        <div className='w-fit p-2 absolute top-0 right-0 cursor-pointer hover:text-red-600' onClick={handleClearUploadVideo}>
                            <IoClose size={30} />
                        </div>
                        <div className='bg-white p-3'>
                            <video src={message.videoUrl} className='aspect-square w-full h-full max-w-sm m-2 object-scale-down' controls muted autoPlay />
                        </div>
                    </div>
                )}

                {loading && (
                    <div className='w-full h-full flex sticky bottom-0 justify-center items-center'>
                        <Loading />
                    </div>
                )}
            </section>

            <section className='h-16 bg-white flex items-center px-4'>
                <div className='relative '>
                    <button onClick={handleUploadImageVideoOpen} className='flex justify-center items-center w-11 h-11 rounded-full hover:bg-primary hover:text-white'>
                        <FaPlus size={20} />
                    </button>

                    {openImageVideoUpload && (
                        <div className='bg-white shadow rounded absolute bottom-14 w-36 p-2'>
                            <form>
                                <label htmlFor='uploadImage' className='flex items-center p-2 px-3 gap-3 hover:bg-slate-200 cursor-pointer'>
                                    <div className='text-primary'>
                                        <FaImage size={18} />
                                    </div>
                                    <p>Image</p>
                                </label>
                                <label htmlFor='uploadVideo' className='flex items-center p-2 px-3 gap-3 hover:bg-slate-200 cursor-pointer'>
                                    <div className='text-purple-500'>
                                        <FaVideo size={18} />
                                    </div>
                                    <p>Video</p>
                                </label>

                                <input
                                    type='file'
                                    id='uploadImage'
                                    onChange={handleUploadImage}
                                    className='hidden'
                                />

                                <input
                                    type='file'
                                    id='uploadVideo'
                                    onChange={handleUploadVideo}
                                    className='hidden'
                                />
                            </form>
                        </div>
                    )}
                </div>

                <form className='h-full w-full flex gap-2' onSubmit={handleSendMessage}>
                    <input
                        type='text'
                        placeholder='Type your message...'
                        className='py-1 px-4 outline-none w-full h-full'
                        value={message.text}
                        onChange={handleOnChange}
                    />
                    <button className='text-primary hover:text-secondary'>
                        <IoMdSend size={28} />
                    </button>
                </form>
            </section>
            {addUserOpen && (
                <div className='fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center'>
                    <div className='bg-white p-4 rounded'>
                        <h2 className='text-lg mb-4'>Add Users to Group</h2>
                        <select
                            value={selectedUsers}
                            onChange={(e) => {
                                const selectedOption = e.target.value;
                                if (selectedUsers.includes(selectedOption)) {
                                    // Deselect if already selected
                                    setSelectedUsers(selectedUsers.filter(user => user !== selectedOption));
                                } else {
                                    // Select if not already selected
                                    setSelectedUsers([...selectedUsers, selectedOption]);
                                }
                            }}
                            className='p-2 border rounded w-full mb-4'
                            multiple
                        >
                            {/* Render options for all users */}
                            {users.map(user => (
                                <option key={user._id} value={user._id}>{user.name}</option>
                            ))}
                        </select>
                        <button onClick={handleAddUsers} className='bg-blue-500 text-white py-2 px-4 rounded mr-2'>Add</button>
                        <button onClick={() => setAddUserOpen(false)} className='bg-gray-500 text-white py-2 px-4 rounded'>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupChat;
