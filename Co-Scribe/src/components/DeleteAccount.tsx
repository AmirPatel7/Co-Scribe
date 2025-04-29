import { jwtDecode } from 'jwt-decode';
import React from 'react';
// import dotenv from "dotenv";

// dotenv.config();

interface DeleteAccountProps {
    onClose: () => void;
}
const BASE_URL="http://159.203.189.208"
const DeleteAccount: React.FC<DeleteAccountProps> = ({ onClose }) => {

    const handleConfirmDelete = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        if (token) {
            try {

                const decodedToken: { email: string } = jwtDecode(token);
                const userEmail = decodedToken.email

                const response = await fetch(`${BASE_URL}:3000/users/delete/${userEmail}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    onClose();
                    window.location.href = '/login';
                    sessionStorage.removeItem('token');
                    localStorage.removeItem('token');
                } else {
                    const data = await response.json();
                    console.error('Error deleting account:', data.message);
                    alert(`Failed to delete account: ${data.message}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while deleting the account.');
            }
        } else {
            alert('No authentication token found. Please log in again.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-[#F4EFE6] p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl mb-4 text-[#3A5757]">Confirm Account Deletion</h2>
                <p className="mb-4 text-[#3A5757]">Are you sure you want to delete your account? This action is irreversible.</p>
                <div className="flex justify-end space-x-4">
                    <button
                        className="bg-gray-300 text-black py-2 px-4 rounded-lg"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="bg-red-600 text-white py-2 px-4 rounded-lg"
                        onClick={handleConfirmDelete}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccount;
