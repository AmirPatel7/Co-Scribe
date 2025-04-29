import React, { useState } from "react";
import { FiDownload, FiTrash, FiFolder, FiRefreshCw, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { MdShare } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { PDFDocument } from 'pdf-lib';
import { jwtDecode } from "jwt-decode";
import { marked } from 'marked';
import { htmlToText } from 'html-to-text';

const BASE_URL = "http://159.203.189.208";

interface Project {
  project_name: string;
  last_modified: string;
  owner: string;
  category: string;
  username: string;
  is_trashed: boolean;
  shared_with: string[];
}

interface ProjectTableProps {
  onOpenCategorize: (projectName: string, owner: string) => void;
  onDelete: (project: Project) => void;
  onPermanentDelete: (project: Project) => void;
  onRestore: (project: Project) => void;
  projects: Project[];
  loggedInUser: string;
  sortField: 'project_name' | 'last_modified';
  sortOrder: 'asc' | 'desc';
  searchTerm: string;
  onShare: (project: Project) => void;
}

const ProjectTable: React.FC<ProjectTableProps> = ({
  onOpenCategorize,
  onDelete,
  onPermanentDelete,
  onRestore,
  projects,
  loggedInUser,
  searchTerm,
  sortField,
  sortOrder,
  onShare,
}) => {

  const [dropdownOpen, setDropdownOpen] = useState<{ [key: string]: boolean }>({});
  const navigate = useNavigate();

  const toggleDropdown = (projectName: string) => {
    setDropdownOpen(prevState => ({
      ...prevState,
      [projectName]: !prevState[projectName],
    }));
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (sortField === 'project_name') {
      if (a.project_name.toLowerCase() < b.project_name.toLowerCase()) return sortOrder === 'asc' ? -1 : 1;
      if (a.project_name.toLowerCase() > b.project_name.toLowerCase()) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    } else if (sortField === 'last_modified') {
      const dateA = new Date(a.last_modified).getTime();
      const dateB = new Date(b.last_modified).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    return 0;
  });

  const filteredProjects = sortedProjects.filter((project) =>
    project.project_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProject = (projectName: string, shared_with: string[], projectOwner: string) => {
    navigate('/project', { state: { projectName, shared_with, projectOwner } });
  };

  const handleDownloadPDF = async (project: Project) => {
    try {
      // Fetch the content using the provided endpoint with native fetch
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        alert("No token in storage");
        return;
      }
  
      const decodedToken: { email: string } = jwtDecode(token);
      const userEmail = decodedToken.email;
      console.log(project.project_name);
  
      const response = await fetch(
        `${BASE_URL}:3000/projects/content/${userEmail}/${project.project_name}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
  
      // Check if the response is okay
      if (response.ok) {
        const data = await response.json();
  
        if (data.success && data.content) {
          const markdownContent = data.content;
  
          // Convert markdown to HTML using marked
          const htmlContent = marked(markdownContent);

          const plainTextContent = htmlToText(htmlContent, {
            wordwrap: 130,
          });
  
          // Convert the content to a PDF using PDF-lib
          const pdfDoc = await PDFDocument.create();
  
          const pageWidth = 595.28;
          const pageHeight = 841.89;
          const margin = 50;
          const fontSize = 12;
          const lineHeight = fontSize * 1.2;
          const maxWidth = pageWidth - 2 * margin;
  
          let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          let cursorY = pageHeight - margin; 
  
          // Split text into lines manually
          const lines = plainTextContent.split('\n');
          for (const line of lines) {
            const words = line.split(' ');
            let currentLine = '';
  
            for (const word of words) {
              
              if (currentLine.length + word.length + 1 < maxWidth / (fontSize * 0.6)) {
                currentLine += (currentLine ? ' ' : '') + word;
              } else {
                // Draw the current line and move to the next
                if (cursorY - lineHeight < margin) {
                  currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
                  cursorY = pageHeight - margin; // Reset cursor for new page
                }
  
                currentPage.drawText(currentLine, {
                  x: margin,
                  y: cursorY - lineHeight,
                  size: fontSize,
                });
                cursorY -= lineHeight; // Move the cursor down for the next line
                currentLine = word; // Start the new line with the current word
              }
            }
  
            if (cursorY - lineHeight < margin) {
              currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
              cursorY = pageHeight - margin; 
            }
            currentPage.drawText(currentLine, {
              x: margin,
              y: cursorY - lineHeight,
              size: fontSize,
            });
            cursorY -= lineHeight;
          }
  
          // Save the PDF
          const pdfBytes = await pdfDoc.save();
  
          // Trigger the browser to download the PDF
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const link = document.createElement('a');
          link.href = window.URL.createObjectURL(blob);
          link.download = `${project.project_name}.pdf`;
          link.click();
        } else {
          alert("Error fetching project content.");
        }
      } else {
        alert("Failed to fetch project content.");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to download the PDF.");
    }
  };

  return (
    <div className="rounded-lg shadow-lg overflow-hidden bg-[#F8F8F8] m-4">
      <table className="w-full text-left hidden sm:table"> {/* Table is hidden on small screens */}
        <thead className="bg-[#F0F0F0] text-[#2F3E46]">
          <tr className="text-sm font-semibold">
            <th className="p-3 border-b border-gray-300">Title</th>
            <th className="p-3 border-b border-gray-300">Category</th>
            <th className="p-3 border-b border-gray-300">Owner</th>
            <th className="p-3 border-b border-gray-300">Last Modified</th>
            <th className="p-3 border-b border-gray-300 text-right"></th>
          </tr>
        </thead>
        <tbody className="text-[#2F3E46]">
          {filteredProjects.map((project, index) => (
            <tr key={index} className="hover:bg-gray-100 transition-colors duration-200">
              <td className="p-3 border-b border-gray-200">
                <button
                  className={`${!project.is_trashed ? "hover:underline focus:underline" : ""}`}
                  onClick={() => handleProject(project.project_name, project.shared_with, project.owner)}
                  disabled={project.is_trashed}
                >
                  {project.project_name}
                </button>
              </td>
              <td className="p-3 border-b border-gray-200">{project.category}</td>
              <td className="p-3 border-b border-gray-200">{project.username}</td>
              <td className="p-3 border-b border-gray-200">
                {new Date(project.last_modified).toLocaleDateString()}
              </td>
              <td className="p-3 border-b border-gray-200 flex space-x-2 justify-end">
                {project.is_trashed ? (
                  <>
                    <button
                      className="p-2 bg-[#1E6262] rounded text-[#F4EFE6] hover:bg-gray-500"
                      title="Restore"
                      aria-label="Restore"
                      onClick={() => onRestore(project)}
                    >
                      <FiRefreshCw />
                    </button>
                    <button
                      className="p-2 bg-red-600 rounded text-[#F4EFE6] hover:bg-gray-500"
                      title="Permanently Delete"
                      aria-label="Permanently Delete"
                      onClick={() => onPermanentDelete(project)}
                    >
                      <FiTrash />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={`p-2 rounded text-[#F4EFE6] ${project.owner === loggedInUser ? "bg-[#1E6262] hover:bg-gray-500" : "bg-gray-400 cursor-not-allowed"}`}
                      title="Categorize"
                      aria-label="Category"
                      onClick={() => project.owner === loggedInUser && onOpenCategorize(project.project_name, project.owner)}
                      disabled={project.owner !== loggedInUser}
                    >
                      <FiFolder />
                    </button>
                    <button
                      className={`p-2 rounded text-[#F4EFE6] ${project.owner === loggedInUser ? "bg-[#1E6262] hover:bg-gray-500" : "bg-gray-400 cursor-not-allowed"}`}
                      title="Share"
                      aria-label="Share"
                      onClick={() => project.owner === loggedInUser && onShare(project)}
                      disabled={project.owner !== loggedInUser}
                    >
                      <MdShare />
                    </button>
                    <button
                      className="p-2 bg-[#1E6262] rounded text-[#F4EFE6] hover:bg-gray-500"
                      title="Download PDF"
                      aria-label="Download PDF"
                      onClick={() => handleDownloadPDF(project)}
                    >
                      <FiDownload />
                    </button>
                    <button
                      className={`p-2 rounded text-[#F4EFE6] ${project.owner === loggedInUser ? "bg-[#1E6262] hover:bg-gray-500" : "bg-gray-400 cursor-not-allowed"}`}
                      title="Delete"
                      aria-label="Delete"
                      onClick={() => project.owner === loggedInUser && onDelete(project)}
                      disabled={project.owner !== loggedInUser}
                    >
                      <FiTrash />
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Horizontal Layout for Smaller Screens */}
      <div className="sm:hidden"> {/* Hidden on larger screens */}
        {filteredProjects.map((project, index) => (
          <div key={index} className="border rounded-lg p-4 mb-4 bg-[#F8F8F8]">
            <div className="mb-2">
              <strong>Title: </strong>
              <button
                className="hover:underline focus:underline"
                onClick={() => handleProject(project.project_name, project.shared_with, project.owner)}
                disabled={project.is_trashed}
              >
                {project.project_name}
              </button>
            </div>
            <div className="mb-2">
              <strong>Category: </strong> {project.category}
            </div>
            <div className="mb-2">
              <strong>Owner: </strong> {project.username}
            </div>
            <div className="mb-2">
              <strong>Last Modified: </strong> {new Date(project.last_modified).toLocaleDateString()}
            </div>

            <div className="flex justify-between items-center">
              {/* Dropdown for buttons */}
              <button
                className="p-2 bg-[#1E6262] rounded text-[#F4EFE6]"
                onClick={() => toggleDropdown(project.project_name)}
              >
                {dropdownOpen[project.project_name] ? <FiChevronUp /> : <FiChevronDown />}
              </button>
              {dropdownOpen[project.project_name] && (
                <div className="mt-2 flex flex-row space-x-1 bg-[#F4EFE6] p-2 rounded-lg shadow-lg">
                  {project.is_trashed ? (
                    <>
                      <button
                        className="p-2 bg-[#1E6262] rounded text-[#F4EFE6] hover:bg-gray-500"
                        title="Restore"
                        aria-label="Restore"
                        onClick={() => onRestore(project)}
                      >
                        <FiRefreshCw />
                      </button>
                      <button
                        className="p-2 bg-red-600 rounded text-[#F4EFE6] hover:bg-gray-500"
                        title="Permanently Delete"
                        aria-label="Permanently Delete"
                        onClick={() => onPermanentDelete(project)}
                      >
                        <FiTrash />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={`p-2 rounded text-[#F4EFE6] ${project.owner === loggedInUser ? "bg-[#1E6262]" : "bg-gray-400 cursor-not-allowed"}`}
                        onClick={() => project.owner === loggedInUser && onOpenCategorize(project.project_name, project.owner)}
                        disabled={project.owner !== loggedInUser}
                      >
                        <FiFolder />
                      </button>
                      <button
                        className={`p-2 rounded text-[#F4EFE6] ${project.owner === loggedInUser ? "bg-[#1E6262]" : "bg-gray-400 cursor-not-allowed"}`}
                        onClick={() => project.owner === loggedInUser && onShare(project)}
                        disabled={project.owner !== loggedInUser}
                      >
                        <MdShare />
                      </button>
                      <button className={"p-2 bg-[#1E6262] rounded text-[#F4EFE6]"} onClick={() => handleDownloadPDF(project)}>
                        <FiDownload />
                      </button>
                      <button
                        className={`p-2 rounded text-[#F4EFE6] ${project.owner === loggedInUser ? "bg-[#1E6262]" : "bg-gray-400 cursor-not-allowed"}`}
                        onClick={() => project.owner === loggedInUser && onDelete(project)}
                        disabled={project.owner !== loggedInUser}
                      >
                        <FiTrash />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default ProjectTable;