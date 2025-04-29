import React, { useState } from 'react';
import { FiFolder } from 'react-icons/fi';
// import dotenv from "dotenv";

// dotenv.config();

/* Info passed as props from Dashboard */
interface CategorizeProps {
  categories: string[]; /* Existing categories passed from the parent */
  projectName: string; /* Name of the project to be categorized */
  owner: string;
  onClose: () => void; /* Function to close the popup */
  onAddCategory: () => void; /* Function to refresh categories after adding a new one */
}

const Categorize: React.FC<CategorizeProps> = ({ categories, onClose, onAddCategory, projectName, owner }) => {
  const [newCategory, setNewCategory] = useState(''); /* State for new category input */
  const [selectedCategory, setSelectedCategory] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const BASE_URL="http://159.203.189.208"

  /* Sends new category info to the backend */
  const handleConfirm = async () => {
    const trimmedCategory = newCategory.trim();
    if (trimmedCategory) {
      try {

        const response = await fetch(`${BASE_URL}:3000/projects/category`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            owner: owner,
            project_name: projectName,
            category: trimmedCategory,
          }),
        });

        if (response.ok) {
          onAddCategory(); /* Trigger category refresh in parent component after successful update */
          onClose(); /* Close the popup after confirmation */
        } else {
          const errorData = await response.json();
          console.error('Failed to update category:', errorData.message);
        }
      } catch (error) {
        console.error('Error updating category:', error);
      }
    } else {
      setErrorMessage('Please insert/select a category name');
    }
  };

  const handleSelectCategory = async (category: string) => {
    setSelectedCategory(category);
    try {

      const response = await fetch(`${BASE_URL}:3000/projects/category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: owner,
          project_name: projectName,
          category: selectedCategory,
        }),
      });

      if (response.ok) {
        onAddCategory(); /* Trigger category refresh in parent component after successful update */
        onClose(); /* Close the popup after confirmation */
      } else {
        const errorData = await response.json();
        console.error('Failed to select category:', errorData.message);
      }
    } catch (error) {
      console.error('Error selecting category:', error);
    }

  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="relative bg-[#F4EFE6] p-6 rounded-lg shadow-lg">
        <button onClick={onClose} className="absolute top-2 right-2 text-[#2F3E46] hover:text-black focus:outline-none">
          &times;
        </button>

        <h2 className="text-lg mb-4">Add to Category</h2>
        <div className="space-y-2">
          {categories.map((category, index) => (
            <button key={index} className="w-full p-2 text-[#2F3E46] text-left rounded" onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#D3D3D3")
            }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#F4EFE6")
              }
              onClick={() => handleSelectCategory(category)}>
              {category}
            </button>
          ))}
        </div>

        <h2 className="text-lg mb-4 mt-4">Create new Category</h2>

        <div className="space-y-2 relative">
          <input
            type="text"
            placeholder="New category..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full p-2 bg-[#F4EFE6] text-black rounded border-2 pl-10"
            style={{ borderColor: '#2F3E46' }}
          />
          <FiFolder className="absolute left-3 bottom-1 transform -translate-y-1/2 text-[#2F3E46] h-5 w-5" />
        </div>

        {errorMessage && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 mt-4 text-sm">
            {errorMessage}
          </div>
        )}

        <button
          className="w-full py-3 mt-4 rounded-lg font-bold transition-colors duration-300"
          style={{ backgroundColor: '#354F52', color: 'white' }}
          onClick={handleConfirm}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#686867")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#354F52")
          }
        >
          Confirm
        </button>
      </div>
    </div>
  );
};

export default Categorize;
