import "dotenv/config";
import mongoose from "mongoose";

// Define TypeScript interfaces for our models
export interface Team {
  _id: string;
  clubName: string;
  username: string;
  passwordHash: string;
  logoUrl: string;
  createdAt: string;
  group?: "A" | "B" | "C" | null;
}

export interface Player {
  _id: string;
  teamId: string;
  name: string;
  age: number;
  position: "Goalkeeper" | "Defender" | "Midfielder" | "Forward";
  category: "Under-17" | "Free Age";
  photoUrl: string;
  jerseyNumber: number;
}

export interface Official {
  _id: string;
  teamId: string;
  name: string;
  position: "Head Coach" | "Assistant Coach" | "Team Doctor" | "Kit Manager" | "Manager";
  photoUrl: string;
}

export interface Match {
  _id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "Scheduled" | "Live" | "Completed";
  stage: "Group Stage" | "Quarter Final" | "Semi Final" | "Final";
  round: string | null;
  group: "A" | "B" | "C" | null;
  matchDate: string;
  refereeId?: string | null;
  goals?: Array<{
    playerId: string;
    playerName: string;
    jerseyNumber: number;
    team: "home" | "away";
    timestamp: string;
    matchTime?: number;
  }>;
  cards?: Array<{
    playerId: string;
    playerName: string;
    jerseyNumber: number;
    team: "home" | "away";
    type: "Yellow" | "Red";
    timestamp: string;
    matchTime?: number;
  }>;
  timerLastStarted: string | null;
  timerAccumulatedTime: number;
  homeLineup: {
    starting11: string[];
    bench: string[];
  };
  awayLineup: {
    starting11: string[];
    bench: string[];
  };
}

export interface ClubRegistration {
  _id: string;
  clubName: string;
  foundedYear: string;
  lga: string;
  homeGround: string;
  clubColors: string;
  clubCategory: string;
  clubLogoUrl: string;
  chairmanName: string;
  secretaryName: string;
  phone: string;
  whatsapp: string;
  email: string;
  websiteOrSocial: string;
  headCoach: string;
  coachLicense: string;
  numPlayers: string;
  ageRange: string;
  prevLeague: string;
  prevLeagueNames: string;
  prevTransfer: string;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason: string;
  submittedAt: string;
  reviewedAt: string;
  passwordHash?: string;
  conference?: string;
  readAnnouncements?: string[];
}

export interface ClubPlayer {
  _id: string;
  clubId: string;
  name: string;
  dob: string;
  age: number;
  gender: "Male" | "Female";
  nationality: string;
  stateOfOrigin: string;
  lgaOfOrigin: string;
  homeAddress: string;
  phone: string;
  jerseyNumber: number;
  primaryPosition: "Goalkeeper" | "Defender" | "Midfielder" | "Winger" | "Forward";
  secondaryPosition?: string;
  preferredFoot: "Left" | "Right" | "Both";
  height: number;
  weight: number;
  experience: number;
  photoUrl: string;
  docUrl: string;
  prevClub?: string;
  transferLetterUrl?: string;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason: string;
  submittedAt: string;
}

export interface Announcement {
  _id: string;
  title: string;
  category: "General" | "Urgent" | "Fixtures" | "League Updates" | "Registration";
  targetAudience: "All" | "Approved" | "Pending" | "Specific";
  targetClubId?: string;
  content: string;
  pinned: boolean;
  publishDate: string;
  status: "Published" | "Draft";
  createdAt: string;
}

export interface OtpEntry {
  _id: string;
  email: string;
  code: string;
  expires: Date;
}

export interface Document {
  _id: string;
  title: string;
  type: "League Rules" | "Fixture Schedule" | "Registration Form" | "Official Letter" | "Code of Conduct" | "Other";
  description: string;
  targetAudience: "All" | "Approved" | "Specific";
  targetClubId?: string;
  fileUrl: string;
  fileSize: string;
  visibility: "Public" | "Private";
  uploadDate: string;
}

// -------------------------------------------------------------
// MongoDB configuration with Mongoose
// -------------------------------------------------------------
const MONGODB_URI = process.env.MONGODB_URI;

