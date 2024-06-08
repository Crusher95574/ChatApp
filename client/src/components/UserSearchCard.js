import React from 'react';
import Avatar from './Avatar';
import { Link } from 'react-router-dom';

const UserSearchCard = ({ user, onClose, onUserSelect }) => {
    const handleClick = (e) => {
        if (onUserSelect) {
            e.preventDefault(); // Prevent the default navigation
            onUserSelect(user);
        }
    };

    return (
        <Link
            to={"/" + user?._id}
            onClick={(e) => handleClick(e)}
            className='flex items-center gap-3 p-2 lg:p-4 border border-transparent border-b-slate-200 hover:border hover:border-primary rounded cursor-pointer'
        >
            <div>
                <Avatar
                    width={50}
                    height={50}
                    name={user?.name}
                    userId={user?._id}
                    imageUrl={user?.profilePic}
                />
            </div>
            <div>
                <div className='font-semibold text-ellipsis line-clamp-1'>
                    {user?.name}
                </div>
                <p className='text-sm text-ellipsis line-clamp-1'>{user?.email}</p>
            </div>
        </Link>
    );
};

export default UserSearchCard;
