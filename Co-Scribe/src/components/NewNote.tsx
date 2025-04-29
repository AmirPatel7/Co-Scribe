import React, { useState } from 'react';
import { jwtDecode } from 'jwt-decode';
// import dotenv from "dotenv";

// dotenv.config();
const BASE_URL="http://159.203.189.208"
interface NewNoteProps {
    onClose: () => void; /* Function to close the popup from Dashboard*/
    onProjectAdded: () => void;
}

const NewNote: React.FC<NewNoteProps> = ({ onClose, onProjectAdded }) => {
    const [noteName, setNoteName] = useState(''); /* State to store the note name entered by the user */
    const [errorMessage, setErrorMessage] = useState('');

    /* Create note */
    const handleCreate = async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');;

        if (token) {
            const decodedToken: { email: string } = jwtDecode(token);
            const userEmail = decodedToken.email;

            if (!noteName.trim()) {
                setErrorMessage('Invalid note name');
                return;
            } else {
                setErrorMessage('');
            }

            try {

                const response = await fetch(`${BASE_URL}:3000/projects/add`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`, /* Add authorization header */
                    },
                    body: JSON.stringify({
                        owner: userEmail,
                        project_name: noteName,
                        shared_with: null,
                        category: null,
                        is_trashed: false,
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    console.log('Project created successfully:', data);
                    onProjectAdded(); /* Trigger the callback after successful creation */
                    onClose(); /* Close the popup */
                } else {
                    alert(`Failed to create project: ${data.message}`);
                }
            } catch (error) {
                console.error('Error creating project:', error);
                alert('An error occurred while creating the project.');
            }
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
            <div className="relative bg-[#F4EFE6] p-6 rounded-lg shadow-lg">

                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-[#2F3E46] hover:text-black focus:outline-none"
                >
                    &times;
                </button>

                <h2 className="text-lg mb-4 text-[#2F3E46]">Create a New Note</h2>

                {errorMessage && (
                    <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
                        {errorMessage}
                    </div>
                )}

                <div className="mb-4">
                    <input
                        id="noteName"
                        type="text"
                        value={noteName}
                        onChange={(e) => setNoteName(e.target.value)}
                        placeholder="Enter note name"
                        className="w-full p-2 bg-[#F4EFE6] text-black rounded border-2 pl-3"
                        style={{ borderColor: '#2F3E46' }}
                    />
                </div>

                <button
                    className="w-full py-3 mt-4 rounded-lg font-bold transition-colors duration-300"
                    style={{ backgroundColor: '#354F52', color: '#F4EFE6' }}
                    onClick={handleCreate}
                    onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor = "#686867")
                    }
                    onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = "#354F52")
                    }
                >
                    Create
                </button>
            </div>
        </div>
    );
};

export default NewNote;