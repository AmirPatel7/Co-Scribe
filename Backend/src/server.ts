import express, { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import cors from "cors";
import { verifyToken, generateToken, generateRememberMeToken } from "./auth";
import bcrypt from "bcryptjs";
import { Server } from "socket.io";
import http from "http";
import multer from "multer";
import { sendEmail } from "./mailer";
import { generateVerificationCode } from "./utils";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swaggerConfig";
import validator from "validator";

import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from "cloudinary";
import streamifier from "streamifier";
import axios from "axios";

dotenv.config();

const app = express();
const port = 3000;
const port2 = 3001;

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Setup HTTP server and socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://159.203.189.208:3001", //TODO Frontend origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
    credentials: true,
  },
});

dotenv.config();
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const corsOptions = {
  origin: ["http://159.203.189.208:5173", "http://159.203.189.208"],
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
  credentials: true, // Allow credentials
};
app.use(cors(corsOptions));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const verificationCodes: { [key: string]: string } = {};
const BASE_URL = "http://159.203.189.208";

app.get("/", (req, res) => {
  res.send("Hello, TypeScript with Express!");
});

let allUsers = [];
let onlineUsers: any[] = [];
// Setup socket.io events
io.on("connection", (socket) => {
  console.log("New User connected:", socket.id);

  socket.on("join-server", (username) => {
    const user = {
      username,
      id: socket.id,
    };
    allUsers.push(user);
    io.emit("all-users", allUsers);
  });

  //Listen for the client to join a specific room
  socket.on("join-room", ({ projectName, username }) => {
    console.log(`User ${socket.id} (${username}) joined room: ${projectName}`);
    socket.join(projectName);
    // Add user to the online users list
    const user = {
      id: socket.id,
      username: username,
      room: projectName,
    };
    onlineUsers.push(user);

    // Emit the list of online users to all clients
    io.emit("update-online-users", onlineUsers);
  });

  // Handle user leaving a room
  socket.on("leave-room", (projectName) => {
    console.log(`User ${socket.id} is leaving room: ${projectName}`);
    socket.leave(projectName);

    // Remove user from the online users list
    onlineUsers = onlineUsers.filter(
      (user) => !(user.id === socket.id && user.room === projectName)
    );

    // Emit the updated list of online users to all clients
    io.emit("update-online-users", onlineUsers);
  });

  // Listen for note changes from the client
  socket.on("note-change", ({ projectName, noteData }) => {
    // Emit the note change to all other clients in the same room
    socket.to(projectName).emit("note-change", noteData);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    onlineUsers = onlineUsers.filter((user) => user.id !== socket.id);

    // Emit the updated list of online users to all clients
    io.emit("update-online-users", onlineUsers);
  });

  socket.on("share-project", ({ sharedWithEmail, projectName, sender }) => {
    console.log(`Project shared with ${sharedWithEmail} by ${sender}`);

    // Send notification to the user that the project was shared with
    const notificationMessage = `You've received a shared project: ${projectName} from ${sender}`;
    io.to(sharedWithEmail).emit("notification", notificationMessage); // Assuming you use email as the socket room
  });
});

server.listen(port2, () => {
  console.log(`Web socket is running on http://159.203.189.208:${port}`);
});
/**
 * @swagger
 * /projects/content/{email}/{project_name}:
 *   get:
 *     summary: Get the contents of a project file (markdown)
 *     description: Fetches the markdown content of a project stored in Cloudinary. Only the owner or users with whom the project is shared can access the project content.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         description: The email of the user requesting access to the project.
 *         schema:
 *           type: string
 *           example: "user@example.com"
 *       - in: path
 *         name: project_name
 *         required: true
 *         description: The name of the project.
 *         schema:
 *           type: string
 *           example: "My New Project"
 *     responses:
 *       200:
 *         description: Markdown content retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 is_owner:
 *                   type: boolean
 *                   description: Whether the user is the project owner
 *                   example: true
 *                 is_shared:
 *                   type: boolean
 *                   description: Whether the project is shared with the user
 *                   example: false
 *                 project_name:
 *                   type: string
 *                   description: The name of the project
 *                   example: "My New Project"
 *                 content:
 *                   type: string
 *                   description: The markdown content of the project
 *                   example: "# Project Title\nThis is the project content."
 *       401:
 *         description: Unauthorized access - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Missing token"
 *       403:
 *         description: Access denied - the user does not have permission to view the project
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied: You do not have permission to view this project"
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Project not found"
 *       500:
 *         description: Internal server error when retrieving markdown content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Server error while retrieving project markdown"
 */
app.get("/projects/content/:email/:project_name", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token ",
    });
  }

  const { email, project_name } = req.params;
  const sanitizedEmail = validator.isEmail(email)
    ? validator.normalizeEmail(email)
    : null;
  const sanitizedProjectName = validator.escape(validator.trim(project_name));

  if (!sanitizedEmail || !sanitizedProjectName) {
    return res.status(400).json({
      success: false,
      message: "Invalid request: Missing or malformed parameters",
    });
  }

  try {
    // Fetch all projects by name
    const { data: projects, error } = await supabase
      .from("Projects")
      .select("*")
      .eq("project_name", sanitizedProjectName);

    if (error || !projects || projects.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    // Check if the user has access to any of the projects
    let accessibleProject = null;

    for (const project of projects) {
      const { owner, shared_with, markdown_url } = project;

      const isOwner = owner === sanitizedEmail;
      const isShared =
        shared_with &&
        Array.isArray(shared_with) &&
        shared_with.includes(sanitizedEmail);

      if (isOwner || isShared) {
        accessibleProject = { ...project, isOwner, isShared };
        break; // stop at the first matching project
      }
    }

    if (!accessibleProject) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied: You do not have permission to view this project",
      });
    }

    // Fetch markdown content from Cloudinary
    const response = await axios.get(accessibleProject.markdown_url);

    if (response.status !== 200) {
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve markdown content from Cloudinary",
      });
    }

    // Send markdown to client
    res.status(200).json({
      success: true,
      is_owner: accessibleProject.isOwner,
      is_shared: accessibleProject.isShared,
      project_name: accessibleProject.project_name,
      content: response.data,
    });
  } catch (error) {
    console.error("Error retrieving project markdown:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving project markdown",
    });
  }
});

/**
 * @swagger
 * /projects/your/{userid}:
 *   get:
 *     summary: Get all projects owned by the user
 *     description: Fetches all projects owned by the specified user, optionally filtered by category. Only projects that are not trashed and not shared with other users will be returned.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The ID of the user whose projects are being retrieved.
 *         schema:
 *           type: string
 *           example: "user123"
 *       - in: query
 *         name: category
 *         required: false
 *         description: The category of the projects to filter by.
 *         schema:
 *           type: string
 *           example: "Work"
 *     responses:
 *       200:
 *         description: List of projects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       project_name:
 *                         type: string
 *                         example: "Project Alpha"
 *                       owner:
 *                         type: string
 *                         example: "user123"
 *                       category:
 *                         type: string
 *                         example: "Work"
 *                       username:
 *                         type: string
 *                         description: The username of the project owner
 *                         example: "john_doe"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-09-10T14:48:00.000Z"
 *                       last_modified:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-09-15T11:22:00.000Z"
 *                       is_trashed:
 *                         type: boolean
 *                         example: false
 *       400:
 *         description: Bad request - invalid or missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email, username, and password are required!"
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Missing token"
 *       500:
 *         description: Internal server error while retrieving projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal Server Error"
 */
