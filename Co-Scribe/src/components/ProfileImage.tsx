import { useState } from "react";

const ProfileImage = ({ profileImageUrl }: { profileImageUrl: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleImageClick = () => {
        setIsOpen(true);
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <>
            {/* Profile Image */}
            {profileImageUrl && (
                <div className="absolute top-4 right-10">
                    <img
                        src={profileImageUrl}
                        alt="Profile"
                        className="w-12 h-12 rounded-full border border-[#2F3E46] cursor-pointer"
                        style={{
                            objectFit: 'cover',
                            objectPosition: 'center',
                            display: 'block',
                        }}
                        onClick={handleImageClick}
                    />
                </div>
            )}

            {/* Popup */}
            {isOpen && (
                <div
                    className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50"
                    onClick={handleClose}
                >
                    <div className="relative">
                        
                        <img
                            src={profileImageUrl}
                            alt="Profile Enlarged"
                            className="w-auto h-auto max-w-lg max-h-screen rounded-lg"
                            style={{
                                objectFit: 'cover',
                                objectPosition: 'center',
                            }}
                        />

                        <button
                            className="absolute top-2 right-2 bg-white text-black rounded-full p-2 cursor-pointer"
                            onClick={handleClose}
                        >
                            &times;
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProfileImage;