import React, { useState, useCallback, useEffect } from 'react';
import ProjectHeader from './ProjectHeader';
import SimpleMDE from 'react-simplemde-editor';
import 'easymde/dist/easymde.min.css';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useSocket } from '../context/SocketContext';

const BASE_URL = "http://159.203.189.208";

const Project: React.FC = () => {
  const [markdownValue, setMarkdownValue] = useState("");
  const location = useLocation();
  const { projectName, shared_with, projectOwner } = location.state || {};
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [hasLoaded, setHasloaded] = useState<boolean>(false);
  const socket = useSocket();
  const navigate = useNavigate();

  let flag = false;

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit("leave-room", projectName);
    }
  };

  const checkAuthentication = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  };

  useEffect(() => {
    checkAuthentication();

    if (!flag) {
      console.log(`Joining room: ${projectName}`);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      let username = "x";
      if (token) {
        const decodedToken: { username: string } = jwtDecode(token);
        username = decodedToken.username;
      }
      if (socket) {
        socket.emit("join-room", { projectName, username });
      }
      flag = true;
    }

    // Add custom CSS to modify SimpleMDE behavior
    const style = document.createElement('style');
    style.textContent = `
      .CodeMirror {
        height: auto !important;
        min-height: 300px;
      }
      .CodeMirror-scroll {
        max-height: none !important;
        min-height: 300px;
      }
      .CodeMirror-sizer {
        min-height: 300px !important;
      }
      .CodeMirror pre.CodeMirror-line, .CodeMirror pre.CodeMirror-line-like {
        word-break: break-all;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [projectName]);

  const onChange = useCallback((value: string) => {
    setMarkdownValue(value);
    if (socket) {
      socket.emit("note-change", { projectName, noteData: value });
    }
  }, [projectName, socket]);

  const fetchProjectContent = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
      const decodedToken: { email: string } = jwtDecode(token);
      const userEmail = decodedToken.email;
      console.log(userEmail, projectName);
      try {
        const response = await fetch(`${BASE_URL}:3000/projects/content/${userEmail}/${projectName}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch project content');
        }
        const data = await response.json();

        if (data.success) {
          setMarkdownValue(data.content);
          setError('');
        } else {
          setError(data.message || 'Failed to load project content');
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Error fetching project content');
        }
      } finally {
        setIsLoading(false);
        setHasloaded(true);
      }
    }
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setError("No token found. Please log in again.");
      return;
    }

    setError('');

    const decodedToken: { email: string } = jwtDecode(token);
    const userEmail = decodedToken.email;

    try {
      const response = await fetch(`${BASE_URL}:3000/projects/updatecontent/${userEmail}/${projectName}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_content: markdownValue }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Project updated successfully!');
      } else {
        setError(data.message || 'Failed to update project');
      }
    } catch (error) {
      setError('An error occurred while updating the project.');
      console.error('Update Error:', error);
    }
  };

  useEffect(() => {
    if (!hasLoaded) {
      fetchProjectContent();
    }
    handleUpdate();

    if (socket) {
      socket.on("note-change", (updatedValue: string) => {
        setMarkdownValue(updatedValue);
      });

      socket.on("update-online-users", (onlineUsers) => {
        console.log("Online Users:", onlineUsers);
      });
    };

  },);

  return (
    <div className="h-screen flex flex-col">
      {isLoading && !hasLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F4EFE6]">
          <img
            src="/LoadingAnimationCS343.gif"
            alt="Loading..."
            className="max-w-full max-h-full w-auto h-auto"
            style={{ width: '100%', maxWidth: '750px', maxHeight: '750px' }}
          />
        </div>
      )}

      <ProjectHeader
        title={projectName}
        shared_with={shared_with}
        projectOwner={projectOwner}
        onLeaveRoom={handleLeaveRoom}
      />
      
      <div className="flex-1 relative p-4 bg-[#F4EFE6]">
        <div className="h-full flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="w-full lg:w-1/2 flex flex-col">
            <SimpleMDE
              value={markdownValue}
              onChange={onChange}
              className="custom-simplemde h-full"
              options={{
                autofocus: true,
                spellChecker: false,
                lineWrapping: true,
              }}
            />
          </div>

          <div className="w-full lg:w-1/2 p-4 border border-gray-300 bg-white overflow-y-auto">
            <ReactMarkdown
              components={{
                p({ children }) {
                  return <p className="mb-2 last:mb-0">{children}</p>;
                },
                h1({ children }) {
                  return <h1 className="text-bold text-2xl">{children}</h1>;
                },
                // Other markdown elements
              }}
            >
              {markdownValue}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Project;