app.get("/projects/your/:userid", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token ",
    });
  }

  const { userid } = req.params;
  const { category } = req.query;
  let eMessage = "Unknown error";

  try {
    // Query to get projects where the owner matches the given userid and is_trashed is false
    let query = supabase
      .from("Projects")
      .select("*")
      .eq("owner", userid)
      .eq("is_trashed", false)
      .is("shared_with", null);

    if (category) {
      query = query.eq("category", category); // Add category filter if provided
    }

    // Fetch the projects
    const { data: projects, error: projectError } = await query;

    if (projectError) {
      console.error("Error retrieving projects:", projectError);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // If no projects are found, return an empty array
    if (!projects.length) {
      return res
        .status(200)
        .json({ projects: [], message: "No projects found" });
    }

    // Extract unique owners (user emails) from the projects
    const uniqueOwners = [
      ...new Set(projects.map((project: { owner: string }) => project.owner)),
    ];

    // Query to get usernames from the 'Co-Scribe Users' table for these owners
    const { data: users, error: userError } = await supabase
      .from("Co-Scribe Users")
      .select("username, email")
      .in("email", uniqueOwners);

    if (userError) {
      console.error("Error retrieving usernames:", userError);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Create a map of email to username for easy lookup
    const userMap: { [key: string]: string } = {};
    users.forEach((user: { email: string; username: string }) => {
      userMap[user.email] = user.username;
    });

    // Attach usernames to the projects based on the owner
    const projectsWithUsernames = projects.map((project: any) => ({
      ...project,
      username: userMap[project.owner] || "Unknown",
    }));

    // Return the final result
    return res.status(200).json({ projects: projectsWithUsernames });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: eMessage });
  }
});

/**
 * @swagger
 * /projects/category/all/{userid}:
 *   get:
 *     summary: Get all projects by category for a user
 *     description: Fetches all projects either owned by or shared with the user. Projects can be filtered by category.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The ID of the user to retrieve projects for.
 *         schema:
 *           type: string
 *           example: "user123"
 *       - in: query
 *         name: category
 *         required: false
 *         description: Optional category to filter projects.
 *         schema:
 *           type: string
 *           example: "Work"
 *     responses:
 *       200:
 *         description: List of projects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   project_name:
 *                     type: string
 *                     example: "Project Alpha"
 *                   owner:
 *                     type: string
 *                     example: "user123"
 *                   username:
 *                     type: string
 *                     description: The username of the project owner
 *                     example: "john_doe"
 *                   category:
 *                     type: string
 *                     example: "Work"
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     example: "2023-09-10T14:48:00.000Z"
 *                   last_modified:
 *                     type: string
 *                     format: date-time
 *                     example: "2023-09-15T11:22:00.000Z"
 *                   is_trashed:
 *                     type: boolean
 *                     example: false
 *       400:
 *         description: Bad request - invalid or missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid parameters provided"
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Missing or invalid token"
 *       500:
 *         description: Internal server error while retrieving projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal Server Error"
 */
app.get("/projects/category/all/:userid", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    // normal authorisation process
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token",
    });
  }

  const { userid } = req.params;
  const { category } = req.query;
  let eMessage = "Unknown error";

  try {
    let query = supabase
      .from("Projects")
      .select("*")
      .eq("is_trashed", false)
      .or(`owner.eq.${userid},shared_with.cs.{${userid}}`); // Filters by shared_with array containing the user's email

    if (category) {
      query = query.eq("category", category);
    }

    const { data: projects, error: projectError } = await query;

    if (projectError) {
      console.error("Error retrieving shared projects:", projectError);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Extract unique owners from the projects
    const uniqueOwners = [
      ...new Set(projects.map((project: { owner: string }) => project.owner)),
    ];

    // Query to get usernames of the owners
    const { data: users, error: userError } = await supabase
      .from("Co-Scribe Users")
      .select("username, email")
      .in("email", uniqueOwners);

    if (userError) {
      return res.status(500).json({
        message: "Error fetching usernames",
        error: userError.message,
      });
    }

    // Create a map of email to username for easy lookup
    const userMap: { [key: string]: string } = {};
    users.forEach((user: { email: string; username: string }) => {
      userMap[user.email] = user.username;
    });

    // Attach usernames to the projects based on the owner
    const projectsWithUsernames = projects.map((project: any) => ({
      ...project,
      username: userMap[project.owner] || "Unknown", // Add username based on the owner
    }));

    res.status(200).json(projectsWithUsernames);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: eMessage });
  }
});

