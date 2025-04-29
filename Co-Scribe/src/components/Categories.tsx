import React from 'react';
import { FiFolder } from 'react-icons/fi';

interface CategoriesProps {
    categories: string[];
    onCategoryClick: (category: string) => void; 
}

const Categories: React.FC<CategoriesProps> = ({ categories, onCategoryClick }) => {
    return (
        <div className="flex space-x-8 p-4 m-4">
            {categories.map((category, index) => (
                <button 
                    key={index} 
                    className="flex flex-col items-center"
                    onClick={() => onCategoryClick(category)} 
                >
                    <FiFolder size={50} className="text-[#1E6262]" />
                    <span className="mt-2 text-lg text-[#2F3E46] hover:underline">{category}</span>
                </button>
            ))}
        </div>
    );
};

export default Categories;
