import React, { useEffect, useState } from 'react';
import { FiLogOut, FiSearch, FiUser, FiMenu, FiFileText, FiTrash2, FiFolder, FiChevronDown, FiChevronUp, FiUsers } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import ProjectTable from './ProjectTable';
import Categories from './Categories';
import Categorize from './Categorize';
import NewNote from './NewNote';
import Delete from './Delete';
import Share from './Share';
import ProfileImage from './ProfileImage'
import { jwtDecode } from 'jwt-decode';
import { useSocket } from '../context/SocketContext';

interface Project {
    project_name: string;
    last_modified: string;
    owner: string;
    category: string;
    username: string;
    is_trashed: boolean;
    shared_with: string[];
}

const Dashboard: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [isCategorizePopupOpen, setIsCategorizePopupOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<{ owner: string; projectName: string } | null>(null);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNewNotePopupOpen, setIsNewNotePopupOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState<'project_name' | 'last_modified'>('project_name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isShareOpen, setShareOpen] = useState(false);
    const [shareProject, setShareProject] = useState<Project | null>(null);
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const BASE_URL = "http://159.203.189.208";
    const navigate = useNavigate();

    const checkAuthentication = () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            navigate('/login'); // Redirect to login if no token exists
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleAccount = () => {
        navigate('/account');
    };

    const fetchUserDetails = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            const decodedToken: { email: string } = jwtDecode(token);
            const userEmail = decodedToken.email;
            setUserEmail(userEmail);

            try {
                const response = await fetch(`${BASE_URL}:3000/users/${userEmail}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();
                if (response.ok && data.user.avatar_url) {
                    setProfileImageUrl(data.user.avatar_url);
                    localStorage.setItem('profileImageUrl', data.user.avatar_url);
                } else {
                    console.error('Failed to fetch user details:', data.message);
                }
            } catch (error) {
                console.error('Error fetching user details:', error);
            }
        }
    };

    const fetchProjects = async () => {
        setIsLoading(true);
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            const decodedToken: { email: string } = jwtDecode(token);
            const userEmail = decodedToken.email;
            setUserEmail(userEmail);

            try {
                const response = await fetch(`${BASE_URL}:3000/projects/all/${userEmail}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const { projects } = await response.json();
                setProjects(projects);

                const uniqueCategories: string[] = Array.from(
                    new Set(
                        projects
                            .filter((project: Project) => project.category)
                            .map((project: Project) => project.category!)
                    )
                ) as string[];

                setCategories(uniqueCategories);

            } catch (error) {
                console.error('Error fetching projects:', error);
            } finally {
                setIsLoading(false);
                setHasLoadedOnce(true);
            }
        }
    };

    const fetchCategoryProjects = async (category: string) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token && userEmail) {
            try {
                const response = await fetch(`${BASE_URL}:3000/projects/category/all/${userEmail}?category=${category}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const projects = await response.json();
                setProjects(projects);
            } catch (error) {
                console.error('Error fetching category projects:', error);
            }
        }
    };

    const fetchTrashedProjects = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token && userEmail) {
            try {
                const response = await fetch(`${BASE_URL}:3000/projects/trashed/${userEmail}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();
                if (data.projects && Array.isArray(data.projects)) {
                    setProjects(data.projects);
                } else {
                    console.error('Unexpected response format', data);
                }
            } catch (error) {
                console.error('Error fetching your projects:', error);
            }
        }
    };

    const fetchYourProjects = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token && userEmail) {
            try {
                const response = await fetch(`${BASE_URL}:3000/projects/your/${userEmail}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();
                if (data.projects && Array.isArray(data.projects)) {
                    setProjects(data.projects);
                } else {
                    console.error('Unexpected response format', data);
                }
            } catch (error) {
                console.error('Error fetching your projects:', error);
            }
        }
    };

    const fetchSharedNotes = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        if (token && userEmail) {
            try {
                const response = await fetch(`${BASE_URL}:3000/project/shared/${userEmail}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const projects = await response.json();
                setProjects(projects);
            } catch (error) {
                console.error('Error fetching shared projects', error);
            }
        }
    };

    useEffect(() => {
        fetchUserDetails();
        fetchProjects();
        checkAuthentication();

        const savedProfileImageUrl = localStorage.getItem('profileImageUrl');
        if (savedProfileImageUrl) {
            setProfileImageUrl(savedProfileImageUrl);
        } else {
            console.log('No profile image found in localStorage');
        }
    }, []);

    const socket = useSocket();

    useEffect(() => {
        // Set up listener for notifications
        if (!socket) return;
        socket.on("notification", (data) => {
          if (data.email === userEmail) { // Only show notifications for the current user
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                new Notification("Project Shared", {
                  body: data.message,
                });
              }
            });
          }
        });
    
        // Cleanup the listener on component unmount
        return () => {
          socket.off("notification");
        };
      }, [socket, userEmail]);
      
    const handleSortToggle = (field: 'project_name' | 'last_modified') => {
        if (sortField === field) {
            setSortOrder(prevOrder => (prevOrder === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const handleOpenCategorize = (projectName: string, owner: string) => {
        setSelectedProject({ owner, projectName });
        setIsCategorizePopupOpen(true);
    };

    const handleCloseCategorize = () => {
        setIsCategorizePopupOpen(false);
        setSelectedProject(null);
    };

    const handleCategoryAdded = () => {
        fetchProjects();
    };

    const handleOpenNewNote = () => {
        setIsNewNotePopupOpen(true);
    };

    const handleCloseNewNote = () => {
        setIsNewNotePopupOpen(false);
    };

    const handleProjectAdded = () => {
        fetchProjects();
    };

    const handleOpenDeletePopup = (project: Project) => {
        setProjectToDelete(project);
        setIsDeletePopupOpen(true);
    };

    const handleCloseDeletePopup = () => {
        setIsDeletePopupOpen(false);
        setProjectToDelete(null);
    };

    const handleAllNotes = () => {
        fetchProjects();
    };

    const handleYourNotes = () => {
        fetchYourProjects();
    };

    const handleSharedNotes = () => {
        fetchSharedNotes();
    };

    const handleTrashedNotes = () => {
        fetchTrashedProjects();
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleDeleteProject = async () => {
        if (projectToDelete) {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            try {
                console.log(`Attempting to mark project: ${projectToDelete.project_name} by owner: ${projectToDelete.owner} as trashed`);

                const response = await fetch(`${BASE_URL}:3000/projects/${projectToDelete.owner}/${projectToDelete.project_name}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ is_trashed: true })
                });

                const data = await response.json();
                if (response.ok) {
                    console.log('Project moved to trash successfully:', data);
                    handleCloseDeletePopup();
                    fetchProjects();
                } else {
                    console.error('Failed to move project to trash:', data.message);
                    alert(`Failed to move project to trash: ${data.message}`);
                }
            } catch (error) {
                console.error('Error moving project to trash:', error);
                alert('An error occurred while moving the project to trash.');
            }
        }
    };

    const handlePermanentDelete = async (project: Project) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${BASE_URL}:3000/projects/${project.owner}/${project.project_name}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (response.ok) {
                console.log('Project permanently deleted:', data);
                fetchProjects();
            } else {
                console.error('Failed to permanently delete project:', data.message);
                alert(`Failed to delete project: ${data.message}`);
            }
        } catch (error) {
            console.error('Error permanently deleting project:', error);
            alert('An error occurred while deleting the project.');
        }
    };

    const handleRestoreProject = async (project: Project) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${BASE_URL}:3000/projects/${project.owner}/${project.project_name}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ is_trashed: false })
            });

            const data = await response.json();
            if (response.ok) {
                console.log('Project restored successfully:', data);
                fetchProjects();
            } else {
                console.error('Failed to restore project:', data.message);
                alert(`Failed to restore project: ${data.message}`);
            }
        } catch (error) {
            console.error('Error restoring project:', error);
            alert('An error occurred while restoring the project.');
        }
    };

    const handleShare = (project: Project) => {
        setShareProject(project);
        setShareOpen(true);
    };

    const handleCloseShare = () => {
        setShareOpen(false);
        setShareProject(null);
    };

    const handleShareSubmit = async (email: string) => {
        if (shareProject) {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) return;

            try {
                const response = await fetch(`${BASE_URL}:3000/projects/${shareProject.owner}/${shareProject.project_name}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ shared_with: [email] }),
                });

                const data = await response.json();
                if (response.ok) {
                    console.log(`Project '${shareProject.project_name}' shared with ${email}:`, data);

                    const response2 = await fetch(`${BASE_URL}:3000/shared-with-email`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({email: email}),
                    });

                    if(response2.ok) {
                        console.log(`Email sent to ${email}:`)
                    }

                    fetchProjects();
                } else {
                    console.error('Failed to share project:', data.message);
                    alert(`Failed to share project: ${data.message}`);
                }
            } catch (error) {
                console.error('Error sharing project:', error);
                alert('An error occurred while sharing the project.');
            }
        }

        setShareOpen(false);
    };

    return (
        <div className="h-screen w-full flex flex-col md:flex-row">
            {/* Loading Screen */}
            {isLoading && !hasLoadedOnce && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F4EFE6]">
                    <img
                        src="/LoadingAnimationCS343.gif"
                        alt="Loading..."
                        className="max-w-full max-h-full w-auto h-auto"
                        style={{ width: '100%', maxWidth: '750px', maxHeight: '750px' }}
                    />
                </div>
            )}

            {/* Sidebar for desktop */}
            <aside className="w-full md:w-1/5 bg-[#3A5757] text-[#F4EFE6] flex flex-col justify-between h-screen hidden md:flex">
                <div>
                    <h1 className="text-2xl mb-6 bg-[#2F3E46] p-4" style={{ color: '#F4EFE6', fontFamily: 'Latin Modern Roman, serif' }}>Co-Scribe</h1>
                    <div className="mb-6 p-4">
                        <button className="bg-[#F4EFE6] w-full text-center text-lg font-semibold py-2 px-4 rounded-lg text-[#2F3E46] hover:bg-gray-400" onClick={handleOpenNewNote}>
                            New Note
                        </button>
                        {isNewNotePopupOpen && <NewNote onClose={handleCloseNewNote} onProjectAdded={handleProjectAdded} />}
                    </div>
                    <ul>
                        <li className="mb-4">
                            <ul className="ml-4">
                                <li className="text-lg mb-2">
                                    <button className="w-full text-left hover:bg-gray-400" onClick={handleAllNotes}>All Notes</button>
                                </li>
                                <li className="text-lg mb-2">
                                    <button className="w-full text-left hover:bg-gray-400" onClick={handleYourNotes}>Your Notes</button>
                                </li>
                                <li className="text-lg mb-2">
                                    <button className="w-full text-left hover:bg-gray-400" onClick={handleSharedNotes}>Shared Notes</button>
                                </li>
                                <li className="text-lg mb-2">
                                    <button className="w-full text-left hover:bg-gray-400" onClick={handleTrashedNotes}>Trashed Notes</button>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </div>
                <div className="p-4 flex flex-col space-y-2 w-full">
                    <button className="flex items-center justify-center bg-[#F4EFE6] py-1 px-2 text-[10px] rounded text-[#2F3E46] w-full sm:w-auto sm:text-xs md:text-sm md:px-4 hover:bg-gray-400" onClick={handleAccount}>
                        <FiUser className="text-[12px] sm:text-base mr-2" />
                        <span>Account</span>
                    </button>
                    <button className="flex items-center justify-center bg-[#F4EFE6] py-1 px-2 text-[10px] rounded text-[#2F3E46] w-full sm:w-auto sm:text-xs md:text-sm md:px-4 hover:bg-gray-400" onClick={handleLogout}>
                        <FiLogOut className="text-[12px] sm:text-base mr-2" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Header for mobile */}