/**
 * @swagger
 * /categories/{owner}:
 *   get:
 *     summary: Get all categories shared with a specific user and owned by a specific owner
 *     description: This endpoint fetches all unique categories of projects owned by the specified owner and shared with the specified owner.
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         description: The owner of the projects.
 *         schema:
 *           type: string
 *           example: "user123"
 *     responses:
 *       200:
 *         description: List of unique categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Work", "Personal", "School"]
 *       500:
 *         description: Internal server error while retrieving categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error fetching categories"
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 */
app.get("/categories/:owner", async (req, res) => {
  const { owner } = req.params;

  try {
    const { data, error } = await supabase
      .from("Projects")
      .select("category, shared_with")
      .eq("owner", owner)
      .contains("shared_with", [owner]); // Ensure the shared_with array contains the sharedUser

    if (error) {
      return res
        .status(500)
        .json({ message: "Error fetching categories", error: error.message });
    }

    // Extract unique categories from the data
    const uniqueCategories = [
      ...new Set(data.map((item: { category: string }) => item.category)),
    ];

    return res.status(200).json({ categories: uniqueCategories });
  } catch (err) {
    console.error("Error fetching categories:", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
});

/**
 * @swagger
 * /users/{email}:
 *   get:
 *     summary: Get user details by email
 *     description: Retrieves detailed information about a user based on their email address. Requires a valid JWT token in the Authorization header.
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: The email address of the user to retrieve
 *     security:
 *       - bearerAuth: []  # Specify that this route requires a Bearer token for authorization
 *     responses:
 *       200:
 *         description: Successful retrieval of user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: "user@example.com"
 *                     username:
 *                       type: string
 *                       example: "john_doe"
 *                     avatar_url:
 *                       type: string
 *                       format: url
 *                       example: "https://example.com/avatar.jpg"
 *       400:
 *         description: Bad Request - Invalid or missing parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email is required"
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Invalid or missing token"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
app.get("/users/:email", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token ",
    });
  }

  const { email } = req.params;

  // Query to fetch user information based on the provided email
  try {
    const { data: user, error: userError } = await supabase
      .from("Co-Scribe Users")
      .select("email, username, password, avatar_url")
      .eq("email", email)
      .single(); // to get one user.

    if (userError) {
      console.error("Error retrieving user information:", userError);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user information (excluding sensitive data like password)
    const { password, ...userInfo } = user;

    return res.status(200).json({ success: true, user: userInfo });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: "Unknown error" });
  }
});

/**
 * @swagger
 * /categories/{owner}:
 *   get:
 *     summary: Get all categories shared with a specific user and owned by a specific owner
 *     description: Fetches all unique project categories shared with or owned by a specific user for the dashboard.
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         description: The email of the project owner.
 *         schema:
 *           type: string
 *           example: "owner@example.com"
 *     responses:
 *       200:
 *         description: A list of unique project categories shared with or owned by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Personal", "Work", "Shared Projects"]
 *       500:
 *         description: Server error while fetching categories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error fetching categories"
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
app.get("/categories/:owner", async (req, res) => {
  const { owner } = req.params;

  // Validate and sanitize input
  const sanitizedOwner = validator.trim(owner);

  if (!sanitizedOwner) {
    return res.status(400).json({
      success: false,
      message: "Invalid request: Owner parameter is required",
    });
  }

  try {
    const { data, error } = await supabase
      .from("Projects")
      .select("category, shared_with")
      .eq("owner", sanitizedOwner)
      .contains("shared_with", [sanitizedOwner]); // Ensure the shared_with array contains the owner

    if (error) {
      return res
        .status(500)
        .json({ message: "Error fetching categories", error: error.message });
    }

    // Extract unique categories from the data
    const uniqueCategories = [
      ...new Set(data.map((item: { category: string }) => item.category)),
    ];

    return res.status(200).json({ categories: uniqueCategories });
  } catch (err) {
    console.error("Error fetching categories:", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
});

/**
 * @swagger
 * /projects/all/{owner}:
 *   get:
 *     summary: Get all projects by owner or shared with owner, including usernames
 *     description: Retrieves all projects owned by or shared with the specified owner, along with the corresponding usernames.
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         description: Email of the project owner
 *         schema:
 *           type: string
 *           example: "owner@example.com"
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       owner:
 *                         type: string
 *                         description: Email of the project owner
 *                         example: "owner@example.com"
 *                       project_name:
 *                         type: string
 *                         description: Name of the project
 *                         example: "My Project"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         description: The date and time the project was created
 *                         example: "2024-10-10T12:34:56Z"
 *                       last_modified:
 *                         type: string
 *                         format: date-time
 *                         description: The date and time the project was last modified
 *                         example: "2024-10-12T09:22:33Z"
 *                       shared_with:
 *                         type: array
 *                         description: List of users the project is shared with
 *                         items:
 *                           type: string
 *                           example: "shared_user@example.com"
 *                       is_trashed:
 *                         type: boolean
 *                         description: Indicates if the project is trashed
 *                         example: false
 *                       category:
 *                         type: string
 *                         description: The category of the project
 *                         example: "Work"
 *                       username:
 *                         type: string
 *                         description: Username of the project owner
 *                         example: "JohnDoe"
 *       500:
 *         description: Server error while fetching projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error fetching projects"
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
app.get("/projects/all/:owner", async (req, res) => {
  const { owner } = req.params;

  // Validate and sanitize input
  const sanitizedOwner = validator.trim(owner);

  if (!sanitizedOwner) {
    return res.status(400).json({
      success: false,
      message: "Invalid request: Owner parameter is required",
    });
  }

  try {
    // Query to get all projects owned by or shared with the owner
    const { data: projects, error: projectError } = await supabase
      .from("Projects")
      .select(
        "owner, project_name, created_at, last_modified, shared_with, is_trashed, category"
      )
      .eq("is_trashed", false)
      .or(`owner.eq.${sanitizedOwner},shared_with.cs.{${sanitizedOwner}}`);

    if (projectError) {
      return res.status(500).json({
        message: "Error fetching projects",
        error: projectError.message,
      });
    }

    // Extract unique owners from projects
    const uniqueOwners = [
      ...new Set(projects.map((project: { owner: string }) => project.owner)),
    ];

    const { data: users, error: userError } = await supabase
      .from("Co-Scribe Users")
      .select("username, email")
      .in("email", uniqueOwners);

    if (userError) {
      return res.status(500).json({
        message: "Error fetching usernames",
        error: userError.message,
      });
    }

    // Create a map of email to username for easy lookup
    const userMap: { [key: string]: string } = {};
    users.forEach((user: { email: string; username: string }) => {
      userMap[user.email] = user.username;
    });

    // Attach usernames to the projects based on the owner
    const projectsWithUsernames = projects.map((project: any) => ({
      ...project,
      username: userMap[project.owner] || "Unknown", // Add username based on the owner
    }));

    return res.status(200).json({ projects: projectsWithUsernames });
  } catch (err) {
    console.error("Error fetching projects:", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
});

/**
 * @swagger
 * /project/shared/{owner}:
 *   get:
 *     summary: Get shared projects for a specific owner
 *     description: Retrieves all projects shared with the specified owner as well as projects owned by the owner that are shared with others.
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         description: Email of the project owner
 *         schema:
 *           type: string
 *           example: "owner@example.com"
 *     responses:
 *       200:
 *         description: Successfully retrieved the list of shared projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   owner:
 *                     type: string
 *                     description: Email of the project owner
 *                     example: "owner@example.com"
 *                   project_name:
 *                     type: string
 *                     description: Name of the project
 *                     example: "Shared Project"
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: The date and time the project was created
 *                     example: "2024-10-10T12:34:56Z"
 *                   last_modified:
 *                     type: string
 *                     format: date-time
 *                     description: The date and time the project was last modified
 *                     example: "2024-10-12T09:22:33Z"
 *                   shared_with:
 *                     type: array
 *                     description: List of users the project is shared with
 *                     items:
 *                       type: string
 *                       example: "shared_user@example.com"
 *                   is_trashed:
 *                     type: boolean
 *                     description: Indicates if the project is trashed
 *                     example: false
 *                   category:
 *                     type: string
 *                     description: The category of the project
 *                     example: "Work"
 *                   username:
 *                     type: string
 *                     description: Username of the project owner
 *                     example: "JohnDoe"
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Invalid or missing token"
 *       500:
 *         description: Server error while fetching shared projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error fetching shared projects"
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
app.get("/project/shared/:owner", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token ",
    });
  }

  const { owner } = req.params;

  try {
    const { data: sharedWithMe, error: sharedWithMeError } = await supabase
      .from("Projects")
      .select("*")
      .eq("is_trashed", false)
      .contains("shared_with", [owner]);

    if (sharedWithMeError) {
      throw sharedWithMeError;
    }

    const { data: ownerSharedProjects, error: ownerProjectsError } =
      await supabase
        .from("Projects")
        .select("*")
        .eq("owner", owner)
        .eq("is_trashed", false)
        .not("shared_with", "is", null);

    if (ownerProjectsError) {
      throw ownerProjectsError;
    }

    const combinedProjects = [...sharedWithMe, ...ownerSharedProjects];

    // Extract unique owners from the projects
    const uniqueOwners = [
      ...new Set(
        combinedProjects.map((project: { owner: string }) => project.owner)
      ),
    ];

    // Query to get usernames of the owners
    const { data: users, error: userError } = await supabase
      .from("Co-Scribe Users")
      .select("username, email")
      .in("email", uniqueOwners);

    if (userError) {
      return res.status(500).json({
        message: "Error fetching usernames",
        error: userError.message,
      });
    }

    // Create a map of email to username for easy lookup
    const userMap: { [key: string]: string } = {};
    users.forEach((user: { email: string; username: string }) => {
      userMap[user.email] = user.username;
    });

    // Attach usernames to the projects based on the owner
    const projectsWithUsernames = combinedProjects.map((project: any) => ({
      ...project,
      username: userMap[project.owner] || "Unknown", // Add username based on the owner
    }));

    res.status(200).json(projectsWithUsernames);
  } catch (error) {
    console.error("Error fetching shared projects:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /projects/trashed/{userid}:
 *   get:
 *     summary: Get trashed projects for a specific user
 *     description: Retrieve all projects that have been marked as trashed for a specific user.
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The user ID (email) to retrieve trashed projects for.
 *         schema:
 *           type: string
 *           example: "user@example.com"
 *     responses:
 *       200:
 *         description: Successfully retrieved trashed projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   description: List of trashed projects
 *                   items:
 *                     type: object
 *                     properties:
 *                       owner:
 *                         type: string
 *                         description: The owner's email address
 *                         example: "user@example.com"
 *                       project_name:
 *                         type: string
 *                         description: The name of the project
 *                         example: "Sample Trashed Project"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         description: The creation timestamp of the project
 *                         example: "2024-10-12T08:34:56Z"
 *                       last_modified:
 *                         type: string
 *                         format: date-time
 *                         description: The last modified timestamp of the project
 *                         example: "2024-10-14T10:22:33Z"
 *                       username:
 *                         type: string
 *                         description: The username of the project owner
 *                         example: "JohnDoe"
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Missing token"
 *       500:
 *         description: Server error while retrieving trashed projects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal Server Error"
 */
app.get("/projects/trashed/:userid", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token ",
    });
  }

  const { userid } = req.params;
  let eMessage = "Unknown error";

  try {
    // Query to get projects where the owner matches the given userid and is_trashed is true
    const { data: projects, error: projectError } = await supabase
      .from("Projects")
      .select("*")
      .eq("owner", userid)
      .eq("is_trashed", true); // Filter to get only trashed projects

    if (projectError) {
      console.error("Error retrieving trashed projects:", projectError);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // If no trashed projects are found, return an empty array
    if (!projects.length) {
      return res
        .status(200)
        .json({ projects: [], message: "No trashed projects found" });
    }

    // Extract unique owners (user emails) from the projects
    const uniqueOwners = [
      ...new Set(projects.map((project: { owner: string }) => project.owner)),
    ];

    // Query to get usernames from the 'Co-Scribe Users' table for these owners
    const { data: users, error: userError } = await supabase
      .from("Co-Scribe Users")
      .select("username, email")
      .in("email", uniqueOwners);

    if (userError) {
      console.error("Error retrieving usernames:", userError);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // Create a map of email to username for easy lookup
    const userMap: { [key: string]: string } = {};
    users.forEach((user: { email: string; username: string }) => {
      userMap[user.email] = user.username;
    });

    // Attach usernames to the projects based on the owner
    const trashedProjectsWithUsernames = projects.map((project: any) => ({
      ...project,
      username: userMap[project.owner] || "Unknown",
    }));

    // Return the final result
    return res.status(200).json({ projects: trashedProjectsWithUsernames });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: eMessage });
  }
});

