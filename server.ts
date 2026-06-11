import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { v2 as cloudinary } from "cloudinary";
import { Resend } from "resend";
import {
  connectDB, dbTeam, dbPlayer, dbOfficial, dbMatch, dbClubRegistration,
  dbClubPlayer, dbAnnouncement, dbDocument, dbOtp,
  Team, Player, Official, Match, ClubPlayer, Announcement, Document
} from "./server/db.js";
import {
  registrationReceivedEmail,
  clubApprovedEmail,
  clubRejectedEmail,
  playerApprovedEmail,
  playerRejectedEmail,
  newAnnouncementEmail,
  newDocumentEmail,
  passwordResetCodeEmail,
} from "./server/emailTemplates.js";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "SMARTCITY_SUPER_SECRET_KEY";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin@123";
const REFEREE_PASSWORD = process.env.REFEREE_PASSWORD || "referee@123";



// -------------------------------------------------------------
// Cloudinary Config
// -------------------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper to save a Base64 string directly to Cloudinary
async function handleImageSave(imageInput: string, prefix: string): Promise<string> {
  if (!imageInput) return "/placeholder-logo.png";
  if (imageInput.startsWith("/uploads/") || imageInput.startsWith("http")) {
    return imageInput;
  }
  if (imageInput.startsWith("data:image/")) {
    try {
      const result = await cloudinary.uploader.upload(imageInput, {
        folder: "smartcity_u17",
        public_id: `${prefix}-${Date.now()}`
      });
      return result.secure_url;
    } catch (error) {
      console.error("Cloudinary Upload Error:", error);
      throw new Error("Failed to upload image to Cloudinary");
    }
  }
  return imageInput;
}

// Helper to save documents and images to Cloudinary dynamically
async function handleFileSave(fileInput: string, prefix: string, resourceType: "image" | "raw" | "auto" = "auto"): Promise<string> {
  if (!fileInput) return "";
  if (fileInput.startsWith("http") || fileInput.startsWith("/uploads/")) {
    return fileInput;
  }
  if (fileInput.startsWith("data:")) {
    try {
      const result = await cloudinary.uploader.upload(fileInput, {
        folder: "smartcity_u17",
        public_id: `${prefix}-${Date.now()}`,
        resource_type: resourceType
      });
      return result.secure_url;
    } catch (error) {
      console.error("Cloudinary File Upload Error:", error);
      throw new Error("Failed to upload file to Cloudinary");
    }
  }
  return fileInput;
}

// -------------------------------------------------------------
// Middlewares Setup
// -------------------------------------------------------------
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Enable CORS for external cross-resource calls
app.use(cors());

// Secure Express headers (with iframe source relaxation so that the local dev iframe displays smoothly)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "https:", "http:", "data:", "blob:"],
        frameAncestors: ["'self'", "https:", "http:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imggSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"]
      }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);



// -------------------------------------------------------------
// Resend Email Service
// -------------------------------------------------------------
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "SmartCity Osun State Football League <onboarding@resend.dev>";

/** Fire-and-forget email sender — never throws, never blocks the main action */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    if (error) {
      console.error(`[EMAIL ERROR] Failed to send "${subject}" to ${to}:`, error);
    } else {
      console.log(`[EMAIL] Sent "${subject}" → ${to}`);
    }
  } catch (err) {
    console.error(`[EMAIL ERROR] Exception sending "${subject}" to ${to}:`, err);
  }
}

/** Send the same email to multiple recipients sequentially */
async function sendEmailToMany(recipients: string[], subject: string, html: string): Promise<void> {
  for (const to of recipients) {
    await sendEmail(to, subject, html);
  }
}

// In-memory OTP store removed — now backed by MongoDB via dbOtp

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Connect Database
connectDB();

// -------------------------------------------------------------
// Auth Middleware Interfaces & Helpers
// -------------------------------------------------------------
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    username?: string;
    email?: string;
    role: "team" | "admin" | "referee" | "club";
  };
}

const verifyToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    res.status(401).json({ message: "No Authorization header provided." });
    return;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({ message: "Invalid authorization format. Must be Bearer <token>" });
    return;
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username?: string; email?: string; role: "team" | "admin" | "referee" | "club" };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token expired or invalid." });
  }
};

const verifyClubToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  verifyToken(req, res, () => {
    if (req.user?.role !== "club") {
      res.status(403).json({ message: "Access forbidden. Club privilege required." });
      return;
    }
    next();
  });
};

const verifyAdminToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  verifyToken(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ message: "Access forbidden. Admin privilege required." });
      return;
    }
    next();
  });
};

const verifyRefereeToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  verifyToken(req, res, () => {
    if (req.user?.role !== "referee" && req.user?.role !== "admin") {
      res.status(403).json({ message: "Access forbidden. Referee or Admin privilege required." });
      return;
    }
    next();
  });
};

// -------------------------------------------------------------
// API CONTROLLERS / ROUTING
// -------------------------------------------------------------

// POST /api/auth/register
app.post(
  "/api/auth/register",
  [
    body("clubName").trim().notEmpty().withMessage("Club Name is required"),
    body("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters long"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { clubName, username, password, logo } = req.body;

    try {
      // Check existing username
      const existing = await dbTeam.findOne({ username });
      if (existing) {
        return res.status(400).json({ message: "A club with this username has already registered." });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Save logo
      let finalLogoUrl = "/placeholder-logo.png";
      if (logo) {
        finalLogoUrl = await handleImageSave(logo, "logo");
      }

      const team = await dbTeam.create({
        clubName,
        username,
        passwordHash,
        logoUrl: finalLogoUrl
      });

      const token = jwt.sign({ id: team._id, username: team.username, role: "team" }, JWT_SECRET, { expiresIn: "7d" });

      res.status(201).json({
        message: "Registration successful!",
        token,
        team: {
          id: team._id,
          clubName: team.clubName,
          username: team.username,
          logoUrl: team.logoUrl
        }
      });
    } catch (err: any) {
      console.error("Register Error:", err);
      res.status(500).json({ message: "An error occurred while creating your team registration.", error: err.message });
    }
  }
);

// POST /api/auth/login
app.post(
  "/api/auth/login",
  [
    body("username").trim().isLength({ min: 3 }).withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { username, password } = req.body;

    try {
      const team = await dbTeam.findOne({ username });
      if (!team) {
        return res.status(401).json({ message: "Invalid username or password." });
      }

      const isMatch = await bcrypt.compare(password, team.passwordHash);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid username or password." });
        return;
      }

      const token = jwt.sign({ id: team._id, username: team.username, role: "team" }, JWT_SECRET, { expiresIn: "7d" });

      res.json({
        message: "Login successful!",
        token,
        team: {
          id: team._id,
          clubName: team.clubName,
          username: team.username,
          logoUrl: team.logoUrl
        }
      });
    } catch (err: any) {
      res.status(500).json({ message: "An error occurred during sign-in.", error: err.message });
    }
  }
);

// POST /api/auth/admin-login
app.post("/api/auth/admin-login", async (req: express.Request, res: express.Response) => {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ message: "Admin password is required." });
    return;
  }

  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ message: "Invalid administrator credentials." });
    return;
  }

  const token = jwt.sign({ id: "admin", username: "admin", role: "admin" }, JWT_SECRET, { expiresIn: "3d" });
  res.json({
    message: "Admin verification successful!",
    token,
    admin: {
      username: "admin",
      role: "admin"
    }
  });
});

