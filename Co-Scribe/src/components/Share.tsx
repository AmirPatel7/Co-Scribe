import React, { useState } from 'react';

type ShareProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string) => void;
  sharedWith: string[];
};

const Share: React.FC<ShareProps> = ({ isOpen, onClose, onSubmit, sharedWith }) => {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = () => {
    if (!validateEmail(email)) {
      setErrorMessage('Invalid Email address');
    } else {
      setErrorMessage(''); 
      onSubmit(email);
      onClose(); 
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-[#F4EFE6] p-6 rounded-lg w-[300px] shadow-md relative text-center">
        <span className="absolute top-2 right-2 text-gray-700 cursor-pointer text-xl" onClick={onClose}>&times;</span>
        <h2 className="text-xl mb-4 font-semibold text-gray-800">Share Note</h2>

        {errorMessage && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
            {errorMessage}
          </div>
        )}

        <input
          type="email"
          placeholder="Enter email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full p-2 mb-4 border ${
            errorMessage ? 'border-red-500' : 'border-gray-300'
          } rounded focus:outline-none focus:ring focus:ring-green-200`}
        />
        <button
          className="bg-[#1E6262] text-white py-2 px-4 rounded hover:bg-[#155252] font-bold"
          onClick={handleSubmit}
        >
          Share
        </button>

         {/* Display the list of people the project is already shared with */}
         {sharedWith.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xl mb-3 font-semibold text-gray-800">Shared with</h3>
            <ul className="text-gray-800 text-lg">
              {sharedWith.map((email, index) => (
                <li key={index} className="mb-1">
                  {email}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Share;
