import React, { useEffect, useState } from 'react';
import { FiHome } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

interface User {
  username: string;
  avatar_url: string;
}

interface HeaderProps {
  title: string;
  shared_with: string[];
  projectOwner: string;
  onLeaveRoom: () => void; // New prop for leaving the room
}

const ProjectHeader: React.FC<HeaderProps> = ({ title, shared_with, projectOwner, onLeaveRoom }) => {
  const BASE_URL = "http://159.203.189.208";

  const [users, setUsers] = useState<User[]>([]);
  const [ownUser, setOwnUser] = useState<User | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socket = useSocket();

  const navigate = useNavigate()

  const handleDashboard = () => {
    onLeaveRoom(); // Call the leave room function
    navigate('/dashboard/all');
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return

      try {

        const response = await fetch(`${BASE_URL}:3000/users/${projectOwner}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.user) {
          const { username, avatar_url } = data.user;
          setOwnUser({ username, avatar_url });
        }

        const fetchedUsers: User[] = await Promise.all(
          shared_with.map(async (email) => {
            const response = await fetch(`${BASE_URL}:3000/users/${email}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });

            const data = await response.json();
            if (response.ok && data.user) {
              const { username, avatar_url } = data.user;
              return { username, avatar_url };
            } else {
              console.error(`Failed to fetch user details for email: ${email}`);
              return { username: 'Unknown User', avatar_url: null };
            }
          })
        );

        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };

    if (shared_with && shared_with.length > 0) {
      fetchUsers();
    }

    if (socket) {
      socket.on("update-online-users", (onlineUsersList) => {
        setOnlineUsers(onlineUsersList.map((user: any) => user.username));
      });
      
      return () => {
        socket.off("update-online-users");
      };
    }

  }, [projectOwner, shared_with, socket]);

  return (
    <header className="bg-[#2F3E46] text-[#F4EFE6] p-3 shadow-md">
    <div className="container flex flex-col md:flex-row justify-between items-center">
      {/* Home Button - This will be centered below the title on smaller devices */}
      <button
        className="flex items-center bg-[#F4EFE6] py-2 px-4 rounded text-[#2F3E46] md:ml-3"
        onClick={handleDashboard}
        style={{ position: 'relative', top: '5px' }}
      >
        <FiHome size={25} className="mr-1" />
        <span>Dashboard</span>
      </button>
  
      {/* Center Section: Title */}
      <div className="text-center text-3xl flex-1 md:ml-80 mt-4 md:mt-0" style={{ color: '#F4EFE6', fontFamily: 'Latin Modern Roman, serif' }}>
        <span>{title}</span> {/* Title passed as a prop */}
      </div>
  
      {/* Profile Images and Usernames */}
      <div className="flex items-center space-x-6 mt-4 md:mt-0">
        {ownUser && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#2F3E46]">
              <img
                src={ownUser.avatar_url}
                alt={ownUser.username}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="mt-2 text-bold text-[#F4EFE6]">{ownUser.username}</p>
            <p className="mt-2 text-sm text-[#F4EFE6]">{onlineUsers.includes(ownUser.username) ? "Online" : "Offline"}</p>
          </div>
        )}
  
        {users.length > 0 && users.map((user, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#2F3E46]">
              <img
                src={user.avatar_url}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="mt-2 text-bold text-[#F4EFE6]">{user.username}</p>
            <p className="mt-2 text-sm text-[#F4EFE6]">{onlineUsers.includes(user.username) ? "Online" : "Offline"}</p>
          </div>
        ))}
      </div>
    </div>
  </header>
  
  );

};

export default ProjectHeader;