// POST /api/auth/referee-login
app.post("/api/auth/referee-login", async (req: express.Request, res: express.Response) => {
  const { refereeName, password } = req.body;
  if (!refereeName || !password) {
    res.status(400).json({ message: "Referee Name and Password are required." });
    return;
  }

  if (password !== REFEREE_PASSWORD) {
    res.status(401).json({ message: "Invalid referee credentials." });
    return;
  }

  const token = jwt.sign({ id: refereeName, username: refereeName, role: "referee" }, JWT_SECRET, { expiresIn: "1d" });
  res.json({
    message: "Referee authenticated.",
    token,
    referee: { username: refereeName, role: "referee" }
  });
});

// GET /api/teams/:id
app.get("/api/teams/:id", verifyToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;

  // Enforce self-access or admin access
  if (req.user?.role !== "admin" && req.user?.id !== id) {
    res.status(403).json({ message: "Access forbidden. Unauthorized view." });
    return;
  }

  try {
    const team = await dbTeam.findById(id);
    if (!team) {
      res.status(404).json({ message: "Team not found." });
      return;
    }

    const players = await dbPlayer.find({ teamId: id });
    const officials = await dbOfficial.find({ teamId: id });

    res.json({
      team: {
        id: team._id,
        clubName: team.clubName,
        username: team.username,
        logoUrl: team.logoUrl,
        createdAt: team.createdAt
      },
      players,
      officials
    });
  } catch (err: any) {
    res.status(500).json({ message: "Error retrieval of team files.", error: err.message });
  }
});

// GET /api/teams/:id/players (for admin live scoring)
app.get("/api/teams/:id/players", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;

  try {
    const players = await dbPlayer.find({ teamId: id });
    res.json({ players });
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching players.", error: err.message });
  }
});

// POST /api/teams/:id/players
app.post(
  "/api/teams/:id/players",
  verifyToken,
  [
    body("name").trim().notEmpty().withMessage("Player Name is required"),
    body("age").isInt({ min: 1, max: 99 }).withMessage("Age must be between 1 and 99"),
    body("position").isIn(["Goalkeeper", "Defender", "Midfielder", "Forward"]).withMessage("Invalid player position"),
    body("photo").notEmpty().withMessage("Player Photo is required")
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;

    if (req.user?.role !== "admin" && req.user?.id !== id) {
      res.status(403).json({ message: "Access forbidden. Unauthorized roster modification." });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, age, position, photo, category } = req.body;

    try {
      // Validate Quota server-side
      const currentPlayers = await dbPlayer.find({ teamId: id });
      
      const parsedAge = parseInt(age, 10);

      const totalCount = currentPlayers.length;
      const u17Count = currentPlayers.filter(p => p.category === "Under-17").length;
      const freeAgeCount = currentPlayers.filter(p => p.category === "Free Age").length;

      if (totalCount >= 25) {
        res.status(400).json({ message: "Roster has reached the maximum capacity of 25 players." });
        return;
      }

      if (category === "Under-17" && u17Count >= 20) {
        res.status(400).json({ message: "Under-17 quota is full (Max 20 players)." });
        return;
      }

      if (category === "Free Age" && freeAgeCount >= 6) {
        res.status(400).json({ message: "Free Age quota is full (Max 6 players)." });
        return;
      }

      // Save player photo
      let finalPhotoUrl = "/placeholder-card.png";
      if (photo) {
        finalPhotoUrl = await handleImageSave(photo, `player-${id}`);
      }

      // Auto assign jersey number as chronological added order (or fallback math to avoid conflicts)
      let nextJersey = currentPlayers.length + 1;
      // Ensure it is unique in this roster
      const usedJerseys = new Set(currentPlayers.map(p => p.jerseyNumber));
      while (usedJerseys.has(nextJersey)) {
        nextJersey++;
      }

      const player = await dbPlayer.create({
        teamId: id,
        name,
        age: parsedAge,
        position,
        category,
        photoUrl: finalPhotoUrl,
        jerseyNumber: nextJersey
      });

      res.status(201).json({
        message: "Player added successfully!",
        player
      });
    } catch (err: any) {
      console.error("Add Player Error:", err);
      res.status(500).json({ message: "Error adding player.", error: err.message });
    }
  }
);

// POST /api/teams/:id/officials
app.post(
  "/api/teams/:id/officials",
  verifyToken,
  [
    body("name").trim().notEmpty().withMessage("Official Name is required"),
    body("position").isIn(["Head Coach", "Assistant Coach", "Team Doctor", "Kit Manager", "Manager"]).withMessage("Invalid official position"),
    body("photo").notEmpty().withMessage("Official Photo is required")
  ],
  async (req: AuthenticatedRequest, res: express.Response) => {
    const { id } = req.params;

    if (req.user?.role !== "admin" && req.user?.id !== id) {
      res.status(403).json({ message: "Access forbidden. Unauthorized roster modification." });
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, position, photo } = req.body;

    try {
      const officials = await dbOfficial.find({ teamId: id });
      if (officials.length >= 4) {
        res.status(400).json({ message: "Officials quota is full (Max 4 officials)." });
        return;
      }

      let finalPhotoUrl = "/placeholder-card.png";
      if (photo) {
        finalPhotoUrl = await handleImageSave(photo, `official-${id}`);
      }

      const official = await dbOfficial.create({
        teamId: id,
        name,
        position,
        photoUrl: finalPhotoUrl
      });

      res.status(201).json({
        message: "Official added successfully!",
        official
      });
    } catch (err: any) {
      res.status(500).json({ message: "Error adding official.", error: err.message });
    }
  }
);

// DELETE /api/admin/players/:id
app.delete("/api/admin/players/:id", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const deleted = await dbPlayer.deleteById(id);
    if (deleted) {
      res.json({ message: "Player removed successfully." });
    } else {
      res.status(404).json({ message: "Player not found." });
    }
  } catch (err: any) {
    res.status(500).json({ message: "Error removing player.", error: err.message });
  }
});

// DELETE /api/admin/teams/:id
app.delete("/api/admin/teams/:id", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const deleted = await dbTeam.deleteById(id);
    if (deleted) {
      // Cascade delete players and officials
      await dbPlayer.deleteByTeamId(id);
      await dbOfficial.deleteByTeamId(id);
      res.json({ message: "Team account and all associated rosters deleted successfully." });
    } else {
      res.status(404).json({ message: "Team not found." });
    }
  } catch (err: any) {
    res.status(500).json({ message: "Error deleting team.", error: err.message });
  }
});

// GET /api/admin/teams
app.get("/api/admin/teams", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const teams = await dbTeam.find();
    
    // Stitch rosters to each team
    const fullTeams = await Promise.all(
      teams.map(async (t) => {
        const players = await dbPlayer.find({ teamId: t._id });
        const officials = await dbOfficial.find({ teamId: t._id });
        return {
          id: t._id,
          clubName: t.clubName,
          username: t.username,
          logoUrl: t.logoUrl,
          createdAt: t.createdAt,
          group: t.group,
          players,
          officials
        };
      })
    );

    res.json({ teams: fullTeams });
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching administrator dashboard records.", error: err.message });
  }
});


// -------------------------------------------------------------
// TOURNAMENT ROUTES
// -------------------------------------------------------------