/**
 * @swagger
 * /add-user:
 *   post:
 *     summary: Add a new user
 *     description: Creates a new user by adding their email, username, and password. The password is hashed before being stored in the database. If the email or username already exists, an error is returned.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - username
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               username:
 *                 type: string
 *                 example: "john_doe"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Password123!"
 *     responses:
 *       200:
 *         description: User added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User added successfully"
 *                 data:
 *                   type: object
 *                   example: {
 *                     "email": "user@example.com",
 *                     "username": "john_doe",
 *                     "password": "$2a$10$hashedPassword"
 *                   }
 *       400:
 *         description: Bad Request - Missing or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email, username, and password are required!"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "An error occurred"
 *                 error:
 *                   type: string
 *                   example: "Internal server error message"
 */
app.post("/add-user", async (req, res) => {
  // Destructure the required fields from the request body
  const { email, username, password } = req.body;

  // Validate and sanitize the required fields
  const sanitizedEmail = validator.trim(email);
  const sanitizedUsername = validator.trim(username);
  const sanitizedPassword = password; // Additional password validation can be done here

  if (!sanitizedEmail || !sanitizedPassword || !sanitizedUsername) {
    return res
      .status(400)
      .json({ message: "Email, username, and password are required!" });
  }

  // Additional validations
  if (!validator.isEmail(sanitizedEmail)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (!validator.isLength(sanitizedPassword, { min: 8 })) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long." });
  }

  try {
    // Check if the email already exists
    const { data: emailExists, error: emailCheckError } = await supabase
      .from("Co-Scribe Users")
      .select("id")
      .eq("email", sanitizedEmail)
      .single();

    if (emailCheckError && emailCheckError.code !== "PGRST116") {
      return res.status(500).json({ message: emailCheckError.message });
    }

    if (emailExists) {
      return res.status(400).json({ message: "Email is already in use." });
    }

    // Check if the username already exists
    const { data: usernameExists, error: usernameCheckError } = await supabase
      .from("Co-Scribe Users")
      .select("id")
      .eq("username", sanitizedUsername)
      .single();

    if (usernameCheckError && usernameCheckError.code !== "PGRST116") {
      return res.status(500).json({ message: usernameCheckError.message });
    }

    if (usernameExists) {
      return res.status(400).json({ message: "Username is already in use." });
    }

    // Define the number of salt rounds for hashing the password
    const saltRounds = 10;

    // Hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(sanitizedPassword, saltRounds);

    // Insert the new user into the Users table
    const { data, error } = await supabase.from("Co-Scribe Users").insert([
      {
        email: sanitizedEmail,
        username: sanitizedUsername,
        password: hashedPassword,
      },
    ]);

    // Handle any error that occurs during the insert operation
    if (error) {
      return res.status(500).json({ message: error.message });
    }

    return res.status(200).json({ message: "User added successfully", data });
  } catch (err) {
    console.error("Error adding user:", err);
    return res.status(500).json({ message: "An error occurred", error: err });
  }
});

/**
 * @swagger
 * /add-image:
 *   post:
 *     summary: Upload a profile image for a user
 *     description: This endpoint allows the user to upload a profile image, which is stored in Supabase storage. The image URL is then updated in the user's profile in the "Co-Scribe Users" table.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: The image file to be uploaded
 *               email:
 *                 type: string
 *                 format: email
 *                 description: The email of the user whose profile image is being uploaded
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Image uploaded successfully"
 *                 fileInfo:
 *                   type: object
 *                   properties:
 *                     originalname:
 *                       type: string
 *                       example: "profile.jpg"
 *                     mimetype:
 *                       type: string
 *                       example: "image/jpeg"
 *                     size:
 *                       type: integer
 *                       example: 204800
 *                     path:
 *                       type: string
 *                       example: "images/1609459200000.jpg"
 *                     url:
 *                       type: string
 *                       example: "https://your-supabase-url.com/storage/v1/object/public/avatar/images/1609459200000.jpg"
 *       400:
 *         description: No image file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No image file uploaded"
 *       500:
 *         description: Error uploading image or updating the user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error uploading image"
 *                 error:
 *                   type: string
 *                   example: "Internal server error message"
 */