const TeamSchema = new mongoose.Schema<Team>({
  clubName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  logoUrl: { type: String, required: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  group: { type: String, enum: ["A", "B", "C", null], default: null }
});

const PlayerSchema = new mongoose.Schema<Player>({
  teamId: { type: String, required: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  position: { type: String, required: true },
  category: { type: String, required: true },
  photoUrl: { type: String, required: true },
  jerseyNumber: { type: Number, required: true }
});

const OfficialSchema = new mongoose.Schema<Official>({
  teamId: { type: String, required: true },
  name: { type: String, required: true },
  position: { type: String, required: true },
  photoUrl: { type: String, required: true }
});

const MatchSchema = new mongoose.Schema<Match>({
  homeTeamId: { type: String, required: true },
  awayTeamId: { type: String, required: true },
  homeScore: { type: Number, default: null },
  awayScore: { type: Number, default: null },
  status: { type: String, enum: ["Scheduled", "Live", "Completed"], default: "Scheduled" },
  stage: { type: String, enum: ["Group Stage", "Quarter Final", "Semi Final", "Final"], required: true },
  round: { type: String, default: null },
  group: { type: String, enum: ["A", "B", "C", null], default: null },
  matchDate: { type: String, required: true },
  refereeId: { type: String, default: null },
  goals: [{
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    jerseyNumber: { type: Number, required: true },
    team: { type: String, enum: ["home", "away"], required: true },
    timestamp: { type: String, required: true },
    matchTime: { type: Number }
  }],
  cards: [{
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    jerseyNumber: { type: Number, required: true },
    team: { type: String, enum: ["home", "away"], required: true },
    type: { type: String, enum: ["Yellow", "Red"], required: true },
    timestamp: { type: String, required: true },
    matchTime: { type: Number }
  }],
  timerLastStarted: { type: String, default: null },
  timerAccumulatedTime: { type: Number, default: 0 },
  homeLineup: {
    formation: { type: String, default: "4-4-2" },
    starting11: [{ type: String }],
    bench: [{ type: String }]
  },
  awayLineup: {
    formation: { type: String, default: "4-4-2" },
    starting11: [{ type: String }],
    bench: [{ type: String }]
  }
});

const ClubRegistrationSchema = new mongoose.Schema<ClubRegistration>({
  clubName: { type: String, required: true },
  foundedYear: { type: String, default: "" },
  lga: { type: String, required: true },
  homeGround: { type: String, default: "" },
  clubColors: { type: String, default: "" },
  clubCategory: { type: String, required: true },
  clubLogoUrl: { type: String, default: "" },
  chairmanName: { type: String, required: true },
  secretaryName: { type: String, default: "" },
  phone: { type: String, required: true },
  whatsapp: { type: String, default: "" },
  email: { type: String, required: true },
  websiteOrSocial: { type: String, default: "" },
  headCoach: { type: String, required: true },
  coachLicense: { type: String, default: "" },
  numPlayers: { type: String, default: "" },
  ageRange: { type: String, default: "" },
  prevLeague: { type: String, default: "" },
  prevLeagueNames: { type: String, default: "" },
  prevTransfer: { type: String, default: "" },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  rejectionReason: { type: String, default: "" },
  submittedAt: { type: String, default: () => new Date().toISOString() },
  reviewedAt: { type: String, default: "" },
  passwordHash: { type: String, default: "" },
  conference: { type: String, default: "" },
  readAnnouncements: { type: [String], default: [] },
});

const ClubPlayerSchema = new mongoose.Schema<ClubPlayer>({
  clubId: { type: String, required: true },
  name: { type: String, required: true },
  dob: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ["Male", "Female"], required: true },
  nationality: { type: String, default: "Nigerian" },
  stateOfOrigin: { type: String, required: true },
  lgaOfOrigin: { type: String, required: true },
  homeAddress: { type: String, required: true },
  phone: { type: String, required: true },
  jerseyNumber: { type: Number, required: true },
  primaryPosition: { type: String, enum: ["Goalkeeper", "Defender", "Midfielder", "Winger", "Forward"], required: true },
  secondaryPosition: { type: String, default: "" },
  preferredFoot: { type: String, enum: ["Left", "Right", "Both"], required: true },
  height: { type: Number, required: true },
  weight: { type: Number, required: true },
  experience: { type: Number, required: true },
  photoUrl: { type: String, required: true },
  docUrl: { type: String, required: true },
  prevClub: { type: String, default: "" },
  transferLetterUrl: { type: String, default: "" },
  guardianName: { type: String, required: true },
  guardianRelationship: { type: String, required: true },
  guardianPhone: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  rejectionReason: { type: String, default: "" },
  submittedAt: { type: String, default: () => new Date().toISOString() },
});

const OtpSchema = new mongoose.Schema<OtpEntry>({
  email: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  expires: { type: Date, required: true },
});
OtpSchema.index({ expires: 1 }, { expireAfterSeconds: 0 }); // auto-delete expired docs

const AnnouncementSchema = new mongoose.Schema<Announcement>({
  title: { type: String, required: true },
  category: { type: String, enum: ["General", "Urgent", "Fixtures", "League Updates", "Registration"], required: true },
  targetAudience: { type: String, enum: ["All", "Approved", "Pending", "Specific"], required: true },
  targetClubId: { type: String, default: "" },
  content: { type: String, required: true },
  pinned: { type: Boolean, default: false },
  publishDate: { type: String, required: true },
  status: { type: String, enum: ["Published", "Draft"], default: "Published" },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const DocumentSchema = new mongoose.Schema<Document>({
  title: { type: String, required: true },
  type: { type: String, enum: ["League Rules", "Fixture Schedule", "Registration Form", "Official Letter", "Code of Conduct", "Other"], required: true },
  description: { type: String, default: "" },
  targetAudience: { type: String, enum: ["All", "Approved", "Specific"], required: true },
  targetClubId: { type: String, default: "" },
  fileUrl: { type: String, required: true },
  fileSize: { type: String, required: true },
  visibility: { type: String, enum: ["Public", "Private"], default: "Public" },
  uploadDate: { type: String, default: () => new Date().toISOString() },
});

// Avoid re-compiling models if they are hot-reloaded
const TeamModel = mongoose.models.Team || mongoose.model("Team", TeamSchema);
const PlayerModel = mongoose.models.Player || mongoose.model("Player", PlayerSchema);
const OfficialModel = mongoose.models.Official || mongoose.model("Official", OfficialSchema);
const MatchModel = mongoose.models.Match || mongoose.model("Match", MatchSchema);
const ClubRegistrationModel = mongoose.models.ClubRegistration || mongoose.model("ClubRegistration", ClubRegistrationSchema);
const ClubPlayerModel = mongoose.models.ClubPlayer || mongoose.model("ClubPlayer", ClubPlayerSchema);
const AnnouncementModel = mongoose.models.Announcement || mongoose.model("Announcement", AnnouncementSchema);
const DocumentModel = mongoose.models.Document || mongoose.model("Document", DocumentSchema);
const OtpModel = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("❌ MONGODB_URI environment variable is required. Please set it in your .env file.");
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ Successfully connected to MongoDB database.");
  } catch (err: any) {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    throw err;
  }
}

// -------------------------------------------------------------
// Database Operations (MongoDB Only)
// -------------------------------------------------------------
export const dbTeam = {
  async create(teamData: Omit<Team, "_id" | "createdAt">): Promise<Team> {
    const doc = await TeamModel.create(teamData);
    return doc.toObject() as Team;
  },

  async find(): Promise<Team[]> {
    const docs = await TeamModel.find().lean();
    return docs as unknown as Team[];
  },

  async findOne(query: Partial<Team>): Promise<Team | null> {
    const doc = await (TeamModel as any).findOne(query as any).lean();
    return doc ? (doc as unknown as Team) : null;
  },

  async findById(id: string): Promise<Team | null> {
    const doc = await (TeamModel as any).findById(id).lean();
    return doc ? (doc as unknown as Team) : null;
  },

  async updateById(id: string, updateData: Partial<Team>): Promise<Team | null> {
    const doc = await (TeamModel as any).findByIdAndUpdate(id, updateData, { returnDocument: "after" }).lean();
    return doc ? (doc as unknown as Team) : null;
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await (TeamModel as any).findByIdAndDelete(id);
    return result !== null;
  }
};

export const dbPlayer = {
  async create(playerData: Omit<Player, "_id">): Promise<Player> {
    const doc = await PlayerModel.create(playerData);
    return doc.toObject() as Player;
  },

  async find(query: Partial<Player>): Promise<Player[]> {
    const docs = await (PlayerModel as any).find(query as any).sort({ jerseyNumber: 1 }).lean();
    return docs as unknown as Player[];
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await (PlayerModel as any).findByIdAndDelete(id);
    return result !== null;
  },

  async deleteByTeamId(teamId: string): Promise<void> {
    await (PlayerModel as any).deleteMany({ teamId });
  }
};

export const dbOfficial = {
  async create(officialData: Omit<Official, "_id">): Promise<Official> {
    const doc = await OfficialModel.create(officialData);
    return doc.toObject() as Official;
  },

  async find(query: Partial<Official>): Promise<Official[]> {
    const docs = await (OfficialModel as any).find(query as any).lean();
    return docs as unknown as Official[];
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await (OfficialModel as any).findByIdAndDelete(id);
    return result !== null;
  },

  async deleteByTeamId(teamId: string): Promise<void> {
    await (OfficialModel as any).deleteMany({ teamId });
  }
};

export const dbMatch = {
  async create(matchData: Omit<Match, "_id">): Promise<Match> {
    const doc = await MatchModel.create(matchData);
    return doc.toObject() as Match;
  },

  async find(query: Partial<Match> = {}): Promise<Match[]> {
    const docs = await (MatchModel as any).find(query as any).sort({ matchDate: 1 }).lean();
    return docs as unknown as Match[];
  },

  async findById(id: string): Promise<Match | null> {
    const doc = await (MatchModel as any).findById(id).lean();
    return doc ? (doc as unknown as Match) : null;
  },

  async updateById(id: string, updateData: Partial<Match>): Promise<Match | null> {
    const doc = await (MatchModel as any).findByIdAndUpdate(id, updateData, { returnDocument: "after" }).lean();
    return doc ? (doc as unknown as Match) : null;
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await (MatchModel as any).findByIdAndDelete(id);
    return result !== null;
  },

  async deleteByTeamId(teamId: string): Promise<void> {
    await (MatchModel as any).deleteMany({
      $or: [{ homeTeamId: teamId }, { awayTeamId: teamId }]
    });
  }
};

export const dbClubRegistration = {
  async create(data: Omit<ClubRegistration, "_id" | "submittedAt" | "reviewedAt" | "status" | "rejectionReason">): Promise<ClubRegistration> {
    const doc = await ClubRegistrationModel.create(data);
    return doc.toObject() as ClubRegistration;
  },

  async find(query: Record<string, any> = {}): Promise<ClubRegistration[]> {
    const docs = await (ClubRegistrationModel as any).find(query).sort({ submittedAt: -1 }).lean();
    return docs as unknown as ClubRegistration[];
  },

  async findOne(query: Record<string, any> = {}): Promise<ClubRegistration | null> {
    const doc = await (ClubRegistrationModel as any).findOne(query).lean();
    return doc ? (doc as unknown as ClubRegistration) : null;
  },

  async findById(id: string): Promise<ClubRegistration | null> {
    const doc = await (ClubRegistrationModel as any).findById(id).lean();
    return doc ? (doc as unknown as ClubRegistration) : null;
  },

  async updateById(id: string, updateData: Partial<ClubRegistration>): Promise<ClubRegistration | null> {
    const doc = await (ClubRegistrationModel as any).findByIdAndUpdate(id, updateData, { returnDocument: "after" }).lean();
    return doc ? (doc as unknown as ClubRegistration) : null;
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await (ClubRegistrationModel as any).findByIdAndDelete(id);
    return result !== null;
  },

  async countByStatus(): Promise<{ total: number; pending: number; approved: number; rejected: number }> {
    const all = await (ClubRegistrationModel as any).find().lean();
    const total = all.length;
    const pending = all.filter((r: any) => r.status === "Pending").length;
    const approved = all.filter((r: any) => r.status === "Approved").length;
    const rejected = all.filter((r: any) => r.status === "Rejected").length;
    return { total, pending, approved, rejected };
  }
};

export const dbClubPlayer = {
  async create(data: Omit<ClubPlayer, "_id" | "submittedAt" | "status" | "rejectionReason">): Promise<ClubPlayer> {
    const doc = await ClubPlayerModel.create(data);
    return doc.toObject() as ClubPlayer;
  },

  async find(query: Record<string, any> = {}): Promise<ClubPlayer[]> {
    const docs = await (ClubPlayerModel as any).find(query).sort({ submittedAt: -1 }).lean();
    return docs as unknown as ClubPlayer[];
  },

  async findOne(query: Record<string, any> = {}): Promise<ClubPlayer | null> {
    const doc = await (ClubPlayerModel as any).findOne(query).lean();
    return doc ? (doc as unknown as ClubPlayer) : null;
  },

  async findById(id: string): Promise<ClubPlayer | null> {
    const doc = await (ClubPlayerModel as any).findById(id).lean();
    return doc ? (doc as unknown as ClubPlayer) : null;
  },

  async updateById(id: string, updateData: Partial<ClubPlayer>): Promise<ClubPlayer | null> {
    const doc = await (ClubPlayerModel as any).findByIdAndUpdate(id, updateData, { returnDocument: "after" }).lean();
    return doc ? (doc as unknown as ClubPlayer) : null;
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await (ClubPlayerModel as any).findByIdAndDelete(id);
    return result !== null;
  },

  async countByStatus(): Promise<{ total: number; pending: number; approved: number; rejected: number }> {
    const all = await (ClubPlayerModel as any).find().lean();
    const total = all.length;
    const pending = all.filter((r: any) => r.status === "Pending").length;
    const approved = all.filter((r: any) => r.status === "Approved").length;
    const rejected = all.filter((r: any) => r.status === "Rejected").length;
    return { total, pending, approved, rejected };
  }
};

export const dbAnnouncement = {
  async create(data: Omit<Announcement, "_id" | "createdAt">): Promise<Announcement> {
    const doc = await AnnouncementModel.create(data);
    return doc.toObject() as Announcement;
  },

  async find(query: Record<string, any> = {}): Promise<Announcement[]> {
    const docs = await (AnnouncementModel as any).find(query).sort({ pinned: -1, publishDate: -1 }).lean();
    return docs as unknown as Announcement[];
  },

  async findById(id: string): Promise<Announcement | null> {
    const doc = await (AnnouncementModel as any).findById(id).lean();
    return doc ? (doc as unknown as Announcement) : null;
  },

  async updateById(id: string, updateData: Partial<Announcement>): Promise<Announcement | null> {
    const doc = await (AnnouncementModel as any).findByIdAndUpdate(id, updateData, { returnDocument: "after" }).lean();
    return doc ? (doc as unknown as Announcement) : null;
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await (AnnouncementModel as any).findByIdAndDelete(id);
    return result !== null;
  }
};

export const dbOtp = {
  async set(email: string, code: string, expires: Date): Promise<void> {
    await (OtpModel as any).findOneAndUpdate(
      { email: email.toLowerCase() },
      { email: email.toLowerCase(), code, expires },
      { upsert: true, new: true }
    );
  },

  async get(email: string): Promise<{ code: string; expires: Date } | null> {
    const doc = await (OtpModel as any).findOne({ email: email.toLowerCase() }).lean();
    if (!doc) return null;
    return { code: (doc as any).code, expires: (doc as any).expires };
  },

  async delete(email: string): Promise<void> {
    await (OtpModel as any).deleteOne({ email: email.toLowerCase() });
  }
};

export const dbDocument = {
  async create(data: Omit<Document, "_id" | "uploadDate">): Promise<Document> {
    const doc = await DocumentModel.create(data);
    return doc.toObject() as Document;
  },

  async find(query: Record<string, any> = {}): Promise<Document[]> {
    const docs = await (DocumentModel as any).find(query).sort({ uploadDate: -1 }).lean();
    return docs as unknown as Document[];
  },

  async findById(id: string): Promise<Document | null> {
    const doc = await (DocumentModel as any).findById(id).lean();
    return doc ? (doc as unknown as Document) : null;
  },

  async updateById(id: string, updateData: Partial<Document>): Promise<Document | null> {
    const doc = await (DocumentModel as any).findByIdAndUpdate(id, updateData, { returnDocument: "after" }).lean();
    return doc ? (doc as unknown as Document) : null;
  },

  async deleteById(id: string): Promise<boolean> {
    const result = await (DocumentModel as any).findByIdAndDelete(id);
    return result !== null;
  }
};