// PUT /api/admin/teams/:id/group
app.put("/api/admin/teams/:id/group", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { group } = req.body; // "A", "B", "C", or null

  try {
    const updated = await dbTeam.updateById(id, { group });
    if (!updated) {
      return res.status(404).json({ message: "Team not found." });
    }
    res.json({ message: "Team group updated.", team: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error updating team group.", error: err.message });
  }
});

// GET /api/matches
app.get("/api/matches", async (req: express.Request, res: express.Response) => {
  try {
    const matches = await dbMatch.find();
    
    // Populate team names and logos
    const populatedMatches = await Promise.all(
      matches.map(async (m) => {
        const homeTeam = await dbTeam.findById(m.homeTeamId);
        const awayTeam = await dbTeam.findById(m.awayTeamId);
        return {
          ...m,
          homeTeamName: homeTeam?.clubName || "Unknown Team",
          homeTeamLogo: homeTeam?.logoUrl || "/placeholder-logo.png",
          awayTeamName: awayTeam?.clubName || "Unknown Team",
          awayTeamLogo: awayTeam?.logoUrl || "/placeholder-logo.png",
        };
      })
    );

    res.json({ matches: populatedMatches });
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching matches.", error: err.message });
  }
});

// POST /api/admin/matches
app.post(
  "/api/admin/matches",
  verifyAdminToken,
  [
    body("homeTeamId").notEmpty().withMessage("Home team is required"),
    body("awayTeamId").notEmpty().withMessage("Away team is required"),
    body("stage").isIn(["Group Stage", "Quarter Final", "Semi Final", "Final"]).withMessage("Invalid match stage"),
    body("matchDate").notEmpty().withMessage("Match date is required"),
    body("round").optional()
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { homeTeamId, awayTeamId, stage, group, matchDate } = req.body;
    const round = req.body.round || null;

    if (homeTeamId === awayTeamId) {
      return res.status(400).json({ message: "Home team and away team cannot be the same." });
    }

    try {
      const match = await dbMatch.create({
        homeTeamId,
        awayTeamId,
        stage,
        group: group || null,
        round,
        matchDate,
        homeScore: null,
        awayScore: null,
        status: "Scheduled"
      });
      res.status(201).json({ message: "Match scheduled successfully.", match });
    } catch (err: any) {
      res.status(500).json({ message: "Error scheduling match.", error: err.message });
    }
  }
);

// PUT /api/admin/matches/:id
app.put("/api/admin/matches/:id", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { homeScore, awayScore, status, matchDate, round, homeTeamId, awayTeamId, refereeId } = req.body;
  
  try {
    const updated = await dbMatch.updateById(id, {
      homeScore: homeScore !== undefined ? homeScore : null,
      awayScore: awayScore !== undefined ? awayScore : null,
      status: status || "Scheduled",
      homeTeamId: homeTeamId !== undefined ? homeTeamId : undefined,
      awayTeamId: awayTeamId !== undefined ? awayTeamId : undefined,
      round: round !== undefined ? (round || null) : undefined,
      refereeId: refereeId !== undefined ? (refereeId || null) : undefined,
      matchDate
    });

    if (!updated) return res.status(404).json({ message: "Match not found." });
    res.json({ message: "Match updated.", match: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error updating match.", error: err.message });
  }
});

// DELETE /api/admin/matches/:id
app.delete("/api/admin/matches/:id", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const deleted = await dbMatch.deleteById(id);
    if (deleted) res.json({ message: "Match deleted successfully." });
    else res.status(404).json({ message: "Match not found." });
  } catch (err: any) {
    res.status(500).json({ message: "Error deleting match.", error: err.message });
  }
});

// POST /api/admin/matches/:id/start-live
app.post("/api/admin/matches/:id/start-live", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const updated = await dbMatch.updateById(id, { 
      status: "Live", 
      goals: [], 
      cards: [],
      timerLastStarted: new Date().toISOString(),
      timerAccumulatedTime: 0
    });
    if (!updated) return res.status(404).json({ message: "Match not found." });
    res.json({ message: "Match started live.", match: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error starting match.", error: err.message });
  }
});