<header className="md:hidden flex justify-between items-center p-4 bg-[#3A5757] text-[#F4EFE6]">
    <h1 className="text-lg" style={{ fontFamily: 'Latin Modern Roman, serif' }}>Co-Scribe</h1>
    <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
        <FiMenu className="text-2xl" />
    </button>
    {isDropdownOpen && (
        <div className="absolute right-4 top-16 bg-[#3A5757] text-[#F4EFE6] p-4 rounded-lg shadow-lg z-10" style={{ width: '90vw' }}>
            <button className="flex items-center mb-2 hover:bg-gray-400" onClick={handleOpenNewNote}>
                <FiFileText className="mr-2" />
                New Note
            </button>
            {/* Display New Note Popup if open */}
            {isNewNotePopupOpen && <NewNote onClose={handleCloseNewNote} onProjectAdded={handleProjectAdded} />}

            <button className="flex items-center mb-2 hover:bg-gray-400" onClick={handleAllNotes}>
                <FiFileText className="mr-2" />
                All Notes
            </button>
            <button className="flex items-center mb-2 hover:bg-gray-400" onClick={handleYourNotes}>
                <FiFolder className="mr-2" />
                Your Notes
            </button>
            <button className="flex items-center mb-2 hover:bg-gray-400" onClick={handleSharedNotes}>
                <FiUsers className="mr-2" />
                Shared with you
            </button>
            <button className="flex items-center mb-2 hover:bg-gray-400" onClick={handleTrashedNotes}>
                <FiTrash2 className="mr-2" />
                Trashed Notes
            </button>
            <button className="flex items-center mt-4 hover:bg-gray-400" onClick={handleAccount}>
                <FiUser className="mr-2" />
                Account
            </button>
            <button className="flex items-center hover:bg-gray-400" onClick={handleLogout}>
                <FiLogOut className="mr-2" />
                Logout
            </button>
        </div>
    )}
