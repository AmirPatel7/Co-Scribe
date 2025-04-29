import React, { useEffect, useState } from 'react';
import { FiHome, FiLogOut, FiUser, FiMenu } from 'react-icons/fi'; 
import { useNavigate } from 'react-router-dom';
import DeleteAccount from './DeleteAccount';

const Account: React.FC = () => {
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false); 
    const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [username, setUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const BASE_URL="http://159.203.189.208";
   
    const navigate = useNavigate();

    const checkAuthentication = () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) {
            navigate('/login'); // Redirect to login page if no token is found
        }
    };

    useEffect(() => {
        checkAuthentication(); // Check if user is authenticated when the component mounts
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/jpg')) {
            setProfileImage(file);
            setErrors((prev) => ({ ...prev, profileImage: '' }));
        } else {
            setProfileImage(null);
            setErrors((prev) => ({ ...prev, profileImage: 'Only JPEG, PNG, and JPG files are allowed.' }));
        }
    };

    const updateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // Prevent the default form submission

        if (newPassword !== confirmNewPassword) {
            setErrors((prev) => ({ ...prev, confirmNewPassword: "Passwords do not match" }));
            return;
        }

        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            if (!token) {
                setErrors((prev) => ({ ...prev, general: "No token found. Please log in again." }));
                return;
            }

            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const userEmail = decodedToken.email;

            // Initialize form data for the profile image
            const formData = new FormData();

            // If a profile image is selected, add it to the form data
            if (profileImage) {
                formData.append('profileImage', profileImage);
            }

            const updates: { username?: string; password?: string } = {};
            if (username) updates.username = username;
            if (newPassword) updates.password = newPassword;

            if (username) {
                updates.username = username;
            }

            if (newPassword) {
                updates.password = newPassword;
            }

            // Upload profile image if selected
            if (profileImage) {
                formData.append('email', userEmail);
                const imageResponse = await fetch(`${BASE_URL}:3000/add-image`, {
                    method: "POST",
                    body: formData,
                });

                const imageData = await imageResponse.json();
                if (imageResponse.ok) {
                    setProfileImageUrl(imageData.fileInfo.url);
                } else {
                    setErrors((prev) => ({ ...prev, general: imageData.message || "An error occurred during image upload." }));
                    return;
                }
            }
    
            const detailsResponse = await fetch(`${BASE_URL}:3000/users/${userEmail}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });

            const detailsData = await detailsResponse.json();
            if (detailsResponse.ok) {
                setErrors((prev) => ({ ...prev, general: "User details updated successfully!" }));
            } else {
                setErrors((prev) => ({ ...prev, general: detailsData.message || "Failed to update user details." }));
            }

        } catch (error) {
            setErrors((prev) => ({ ...prev, general: "An error occurred while updating the account." }));
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleDashboard = () => {
        navigate('/dashboard/all');
    };

    const handleDeleteAccount = () => {
        if (isCheckboxChecked) {
            setIsDeletePopupOpen(true);
        }
    };

    const handleCheckboxChange = () => {
        setIsCheckboxChecked(!isCheckboxChecked);
    };

    const handleCloseDeletePopup = () => {
        setIsDeletePopupOpen(false);
    };

    return (
        <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#F4EFE6]">
            <aside className="w-full md:w-1/5 bg-[#3A5757] text-[#F4EFE6] flex flex-col justify-between md:h-screen h-auto">
                <div className="hidden md:flex flex-col justify-between h-full">
                    <div>
                        <h1 className="text-3xl mb-6 bg-[#2F3E46] p-4" style={{ color: '#F4EFE6', fontFamily: 'Latin Modern Roman, serif' }}>Co-Scribe</h1>
                        <ul>
                            <li className="mb-4">
                                <ul className="ml-4">
                                    <li className="text-lg mb-2">
                                        <button className="w-full text-left"><FiUser className="inline mr-2" />Account</button>
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                    <div className="p-4 mt-auto">
                        <button className="flex items-center space-x-2 bg-[#F4EFE6] py-2 px-4 rounded text-[#2F3E46] mb-4 hover:bg-gray-400" onClick={handleDashboard}>
                            <FiHome className="text-lg" />
                            <span>Dashboard</span>
                        </button>
                        <button className="flex items-center space-x-2 bg-[#F4EFE6] py-2 px-4 rounded text-[#2F3E46] hover:bg-gray-400" onClick={handleLogout}>
                            <FiLogOut className="text-lg" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>


            <header className="md:hidden flex justify-between items-center p-4 bg-[#3A5757] text-[#F4EFE6]">
                <h1 className="text-lg" style={{ fontFamily: 'Latin Modern Roman, serif' }}>Co-Scribe</h1>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                    <FiMenu className="text-2xl" />
                </button>
                {isDropdownOpen && (
                    <div className="absolute right-4 top-16 bg-[#3A5757] text-[#F4EFE6] p-4 rounded-lg shadow-lg z-10" style={{ width: '90vw' }}>
                        <button className="flex items-center mt-4 hover:bg-gray-400" onClick={handleDashboard}>
                            <FiHome className="text-lg" />
                            Dashboard
                        </button>
                        <button className="flex items-center hover:bg-gray-400" onClick={handleLogout}>
                            <FiLogOut className="mr-2" />
                            Logout
                        </button>
                    </div>
                )}
            </header>

            {/* Main */}
            <main className="w-full md:w-4/5 bg-[#F4EFE6] text-[#2F3E46] flex-grow">
                <div className="text-3xl mb-6 bg-[#F4EFE6] text-[#2F3E46] p-9">Edit Profile</div>

                <form onSubmit={updateAccount} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start max-w-4xl mx-auto px-4 md:px-10" noValidate>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-lg mb-2" htmlFor="username">Username</label>
                            <input
                                id="username"
                                type="text"
                                className="w-full p-2 bg-[#F4EFE6] text-black rounded border-2"
                                onChange={(e) => setUsername(e.target.value)}
                                style={{ borderColor: '#2F3E46' }}
                                placeholder="Enter your username"
                                value={username}
                            />
                            {errors.username && <p className="text-red-600">{errors.username}</p>}
                        </div>

                        <div>
                            <label className="block text-lg mb-2" htmlFor="profilePicture">Profile Picture</label>
                            <input
                                id="profilePicture"
                                type="file"
                                onChange={handleImageUpload}
                                className="w-full p-2 bg-[#F4EFE6] text-black rounded border-2"
                                style={{ borderColor: '#2F3E46' }}
                            />
                            {errors.profileImage && <p className="text-red-600">{errors.profileImage}</p>}
                            {profileImageUrl && (
                                <img src={profileImageUrl} alt="Profile" className="mt-2 w-32 h-32 object-cover rounded-full" />
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-lg mb-2" htmlFor="newPassword">New Password</label>
                            <input
                                id="newPassword"
                                type="password"
                                className="w-full p-2 bg-[#F4EFE6] text-black rounded border-2"
                                onChange={(e) => setNewPassword(e.target.value)}
                                style={{ borderColor: '#2F3E46' }}
                                placeholder="Enter a new password"
                                value={newPassword}
                            />
                            {errors.newPassword && <p className="text-red-600">{errors.newPassword}</p>}
                        </div>

                        <div>
                            <label className="block text-lg mb-2" htmlFor="confirmNewPassword">Confirm New Password</label>
                            <input
                                id="confirmNewPassword"
                                type="password"
                                className="w-full p-2 bg-[#F4EFE6] text-black rounded border-2"
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                style={{ borderColor: '#2F3E46' }}
                                placeholder="Confirm your new password"
                                value={confirmNewPassword}
                            />
                            {errors.confirmNewPassword && <p className="text-red-600">{errors.confirmNewPassword}</p>}
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 text-center mt-6">
                        <button type="submit" className="bg-[#2F3E46] text-white py-2 px-4 rounded-lg hover:bg-gray-400">Save Changes</button>
                        {errors.general && <p className="text-red-600 mt-4">{errors.general}</p>}
                    </div>
                </form>

                <div className="text-3xl mb-6 bg-[#F4EFE6] text-[#2F3E46] p-9">Delete Account</div>
                <div className="max-w-4xl mx-auto px-4 md:px-10">
                    <p className="text-lg mb-4">
                        Deleting your account will permanently remove all your data, including shared projects owned by you. This action cannot be undone. Please check the box below to confirm that you understand the consequences of deleting your account.
                    </p>

                    <div className="mb-4">
                        <label className="flex items-center">
                            <input type="checkbox" checked={isCheckboxChecked} onChange={handleCheckboxChange} className="mr-2"/>
                            I understand that deleting my account will remove all data permanently.
                        </label>
                    </div>

                    <button className={`bg-red-600 text-[#F4EFE6] py-2 px-4 rounded-lg ${!isCheckboxChecked ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-400'}`} 
                            disabled={!isCheckboxChecked} onClick={handleDeleteAccount}>
                        Delete Account
                    </button>
                </div>

            </main>

            {isDeletePopupOpen && <DeleteAccount onClose={handleCloseDeletePopup} />}
        </div>
    );
};

export default Account;