// POST /api/admin/matches/:id/record-goal
app.post("/api/admin/matches/:id/record-goal", verifyRefereeToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { playerId, playerName, jerseyNumber, team, timerLastStarted, timerAccumulatedTime, matchTime } = req.body;

  try {
    const match = await dbMatch.findById(id);
    if (!match) return res.status(404).json({ message: "Match not found." });

    if (!match.goals) match.goals = [];
    
    match.goals.push({
      playerId,
      playerName,
      jerseyNumber,
      team,
      timestamp: new Date().toISOString(),
      matchTime
    });

    // Update scores based on goals
    const homeGoals = match.goals.filter(g => g.team === "home").length;
    const awayGoals = match.goals.filter(g => g.team === "away").length;

    const updated = await dbMatch.updateById(id, {
      goals: match.goals,
      homeScore: homeGoals,
      awayScore: awayGoals,
      timerLastStarted: timerLastStarted !== undefined ? timerLastStarted : match.timerLastStarted,
      timerAccumulatedTime: timerAccumulatedTime !== undefined ? timerAccumulatedTime : match.timerAccumulatedTime
    });

    res.json({ message: "Goal recorded.", match: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error recording goal.", error: err.message });
  }
});

// DELETE /api/admin/matches/:id/goal/:goalIndex
app.delete("/api/admin/matches/:id/goal/:goalIndex", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id, goalIndex } = req.params;

  try {
    const match = await dbMatch.findById(id);
    if (!match) return res.status(404).json({ message: "Match not found." });

    if (!match.goals || !match.goals[goalIndex]) {
      return res.status(404).json({ message: "Goal not found." });
    }

    match.goals.splice(parseInt(goalIndex), 1);

    // Recalculate scores
    const homeGoals = match.goals.filter(g => g.team === "home").length;
    const awayGoals = match.goals.filter(g => g.team === "away").length;

    const updated = await dbMatch.updateById(id, {
      goals: match.goals,
      homeScore: homeGoals,
      awayScore: awayGoals
    });

    res.json({ message: "Goal removed.", match: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error removing goal.", error: err.message });
  }
});

// POST /api/admin/matches/:id/record-card
app.post("/api/admin/matches/:id/record-card", verifyRefereeToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { playerId, playerName, jerseyNumber, team, type, timestamp, timerLastStarted, timerAccumulatedTime, matchTime } = req.body;

  try {
    const match = await dbMatch.findById(id);
    if (!match) return res.status(404).json({ message: "Match not found" });

    if (!match.cards) match.cards = [];
    
    match.cards.push({
      playerId,
      playerName,
      jerseyNumber,
      team,
      type,
      timestamp: timestamp || new Date().toISOString(),
      matchTime
    });

    const updated = await dbMatch.updateById(id, {
      cards: match.cards,
      timerLastStarted: timerLastStarted !== undefined ? timerLastStarted : match.timerLastStarted,
      timerAccumulatedTime: timerAccumulatedTime !== undefined ? timerAccumulatedTime : match.timerAccumulatedTime
    });

    res.json({ message: "Card recorded.", match: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error recording card.", error: err.message });
  }
});

// DELETE /api/admin/matches/:id/card/:cardIndex
app.delete("/api/admin/matches/:id/card/:cardIndex", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id, cardIndex } = req.params;

  try {
    const match = await dbMatch.findById(id);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const index = parseInt(cardIndex);
    if (!match.cards || isNaN(index) || !match.cards[index]) {
      return res.status(404).json({ message: "Card not found." });
    }

    match.cards.splice(index, 1);

    const updated = await dbMatch.updateById(id, {
      cards: match.cards
    });

    res.json({ message: "Card removed.", match: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error removing card.", error: err.message });
  }
});

// POST /api/admin/matches/:id/end-live
app.post("/api/admin/matches/:id/end-live", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const updated = await dbMatch.updateById(id, { 
      status: "Completed",
      timerLastStarted: null,
      timerAccumulatedTime: 0
    });
    if (!updated) return res.status(404).json({ message: "Match not found." });
    res.json({ message: "Match ended.", match: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error ending match.", error: err.message });
  }
});

// POST /api/admin/matches/:id/sync-timer
app.post("/api/admin/matches/:id/sync-timer", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { timerLastStarted, timerAccumulatedTime } = req.body;

  try {
    const updated = await dbMatch.updateById(id, {
      timerLastStarted,
      timerAccumulatedTime
    });

    if (!updated) return res.status(404).json({ message: "Match not found." });
    res.json({ message: "Timer synced.", match: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error syncing timer.", error: err.message });
  }
});

// POST /api/matches/:id/lineup
app.post("/api/matches/:id/lineup", verifyToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const { id } = req.params;
  const { formation, starting11, bench } = req.body;
  const teamId = req.user?.id;

  try {
    const match = await dbMatch.findById(id);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const isHome = match.homeTeamId === teamId;
    const isAway = match.awayTeamId === teamId;

    if (!isHome && !isAway && req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Unauthorized: You are not a participant in this match." });
    }

    const update: any = {};
    if (isHome) update.homeLineup = { formation, starting11, bench };
    if (isAway) update.awayLineup = { formation, starting11, bench };

    const updated = await dbMatch.updateById(id, update);
    res.json({ message: "Lineup successfully submitted.", match: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error committing lineup.", error: err.message });
  }
});

// GET /api/matches/:id/rosters
app.get("/api/matches/:id/rosters", async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const match = await dbMatch.findById(id);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const [homePlayers, awayPlayers] = await Promise.all([
      dbPlayer.find({ teamId: match.homeTeamId }),
      dbPlayer.find({ teamId: match.awayTeamId })
    ]);

    res.json({ homePlayers, awayPlayers });
  } catch (err: any) {
    res.status(500).json({ message: "Error retrieving match rosters.", error: err.message });
  }
});

// GET /api/matches/:id/goal-scorers
app.get("/api/matches/:id/goal-scorers", async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  try {
    const match = await dbMatch.findById(id);
    if (!match) return res.status(404).json({ message: "Match not found." });

    const goals = match.goals || [];
    const homeGoalScorers: Record<string, number> = {};
    const awayGoalScorers: Record<string, number> = {};

    goals.forEach(goal => {
      const key = `${goal.playerName} (#${goal.jerseyNumber})`;
      if (goal.team === "home") {
        homeGoalScorers[key] = (homeGoalScorers[key] || 0) + 1;
      } else {
        awayGoalScorers[key] = (awayGoalScorers[key] || 0) + 1;
      }
    });

    res.json({
      homeGoalScorers: Object.entries(homeGoalScorers).map(([name, goals]) => ({ name, goals })),
      awayGoalScorers: Object.entries(awayGoalScorers).map(([name, goals]) => ({ name, goals }))
    });
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching goal scorers.", error: err.message });
  }
});

// GET /api/stats
app.get("/api/stats", async (req: express.Request, res: express.Response) => {
  try {
    const matches = await dbMatch.find();
    const teams = await dbTeam.find();
    
    const scorerMap: Record<string, { name: string, team: string, teamLogo: string, goals: number }> = {};
    const disciplinaryRecords: Array<{
      playerName: string,
      playerId: string,
      teamName: string,
      teamLogo: string,
      type: "Yellow" | "Red",
      date: string,
      matchMissed?: string
    }> = [];

    // Sort matches chronologically to find next fixtures for suspensions
    const sortedMatches = [...matches].sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

    matches.forEach(m => {
      const homeTeam = teams.find(t => t._id.toString() === m.homeTeamId);
      const awayTeam = teams.find(t => t._id.toString() === m.awayTeamId);

      // Process Goals
      (m.goals || []).forEach(g => {
        const team = g.team === 'home' ? homeTeam : awayTeam;
        if (!scorerMap[g.playerId]) {
          scorerMap[g.playerId] = {
            name: g.playerName,
            team: team?.clubName || "Unknown",
            teamLogo: team?.logoUrl || "/placeholder-logo.png",
            goals: 0
          };
        }
        scorerMap[g.playerId].goals += 1;
      });

      // Process Cards
      (m.cards || []).forEach(c => {
        const team = c.team === 'home' ? homeTeam : awayTeam;
        const teamId = c.team === 'home' ? m.homeTeamId : m.awayTeamId;
        
        let matchMissed = undefined;
        if (c.type === 'Red') {
          // Find the next scheduled match for this team
          const nextMatch = sortedMatches.find(sm => 
            new Date(sm.matchDate) > new Date(m.matchDate) && 
            (sm.homeTeamId === teamId || sm.awayTeamId === teamId)
          );
          
          if (nextMatch) {
            const vsTeamId = nextMatch.homeTeamId === teamId ? nextMatch.awayTeamId : nextMatch.homeTeamId;
            const vsTeam = teams.find(t => t._id.toString() === vsTeamId);
            matchMissed = `vs ${vsTeam?.clubName || 'TBD'} (${new Date(nextMatch.matchDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
          } else {
            matchMissed = "Tournament Exit / Final";
          }
        }

        disciplinaryRecords.push({
          playerName: c.playerName,
          playerId: c.playerId,
          teamName: team?.clubName || "Unknown",
          teamLogo: team?.logoUrl || "/placeholder-logo.png",
          type: c.type,
          date: m.matchDate,
          matchMissed
        });
      });
    });

    const topScorers = Object.values(scorerMap)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 15);

    // Sort disciplinary by date descending
    const disciplinary = disciplinaryRecords.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json({
      topScorers,
      disciplinary
    });
  } catch (err: any) {
    res.status(500).json({ 
      message: "Error compiling tournament statistics.", 
      error: err.message 
    });
  }
});

// GET /api/standings
app.get("/api/standings", async (req: express.Request, res: express.Response) => {
  try {
    const teams = await dbTeam.find();
    const matches = await dbMatch.find({ stage: "Group Stage", status: "Completed" });

    const standings: Record<string, Record<string, any>> = {
      "A": {}, "B": {}, "C": {}
    };

    // Initialize standings for teams that have a group
    teams.forEach(t => {
      if (t.group && standings[t.group]) {
        standings[t.group][t._id.toString()] = {
          teamId: t._id,
          clubName: t.clubName,
          logoUrl: t.logoUrl,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        };
      }
    });

    // Calculate match results
    matches.forEach(m => {
      if (!m.group || !standings[m.group]) return;

      const homeStats = standings[m.group][m.homeTeamId];
      const awayStats = standings[m.group][m.awayTeamId];

      if (homeStats && awayStats && m.homeScore !== null && m.awayScore !== null) {
        homeStats.played += 1;
        awayStats.played += 1;
        homeStats.goalsFor += m.homeScore;
        homeStats.goalsAgainst += m.awayScore;
        awayStats.goalsFor += m.awayScore;
        awayStats.goalsAgainst += m.homeScore;

        if (m.homeScore > m.awayScore) {
          homeStats.won += 1;
          homeStats.points += 3;
          awayStats.lost += 1;
        } else if (m.homeScore < m.awayScore) {
          awayStats.won += 1;
          awayStats.points += 3;
          homeStats.lost += 1;
        } else {
          homeStats.drawn += 1;
          awayStats.drawn += 1;
          homeStats.points += 1;
          awayStats.points += 1;
        }

        homeStats.goalDifference = homeStats.goalsFor - homeStats.goalsAgainst;
        awayStats.goalDifference = awayStats.goalsFor - awayStats.goalsAgainst;
      }
    });

    // Convert to arrays and sort
    const formattedStandings = {
      A: Object.values(standings["A"]).sort((a: any, b: any) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor),
      B: Object.values(standings["B"]).sort((a: any, b: any) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor),
      C: Object.values(standings["C"]).sort((a: any, b: any) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
    };

    res.json({ standings: formattedStandings });
  } catch (err: any) {
    res.status(500).json({ message: "Error calculating standings.", error: err.message });
  }
});

// -------------------------------------------------------------
// CLUB REGISTRATION ROUTES
// -------------------------------------------------------------

// POST /api/club-registrations  (public — no auth required)
app.post("/api/club-registrations", async (req: express.Request, res: express.Response) => {
  const {
    clubName, foundedYear, lga, homeGround, clubColors, clubCategory, clubLogoBase64,
    chairmanName, secretaryName, phone, whatsapp, email, websiteOrSocial,
    headCoach, coachLicense, numPlayers, ageRange,
    prevLeague, prevLeagueNames, prevTransfer
  } = req.body;

  if (!clubName || !lga || !clubCategory || !chairmanName || !phone || !email || !headCoach) {
    res.status(400).json({ message: "Missing required fields." });
    return;
  }

  try {
    let clubLogoUrl = "";
    if (clubLogoBase64 && clubLogoBase64.startsWith("data:image/")) {
      clubLogoUrl = await handleImageSave(clubLogoBase64, "club-logo");
    }

    // Send registration received email (non-blocking)
    sendEmail(
      email,
      `We've Received Your Club Registration — SmartCity Osun State Football League`,
      registrationReceivedEmail(clubName.trim(), lga, clubCategory, chairmanName.trim())
    );

    const registration = await dbClubRegistration.create({
      clubName: clubName.trim(),
      foundedYear: foundedYear || "",
      lga,
      homeGround: homeGround || "",
      clubColors: clubColors || "",
      clubCategory,
      clubLogoUrl,
      chairmanName: chairmanName.trim(),
      secretaryName: secretaryName || "",
      phone: phone.trim(),
      whatsapp: whatsapp || "",
      email: email.trim(),
      websiteOrSocial: websiteOrSocial || "",
      headCoach: headCoach.trim(),
      coachLicense: coachLicense || "",
      numPlayers: numPlayers || "",
      ageRange: ageRange || "",
      prevLeague: prevLeague || "",
      prevLeagueNames: prevLeagueNames || "",
      prevTransfer: prevTransfer || ""
    });

    res.status(201).json({ message: "Registration submitted successfully!", registration });
  } catch (err: any) {
    console.error("Club Registration Error:", err);
    res.status(500).json({ message: "Error submitting registration.", error: err.message });
  }
});

// GET /api/admin/club-registrations  (admin only)
app.get("/api/admin/club-registrations", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const registrations = await dbClubRegistration.find(query);
    const counts = await dbClubRegistration.countByStatus();
    res.json({ registrations, counts });
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching registrations.", error: err.message });
  }
});

// GET /api/admin/club-registrations/:id  (admin only)
app.get("/api/admin/club-registrations/:id", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const reg = await dbClubRegistration.findById(req.params.id);
    if (!reg) return res.status(404).json({ message: "Registration not found." });
    res.json({ registration: reg });
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching registration.", error: err.message });
  }
});

// PATCH /api/admin/club-registrations/:id/status  (admin only)
app.patch("/api/admin/club-registrations/:id/status", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const { status, rejectionReason, email, password } = req.body;

  if (!status || !["Approved", "Rejected", "Pending"].includes(status)) {
    res.status(400).json({ message: "Invalid status value." });
    return;
  }

  try {
    const updateData: any = {
      status,
      rejectionReason: rejectionReason || "",
      reviewedAt: new Date().toISOString()
    };

    if (status === "Approved") {
      if (!email || !password) {
        res.status(400).json({ message: "Credentials (email and password) are required for approval." });
        return;
      }
      updateData.email = email.trim();
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await dbClubRegistration.updateById(id, updateData);
    if (!updated) return res.status(404).json({ message: "Registration not found." });

    if (status === "Approved") {
      const approvedDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      sendEmail(
        email,
        `🎉 Congratulations! Your Club Has Been Approved — SmartCity Osun State Football League`,
        clubApprovedEmail(updated.clubName, email, password, approvedDate)
      );
    } else if (status === "Rejected") {
      sendEmail(
        updated.email || "",
        `Update on Your Club Registration — SmartCity Osun State Football League`,
        clubRejectedEmail(updated.clubName, rejectionReason || "")
      );
    }

    res.json({ message: `Registration ${status.toLowerCase()}.`, registration: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error updating registration status.", error: err.message });
  }
});

// DELETE /api/admin/club-registrations/:id  (admin only)
app.delete("/api/admin/club-registrations/:id", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const deleted = await dbClubRegistration.deleteById(req.params.id);
    if (deleted) res.json({ message: "Registration deleted." });
    else res.status(404).json({ message: "Registration not found." });
  } catch (err: any) {
    res.status(500).json({ message: "Error deleting registration.", error: err.message });
  }
});

// -------------------------------------------------------------
// Club Portal Auth Endpoints
// -------------------------------------------------------------

// POST /api/club-auth/login  (public)
app.post("/api/club-auth/login", async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  try {
    const club = await dbClubRegistration.findOne({
      email: { $regex: new RegExp("^" + email.trim() + "$", "i") },
      status: "Approved"
    });

    if (!club || !club.passwordHash) {
      res.status(401).json({ message: "Invalid email or password. Please check your login details or contact the league admin." });
      return;
    }

    const isMatch = await bcrypt.compare(password, club.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email or password. Please check your login details or contact the league admin." });
      return;
    }

    const token = jwt.sign({ id: club._id, email: club.email, role: "club" }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      message: "Login successful!",
      token,
      club: {
        id: club._id,
        clubName: club.clubName,
        email: club.email,
        logoUrl: club.clubLogoUrl,
        conference: club.conference || ""
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: "An error occurred during sign-in.", error: err.message });
  }
});

// GET /api/club-auth/me  (club only)
app.get("/api/club-auth/me", verifyClubToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const club = await dbClubRegistration.findById(req.user!.id);
    if (!club || club.status !== "Approved") {
      res.status(404).json({ message: "Club not found or not approved." });
      return;
    }

    const announcements = [
      {
        id: "ann_1",
        title: "Welcome to SmartCity League",
        content: "Welcome to the SmartCity Osun State Football League! Your conference assignment will be communicated soon.",
        date: new Date().toISOString()
      },
      {
        id: "ann_2",
        title: "Season Guidelines PDF",
        content: "Please download the official Season Guidelines and Roster Rules from the documents section below. Kick-off dates will be finalized next week.",
        date: new Date().toISOString()
      }
    ];

    res.json({ club, announcements });
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching club profile.", error: err.message });
  }
});