</header>

            {/* Main content area */}
            <main className="flex-grow bg-[#F4EFE6] text-[#2F3E46] relative">
                <div className="text-3xl mb-6 bg-[#F4EFE6] text-[#2F3E46] p-4">All Notes</div>

                <div className="relative mt-4 mb-6 ml-10 mr-10">
                    <input
                        type="text"
                        placeholder="Search in all projects..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full p-2 bg-[#F4EFE6] text-black rounded border-2 pl-10"
                        style={{ borderColor: '#2F3E46' }}
                    />
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#2F3E46] h-5 w-5" />
                </div>

                {/* Sorting buttons */}
                <div className="flex space-x-4 ml-10">
                    <button
                        onClick={() => handleSortToggle('project_name')}
                        className="flex items-center space-x-2 hover:bg-gray-300"
                    >
                        <span>Sort by Name</span>
                        {sortField === 'project_name' && (sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                    </button>
                    <button
                        onClick={() => handleSortToggle('last_modified')}
                        className="flex items-center space-x-2 hover:bg-gray-300"
                    >
                        <span>Sort by Date</span>
                        {sortField === 'last_modified' && (sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                    </button>
                </div>

                {/* Categories folders -> sends into to categories*/}
                <Categories categories={categories} onCategoryClick={fetchCategoryProjects} />

                {/* Categorize popup */}
                {isCategorizePopupOpen && selectedProject && (
                    <Categorize
                        categories={categories}
                        onClose={handleCloseCategorize}
                        projectName={selectedProject.projectName}
                        owner={selectedProject.owner}
                        onAddCategory={handleCategoryAdded}
                    />
                )}

                {/* Delete Popup */}
                {isDeletePopupOpen && projectToDelete && (
                    <Delete
                        projectName={projectToDelete.project_name}
                        onClose={handleCloseDeletePopup}
                        onDelete={handleDeleteProject}
                    />
                )}

                {/* Share Popup */}
                {isShareOpen && shareProject && (
                    <Share
                        isOpen={isShareOpen}
                        onClose={handleCloseShare}
                        onSubmit={handleShareSubmit}
                        sharedWith={shareProject.shared_with || []}
                    />
                )}

                {/* Project table */}
                <ProjectTable
                    onOpenCategorize={handleOpenCategorize}
                    projects={projects}
                    onDelete={handleOpenDeletePopup}
                    onRestore={handleRestoreProject}
                    onPermanentDelete={handlePermanentDelete}
                    loggedInUser={userEmail!}
                    searchTerm={searchTerm}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onShare={handleShare}
                />

                {/* Profile Image */}
                {profileImageUrl && (
                    <ProfileImage profileImageUrl={profileImageUrl} />
                )}
                
            </main>
        </div>
    );
};

export default Dashboard;