app.post(
  "/add-image",
  upload.single("profileImage"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded" });
    }

    try {
      const file = req.file;
      const fileExt = file.originalname.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `images/${fileName}`; // Adjusted path to fit your bucket structure

      // Upload the file to Supabase storage
      const { data, error } = await supabase.storage
        .from("avatar") // Use the existing bucket name 'avatar'
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
        });

      if (error) {
        console.error("Error uploading image: ", error.message);
        return res
          .status(500)
          .json({ message: "Error uploading image", error: error.message });
      }

      // Get the public URL of the uploaded file
      const { data: urlData } = await supabase.storage
        .from("avatar") // Use the existing bucket name 'avatar'
        .getPublicUrl(filePath);

      // Update the user's profile image URL
      const { email } = req.body; // Assuming the user's email is sent in the request body
      const { data: userData, error: userError } = await supabase
        .from("Co-Scribe Users")
        .update({ avatar_url: urlData.publicUrl })
        .eq("email", email);

      if (userError) {
        console.error(
          "Error updating user profile image URL: ",
          userError.message
        );
        return res.status(500).json({
          message: "Error updating user profile image URL",
          error: userError.message,
        });
      }

      // Success response
      res.status(200).json({
        message: "Image uploaded successfully",
        fileInfo: {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: filePath,
          url: urlData.publicUrl,
        },
      });
    } catch (error: any) {
      console.error("Unexpected error: ", error);
      res
        .status(500)
        .json({ message: "Unexpected error occurred", error: error.message });
    }
  }
);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user using their email and password, and returns a JWT token upon successful login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Email and password are required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email and password are required!"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid credentials"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error"
 *                 error:
 *                   type: string
 *                   example: "Error details"
 */
app.post("/login", async (req, res) => {
  const { email, password }: { email: string; password: string } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required!" });
  }

  //Sanitize a email
  const sanitizedEmail = validator.trim(email);
  if (!validator.isEmail(sanitizedEmail)) {
    return res.status(400).json({ message: "Invalid email format!" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters long!" });
  }

  try {
    const { data, error } = await supabase
      .from("Co-Scribe Users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !data) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = data;

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    // Send back the token and any relevant user data
    return res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
});

/**
 * @swagger
 * /projects/add:
 *   post:
 *     summary: Add a new project and store markdown content in Cloudinary
 *     description: Creates a new project with markdown content. The markdown file is stored in Cloudinary and the project's metadata is stored in the database.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               owner:
 *                 type: string
 *                 description: Email of the project owner
 *                 example: "user@example.com"
 *               project_name:
 *                 type: string
 *                 description: Name of the project
 *                 example: "My New Project"
 *               shared_with:
 *                 type: array
 *                 description: List of emails of users to share the project with
 *                 items:
 *                   type: string
 *                 example: ["user1@example.com", "user2@example.com"]
 *               category:
 *                 type: string
 *                 description: Category of the project
 *                 example: "Education"
 *               is_trashed:
 *                 type: boolean
 *                 description: Indicates if the project is trashed
 *                 example: false
 *               note_content:
 *                 type: string
 *                 description: Markdown content of the project
 *                 example: "## Project Notes\nThis is a markdown note."
 *     responses:
 *       201:
 *         description: Project added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "My New Project added successfully with Markdown file"
 *                 markdown_url:
 *                   type: string
 *                   example: "https://res.cloudinary.com/your-cloud-name/raw/upload/v1614798857/Co-Scribe/My_New_Project.md"
 *       400:
 *         description: Bad request, missing required fields or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Missing token"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error adding project"
 */
app.post("/projects/add", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token ",
    });
  }

  const {
    owner,
    project_name,
    shared_with,
    category,
    is_trashed,
    note_content,
  } = req.body; // Assume note_content is passed
  let eMessage = "Unknown error";

  try {
    // Check if the project name already exists for the owner
    const { data: existingProjects, error: fetchError } = await supabase
      .from("Projects")
      .select("*")
      .eq("owner", owner)
      .eq("project_name", project_name);

    if (fetchError) {
      console.error("Error checking existing projects:", fetchError);
      return res
        .status(500)
        .json({ success: false, message: "Database error" });
    }

    if (existingProjects && existingProjects.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Project name already exists for this user",
      });
    }
    // Create markdown content
    const markdownContent = `
# ${project_name}
${note_content || "Start typying here."}
`;

    // Upload the markdown content to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "Co-Scribe",
        public_id: `${project_name}`,
        format: "md",
      },
      async (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined
      ) => {
        if (error) {
          console.error("Error uploading to Cloudinary:", error);
          return res.status(500).json({
            success: false,
            message: "Cloudinary upload failed",
            error,
          });
        }

        if (!result) {
          return res.status(500).json({
            success: false,
            message: "No result returned from Cloudinary",
          });
        }

        // Get the URL of the uploaded file
        const markdown_url = result.secure_url;

        // Insert project data into Projects table along with the markdown URL
        const { data, error: dbError } = await supabase
          .from("Projects")
          .insert([
            {
              owner,
              project_name,
              created_at: new Date().toISOString(),
              last_modified: new Date().toISOString(),
              shared_with,
              category,
              is_trashed,
              markdown_url, // Store the markdown URL in the database
            },
          ]);

        if (dbError) {
          console.log(dbError.message);
          eMessage = dbError.message;
          throw dbError;
        }

        // Respond with success
        res.status(201).json({
          success: true,
          message: project_name + " added successfully with Markdown file",
          markdown_url,
        });
      }
    );

    // Create stream from markdown content and pipe it to Cloudinary
    streamifier
      .createReadStream(Buffer.from(markdownContent))
      .pipe(uploadStream);
  } catch (error) {
    if (error instanceof Error) {
      eMessage = error.message;
    }

    console.error("Error adding project:", eMessage);
    res.status(500).json({ success: false, message: eMessage });
  }
});