// PUT /api/club-auth/profile  (club only)
app.put("/api/club-auth/profile", verifyClubToken, async (req: AuthenticatedRequest, res: express.Response) => {
  const {
    chairmanName, secretaryName, phone, whatsapp, email, websiteOrSocial, clubLogoBase64
  } = req.body;

  try {
    const updateData: any = {};
    if (chairmanName !== undefined) updateData.chairmanName = chairmanName.trim();
    if (secretaryName !== undefined) updateData.secretaryName = secretaryName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (websiteOrSocial !== undefined) updateData.websiteOrSocial = websiteOrSocial.trim();

    if (clubLogoBase64 && clubLogoBase64.startsWith("data:image/")) {
      updateData.clubLogoUrl = await handleImageSave(clubLogoBase64, "club-logo");
    }

    const updated = await dbClubRegistration.updateById(req.user!.id, updateData);
    if (!updated) {
      res.status(404).json({ message: "Club not found." });
      return;
    }

    res.json({ message: "Profile updated successfully!", club: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Error updating profile.", error: err.message });
  }
});

// POST /api/club-auth/forgot-password  (public) — generates & emails 6-digit OTP
app.post("/api/club-auth/forgot-password", async (req: express.Request, res: express.Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ message: "Email is required." });
    return;
  }

  try {
    const club = await dbClubRegistration.findOne({
      email: { $regex: new RegExp("^" + email.trim() + "$", "i") },
      status: "Approved"
    });

    // Always respond success to prevent email enumeration
    if (club) {
      const code = generateOtp();
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await dbOtp.set(email.trim(), code, expires);

      sendEmail(
        email.trim(),
        `🔐 Your Password Reset Code — SmartCity Osun State Football League`,
        passwordResetCodeEmail(club.clubName, code)
      );
    }

    res.json({ message: "If this email is registered, a 6-digit code has been sent to it.", codeSent: true });
  } catch (err: any) {
    res.status(500).json({ message: "Error processing request.", error: err.message });
  }
});

