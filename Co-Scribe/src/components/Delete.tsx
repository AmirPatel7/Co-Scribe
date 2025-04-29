import React from 'react';

interface DeleteProps {
    projectName: string;
    onClose: () => void;
    onDelete: () => void; 
}

const Delete: React.FC<DeleteProps> = ({ projectName, onClose, onDelete }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
            <div className="relative bg-[#F4EFE6] p-6 rounded-lg shadow-lg">

                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-[#2F3E46] hover:text-black focus:outline-none"
                >
                    &times;
                </button>

                <h2 className="text-lg mb-4 text-[#2F3E46]">Delete {projectName}?</h2>

    
                <div className="flex justify-between space-x-4">
                    <button
                        onClick={onDelete}
                        className="bg-[#354F52] text-white py-2 px-4 rounded-lg"
                        onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#686867")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor = "#354F52")
                          } 
                    >
                        Confirm
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-[#354F52] text-white py-2 px-4 rounded-lg"
                        onMouseOver={(e) =>
                            (e.currentTarget.style.backgroundColor = "#686867")
                          }
                          onMouseOut={(e) =>
                            (e.currentTarget.style.backgroundColor = "#354F52")
                          } 
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Delete;