/**
 * @swagger
 * /projects/{owner}/{project_name}:
 *   delete:
 *     summary: Delete a specific project for a user by project name and owner
 *     description: This endpoint deletes a project that belongs to the specified owner and removes the associated markdown file from Cloudinary.
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         description: The owner of the project to delete.
 *         schema:
 *           type: string
 *           example: "user123"
 *       - in: path
 *         name: project_name
 *         required: true
 *         description: The name of the project to delete.
 *         schema:
 *           type: string
 *           example: "MyProject"
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Bearer token for authorization.
 *         schema:
 *           type: string
 *           example: "Bearer <token>"
 *     responses:
 *       200:
 *         description: Project and associated markdown file deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "MyProject deleted successfully"
 *       401:
 *         description: Unauthorized request due to missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Missing token"
 *       404:
 *         description: Project not found or does not belong to the user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Project not found or does not belong to this user"
 *       500:
 *         description: Internal server error during project deletion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
app.delete("/projects/:owner/:project_name", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token ",
    });
  }

  const { owner, project_name } = req.params;

  try {
    //select query to check if the project belongs to the user with project name
    const { data: project, error: fetchError } = await supabase
      .from("Projects")
      .select("owner, project_name, markdown_url")
      .eq("owner", owner)
      .eq("project_name", project_name);

    // Handle errors or project not found
    if (fetchError) {
      console.error("Error fetching project:", fetchError);
      return res.status(500).json({ error: "Error retrieving project data" });
    }

    if (!project) {
      return res
        .status(404)
        .json({ error: "Project not found or does not belong to this user" });
    }

    // Step 2: Delete the markdown file from Cloudinary
    const cloudinaryPublicId = `Co-Scribe/${project_name}.md`;
    cloudinary.uploader.destroy(
      cloudinaryPublicId,
      { resource_type: "raw" },
      async (error, result) => {
        if (error) {
          console.error("Error deleting file from Cloudinary:", error);
          return res.status(500).json({
            error: "Failed to delete associated markdown file from Cloudinary",
          });
        }

        // Step 3: Delete the project from the database
        const { error: deleteError } = await supabase
          .from("Projects")
          .delete()
          .eq("owner", owner)
          .eq("project_name", project_name);

        if (deleteError) {
          console.error("Error deleting project:", deleteError);
          return res.status(500).json({ error: "Internal Server Error" });
        }

        res.status(200).json({
          success: true,
          message: `${project_name} deleted successfully`,
        });
      }
    );
  } catch (error) {
    // Handle any other server errors
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /users/delete/{userid}:
 *   delete:
 *     summary: Delete a user and all their associated projects
 *     description: This endpoint deletes a user by their userid and removes all associated projects from the system.
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The ID of the user to delete.
 *         schema:
 *           type: string
 *           example: "user123"
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Bearer token for authorization.
 *         schema:
 *           type: string
 *           example: "Bearer <token>"
 *     responses:
 *       200:
 *         description: User and their associated projects deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User user123 and their projects deleted successfully"
 *       401:
 *         description: Unauthorized request due to missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Missing token"
 *       500:
 *         description: Internal server error during user deletion
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
app.delete("/users/delete/:userid", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token",
    });
  }

  const { userid } = req.params;

  try {
    // Select all projects owned by the user
    const { data: projects, error: fetchProjectsError } = await supabase
      .from("Projects")
      .select("project_name")
      .eq("owner", userid);

    if (fetchProjectsError) {
      console.error("Error fetching user's projects:", fetchProjectsError);
      return res.status(500).json({ error: "Error retrieving projects data" });
    }

    // Loop through each project and delete it
    if (projects && projects.length > 0) {
      for (const project of projects) {
        const deleteProjectRes = await fetch(
          `${BASE_URL}:3000/projects/${userid}/${project.project_name}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        ); // API call to delete each project

        if (!deleteProjectRes.ok) {
          console.error(
            `Error deleting project: ${project.project_name} for user ${userid}`
          );
          return res.status(500).json({
            success: false,
            message: `Failed to delete project ${project.project_name}`,
          });
        }
      }
    }

    // Delete the user after their projects have been deleted
    const { error: deleteUserError } = await supabase
      .from("Co-Scribe Users")
      .delete()
      .eq("email", userid);

    if (deleteUserError) {
      console.error("Error deleting user:", deleteUserError);
      return res.status(500).json({ error: "Error deleting user" });
    }

    res.status(200).json({
      success: true,
      message: `User ${userid} and their projects deleted successfully`,
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * @swagger
 * /projects/{userid}/{projectname}:
 *   put:
 *     summary: Update a project details
 *     description: Updates the details of an existing project, including shared users. Only the owner of the project can make updates.
 *     parameters:
 *       - in: path
 *         name: userid
 *         required: true
 *         description: The ID of the user who owns the project.
 *         schema:
 *           type: string
 *           example: "user123"
 *       - in: path
 *         name: projectname
 *         required: true
 *         description: The name of the project to be updated.
 *         schema:
 *           type: string
 *           example: "my-awesome-project"
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Bearer token for authorization.
 *         schema:
 *           type: string
 *           example: "Bearer <token>"
 *       - in: body
 *         name: updates
 *         description: The updated project details including shared users.
 *         schema:
 *           type: object
 *           properties:
 *             shared_with:
 *               type: array
 *               description: Array of emails to share the project with.
 *               items:
 *                 type: string
 *                 example: "example@example.com"
 *             category:
 *               type: string
 *               description: The category of the project.
 *               example: "Development"
 *             is_trashed:
 *               type: boolean
 *               description: If the project is trashed.
 *               example: false
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "my-awesome-project updated successfully"
 *       400:
 *         description: Invalid request due to shared users not found or already shared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No valid emails were provided or they are already shared"
 *       401:
 *         description: Unauthorized request due to missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Missing token"
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Project not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
app.put("/projects/:userid/:projectname", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token ",
    });
  }

  const { userid, projectname } = req.params; // get the user id and project name from params
  const updates = req.body; // get the updated fields from request body
  let eMessage = "Unknown error";

  try {
    // Checking if project exists in the database
    const { data: project, error: fetchError } = await supabase
      .from("Projects")
      .select("owner, project_name, shared_with")
      .eq("owner", userid)
      .eq("project_name", projectname)
      .single();

    if (fetchError) {
      console.error("Error fetching project:", fetchError.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Extract the current shared_with array (if present) or default to an empty array
    let sharedWithArray: string[] = project.shared_with || [];
    let newSharedUsers: string[] = []; // Array to store new users to notify

    // Handle updates to the shared_with array if provided in the update request
    if (updates.shared_with && Array.isArray(updates.shared_with)) {
      const { data: users, error: usersFetchError } = await supabase
        .from("Co-Scribe Users")
        .select("email")
        .in("email", updates.shared_with); // Find all provided emails that exist in the Users table

      if (usersFetchError) {
        console.error("Error fetching users:", usersFetchError.message);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      // If the users query returned null or undefined, treat it as no valid users found
      if (!users) {
        return res.status(400).json({
          success: false,
          message:
            "None of the provided emails exist in the Co-Scribe Users table",
        });
      }

      const validEmails = users.map((user: { email: string }) => user.email);
      let errorFlag = false;
      updates.shared_with.forEach((email: string) => {
        if (validEmails.includes(email) && !sharedWithArray.includes(email)) {
          sharedWithArray.push(email);
          newSharedUsers.push(email); // Track new users added to the shared list
        } else {
          errorFlag = true;
        }
      });

      if (errorFlag) {
        return res.status(400).json({
          success: false,
          message: "No valid emails were provided or they are already shared",
        });
      }

      // if (sharedWithArray.length === project.shared_with.length) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "No valid emails were provided or they are already shared",
      //   });
      // }

      // Add the updated shared_with array to the list of fields to update
      updates.shared_with = sharedWithArray;
    } else {
      // Remove shared_with from updates if it's not provided in the body
      delete updates.shared_with;
    }

    // Update the project where both owner and project name match
    const { data, error } = await supabase
      .from("Projects")
      .update(updates)
      .eq("owner", userid)
      .eq("project_name", projectname); // Filters by owner and project name

    if (error) {
      console.error("Error updating project:", error.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (newSharedUsers.length > 0) {
      newSharedUsers.forEach((userEmail) => {
        const notificationMessage = `${userid} shared the note ${projectname} with you.`;

        // Emit the notification to the user via WebSocket
        io.emit("notification", {
          email: userEmail, // Target the user's email for the notification
          message: notificationMessage,
        });
      });
    }

    res
      .status(200)
      .json({ success: true, message: projectname + " updated successfully" });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: eMessage });
  }
});

/**
 * @swagger
 * /users/{email}:
 *   put:
 *     summary: Update a user's details except the profile image
 *     description: Updates a user's details such as username and password. The request must be authenticated using a valid token.
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         description: The email of the user whose details are being updated.
 *         schema:
 *           type: string
 *           example: "user@example.com"
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Bearer token for authorization.
 *         schema:
 *           type: string
 *           example: "Bearer <token>"
 *       - in: body
 *         name: updates
 *         description: The user details to update (username, password).
 *         schema:
 *           type: object
 *           properties:
 *             username:
 *               type: string
 *               description: The new username of the user (must be unique).
 *               example: "new_username"
 *             password:
 *               type: string
 *               description: The new password (will be hashed).
 *               example: "newStrongPassword123!"
 *     responses:
 *       200:
 *         description: User details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User details updated successfully"
 *       401:
 *         description: Unauthorized request due to missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Missing token"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       409:
 *         description: Username already in use
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Username already in use"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
app.put("/users/:email", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  // Check for Authorization token
  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token = authorizationHeader.split(" ")[1];

  // Verify token validity
  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token",
    });
  }

  const { email } = req.params; // get the email from params
  const updates = req.body; // get the updated fields from request body
  let eMessage = "Unknown error";

  try {
    // Check if user exists in the database
    const { data: user, error: fetchError } = await supabase
      .from("Co-Scribe Users")
      .select("email")
      .eq("email", email);

    if (!user || user.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if a new username is being provided
    if (updates.username) {
      // Check if the new username is unique
      const { data: existingUser, error: usernameError } = await supabase
        .from("Co-Scribe Users")
        .select("email")
        .eq("username", updates.username)
        .neq("email", email);

      if (existingUser && existingUser.length > 0) {
        return res
          .status(409)
          .json({ success: false, message: "Username already in use" });
      }

      if (usernameError) {
        console.error("Error checking username:", usernameError.message);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    }

    // Check if password is part of the update
    if (updates.password) {
      // Salt and hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(updates.password, saltRounds);
      updates.password = hashedPassword; // Replace plain text password with hashed password
    }

    // Update the user where email matches
    const { data, error } = await supabase
      .from("Co-Scribe Users")
      .update(updates)
      .eq("email", email);

    if (error) {
      console.error("Error updating user:", error.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res
      .status(200)
      .json({ success: true, message: "User details updated successfully" });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: eMessage });
  }
});

/**
 * @swagger
 * /projects/updatecontent/{email}/{project_name}:
 *   put:
 *     summary: Update the contents of a project
 *     description: Updates the markdown content of a project stored in Cloudinary. The request must be authenticated using a valid token. Only the project owner or shared users can modify the project.
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         description: The email of the user making the request (either owner or shared user).
 *         schema:
 *           type: string
 *           example: "user@example.com"
 *       - in: path
 *         name: project_name
 *         required: true
 *         description: The name of the project to be updated.
 *         schema:
 *           type: string
 *           example: "MyProject"
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Bearer token for authorization.
 *         schema:
 *           type: string
 *           example: "Bearer <token>"
 *       - in: body
 *         name: new_content
 *         required: true
 *         description: The new markdown content to update the project with.
 *         schema:
 *           type: object
 *           properties:
 *             new_content:
 *               type: string
 *               description: The updated markdown content for the project.
 *               example: "# MyProject\nThis is the updated project content."
 *     responses:
 *       200:
 *         description: Project content updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "MyProject updated successfully"
 *                 updated_url:
 *                   type: string
 *                   description: The URL of the updated markdown content.
 *                   example: "https://res.cloudinary.com/project_url.md"
 *       401:
 *         description: Unauthorized request due to missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Missing token"
 *       403:
 *         description: Access denied due to insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied: You do not have permission to modify this project"
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Project not found"
 *       500:
 *         description: Internal server error while updating the project
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Server error while updating project"
 */