// POST /api/club-auth/verify-reset-code  (public)
app.post("/api/club-auth/verify-reset-code", async (req: express.Request, res: express.Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ message: "Email and code are required." });
    return;
  }

  try {
    const stored = await dbOtp.get(email.trim());
    if (!stored) {
      res.status(400).json({ message: "No reset code found. Please request a new one." });
      return;
    }
    if (new Date() > stored.expires) {
      await dbOtp.delete(email.trim());
      res.status(400).json({ message: "This code has expired. Please request a new one." });
      return;
    }
    if (stored.code !== code.trim()) {
      res.status(400).json({ message: "Incorrect code. Please try again." });
      return;
    }
    res.json({ valid: true, message: "Code verified. You may now reset your password." });
  } catch (err: any) {
    res.status(500).json({ message: "Error verifying code.", error: err.message });
  }
});

// POST /api/club-auth/reset-password  (public)
app.post("/api/club-auth/reset-password", async (req: express.Request, res: express.Response) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    res.status(400).json({ message: "Email, code, and new password are required." });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ message: "Password must be at least 6 characters." });
    return;
  }

  try {
    const stored = await dbOtp.get(email.trim());
    if (!stored || stored.code !== code.trim() || new Date() > stored.expires) {
      res.status(400).json({ message: "Invalid or expired reset code. Please restart the process." });
      return;
    }

    const club = await dbClubRegistration.findOne({
      email: { $regex: new RegExp("^" + email.trim() + "$", "i") },
      status: "Approved"
    });
    if (!club) {
      res.status(404).json({ message: "Club not found." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await dbClubRegistration.updateById(club._id.toString(), { passwordHash });
    await dbOtp.delete(email.trim()); // Clear the used code

    res.json({ message: "Password reset successfully! You can now log in with your new password." });
  } catch (err: any) {
    res.status(500).json({ message: "Error resetting password.", error: err.message });
  }
});

// -------------------------------------------------------------
// Club Portal: Player Management Endpoints
// -------------------------------------------------------------

// GET /api/club-auth/players (club only)
app.get("/api/club-auth/players", verifyClubToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const players = await dbClubPlayer.find({ clubId: req.user!.id });
    res.json({ players });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch club players.", error: err.message });
  }
});

// POST /api/club-auth/players (club only)
app.post("/api/club-auth/players", verifyClubToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const {
      name, dob, gender, nationality, stateOfOrigin, lgaOfOrigin, homeAddress, phone,
      jerseyNumber, primaryPosition, secondaryPosition, preferredFoot, height, weight,
      experience, photoBase64, docBase64, prevClub, transferLetterBase64,
      guardianName, guardianRelationship, guardianPhone
    } = req.body;

    if (!name || !dob || !gender || !stateOfOrigin || !lgaOfOrigin || !homeAddress || !phone ||
        !jerseyNumber || !primaryPosition || !preferredFoot || !height || !weight ||
        !experience || !photoBase64 || !docBase64 || !guardianName || !guardianRelationship || !guardianPhone) {
      res.status(400).json({ message: "Missing required player fields." });
      return;
    }

    // Auto-calculate age
    const birthDate = new Date(dob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }

    // Upload files to Cloudinary
    const photoUrl = await handleFileSave(photoBase64, `player-photo-${jerseyNumber}`, "image");
    const docUrl = await handleFileSave(docBase64, `player-doc-${jerseyNumber}`, "auto");
    let transferLetterUrl = "";
    if (transferLetterBase64) {
      transferLetterUrl = await handleFileSave(transferLetterBase64, `player-transfer-${jerseyNumber}`, "auto");
    }

    const player = await dbClubPlayer.create({
      clubId: req.user!.id,
      name: name.trim(),
      dob,
      age: calculatedAge,
      gender,
      nationality: nationality || "Nigerian",
      stateOfOrigin,
      lgaOfOrigin,
      homeAddress,
      phone,
      jerseyNumber: Number(jerseyNumber),
      primaryPosition,
      secondaryPosition: secondaryPosition || "",
      preferredFoot,
      height: Number(height),
      weight: Number(weight),
      experience: Number(experience),
      photoUrl,
      docUrl,
      prevClub: prevClub || "",
      transferLetterUrl,
      guardianName,
      guardianRelationship,
      guardianPhone
    });

    res.status(201).json({ message: "Player added successfully and is pending admin review.", player });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to add player.", error: err.message });
  }
});

// PUT /api/club-auth/players/:id (club only)
app.put("/api/club-auth/players/:id", verifyClubToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const existing = await dbClubPlayer.findById(id);
    if (!existing || existing.clubId !== req.user!.id) {
      res.status(404).json({ message: "Player not found." });
      return;
    }

    const {
      name, dob, gender, nationality, stateOfOrigin, lgaOfOrigin, homeAddress, phone,
      jerseyNumber, primaryPosition, secondaryPosition, preferredFoot, height, weight,
      experience, photoBase64, docBase64, prevClub, transferLetterBase64,
      guardianName, guardianRelationship, guardianPhone
    } = req.body;

    const updateData: any = { status: "Pending", rejectionReason: "" };

    if (name !== undefined) updateData.name = name.trim();
    if (dob !== undefined) {
      updateData.dob = dob;
      const birthDate = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      updateData.age = calculatedAge;
    }
    if (gender !== undefined) updateData.gender = gender;
    if (nationality !== undefined) updateData.nationality = nationality;
    if (stateOfOrigin !== undefined) updateData.stateOfOrigin = stateOfOrigin;
    if (lgaOfOrigin !== undefined) updateData.lgaOfOrigin = lgaOfOrigin;
    if (homeAddress !== undefined) updateData.homeAddress = homeAddress;
    if (phone !== undefined) updateData.phone = phone;
    if (jerseyNumber !== undefined) updateData.jerseyNumber = Number(jerseyNumber);
    if (primaryPosition !== undefined) updateData.primaryPosition = primaryPosition;
    if (secondaryPosition !== undefined) updateData.secondaryPosition = secondaryPosition;
    if (preferredFoot !== undefined) updateData.preferredFoot = preferredFoot;
    if (height !== undefined) updateData.height = Number(height);
    if (weight !== undefined) updateData.weight = Number(weight);
    if (experience !== undefined) updateData.experience = Number(experience);
    if (prevClub !== undefined) updateData.prevClub = prevClub;
    if (guardianName !== undefined) updateData.guardianName = guardianName;
    if (guardianRelationship !== undefined) updateData.guardianRelationship = guardianRelationship;
    if (guardianPhone !== undefined) updateData.guardianPhone = guardianPhone;

    const jerseySuffix = updateData.jerseyNumber || existing.jerseyNumber;
    if (photoBase64 && photoBase64.startsWith("data:")) {
      updateData.photoUrl = await handleFileSave(photoBase64, `player-photo-${jerseySuffix}`, "image");
    }
    if (docBase64 && docBase64.startsWith("data:")) {
      updateData.docUrl = await handleFileSave(docBase64, `player-doc-${jerseySuffix}`, "auto");
    }
    if (transferLetterBase64 && transferLetterBase64.startsWith("data:")) {
      updateData.transferLetterUrl = await handleFileSave(transferLetterBase64, `player-transfer-${jerseySuffix}`, "auto");
    }

    const updated = await dbClubPlayer.updateById(id, updateData);
    res.json({ message: "Player updated successfully and is pending admin review.", player: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to update player.", error: err.message });
  }
});

// DELETE /api/club-auth/players/:id (club only)
app.delete("/api/club-auth/players/:id", verifyClubToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const existing = await dbClubPlayer.findById(id);
    if (!existing || existing.clubId !== req.user!.id) {
      res.status(404).json({ message: "Player not found." });
      return;
    }
    await dbClubPlayer.deleteById(id);
    res.json({ message: "Player removed from squad." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to delete player.", error: err.message });
  }
});

// -------------------------------------------------------------
// Admin Side: Player Review Endpoints
// -------------------------------------------------------------

// GET /api/admin/players (admin only)
app.get("/api/admin/players", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const rawPlayers = await dbClubPlayer.find({});
    // Populate club name
    const clubs = await dbClubRegistration.find({});
    const clubMap = new Map(clubs.map(c => [c._id.toString(), c.clubName]));

    const players = rawPlayers.map(p => ({
      ...p,
      clubName: clubMap.get(p.clubId) || "Unknown Club"
    }));

    // Return counts and players
    const counts = {
      total: players.length,
      pending: players.filter(p => p.status === "Pending").length,
      approved: players.filter(p => p.status === "Approved").length,
      rejected: players.filter(p => p.status === "Rejected").length,
    };

    res.json({ players, counts });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch players for review.", error: err.message });
  }
});

// PATCH /api/admin/players/:id/status (admin only)
app.patch("/api/admin/players/:id/status", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!status || !["Approved", "Rejected"].includes(status)) {
      res.status(400).json({ message: "Invalid status value." });
      return;
    }

    if (status === "Rejected" && !rejectionReason) {
      res.status(400).json({ message: "Rejection reason is required." });
      return;
    }

    const updated = await dbClubPlayer.updateById(id, {
      status,
      rejectionReason: status === "Rejected" ? rejectionReason : ""
    });

    if (!updated) {
      res.status(404).json({ message: "Player not found." });
      return;
    }

    // Look up the club email for notification
    if (updated.clubId) {
      try {
        const club = await dbClubRegistration.findById(updated.clubId);
        if (club?.email) {
          if (status === "Approved") {
            sendEmail(
              club.email,
              `✅ Player Approved — ${updated.name} | SmartCity Osun State Football League`,
              playerApprovedEmail(club.clubName, updated.name, updated.primaryPosition, updated.jerseyNumber)
            );
          } else if (status === "Rejected") {
            sendEmail(
              club.email,
              `⚠️ Player Registration Update — ${updated.name} | SmartCity Osun State Football League`,
              playerRejectedEmail(club.clubName, updated.name, rejectionReason || "")
            );
          }
        }
      } catch (emailErr) {
        console.error("[EMAIL ERROR] Failed to fetch club for player notification:", emailErr);
      }
    }

    res.json({ message: `Player ${status.toLowerCase()} successfully`, player: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to update player status.", error: err.message });
  }
});

// -------------------------------------------------------------
// Admin Side: Communications (Announcements) Endpoints
// -------------------------------------------------------------

// GET /api/admin/announcements
app.get("/api/admin/announcements", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const announcements = await dbAnnouncement.find({});
    res.json({ announcements });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch announcements.", error: err.message });
  }
});

// POST /api/admin/announcements
app.post("/api/admin/announcements", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const { title, category, targetAudience, targetClubId, content, pinned, publishDate, status } = req.body;
    if (!title || !category || !targetAudience || !content || !publishDate) {
      res.status(400).json({ message: "Missing required fields." });
      return;
    }

    const announcement = await dbAnnouncement.create({
      title,
      category,
      targetAudience,
      targetClubId: targetClubId || "",
      content,
      pinned: !!pinned,
      publishDate,
      status: status || "Published"
    });

    // Send email notification to targeted clubs (non-blocking)
    if (announcement.status === "Published") {
      try {
        const allClubs = await dbClubRegistration.find({ status: "Approved" });
        let targetEmails: string[] = [];
        if (targetAudience === "All" || targetAudience === "Approved") {
          targetEmails = allClubs.map((c: any) => c.email).filter(Boolean);
        } else if (targetAudience === "Specific" && targetClubId) {
          const specificClub = allClubs.find((c: any) => c._id.toString() === targetClubId);
          if (specificClub?.email) targetEmails = [specificClub.email];
        }
        const subject = `📢 New Announcement: ${title} — SmartCity Osun State Football League`;
        for (const clubEmail of targetEmails) {
          const club = allClubs.find((c: any) => c.email === clubEmail);
          sendEmail(
            clubEmail,
            subject,
            newAnnouncementEmail(club?.clubName || "Club", title, category, content, publishDate)
          );
        }
      } catch (emailErr) {
        console.error("[EMAIL ERROR] Failed sending announcement emails:", emailErr);
      }
    }

    res.status(201).json({ message: "Announcement published successfully.", announcement });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to publish announcement.", error: err.message });
  }
});

// PUT /api/admin/announcements/:id
app.put("/api/admin/announcements/:id", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { title, category, targetAudience, targetClubId, content, pinned, publishDate, status } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (category !== undefined) updateData.category = category;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    if (targetClubId !== undefined) updateData.targetClubId = targetClubId;
    if (content !== undefined) updateData.content = content;
    if (pinned !== undefined) updateData.pinned = !!pinned;
    if (publishDate !== undefined) updateData.publishDate = publishDate;
    if (status !== undefined) updateData.status = status;

    const updated = await dbAnnouncement.updateById(id, updateData);
    if (!updated) {
      res.status(404).json({ message: "Announcement not found." });
      return;
    }
    res.json({ message: "Announcement updated successfully.", announcement: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to update announcement.", error: err.message });
  }
});