app.put(
  "/projects/updatecontent/:email/:project_name",
  async (req: Request, res: Response) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Missing token" });
    }

    const token: string | undefined = req.headers.authorization?.split(" ")[1];

    if (!verifyToken(token)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid or missing token ",
      });
    } // nromal auth process

    const { email, project_name } = req.params;
    const { new_content } = req.body;

    try {
      // Fetch the project by name and ensure it exists
      const { data: project, error } = await supabase
        .from("Projects")
        .select("*")
        .eq("project_name", project_name)
        .single();

      if (error || !project) {
        return res
          .status(404)
          .json({ success: false, message: "Project not found" });
      }

      //Verify if the user has access (is the owner or shared)
      const { owner, shared_with, markdown_url } = project;
      const isOwner = owner === email;
      const isShared =
        shared_with &&
        Array.isArray(shared_with) &&
        shared_with.includes(email);

      if (!isOwner && !isShared) {
        return res.status(403).json({
          success: false,
          message:
            "Access denied: You do not have permission to modify this project",
        });
      }
      const updatedMarkdownContent = `${new_content}`;

      //Upload the updated markdown content to Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "Co-Scribe",
          public_id: `${project_name}`,
          format: "md",
          overwrite: true, // Ensure existing content is overwritten
        },
        async (error, result) => {
          if (error) {
            console.error("Error updating Cloudinary content:", error);
            return res.status(500).json({
              success: false,
              message: "Failed to update content on Cloudinary",
            });
          }

          //Confirm the updated Cloudinary URL (if necessary)
          const updatedMarkdownUrl = result?.secure_url;

          //Update the project record in the database (optional, in case of any metadata changes)
          const { error: updateError } = await supabase
            .from("Projects")
            .update({
              last_modified: new Date().toISOString(),
              markdown_url: updatedMarkdownUrl, // Update the markdown_url with the new Cloudinary URL
            })
            .eq("owner", owner)
            .eq("project_name", project_name);

          if (updateError) {
            console.error("Error updating project record:", updateError);
            return res.status(500).json({
              success: false,
              message: "Failed to update project record in the database",
            });
          }

          //Send success response
          res.status(200).json({
            success: true,
            message: `${project_name} updated successfully`,
            updated_url: updatedMarkdownUrl,
          });
        }
      );

      // Step 8: Create stream from updated markdown content and pipe it to Cloudinary
      streamifier
        .createReadStream(Buffer.from(updatedMarkdownContent))
        .pipe(uploadStream);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating project",
      });
    }
  }
);