// DELETE /api/admin/announcements/:id
app.delete("/api/admin/announcements/:id", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const result = await dbAnnouncement.deleteById(id);
    if (!result) {
      res.status(404).json({ message: "Announcement not found." });
      return;
    }
    res.json({ message: "Announcement deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to delete announcement.", error: err.message });
  }
});

// -------------------------------------------------------------
// Admin Side: Communications (Documents) Endpoints
// -------------------------------------------------------------

// GET /api/admin/documents
app.get("/api/admin/documents", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const documents = await dbDocument.find({});
    res.json({ documents });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch documents.", error: err.message });
  }
});

// POST /api/admin/documents
app.post("/api/admin/documents", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const { title, type, description, targetAudience, targetClubId, fileBase64, fileName, visibility } = req.body;
    if (!title || !type || !targetAudience || !fileBase64 || !fileName) {
      res.status(400).json({ message: "Missing required fields." });
      return;
    }

    // Estimate file size from base64 if not sent
    let sizeStr = "Unknown Size";
    try {
      const stringLength = fileBase64.length - (fileBase64.indexOf(",") + 1);
      const sizeInBytes = (stringLength * 3) / 4 - (fileBase64.endsWith("==") ? 2 : fileBase64.endsWith("=") ? 1 : 0);
      const sizeInMb = sizeInBytes / (1024 * 1024);
      sizeStr = sizeInMb < 0.1 ? `${(sizeInBytes / 1024).toFixed(1)} KB` : `${sizeInMb.toFixed(1)} MB`;
    } catch {}

    const fileUrl = await handleFileSave(fileBase64, `doc-${Date.now()}`, "auto");

    const document = await dbDocument.create({
      title,
      type,
      description: description || "",
      targetAudience,
      targetClubId: targetClubId || "",
      fileUrl,
      fileSize: sizeStr,
      visibility: visibility || "Public"
    });

    // Send email notification to targeted clubs (non-blocking)
    try {
      const allClubs = await dbClubRegistration.find({ status: "Approved" });
      let targetEmails: { email: string; clubName: string }[] = [];
      if (targetAudience === "All" || targetAudience === "Approved") {
        targetEmails = allClubs.map((c: any) => ({ email: c.email, clubName: c.clubName })).filter((c: any) => c.email);
      } else if (targetAudience === "Specific" && targetClubId) {
        const specificClub = allClubs.find((c: any) => c._id.toString() === targetClubId);
        if (specificClub?.email) targetEmails = [{ email: specificClub.email, clubName: specificClub.clubName }];
      }
      const subject = `📁 New Document Available: ${title} — SmartCity Osun State Football League`;
      for (const { email: clubEmail, clubName } of targetEmails) {
        sendEmail(clubEmail, subject, newDocumentEmail(clubName, title, type, description || ""));
      }
    } catch (emailErr) {
      console.error("[EMAIL ERROR] Failed sending document emails:", emailErr);
    }

    res.status(201).json({ message: "Document uploaded successfully.", document });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to upload document.", error: err.message });
  }
});

// PUT /api/admin/documents/:id
app.put("/api/admin/documents/:id", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const { title, type, description, targetAudience, targetClubId, fileBase64, visibility } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    if (targetClubId !== undefined) updateData.targetClubId = targetClubId;
    if (visibility !== undefined) updateData.visibility = visibility;

    if (fileBase64 && fileBase64.startsWith("data:")) {
      updateData.fileUrl = await handleFileSave(fileBase64, `doc-${Date.now()}`, "auto");
      try {
        const stringLength = fileBase64.length - (fileBase64.indexOf(",") + 1);
        const sizeInBytes = (stringLength * 3) / 4 - (fileBase64.endsWith("==") ? 2 : fileBase64.endsWith("=") ? 1 : 0);
        const sizeInMb = sizeInBytes / (1024 * 1024);
        updateData.fileSize = sizeInMb < 0.1 ? `${(sizeInBytes / 1024).toFixed(1)} KB` : `${sizeInMb.toFixed(1)} MB`;
      } catch {}
    }

    const updated = await dbDocument.updateById(id, updateData);
    if (!updated) {
      res.status(404).json({ message: "Document not found." });
      return;
    }
    res.json({ message: "Document updated successfully.", document: updated });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to update document.", error: err.message });
  }
});

// DELETE /api/admin/documents/:id
app.delete("/api/admin/documents/:id", verifyAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const { id } = req.params;
    const result = await dbDocument.deleteById(id);
    if (!result) {
      res.status(404).json({ message: "Document not found." });
      return;
    }
    res.json({ message: "Document deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to delete document.", error: err.message });
  }
});

// -------------------------------------------------------------
// Club Communications Endpoints
// -------------------------------------------------------------

// GET /api/club-auth/announcements (club only)
app.get("/api/club-auth/announcements", verifyClubToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const club = await dbClubRegistration.findById(req.user!.id);
    if (!club) {
      res.status(404).json({ message: "Club not found." });
      return;
    }

    // Fetch announcements that are Published, and targeting this club's status, specific ID, or all
    const allAnnouncements = await dbAnnouncement.find({ status: "Published" });
    const now = new Date();

    const filtered = allAnnouncements.filter(ann => {
      // Check publish date (allow scheduling)
      if (new Date(ann.publishDate) > now) return false;

      if (ann.targetAudience === "All") return true;
      if (ann.targetAudience === "Approved" && club.status === "Approved") return true;
      if (ann.targetAudience === "Pending" && club.status === "Pending") return true;
      if (ann.targetAudience === "Specific" && ann.targetClubId === club._id.toString()) return true;
      return false;
    });

    const readSet = new Set(club.readAnnouncements || []);
    const announcements = filtered.map(ann => ({
      ...ann,
      isRead: readSet.has(ann._id.toString())
    }));

    res.json({ announcements });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch announcements.", error: err.message });
  }
});

// POST /api/club-auth/announcements/:id/read (club only)
app.post("/api/club-auth/announcements/:id/read", verifyClubToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { id } = req.params;
    const club = await dbClubRegistration.findById(req.user!.id);
    if (!club) {
      res.status(404).json({ message: "Club not found." });
      return;
    }

    const readAnnouncements = club.readAnnouncements || [];
    if (!readAnnouncements.includes(id)) {
      readAnnouncements.push(id);
      await dbClubRegistration.updateById(req.user!.id, { readAnnouncements });
    }

    res.json({ message: "Announcement marked as read." });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to mark announcement as read.", error: err.message });
  }
});

// GET /api/club-auth/documents (club only)
app.get("/api/club-auth/documents", verifyClubToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const club = await dbClubRegistration.findById(req.user!.id);
    if (!club) {
      res.status(404).json({ message: "Club not found." });
      return;
    }

    const allDocs = await dbDocument.find({ visibility: "Public" });

    const documents = allDocs.filter(doc => {
      if (doc.targetAudience === "All") return true;
      if (doc.targetAudience === "Approved" && club.status === "Approved") return true;
      if (doc.targetAudience === "Specific" && doc.targetClubId === club._id.toString()) return true;
      return false;
    });

    res.json({ documents });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch documents.", error: err.message });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`⚽ SmartCity Under 17 Portal listening on: http://localhost:${PORT}`);
  });
}

export default app;