/**
 * @swagger
 * /projects/category:
 *   post:
 *     summary: Update a category for a specific project
 *     description: Updates the category of a specific project by the project owner and project name.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - owner
 *               - project_name
 *               - category
 *             properties:
 *               owner:
 *                 type: string
 *                 description: The email of the project owner
 *                 example: "owner@example.com"
 *               project_name:
 *                 type: string
 *                 description: The name of the project
 *                 example: "My Awesome Project"
 *               category:
 *                 type: string
 *                 description: The new category to assign to the project
 *                 example: "Work"
 *     responses:
 *       200:
 *         description: The category was successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Category updated successfully"
 *                 project:
 *                   type: object
 *                   description: The updated project data
 *                   example: { owner: "owner@example.com", project_name: "My Awesome Project", category: "Work", last_modified: "2024-10-10T12:34:56Z" }
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Owner, project name, and category are required"
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Project not found"
 *       500:
 *         description: Server error while updating the project
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error updating project"
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
app.post("/projects/category", async (req, res) => {
  const { owner, project_name, category } = req.body;

  // Ensure all necessary data is provided
  if (!owner || !project_name || !category) {
    return res
      .status(400)
      .json({ message: "Owner, project name, and category are required" });
  }

  try {
    // Update the project with the new category
    const { data, error } = await supabase
      .from("Projects")
      .update({ category, last_modified: new Date().toISOString() })
      .eq("owner", owner)
      .eq("project_name", project_name);

    if (error) {
      return res
        .status(500)
        .json({ message: "Error updating project", error: error.message });
    }

    // If no rows were updated, return a 404
    if (data) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Return the updated project data
    return res
      .status(200)
      .json({ message: "Category updated successfully", project: data });
  } catch (err) {
    console.error("Error updating category:", err);
    return res.status(500).json({ message: "Server error", error: err });
  }
});

/**
 * @swagger
 * /projects/trash/{owner}/{project_name}:
 *   put:
 *     summary: Move a project to trash
 *     description: Update the 'is_trashed' column of a project to true, marking the project as trashed.
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         description: The email of the project owner.
 *         schema:
 *           type: string
 *           example: "user@example.com"
 *       - in: path
 *         name: project_name
 *         required: true
 *         description: The name of the project to be trashed.
 *         schema:
 *           type: string
 *           example: "Sample Project"
 *     responses:
 *       200:
 *         description: Successfully moved the project to trash.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Sample Project has been moved to trash"
 *       401:
 *         description: Unauthorized - Missing or invalid token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Missing token"
 *       404:
 *         description: Project not found or doesn't belong to the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Project not found or doesn't belong to this owner"
 *       500:
 *         description: Server error while trashing the project.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal Server Error"
 */
app.put("/projects/trash/:owner/:project_name", async (req, res) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Missing token" });
  }

  const token: string | undefined = req.headers.authorization?.split(" ")[1];

  if (!verifyToken(token)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing token ",
    });
  }

  const { owner, project_name } = req.params; // Extract owner and project name from route parameters
  let eMessage = "Unknown error";

  try {
    // Check if the project exists and belongs to the user (owner)
    const { data: project, error: fetchError } = await supabase
      .from("Projects")
      .select("*")
      .eq("owner", owner)
      .eq("project_name", project_name)
      .single();

    if (fetchError || !project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or doesn't belong to this owner",
      });
    }

    // Update the `is_trashed` column to `true` for soft deletion
    const { error: updateError } = await supabase
      .from("Projects")
      .update({ is_trashed: true }) // Only update is_trashed to true
      .eq("owner", owner)
      .eq("project_name", project_name);

    if (updateError) {
      eMessage = updateError.message;
      throw updateError;
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: `${project_name} has been moved to trash`,
    });
  } catch (error) {
    console.error("Error trashing project:", error);
    return res.status(500).json({ success: false, message: eMessage });
  }
});

/**
 * @swagger
 * /forgot-password:
 *   post:
 *     summary: Send verification code for password reset
 *     description: Generates and sends a verification code to the user's email for password reset.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The email address of the user.
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Verification code sent successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Verification code sent"
 *       404:
 *         description: Email not found in the database.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Email not found"
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // Check if the user exists in the database
    const { data: user, error } = await supabase
      .from("Co-Scribe Users")
      .select("*")
      .eq("email", email)
      .single();

    if (!user || error) {
      return res.status(404).json({ message: "Email not found" });
    }

    // Generate a random verification code
    const verificationCode = generateVerificationCode();
    verificationCodes[email] = verificationCode; // Store in-memory or in a DB

    // Send the verification code via email
    await sendEmail(
      email,
      "Password Reset Code",
      `Your verification code is: ${verificationCode}`
    );

    res.status(200).json({ message: "Verification code sent" });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /reset-password:
 *   post:
 *     summary: Reset user password
 *     description: Verifies the provided email and resets the user's password after hashing the new password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The email address of the user.
 *                 example: "user@example.com"
 *               newPassword:
 *                 type: string
 *                 description: The new password for the user.
 *                 example: "new_secure_password123"
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Password reset successfully"
 *       500:
 *         description: Server error while resetting the password.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
app.post("/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password in the database
    const { data, error } = await supabase
      .from("Co-Scribe Users")
      .update({ password: hashedPassword })
      .eq("email", email);

    if (error) {
      return res.status(500).json({ message: "Error updating password" });
    }

    // Delete the verification code after successful password reset
    delete verificationCodes[email];

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error in reset password:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * @swagger
 * /verify-code:
 *   post:
 *     summary: Verify the code sent for password reset
 *     description: Verifies the code sent to the user's email for password reset and removes the code after successful verification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The email address of the user.
 *                 example: "user@example.com"
 *               code:
 *                 type: string
 *                 description: The verification code sent to the user's email.
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Verification successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Verification successful"
 *       400:
 *         description: Invalid or missing code or email.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid verification code or Email and code are required"
 *       500:
 *         description: Server error during verification.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
app.post("/verify-code", (req: Request, res: Response) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  // Check if the code matches the one we sent
  if (verificationCodes[email] === code) {
    delete verificationCodes[email]; // Remove the code after successful verification
    return res.status(200).json({ message: "Verification successful" });
  } else {
    return res.status(400).json({ message: "Invalid verification code" });
  }
});

//"Remember Me" token
app.post("/remember-me", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Query Supabase to check if the user exists
    const { data, error } = await supabase
      .from("Co-Scribe Users")
      .select("*")
      .eq("email", email)
      .single();
    if (error) {
      return res
        .status(500)
        .json({ message: "Error querying database", error });
    }

    if (!data) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = data;

    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    res.json({
      message: "Remember me token generated successfully",
      token,
    });
  } catch (error) {
    console.error("Error checking user existence:", error);
    return res
      .status(500)
      .json({ message: "An error occurred while checking the user" });
  }
});

app.post("/shared-with-email", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    // Check if the user exists in the database
    const { data: user, error } = await supabase
      .from("Co-Scribe Users")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: "Email not found" });
    }

    // Send the verification code via email
    const subject = "Note was shared with you";
    const text = `Hello,

A note was shared with you on Co-Scribe. Please log in to view it.

Best regards,
The Co-Scribe Team`;

    await sendEmail(email, subject, text);

    return res
      .status(200)
      .json({ message: "Email has been sent to the user." });
  } catch (error) {
    console.error("Error in trying to share note with user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(port, "159.203.189.208", () => {
  // TODO s
  console.log(`Server is running on http://159.203.189.208:${port}`);
  console.log("API docs available at http://159.203.189.208:3000/api-docs");
});
