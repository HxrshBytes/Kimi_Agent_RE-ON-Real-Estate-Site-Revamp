import { Router } from "express";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "./db.js";
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  requireAuth,
  requireSuperadmin,
} from "./auth.js";
import { checkRateLimit, recordLoginAttempt } from "./rateLimit.js";
import {
  syncPropertyToSheet,
  deletePropertyFromSheet,
  fullSyncToSheet,
  syncContactToSheet,
  deleteContactFromSheet,
  fullContactsSyncToSheet,
} from "./googleSheets.js";
import {
  generateCustomerDigitalTwin,
  matchPropertiesForLead,
  executeAutonomousAgent,
  processNaturalLanguageQuery,
  parsePriceToNumber,
} from "./aiRevenueEngine.js";
import {
  generateCallScript,
  generateObjections,
  generateWhatsAppTemplates,
  generateCoachingTips,
  compareProperties,
  clearNemotronCache,
} from "./nemotronClient.js";
import { sendSMSOtp } from "./smsService.js";
import {
  createPropertiesBackup,
  listPropertiesBackups,
} from "./backupService.js";

function buildIdQuery(idParam) {
  const conditions = [];
  const strVal = String(idParam || "").trim();

  if (ObjectId.isValid(strVal) && strVal.length === 24) {
    try {
      conditions.push({ _id: new ObjectId(strVal) });
    } catch (e) {}
  }

  const num = Number(strVal);
  if (!isNaN(num)) {
    conditions.push({ id: num });
  }

  conditions.push({ id: strVal });

  return conditions.length === 1 ? conditions[0] : { $or: conditions };
}

function normalizeUrlList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeLineList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function sanitizeMapUrl(input) {
  if (!input || typeof input !== "string") return "";
  let cleaned = input.trim();
  const iframeSrcMatch = cleaned.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    cleaned = iframeSrcMatch[1];
  }
  return cleaned
    .replace(/&#0*38;/gi, "&")
    .replace(/&amp;/gi, "&")
    .replace(/&#0*34;/gi, '"')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#0*60;/gi, "<")
    .replace(/&lt;/gi, "<")
    .replace(/&#0*62;/gi, ">")
    .replace(/&gt;/gi, ">")
    .trim();
}

function buildPropertyUpdates(body) {
  const updates = {};
  const unset = {};

  const scalarFields = [
    "name",
    "location",
    "price",
    "type",
    "status",
    "possessionDate",
    "possession",
    "area",
    "reraNumber",
    "description",
  ];

  for (const field of scalarFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field] ?? "";
    }
  }

  if (body.possessionDate !== undefined || body.possession !== undefined) {
    const possVal =
      body.possessionDate !== undefined ? body.possessionDate : body.possession;
    updates.possessionDate = possVal ?? "";
    updates.possession = possVal ?? "";
  }

  if (body.mapLink !== undefined || body.googleMapsUrl !== undefined) {
    const rawMap =
      body.mapLink !== undefined ? body.mapLink : body.googleMapsUrl;
    const cleanedMap = sanitizeMapUrl(rawMap);
    updates.mapLink = cleanedMap;
    updates.googleMapsUrl = cleanedMap;
  }

  if (body.developer !== undefined || body.developedBy !== undefined) {
    const developer = body.developer || body.developedBy || "";
    updates.developer = developer;
    updates.developedBy = developer;
  }

  if (body.highlights !== undefined) {
    updates.highlights = normalizeLineList(body.highlights);
  }

  if (body.connectivity !== undefined) {
    updates.connectivity = normalizeLineList(body.connectivity);
  }

  if (body.images !== undefined) {
    updates.images = normalizeUrlList(body.images);
    unset.img = "";
    unset.image = "";
  }

  if (body.videos !== undefined) {
    updates.videos = normalizeUrlList(body.videos);
    unset.video = "";
  }

  return { updates, unset };
}

function buildMediaContentUpdates(body) {
  const updates = {};
  const unset = {};

  const scalarFields = [
    "title",
    "category",
    "excerpt",
    "content",
    "source",
    "date",
  ];
  for (const field of scalarFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field] ?? "";
    }
  }

  if (body.images !== undefined) {
    updates.images = normalizeUrlList(body.images);
    unset.img = "";
    unset.image = "";
  }

  if (body.videos !== undefined) {
    updates.videos = normalizeUrlList(body.videos);
    unset.video = "";
  }

  return { updates, unset };
}

async function updateDocumentById(db, collectionName, idParam, updateDoc) {
  const query = buildIdQuery(idParam);
  const collection = db.collection(collectionName);

  const updateResult = await collection.updateOne(query, updateDoc);
  if (updateResult.matchedCount === 0) {
    return null;
  }

  return collection.findOne(query);
}

const router = Router();

// Helper: Audit logging in MongoDB
async function logAuditEvent(db, eventType, username, details, req) {
  try {
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Unknown";
    await db.collection("audit_logs").insertOne({
      eventType,
      username: username || "anonymous",
      details,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Audit Log Error]", err);
  }
}

// Helper: Handle DB connection errors gracefully
const withDb = (handler) => async (req, res, next) => {
  try {
    const { db } = await connectToDatabase();
    return await handler(req, res, db, next);
  } catch (err) {
    console.error("[API Error]", err);
    return res
      .status(500)
      .json({ error: "Database connection failed", details: err.message });
  }
};

// Security Middleware: Set security headers
router.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// ---------------- STATUS & HEALTH ----------------
router.get(
  "/health",
  withDb(async (req, res, db) => {
    const propertiesCount = await db.collection("properties").countDocuments();
    const blogsCount = await db.collection("blogs").countDocuments();
    const adminsCount = await db.collection("admins").countDocuments();
    const contactsCount = await db.collection("contacts").countDocuments();
    const auditLogsCount = await db.collection("audit_logs").countDocuments();

    res.json({
      status: "connected",
      database: "sample_mflix",
      cluster: "cluster0111.fdeg09e.mongodb.net",
      security: "JWT + Salted PBKDF2 + Rate Limiting + Audit Logging",
      counts: {
        properties: propertiesCount,
        blogs: blogsCount,
        admins: adminsCount,
        contacts: contactsCount,
        auditLogs: auditLogsCount,
      },
    });
  }),
);

// ---------------- AUTHENTICATION ----------------

// Clerk Token Exchange — issues JWT and records login activity in audit logs
router.post(
  "/auth/clerk-exchange",
  withDb(async (req, res, db) => {
    const { clerkUserId, email } = req.body;

    if (!clerkUserId && !email) {
      return res
        .status(400)
        .json({ success: false, error: "clerkUserId or email required" });
    }

    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
    const ALLOWED_ADMIN_EMAIL = (
      process.env.ALLOWED_ADMIN_EMAIL || "yasirreonadmin@gmail.com"
    ).toLowerCase();

    let verifiedEmail = null;

    if (email) {
      verifiedEmail = String(email).toLowerCase().trim();
    } else if (clerkUserId && CLERK_SECRET_KEY) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const userRes = await fetch(
          `https://api.clerk.com/v1/users/${clerkUserId}`,
          {
            headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
            signal: controller.signal,
          },
        );
        clearTimeout(timeout);
        if (userRes.ok) {
          const user = await userRes.json();
          const emails = (user.email_addresses || [])
            .map((e) => e.email_address?.toLowerCase().trim())
            .filter(Boolean);
          if (emails.length > 0) {
            verifiedEmail = emails[0];
          }
        }
      } catch (err) {
        console.warn("[clerk-exchange] Clerk API error:", err.message);
      }
    }

    if (!verifiedEmail) {
      return res
        .status(403)
        .json({ success: false, error: "Could not verify email" });
    }

    // Determine user role: Superadmin, Subadmin, or Caller
    let role = null;
    if (verifiedEmail === ALLOWED_ADMIN_EMAIL) {
      role = "superadmin";
    } else {
      // Check in database admins collection for subadmin or caller
      const adminDoc = await db.collection("admins").findOne({
        $or: [
          { username: { $regex: new RegExp(`^${verifiedEmail}$`, "i") } },
          { email: { $regex: new RegExp(`^${verifiedEmail}$`, "i") } },
        ],
      });
      if (adminDoc) {
        role = adminDoc.role || "subadmin";
      } else {
        // Also check in callers collection for authorized telecallers
        const callerDoc = await db.collection("callers").findOne({
          email: { $regex: new RegExp(`^${verifiedEmail}$`, "i") },
          active: { $ne: false },
        });
        if (callerDoc) {
          role = "caller";
        }
      }
    }

    if (!role) {
      // Log unauthorized login attempt in audit logs
      await logAuditEvent(
        db,
        "UNAUTHORIZED_LOGIN_ATTEMPT",
        verifiedEmail,
        `Attempted login without authorized admin privileges (ClerkID: ${clerkUserId || "N/A"})`,
        req,
      );
      return res
        .status(403)
        .json({
          success: false,
          error: "Not an authorized admin or subadmin account",
        });
    }

    const token = generateToken({ username: verifiedEmail, role });
    console.log(
      `[clerk-exchange] ✅ Issued JWT for ${verifiedEmail} (Role: ${role})`,
    );

    // Log successful login in MongoDB audit logs
    await logAuditEvent(
      db,
      "LOGIN_SUCCESS",
      verifiedEmail,
      `Role: ${role} logged in via Clerk SSO`,
      req,
    );

    res.json({ success: true, token, user: { username: verifiedEmail, role } });
  }),
);

// Record Logout Activity in Audit Logs
router.post(
  "/auth/logout",
  withDb(async (req, res, db) => {
    const { email, role } = req.body || {};
    const authHeader = req.headers.authorization;
    let username = email;
    let userRole = role;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token);
      if (decoded) {
        username = username || decoded.username;
        userRole = userRole || decoded.role;
      }
    }

    username = username || "admin";
    userRole = userRole || "superadmin";

    await logAuditEvent(
      db,
      "LOGOUT_SUCCESS",
      username,
      `Role: ${userRole} logged out`,
      req,
    );
    res.json({ success: true, message: "Logout activity recorded" });
  }),
);

router.post(
  "/auth/login",
  withDb(async (req, res, db) => {
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "127.0.0.1";

    // Brute-force Rate Limit Check
    const rateLimitStatus = checkRateLimit(ip);
    if (!rateLimitStatus.allowed) {
      await logAuditEvent(
        db,
        "LOGIN_BLOCKED_RATE_LIMIT",
        req.body.username,
        rateLimitStatus.message,
        req,
      );
      return res
        .status(429)
        .json({ success: false, error: rateLimitStatus.message });
    }

    const { username, password } = req.body;
    const normalized = (username || "").trim().toLowerCase();

    if (!normalized || !password) {
      recordLoginAttempt(ip, false);
      return res
        .status(400)
        .json({ success: false, error: "Username and password are required." });
    }

    const user = await db
      .collection("admins")
      .findOne({ username: { $regex: new RegExp(`^${normalized}$`, "i") } });

    if (!user) {
      recordLoginAttempt(ip, false);
      await logAuditEvent(
        db,
        "LOGIN_FAILED_INVALID_USER",
        normalized,
        "User not found",
        req,
      );
      return res
        .status(401)
        .json({ success: false, error: "Invalid admin credentials." });
    }

    // Password verification with hash or legacy fallback
    const isPasswordValid = user.passwordHash
      ? verifyPassword(password, user.passwordHash)
      : password === "!@#$%Reonadmin786";

    if (!isPasswordValid) {
      recordLoginAttempt(ip, false);
      await logAuditEvent(
        db,
        "LOGIN_FAILED_BAD_PASSWORD",
        normalized,
        "Incorrect password",
        req,
      );
      return res
        .status(401)
        .json({ success: false, error: "Invalid admin credentials." });
    }

    // Record successful login
    recordLoginAttempt(ip, true);

    // Upgrade legacy user password hash if missing
    if (!user.passwordHash) {
      await db
        .collection("admins")
        .updateOne(
          { _id: user._id },
          { $set: { passwordHash: hashPassword(password) } },
        );
    }

    // Issue JWT Token
    const token = generateToken({ username: user.username, role: user.role });
    await logAuditEvent(
      db,
      "LOGIN_SUCCESS",
      user.username,
      `Role: ${user.role}`,
      req,
    );

    res.json({
      success: true,
      token,
      user: { username: user.username, role: user.role },
    });
  }),
);

router.put(
  "/auth/change-password",
  requireAuth,
  withDb(async (req, res, db) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          error: "New password must be at least 6 characters long.",
        });
    }

    const user = await db
      .collection("admins")
      .findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const isValid = user.passwordHash
      ? verifyPassword(currentPassword, user.passwordHash)
      : currentPassword === "!@#$%Reonadmin786";

    if (!isValid) {
      return res
        .status(401)
        .json({ success: false, error: "Incorrect current password." });
    }

    const newHash = hashPassword(newPassword);
    await db
      .collection("admins")
      .updateOne(
        { username: req.user.username },
        {
          $set: { passwordHash: newHash, updatedAt: new Date().toISOString() },
        },
      );

    await logAuditEvent(
      db,
      "PASSWORD_CHANGED",
      req.user.username,
      "Password updated successfully",
      req,
    );
    res.json({ success: true, message: "Password updated successfully." });
  }),
);

// ---------------- AUDIT LOGS ----------------
router.get(
  "/audit-logs",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const logs = await db
      .collection("audit_logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();
    res.json(logs);
  }),
);

// ---------------- PROPERTIES ----------------
router.get(
  "/properties",
  withDb(async (req, res, db) => {
    const properties = await db.collection("properties").find({}).toArray();
    res.json(properties);
  }),
);

// Download / export full database backup of properties
router.get(
  "/properties/backup",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const backupResult = await createPropertiesBackup(db, {
      triggerReason: "manual_export",
      user: req.user?.username || req.user?.email || "superadmin",
    });

    if (!backupResult.success) {
      return res.status(500).json({ error: "Failed to create properties backup: " + backupResult.error });
    }

    await logAuditEvent(
      db,
      "PROPERTIES_BACKUP_CREATED",
      req.user?.username || req.user?.email || "superadmin",
      `Manual DB Backup created: ${backupResult.filename} (${backupResult.count} properties)`,
      req,
    );

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${backupResult.filename}"`);
    res.json(backupResult.backupData);
  }),
);

// List properties backups stored on server
router.get(
  "/properties/backups",
  requireAuth,
  requireSuperadmin,
  (req, res) => {
    const backups = listPropertiesBackups();
    res.json({ success: true, backups });
  },
);

router.get(
  "/properties/:id",
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const query = buildIdQuery(idParam);
    let property = await db.collection("properties").findOne(query);
    if (!property) {
      // Try matching by name as fallback (e.g. slug or name in URL)
      property = await db.collection("properties").findOne({
        name: {
          $regex: new RegExp(
            `^${decodeURIComponent(idParam).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
        },
      });
    }
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }
    res.json(property);
  }),
);

router.post(
  "/properties",
  requireAuth,
  withDb(async (req, res, db) => {
    const propertyData = req.body;
    const newProperty = {
      id: propertyData.id || Date.now(),
      name: propertyData.name || "New Property",
      location: propertyData.location || "",
      price: propertyData.price || "",
      type: propertyData.type || "",
      status: propertyData.status || "Ready to Move",
      possessionDate:
        propertyData.possessionDate || propertyData.possession || "",
      possession: propertyData.possession || propertyData.possessionDate || "",
      area: propertyData.area || "",
      reraNumber: propertyData.reraNumber || "",
      developer: propertyData.developer || propertyData.developedBy || "",
      developedBy: propertyData.developedBy || propertyData.developer || "",
      description: propertyData.description || "",
      mapLink: sanitizeMapUrl(
        propertyData.mapLink || propertyData.googleMapsUrl || "",
      ),
      highlights: Array.isArray(propertyData.highlights)
        ? propertyData.highlights
        : [],

      connectivity: Array.isArray(propertyData.connectivity)
        ? propertyData.connectivity
        : [],
      images: Array.isArray(propertyData.images) ? propertyData.images : [],
      videos: Array.isArray(propertyData.videos) ? propertyData.videos : [],
      createdBy: req.user.username,
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("properties").insertOne(newProperty);
    await logAuditEvent(
      db,
      "PROPERTY_CREATED",
      req.user.username,
      `Property: ${newProperty.name}`,
      req,
    );

    // Sync to Google Sheets (fire-and-forget)
    const createdProperty = { ...newProperty, _id: result.insertedId };
    syncPropertyToSheet(createdProperty).catch((err) =>
      console.error("[Sheets Sync] Create error:", err.message),
    );

    res.status(201).json(createdProperty);
  }),
);

router.put(
  "/properties/:id",
  requireAuth,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const body = req.body && typeof req.body === "object" ? req.body : {};

    console.log(
      "[PUT /properties/:id] idParam:",
      idParam,
      "body keys:",
      Object.keys(body),
    );

    const query = buildIdQuery(idParam);
    const existingProp = await db.collection("properties").findOne(query);

    if (!existingProp) {
      return res.status(404).json({ error: "Property not found", id: idParam });
    }

    // Permission Check: Subadmins can ONLY edit properties they personally added
    if (req.user.role !== "superadmin") {
      const creator = (existingProp.createdBy || "").toLowerCase().trim();
      const requester = (req.user.username || "").toLowerCase().trim();

      if (!creator || creator !== requester) {
        await logAuditEvent(
          db,
          "PROPERTY_UPDATE_FORBIDDEN",
          req.user.username,
          `Subadmin ${req.user.username} denied editing property "${existingProp.name}" created by "${creator || "superadmin"}"`,
          req,
        );
        return res.status(403).json({
          error:
            "Forbidden: Subadmins can only edit properties they have added.",
        });
      }
    }

    if (!body || typeof body !== "object" || Object.keys(body).length === 0) {
      return res.status(400).json({
        error:
          "Invalid update payload. Form data did not reach the server. Please refresh and try again.",
      });
    }

    const { updates, unset } = buildPropertyUpdates(body);
    updates.updatedBy = req.user.username;
    updates.updatedAt = new Date().toISOString();

    const updateDoc = { $set: updates };
    if (Object.keys(unset).length > 0) {
      updateDoc.$unset = unset;
    }

    console.log(
      "[PUT /properties/:id] update fields:",
      Object.keys(updates),
      "images:",
      updates.images?.length ?? "unchanged",
    );

    await db.collection("properties").updateOne(query, updateDoc);
    const result = await db.collection("properties").findOne(query);

    await logAuditEvent(
      db,
      "PROPERTY_UPDATED",
      req.user.username,
      `Property ID: ${idParam} (${result.name})`,
      req,
    );

    // Sync to Google Sheets (fire-and-forget)
    syncPropertyToSheet(result).catch((err) =>
      console.error("[Sheets Sync] Update error:", err.message),
    );

    res.json(result);
  }),
);

// Bulk delete properties with automated snapshot backup every single time
const handleDeleteManyProperties = async (req, res, db) => {
  try {
    const { ids, all } = req.body || {};

    let filter = {};
    if (all === true) {
      filter = {};
    } else if (Array.isArray(ids) && ids.length > 0) {
      const orConditions = ids.map((id) => buildIdQuery(id));
      filter = { $or: orConditions };
    } else {
      return res.status(400).json({ error: "No property IDs provided for deleteMany." });
    }

    // Step 1: Query targeted properties to back up
    const propertiesToDelete = await db.collection("properties").find(filter).toArray();

    if (propertiesToDelete.length === 0) {
      return res.status(404).json({ error: "No matching properties found to delete." });
    }

    // Step 2: AUTOMATION - Create snapshot backup on server disk before deleting
    const backupResult = await createPropertiesBackup(db, {
      triggerReason: "deleteMany_automation",
      user: req.user?.username || req.user?.email || "superadmin",
      specificItems: propertiesToDelete,
    });

    // Step 3: Perform deleteMany on MongoDB collection
    const deleteResult = await db.collection("properties").deleteMany(filter);

    // Step 4: Audit logging
    await logAuditEvent(
      db,
      "PROPERTIES_DELETE_MANY",
      req.user?.username || req.user?.email || "superadmin",
      `Bulk deleted ${deleteResult.deletedCount} properties. Auto backup: ${backupResult.filename || "saved"}`,
      req,
    );

    // Step 5: Sync deleted properties with Google Sheets (fire-and-forget)
    propertiesToDelete.forEach((p) => {
      if (p._id) {
        deletePropertyFromSheet(p._id).catch((err) =>
          console.error("[Sheets Sync] Delete error:", err.message),
        );
      }
    });

    // Step 6: Return result with full backupData so frontend can also automatically download to user's device
    res.json({
      success: true,
      deletedCount: deleteResult.deletedCount,
      backupFile: backupResult.filename,
      backupData: backupResult.backupData,
      message: `Successfully deleted ${deleteResult.deletedCount} properties. Automated backup saved to ${backupResult.filename}`,
    });
  } catch (err) {
    console.error("[deleteManyProperties] Error:", err);
    res.status(500).json({ error: "Failed to delete properties: " + err.message });
  }
};

router.post(
  "/properties/delete-many",
  requireAuth,
  requireSuperadmin,
  withDb(handleDeleteManyProperties),
);

router.delete(
  "/properties/delete-many",
  requireAuth,
  requireSuperadmin,
  withDb(handleDeleteManyProperties),
);

router.delete(
  "/properties",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    // If request body has ids or all, delegate to bulk delete
    if (req.body && (req.body.ids || req.body.all)) {
      return handleDeleteManyProperties(req, res, db);
    }
    res.status(400).json({ error: "Bulk delete requires 'ids' array or 'all: true' in request body." });
  }),
);

router.delete(
  "/properties/:id",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const query = buildIdQuery(idParam);

    // Capture _id before deleting so we can remove from Google Sheets
    const propertyToDelete = await db.collection("properties").findOne(query);

    const result = await db.collection("properties").deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Property not found" });
    }
    await logAuditEvent(
      db,
      "PROPERTY_DELETED",
      req.user.username,
      `Property ID: ${idParam}`,
      req,
    );

    // Sync to Google Sheets (fire-and-forget)
    if (propertyToDelete?._id) {
      deletePropertyFromSheet(propertyToDelete._id).catch((err) =>
        console.error("[Sheets Sync] Delete error:", err.message),
      );
    }

    res.json({ success: true, message: "Property deleted successfully" });
  }),
);

// Full sync all properties to Google Sheets
router.post(
  "/properties/sync-sheets",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const result = await fullSyncToSheet(db);
    if (result.success) {
      await logAuditEvent(
        db,
        "SHEETS_FULL_SYNC",
        req.user.username,
        `Synced ${result.count} properties to Google Sheets`,
        req,
      );
      res.json({
        success: true,
        message: `${result.count} properties synced to Google Sheets`,
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  }),
);

// ---------------- BLOGS ----------------
router.get(
  "/blogs",
  withDb(async (req, res, db) => {
    const blogs = await db.collection("blogs").find({}).toArray();
    res.json(blogs);
  }),
);

router.get(
  "/blogs/:id",
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const query = buildIdQuery(idParam);
    let blog = await db.collection("blogs").findOne(query);
    if (!blog) {
      blog = await db.collection("blogs").findOne({
        title: {
          $regex: new RegExp(
            `^${decodeURIComponent(idParam).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
        },
      });
    }
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }
    res.json(blog);
  }),
);

router.post(
  "/blogs",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const blogData = req.body;
    const newBlog = {
      id: blogData.id || Date.now(),
      title: blogData.title || "Untitled Blog",
      category: blogData.category || "General",
      excerpt: blogData.excerpt || "",
      content: blogData.content || "",
      images: Array.isArray(blogData.images) ? blogData.images : [],
      videos: Array.isArray(blogData.videos) ? blogData.videos : [],
      createdBy: req.user.username,
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("blogs").insertOne(newBlog);
    await logAuditEvent(
      db,
      "BLOG_CREATED",
      req.user.username,
      `Blog: ${newBlog.title}`,
      req,
    );
    res.status(201).json({ ...newBlog, _id: result.insertedId });
  }),
);

router.put(
  "/blogs/:id",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;

    const { updates, unset } = buildMediaContentUpdates(req.body);
    updates.updatedBy = req.user.username;
    updates.updatedAt = new Date().toISOString();

    const updateDoc = { $set: updates };
    if (Object.keys(unset).length > 0) {
      updateDoc.$unset = unset;
    }

    const result = await updateDocumentById(db, "blogs", idParam, updateDoc);

    if (!result) {
      return res.status(404).json({ error: "Blog post not found" });
    }
    await logAuditEvent(
      db,
      "BLOG_UPDATED",
      req.user.username,
      `Blog ID: ${idParam}`,
      req,
    );
    res.json(result);
  }),
);

router.delete(
  "/blogs/:id",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const query = buildIdQuery(idParam);

    const result = await db.collection("blogs").deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Blog post not found" });
    }
    await logAuditEvent(
      db,
      "BLOG_DELETED",
      req.user.username,
      `Blog ID: ${idParam}`,
      req,
    );
    res.json({ success: true, message: "Blog post deleted successfully" });
  }),
);

// ---------------- NEWS ----------------
router.get(
  "/news",
  withDb(async (req, res, db) => {
    const news = await db
      .collection("news")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(news);
  }),
);

router.get(
  "/news/:id",
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const query = buildIdQuery(idParam);
    let item = await db.collection("news").findOne(query);
    if (!item) {
      item = await db.collection("news").findOne({
        title: {
          $regex: new RegExp(
            `^${decodeURIComponent(idParam).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i",
          ),
        },
      });
    }
    if (!item) {
      return res.status(404).json({ error: "News article not found" });
    }
    res.json(item);
  }),
);

router.post(
  "/news",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const newsData = req.body;
    const newNews = {
      id: newsData.id || Date.now(),
      title: newsData.title || "Untitled News",
      category: newsData.category || "Market News",
      source: newsData.source || "RE-ON Intelligence",
      date: newsData.date || new Date().toISOString().split("T")[0],
      excerpt: newsData.excerpt || "",
      content: newsData.content || "",
      images: Array.isArray(newsData.images) ? newsData.images : [],
      videos: Array.isArray(newsData.videos) ? newsData.videos : [],
      createdBy: req.user.username,
      createdAt: new Date().toISOString(),
    };

    const result = await db.collection("news").insertOne(newNews);
    await logAuditEvent(
      db,
      "NEWS_CREATED",
      req.user.username,
      `News: ${newNews.title}`,
      req,
    );
    res.status(201).json({ ...newNews, _id: result.insertedId });
  }),
);

router.put(
  "/news/:id",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;

    const { updates, unset } = buildMediaContentUpdates(req.body);
    updates.updatedBy = req.user.username;
    updates.updatedAt = new Date().toISOString();

    const updateDoc = { $set: updates };
    if (Object.keys(unset).length > 0) {
      updateDoc.$unset = unset;
    }

    const result = await updateDocumentById(db, "news", idParam, updateDoc);

    if (!result) {
      return res.status(404).json({ error: "News article not found" });
    }
    await logAuditEvent(
      db,
      "NEWS_UPDATED",
      req.user.username,
      `News ID: ${idParam}`,
      req,
    );
    res.json(result);
  }),
);

router.delete(
  "/news/:id",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const query = buildIdQuery(idParam);

    const result = await db.collection("news").deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "News article not found" });
    }
    await logAuditEvent(
      db,
      "NEWS_DELETED",
      req.user.username,
      `News ID: ${idParam}`,
      req,
    );
    res.json({ success: true, message: "News article deleted successfully" });
  }),
);

// ---------------- ADMINS / SUBADMINS ----------------
router.get(
  "/admins",
  requireAuth,
  withDb(async (req, res, db) => {
    const admins = await db
      .collection("admins")
      .find({}, { projection: { passwordHash: 0 } })
      .toArray();
    res.json(admins);
  }),
);

router.post(
  "/admins",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const { username, email, role = "subadmin" } = req.body;
    const rawEmail = (email || username || "").trim().toLowerCase();

    if (!rawEmail || !rawEmail.includes("@")) {
      return res
        .status(400)
        .json({
          success: false,
          message: "A valid Gmail / email address is required",
        });
    }

    const ALLOWED_ADMIN_EMAIL = (
      process.env.ALLOWED_ADMIN_EMAIL || "yasirreonadmin@gmail.com"
    ).toLowerCase();
    if (rawEmail === ALLOWED_ADMIN_EMAIL) {
      return res
        .status(400)
        .json({
          success: false,
          message: "This email is already the primary Superadmin",
        });
    }

    const existing = await db.collection("admins").findOne({
      $or: [
        { username: { $regex: new RegExp(`^${rawEmail}$`, "i") } },
        { email: { $regex: new RegExp(`^${rawEmail}$`, "i") } },
      ],
    });

    if (existing) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Subadmin already exists with this email address",
        });
    }

    const newAdmin = {
      username: rawEmail,
      email: rawEmail,
      role: role || "subadmin",
      createdBy: req.user.username,
      createdAt: new Date().toISOString(),
    };

    const insertResult = await db.collection("admins").insertOne(newAdmin);
    await logAuditEvent(
      db,
      "SUBADMIN_ADDED",
      req.user.username,
      `Added subadmin: ${rawEmail}`,
      req,
    );
    res.status(201).json({
      success: true,
      message: `Subadmin ${rawEmail} added successfully`,
      admin: { ...newAdmin, _id: insertResult.insertedId },
    });
  }),
);

router.delete(
  "/admins/:username",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const username = decodeURIComponent(req.params.username)
      .trim()
      .toLowerCase();
    const ALLOWED_ADMIN_EMAIL = (
      process.env.ALLOWED_ADMIN_EMAIL || "yasirreonadmin@gmail.com"
    ).toLowerCase();

    if (username === "superadmin" || username === ALLOWED_ADMIN_EMAIL) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot remove the primary Superadmin",
        });
    }

    const result = await db.collection("admins").deleteOne({
      $or: [
        { username: { $regex: new RegExp(`^${username}$`, "i") } },
        { email: { $regex: new RegExp(`^${username}$`, "i") } },
      ],
    });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subadmin not found" });
    }

    await logAuditEvent(
      db,
      "SUBADMIN_REMOVED",
      req.user.username,
      `Removed subadmin: ${username}`,
      req,
    );
    res.json({
      success: true,
      message: `Subadmin ${username} removed successfully`,
    });
  }),
);

// ---------------- CONTACT INQUIRIES ----------------
// Helper: Find next active caller using round-robin & least-workload algorithm
async function getAutoAssignedCaller(db) {
  try {
    const activeCallers = await db
      .collection("callers")
      .find({ active: { $ne: false } })
      .toArray();
    if (!activeCallers || activeCallers.length === 0) return null;

    // Count leads assigned to each active caller
    const callerCounts = await Promise.all(
      activeCallers.map(async (caller) => {
        const callerIdStr = String(caller._id);
        const count = await db.collection("contacts").countDocuments({
          $or: [
            { "assignedTo.callerId": callerIdStr },
            { "assignedTo.name": caller.name },
            { assignedCallerName: caller.name },
          ],
        });
        return { caller, count };
      }),
    );

    // Sort by lowest assigned count first
    callerCounts.sort((a, b) => a.count - b.count);
    const selected = callerCounts[0].caller;

    return {
      callerId: String(selected._id),
      name: selected.name,
      phone: selected.phone || "",
      email: selected.email || "",
      assignedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[AutoAssign] Error picking caller:", err.message);
    return null;
  }
}

router.get(
  "/contacts",
  withDb(async (req, res, db) => {
    // 100% Automatic Background Round-Robin: auto-assign any unassigned contacts immediately
    try {
      const activeCallers = await db.collection("callers").find({ active: { $ne: false } }).toArray();
      if (activeCallers && activeCallers.length > 0) {
        const unassigned = await db.collection("contacts").find({
          $or: [
            { assignedTo: { $exists: false } },
            { assignedTo: null },
            { assignedCallerName: "" },
            { assignedCallerName: { $exists: false } },
            { "assignedTo.name": { $exists: false } },
          ],
        }).toArray();

        if (unassigned.length > 0) {
          const nowStr = new Date().toISOString();
          for (let i = 0; i < unassigned.length; i++) {
            const nextCaller = await getAutoAssignedCaller(db);
            if (nextCaller) {
              await db.collection("contacts").updateOne(
                { _id: unassigned[i]._id },
                { $set: { assignedTo: nextCaller, assignedCallerName: nextCaller.name, updatedAt: nowStr } }
              );
            }
          }
        }
      }
    } catch (e) {
      console.warn("[AutoAssign Background Notice]:", e.message);
    }

    const contacts = await db
      .collection("contacts")
      .find({})
      .sort({ submittedAt: -1 })
      .toArray();
    res.json(contacts);
  }),
);

router.post(
  "/contacts",
  withDb(async (req, res, db) => {
    const {
      name,
      email,
      phone,
      propertyName,
      propertyId,
      propertyLocation,
      location,
      budget,
      message,
      type,
      source,
      preferredDate,
      status,
      notes,
      assignedTo,
    } = req.body;

    if (!name && !phone && !email) {
      return res
        .status(400)
        .json({
          success: false,
          error: "At least a name, phone number, or email is required.",
        });
    }

    // Auto-assign to caller with lowest workload if not explicitly assigned
    let finalAssignedTo = assignedTo || null;
    if (!finalAssignedTo) {
      finalAssignedTo = await getAutoAssignedCaller(db);
    }

    const newContact = {
      name: (name || "Anonymous Visitor").trim(),
      email: (email || "").trim(),
      phone: (phone || "").trim(),
      propertyName: (propertyName || "").trim(),
      propertyId: propertyId ? String(propertyId) : "",
      propertyLocation: (propertyLocation || location || "").trim(),
      location: (location || propertyLocation || "").trim(),
      budget: (budget || "").trim(),
      message: (
        message ||
        (propertyName ? `Inquiry regarding ${propertyName}` : "General inquiry")
      ).trim(),
      type: (
        type || (propertyName ? "Property Inquiry" : "General Contact")
      ).trim(),
      source: (source || "Website").trim(),
      preferredDate: (preferredDate || "").trim(),
      status: status || "New",
      notes: (notes || "").trim(),
      assignedTo: finalAssignedTo,
      assignedCallerName: finalAssignedTo?.name || "",
      callStatus: "Pending",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("contacts").insertOne(newContact);
    const savedContact = { ...newContact, _id: result.insertedId };

    // Sync to Google Sheets (fire-and-forget)
    syncContactToSheet(savedContact).catch((err) =>
      console.error("[Sheets Sync] Contact create error:", err.message),
    );

    res.status(201).json({
      success: true,
      message: "Inquiry saved successfully to MongoDB",
      contact: savedContact,
    });
  }),
);

router.put(
  "/contacts/:id",
  requireAuth,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const body = req.body || {};
    const query = buildIdQuery(idParam);

    const updates = { updatedAt: new Date().toISOString() };
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.assignedTo !== undefined) {
      if (body.assignedTo === "ROUND_ROBIN" || body.assignedTo === "__ROUND_ROBIN__") {
        const nextCaller = await getAutoAssignedCaller(db);
        if (nextCaller) {
          updates.assignedTo = nextCaller;
          updates.assignedCallerName = nextCaller.name;
        }
      } else {
        updates.assignedTo = body.assignedTo;
        updates.assignedCallerName =
          body.assignedTo?.name ||
          (typeof body.assignedTo === "string" ? body.assignedTo : "");
      }
    }
    if (body.assignedCallerName !== undefined) {
      if (body.assignedCallerName === "__ROUND_ROBIN__" || body.assignedCallerName === "ROUND_ROBIN") {
        const nextCaller = await getAutoAssignedCaller(db);
        if (nextCaller) {
          updates.assignedTo = nextCaller;
          updates.assignedCallerName = nextCaller.name;
        }
      } else {
        updates.assignedCallerName = body.assignedCallerName;
      }
    }
    if (body.callStatus !== undefined) updates.callStatus = body.callStatus;
    if (body.lastCalledAt !== undefined)
      updates.lastCalledAt = body.lastCalledAt;
    if (body.stage !== undefined) updates.stage = body.stage;
    if (body.timeline !== undefined) updates.timeline = body.timeline;
    if (body.kycStatus !== undefined) updates.kycStatus = body.kycStatus;
    if (body.fintech !== undefined) updates.fintech = body.fintech;
    if (body.agentLogs !== undefined) updates.agentLogs = body.agentLogs;
    if (body.digitalTwin !== undefined) updates.digitalTwin = body.digitalTwin;
    if (body.budget !== undefined) updates.budget = body.budget;
    if (body.propertyName !== undefined)
      updates.propertyName = body.propertyName;

    const result = await db
      .collection("contacts")
      .findOneAndUpdate(query, { $set: updates }, { returnDocument: "after" });

    const contactResult = result?.value || result || updates;
    if (contactResult) {
      syncContactToSheet(contactResult).catch((err) =>
        console.error("[Sheets Sync] Contact update error:", err.message),
      );
    }

    res.json({ success: true, contact: contactResult });
  }),
);

router.delete(
  "/contacts/:id",
  requireAuth,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const query = buildIdQuery(idParam);

    const contactToDelete = await db.collection("contacts").findOne(query);

    const result = await db.collection("contacts").deleteOne(query);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Inquiry not found" });
    }

    await logAuditEvent(
      db,
      "INQUIRY_DELETED",
      req.user.username,
      `Deleted inquiry ID: ${idParam}`,
      req,
    );

    if (contactToDelete?._id) {
      deleteContactFromSheet(contactToDelete._id).catch((err) =>
        console.error("[Sheets Sync] Contact delete error:", err.message),
      );
    }

    res.json({ success: true, message: "Inquiry deleted successfully" });
  }),
);

// ──────────────────────────────────────────────
// CALLERS & AUTO-ASSIGNMENT LEAD DISTRIBUTION API
// ──────────────────────────────────────────────

// GET /api/callers — List all callers with live lead stats & workload
router.get(
  "/callers",
  requireAuth,
  withDb(async (req, res, db) => {
    const callers = await db
      .collection("callers")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Aggregate live metrics from contacts collection
    const callersWithStats = await Promise.all(
      callers.map(async (caller) => {
        const callerIdStr = String(caller._id);
        const query = {
          $or: [
            { "assignedTo.callerId": callerIdStr },
            { "assignedTo.name": caller.name },
            { assignedCallerName: caller.name },
          ],
        };
        const totalLeads = await db
          .collection("contacts")
          .countDocuments(query);
        const newLeads = await db
          .collection("contacts")
          .countDocuments({
            ...query,
            $or: [{ status: "New" }, { status: { $exists: false } }],
          });
        const contactedLeads = await db
          .collection("contacts")
          .countDocuments({
            ...query,
            $or: [
              { status: "Contacted" },
              { callStatus: "Called" },
              { callStatus: "Interested" },
            ],
          });
        const siteVisits = await db
          .collection("contacts")
          .countDocuments({ ...query, status: "Site Visit Scheduled" });
        const converted = await db
          .collection("contacts")
          .countDocuments({ ...query, status: "Converted" });

        return {
          ...caller,
          totalLeads,
          newLeads,
          contactedLeads,
          siteVisits,
          converted,
        };
      }),
    );

    const unassignedCount = await db.collection("contacts").countDocuments({
      $or: [
        { assignedTo: { $exists: false } },
        { assignedTo: null },
        { assignedCallerName: "" },
        { assignedCallerName: { $exists: false } },
      ],
    });

    res.json({
      success: true,
      callers: callersWithStats,
      unassignedCount,
      totalContacts: await db.collection("contacts").countDocuments({}),
    });
  }),
);

// POST /api/callers — Add a new caller
router.post(
  "/callers",
  requireAuth,
  withDb(async (req, res, db) => {
    const { name, phone, email, active } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Caller name is required." });
    }

    const newCaller = {
      name: name.trim(),
      phone: (phone || "").trim(),
      email: (email || "").trim().toLowerCase(),
      active: active !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("callers").insertOne(newCaller);
    const saved = { ...newCaller, _id: result.insertedId };

    await logAuditEvent(
      db,
      "CALLER_CREATED",
      req.user?.username || "admin",
      `Created telecaller "${name}"`,
      req,
    );
    res.status(201).json({ success: true, caller: saved });
  }),
);

// PUT /api/callers/:id — Update caller details or toggle active status
router.put(
  "/callers/:id",
  requireAuth,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const query = buildIdQuery(idParam);
    const body = req.body || {};

    const updates = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.phone !== undefined) updates.phone = body.phone.trim();
    if (body.email !== undefined)
      updates.email = body.email.trim().toLowerCase();
    if (body.active !== undefined) updates.active = Boolean(body.active);

    const result = await db
      .collection("callers")
      .findOneAndUpdate(query, { $set: updates }, { returnDocument: "after" });
    const updated = result?.value || result || updates;
    res.json({ success: true, caller: updated });
  }),
);

// DELETE /api/callers/:id — Remove a caller
router.delete(
  "/callers/:id",
  requireAuth,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const query = buildIdQuery(idParam);
    const caller = await db.collection("callers").findOne(query);
    if (!caller) return res.status(404).json({ error: "Caller not found" });

    await db.collection("callers").deleteOne(query);
    await logAuditEvent(
      db,
      "CALLER_DELETED",
      req.user?.username || "admin",
      `Deleted telecaller "${caller.name}"`,
      req,
    );
    res.json({ success: true, message: "Caller deleted successfully" });
  }),
);

// POST /api/callers/auto-distribute — Evenly distribute leads among active callers (e.g. 50 leads ÷ 5 callers = 10 each)
router.post(
  "/callers/auto-distribute",
  requireAuth,
  withDb(async (req, res, db) => {
    const { mode = "unassigned_only" } = req.body || {}; // 'unassigned_only' | 'rebalance_all'

    const activeCallers = await db
      .collection("callers")
      .find({ active: { $ne: false } })
      .toArray();
    if (!activeCallers || activeCallers.length === 0) {
      return res
        .status(400)
        .json({
          error:
            "No active callers found. Please add or activate at least one caller first.",
        });
    }

    let contactsToDistribute = [];
    if (mode === "rebalance_all") {
      contactsToDistribute = await db
        .collection("contacts")
        .find({})
        .sort({ submittedAt: -1 })
        .toArray();
    } else {
      contactsToDistribute = await db
        .collection("contacts")
        .find({
          $or: [
            { assignedTo: { $exists: false } },
            { assignedTo: null },
            { assignedCallerName: "" },
            { assignedCallerName: { $exists: false } },
            { "assignedTo.name": { $exists: false } },
          ],
        })
        .sort({ submittedAt: -1 })
        .toArray();
    }

    if (contactsToDistribute.length === 0) {
      return res.json({
        success: true,
        message: "All leads are already assigned to active callers.",
        distributedCount: 0,
        callersCount: activeCallers.length,
      });
    }

    // Fair Round-Robin distribution
    let count = 0;
    const nowStr = new Date().toISOString();
    const updatedContacts = [];

    for (let i = 0; i < contactsToDistribute.length; i++) {
      const contact = contactsToDistribute[i];
      const assignedCaller = activeCallers[i % activeCallers.length];

      const assignedInfo = {
        callerId: String(assignedCaller._id),
        name: assignedCaller.name,
        phone: assignedCaller.phone || "",
        email: assignedCaller.email || "",
        assignedAt: nowStr,
      };

      await db.collection("contacts").updateOne(
        { _id: contact._id },
        {
          $set: {
            assignedTo: assignedInfo,
            assignedCallerName: assignedCaller.name,
            updatedAt: nowStr,
          },
        },
      );

      const updatedDoc = {
        ...contact,
        assignedTo: assignedInfo,
        assignedCallerName: assignedCaller.name,
        updatedAt: nowStr,
      };
      updatedContacts.push(updatedDoc);
      count++;

      // Sync to sheet
      syncContactToSheet(updatedDoc).catch(() => {});
    }

    await logAuditEvent(
      db,
      "LEADS_AUTO_DISTRIBUTED",
      req.user?.username || "admin",
      `Auto-distributed ${count} leads equally across ${activeCallers.length} callers (~${Math.ceil(count / activeCallers.length)} each)`,
      req,
    );

    res.json({
      success: true,
      message: `Successfully distributed ${count} leads equally across ${activeCallers.length} active callers (~${Math.round(count / activeCallers.length)} leads each)!`,
      distributedCount: count,
      callersCount: activeCallers.length,
      leadsPerCaller: Math.ceil(count / activeCallers.length),
    });
  }),
);

// POST /api/callers/round-robin-assign — Round-robin assign a single lead or selected leads
router.post(
  "/callers/round-robin-assign",
  requireAuth,
  withDb(async (req, res, db) => {
    const { contactId, contactIds } = req.body || {};

    const targetIds = contactIds && Array.isArray(contactIds) && contactIds.length > 0
      ? contactIds
      : contactId
      ? [contactId]
      : [];

    if (targetIds.length === 0) {
      return res.status(400).json({ success: false, error: "contactId or contactIds array is required." });
    }

    const activeCallers = await db
      .collection("callers")
      .find({ active: { $ne: false } })
      .toArray();

    if (!activeCallers || activeCallers.length === 0) {
      return res.status(400).json({ success: false, error: "No active callers found. Please add callers first." });
    }

    const assignedResults = [];
    const nowStr = new Date().toISOString();

    for (const id of targetIds) {
      const assignedCaller = await getAutoAssignedCaller(db);
      if (!assignedCaller) continue;

      const query = buildIdQuery(id);
      await db.collection("contacts").updateOne(
        query,
        {
          $set: {
            assignedTo: assignedCaller,
            assignedCallerName: assignedCaller.name,
            updatedAt: nowStr,
          },
        }
      );

      const updated = await db.collection("contacts").findOne(query);
      if (updated) {
        syncContactToSheet(updated).catch(() => {});
        assignedResults.push({ id, callerName: assignedCaller.name });
      }
    }

    await logAuditEvent(
      db,
      "LEAD_ROUND_ROBIN_ASSIGNED",
      req.user?.username || "admin",
      `Round-robin assigned ${assignedResults.length} lead(s) to active callers`,
      req,
    );

    res.json({
      success: true,
      message: `Round-robin assigned ${assignedResults.length} lead(s) successfully!`,
      assigned: assignedResults,
    });
  }),
);

// PUT /api/contacts/:id/call-log — Quick call logger & status update
router.put(
  "/contacts/:id/call-log",
  requireAuth,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const query = buildIdQuery(idParam);
    const { outcome, note, status } = req.body || {};
    const now = new Date().toISOString();

    const logEntry = {
      calledAt: now,
      outcome: outcome || "Connected",
      note: note || "",
      calledBy: req.user?.username || "Admin",
    };

    const updates = {
      callStatus: outcome || "Called",
      lastCalledAt: now,
      updatedAt: now,
    };
    if (status) updates.status = status;

    const contact = await db.collection("contacts").findOneAndUpdate(
      query,
      {
        $set: updates,
        $push: {
          callHistory: logEntry,
          timeline: {
            type: "Call Log",
            title: `Called: ${outcome}`,
            desc: note,
            timestamp: now,
          },
        },
      },
      { returnDocument: "after" },
    );

    const updatedContact = contact?.value || contact;
    if (updatedContact) {
      syncContactToSheet(updatedContact).catch(() => {});
    }

    res.json({ success: true, contact: updatedContact, log: logEntry });
  }),
);

// ---------------- AI-NATIVE REVENUE OS ENDPOINTS (POWERED BY NVIDIA NEMOTRON) ----------------

// 1. Analyze Lead with Digital Twin, Intent, Scoring, & Property Matcher
router.get(
  "/crm/ai/analyze-lead/:id",
  requireAuth,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const query = buildIdQuery(idParam);
    const contact = await db.collection("contacts").findOne(query);
    if (!contact) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const properties = await db.collection("properties").find({}).toArray();
    const digitalTwin = generateCustomerDigitalTwin(contact, properties);
    const matchedProperties = matchPropertiesForLead(digitalTwin, properties);

    res.json({
      success: true,
      leadId: idParam,
      digitalTwin,
      matchedProperties,
    });
  }),
);

// 2. Execute Autonomous AI Sales Agent (Nemotron Powered)
router.post(
  "/crm/ai/run-agent",
  requireAuth,
  withDb(async (req, res, db) => {
    const { leadId, agentName } = req.body;
    if (!leadId || !agentName) {
      return res
        .status(400)
        .json({ error: "leadId and agentName are required" });
    }

    const query = buildIdQuery(leadId);
    const contact = await db.collection("contacts").findOne(query);
    if (!contact) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const properties = await db.collection("properties").find({}).toArray();
    const digitalTwin = generateCustomerDigitalTwin(contact, properties);
    const agentExecution = await executeAutonomousAgent(
      agentName,
      contact,
      digitalTwin,
      properties,
    );

    // Append to lead's timeline & agent logs
    const timelineEntry = {
      id: `event_${Date.now()}`,
      type: "AI_AGENT_ACTION",
      title: `${agentExecution.agent} Dispatched`,
      detail:
        agentExecution.output?.executiveSummary ||
        agentExecution.output?.draftMessage ||
        agentExecution.output?.callObjective ||
        "Agent completed task.",
      timestamp: new Date().toISOString(),
      actor: req.user.username || "AI Revenue OS",
      confidence: agentExecution.confidence,
    };

    const existingTimeline = Array.isArray(contact.timeline)
      ? contact.timeline
      : [];
    const existingAgentLogs = Array.isArray(contact.agentLogs)
      ? contact.agentLogs
      : [];

    await db.collection("contacts").updateOne(query, {
      $set: {
        timeline: [timelineEntry, ...existingTimeline],
        agentLogs: [agentExecution, ...existingAgentLogs],
        updatedAt: new Date().toISOString(),
      },
    });

    await logAuditEvent(
      db,
      "AI_AGENT_EXECUTED",
      req.user.username,
      `Executed ${agentName} for lead ${contact.name || leadId}`,
      req,
    );

    res.json({
      success: true,
      agentExecution,
      timelineEntry,
    });
  }),
);

// 3. 'Ask CRM' Natural Language Query Engine (Nemotron Enhanced)
router.post(
  "/crm/ai/ask-crm",
  requireAuth,
  withDb(async (req, res, db) => {
    const { query } = req.body;
    const contacts = await db
      .collection("contacts")
      .find({})
      .sort({ submittedAt: -1 })
      .toArray();
    const properties = await db.collection("properties").find({}).toArray();

    const result = await processNaturalLanguageQuery(query, contacts, properties);
    res.json({
      success: true,
      ...result,
    });
  }),
);

// 4. Generate Dynamic Call Script (Nemotron Powered)
router.post(
  "/crm/ai/generate-script",
  requireAuth,
  withDb(async (req, res, db) => {
    const { leadId, stage } = req.body;
    if (!leadId) {
      return res.status(400).json({ error: "leadId is required" });
    }

    const query = buildIdQuery(leadId);
    const contact = await db.collection("contacts").findOne(query);
    if (!contact) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const properties = await db.collection("properties").find({}).toArray();
    const digitalTwin = generateCustomerDigitalTwin(contact, properties);
    const script = await generateCallScript({ ...contact, status: stage || contact.status }, digitalTwin);

    res.json({
      success: true,
      leadId,
      script,
      aiPowered: Boolean(script),
    });
  }),
);

// 5. Generate Dynamic Objection Rebuttals (Nemotron Powered)
router.post(
  "/crm/ai/generate-objections",
  requireAuth,
  withDb(async (req, res, db) => {
    const { leadId } = req.body;
    if (!leadId) {
      return res.status(400).json({ error: "leadId is required" });
    }

    const query = buildIdQuery(leadId);
    const contact = await db.collection("contacts").findOne(query);
    if (!contact) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const properties = await db.collection("properties").find({}).toArray();
    const digitalTwin = generateCustomerDigitalTwin(contact, properties);
    const objections = await generateObjections(contact, digitalTwin);

    res.json({
      success: true,
      leadId,
      objections,
      aiPowered: Boolean(objections && objections.length),
    });
  }),
);

// 6. Generate Dynamic WhatsApp Pitch Templates (Nemotron Powered)
router.post(
  "/crm/ai/generate-whatsapp",
  requireAuth,
  withDb(async (req, res, db) => {
    const { leadId } = req.body;
    if (!leadId) {
      return res.status(400).json({ error: "leadId is required" });
    }

    const query = buildIdQuery(leadId);
    const contact = await db.collection("contacts").findOne(query);
    if (!contact) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const properties = await db.collection("properties").find({}).toArray();
    const digitalTwin = generateCustomerDigitalTwin(contact, properties);
    const templates = await generateWhatsAppTemplates(contact, digitalTwin);

    res.json({
      success: true,
      leadId,
      templates,
      aiPowered: Boolean(templates && templates.length),
    });
  }),
);

// 7. Clear AI Cache (Admin Utility)
router.post(
  "/crm/ai/clear-cache",
  requireAuth,
  requireSuperadmin,
  async (req, res) => {
    const result = clearNemotronCache();
    res.json({ success: true, ...result });
  },
);

// 7b. AI Property Comparison (Nemotron Powered — no DB needed)
router.post(
  "/crm/ai/compare-properties",
  async (req, res) => {
    const { properties } = req.body;
    if (!Array.isArray(properties) || properties.length < 2) {
      return res.status(400).json({ error: "At least 2 properties required" });
    }
    try {
      const comparison = await compareProperties(properties);
      res.json({
        success: true,
        comparison,
        aiPowered: Boolean(comparison),
      });
    } catch (err) {
      console.error("[AI Compare] Error:", err.message);
      res.json({ success: false, comparison: null, aiPowered: false });
    }
  },
);

// 8. Log Omnichannel Timeline Event (Call, WhatsApp, Meeting, KYC)
router.post(
  "/crm/leads/:id/timeline",
  requireAuth,
  withDb(async (req, res, db) => {
    const idParam = req.params.id;
    const { type, title, detail, outcome } = req.body;
    const query = buildIdQuery(idParam);

    const contact = await db.collection("contacts").findOne(query);
    if (!contact) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const timelineEntry = {
      id: `event_${Date.now()}`,
      type: type || "NOTE_LOGGED",
      title: title || "CRM Event",
      detail: detail || "",
      outcome: outcome || "COMPLETED",
      timestamp: new Date().toISOString(),
      actor: req.user.username || "Sales Rep",
    };

    const existingTimeline = Array.isArray(contact.timeline)
      ? contact.timeline
      : [];

    await db.collection("contacts").updateOne(query, {
      $set: {
        timeline: [timelineEntry, ...existingTimeline],
        updatedAt: new Date().toISOString(),
      },
    });

    res.json({ success: true, timelineEntry });
  }),
);

// 5. Pipeline Summary & Revenue Forecasting
router.get(
  "/crm/pipeline-summary",
  requireAuth,
  withDb(async (req, res, db) => {
    const contacts = await db.collection("contacts").find({}).toArray();
    const properties = await db.collection("properties").find({}).toArray();

    let totalPipelineValue = 0;
    let highIntentCount = 0;
    let totalSiteVisits = 0;
    let atRiskCount = 0;

    contacts.forEach((c) => {
      let budgetNum = parsePriceToNumber(c.budget);
      if (!budgetNum && c.propertyName) {
        const p = properties.find(
          (prop) =>
            (prop.name || "").toLowerCase() === c.propertyName.toLowerCase(),
        );
        if (p) budgetNum = parsePriceToNumber(p.price);
      }
      if (!budgetNum) budgetNum = 8500000;
      totalPipelineValue += budgetNum;

      const type = (c.type || "").toLowerCase();
      const msg = (c.message || "").toLowerCase();
      if (
        type.includes("dwell") ||
        type.includes("visit") ||
        type.includes("30s") ||
        msg.includes("urgent")
      ) {
        highIntentCount++;
      }
      if (type.includes("visit") || c.status === "Site Visit Scheduled") {
        totalSiteVisits++;
      }
      const ageDays = c.submittedAt
        ? (Date.now() - new Date(c.submittedAt).getTime()) / (1000 * 3600 * 24)
        : 0;
      if ((!c.status || c.status === "New") && ageDays > 2) {
        atRiskCount++;
      }
    });

    // Predicted conversion rate heuristic ~28%
    const forecastedRevenue = Math.round(totalPipelineValue * 0.28);

    res.json({
      success: true,
      totalLeads: contacts.length,
      totalPipelineValue,
      forecastedRevenue,
      highIntentCount,
      totalSiteVisits,
      atRiskCount,
    });
  }),
);

// Full sync all contacts/leads to Google Sheets
router.post(
  "/contacts/sync-sheets",
  requireAuth,
  requireSuperadmin,
  withDb(async (req, res, db) => {
    const result = await fullContactsSyncToSheet(db);
    if (result.success) {
      await logAuditEvent(
        db,
        "CONTACTS_SHEETS_FULL_SYNC",
        req.user.username,
        `Synced ${result.count} contacts to Google Sheets`,
        req,
      );
      res.json({
        success: true,
        message: `${result.count} contacts synced to Google Sheets`,
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  }),
);

// ---------------- MEDIA FILE UPLOADS ----------------
router.post("/upload", requireAuth, (req, res) => {
  const { fileData } = req.body;
  if (!fileData) {
    return res.status(400).json({ error: "No file data provided" });
  }
  res.json({ success: true, url: fileData });
});

// ---------------- PROTECTED MEDIA PROXY & REDIRECT ----------------
const MEDIA_SECRET =
  process.env.JWT_SECRET || "reon-media-secure-encryption-key-2026";

function decryptMediaToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split("_");
    if (parts.length === 2) {
      const iv = Buffer.from(parts[0], "hex");
      const enc = parts[1];
      const key = crypto.createHash("sha256").update(MEDIA_SECRET).digest();
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(enc, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return JSON.parse(decrypted);
    }
  } catch {}

  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    if (raw.startsWith("{")) {
      return JSON.parse(raw);
    }
    return { u: raw };
  } catch {}

  return null;
}

router.get("/media/view", async (req, res) => {
  const { token, ref } = req.query;
  const propertyRef = ref || "";

  // Determine if this is a direct browser top-level navigation (new tab, address bar, devtools "open in new tab")
  const acceptHeader = req.headers["accept"] || "";
  const secFetchDest = req.headers["sec-fetch-dest"] || "";
  const secFetchMode = req.headers["sec-fetch-mode"] || "";

  const isBrowserTabNavigation =
    secFetchMode === "navigate" ||
    secFetchDest === "document" ||
    (acceptHeader.includes("text/html") && !acceptHeader.includes("image/"));

  // If someone tries to open in a new tab or paste in browser -> Redirect to website property / home page
  if (isBrowserTabNavigation) {
    const websiteRedirect =
      propertyRef && propertyRef !== "reon"
        ? `/properties/${encodeURIComponent(propertyRef)}`
        : "/";
    return res.redirect(302, websiteRedirect);
  }

  if (!token) {
    return res.redirect(302, "/");
  }

  const payload = decryptMediaToken(token);
  if (!payload || !payload.u) {
    return res.redirect(302, "/");
  }

  let targetUrl = payload.u;

  // Auto-convert Google Drive links to direct high-res streamable URL
  if (
    targetUrl &&
    (targetUrl.includes("drive.google.com") ||
      targetUrl.includes("docs.google.com"))
  ) {
    const fileDMatch = targetUrl.match(
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    );
    const idParamMatch = targetUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    const driveId =
      (fileDMatch && fileDMatch[1]) || (idParamMatch && idParamMatch[1]);
    if (driveId) {
      targetUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
    }
  }

  // If targetUrl is data URI
  if (targetUrl.startsWith("data:")) {
    const parts = targetUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const buf = Buffer.from(parts[1], "base64");
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.send(buf);
  }

  // Stream remote image content with upstream referer to bypass CDN/hotlinking protection
  try {
    let parsedOrigin = "";
    try {
      const u = new URL(targetUrl);
      parsedOrigin = `${u.protocol}//${u.host}/`;
    } catch {}

    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        ...(parsedOrigin ? { Referer: parsedOrigin } : {}),
      },
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send("Media unavailable");
    }

    const contentType = upstreamRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    return res.redirect(
      302,
      propertyRef ? `/properties/${encodeURIComponent(propertyRef)}` : "/",
    );
  }
});

// ═══════════════════════════════════════════════
// BETTER AUTH CLIENT ROUTES — Phone & Email Auth in MongoDB
// ═══════════════════════════════════════════════

// Helper to normalize phone numbers
function formatPhoneNumber(input) {
  if (!input) return "";
  let cleaned = String(input).replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    if (cleaned.length === 10) cleaned = "+91" + cleaned;
    else if (cleaned.length === 12 && cleaned.startsWith("91"))
      cleaned = "+" + cleaned;
    else cleaned = "+" + cleaned;
  }
  return cleaned;
}

// ──────────────────────────────────────────────
// CLIENT PHONE OTP & AUTHENTICATION SYSTEM
// ──────────────────────────────────────────────

// In-memory OTP storage challenge map with auto-expiry
const otpStore = new Map();

// Clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [phone, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(phone);
    }
  }
}, 60000);

// POST /api/clients/send-otp — Generate and dispatch secure 6-digit OTP via SMS
router.post("/clients/send-otp", async (req, res) => {
  try {
    const { phone, name } = req.body || {};
    const formattedPhone = formatPhoneNumber(phone);

    if (!formattedPhone || formattedPhone.replace(/\D/g, "").length < 10) {
      return res
        .status(400)
        .json({ error: "Please enter a valid 10-digit mobile number." });
    }

    // Generate random 6-digit OTP (e.g. 849201)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Dispatch SMS to the phone number
    const smsResult = await sendSMSOtp(formattedPhone, otp);
    if (!smsResult.success) {
      return res
        .status(503)
        .json({
          error:
            smsResult.message ||
            "OTP delivery is temporarily unavailable. Please try again.",
        });
    }

    // Only retain a challenge after the provider accepts the message.
    otpStore.set(formattedPhone, {
      otp,
      expiresAt,
      name: (name || "").trim(),
      attempts: 0,
    });

    res.json({
      success: true,
      message: `OTP verification code sent to ${formattedPhone}`,
      provider: smsResult.provider,
      expiresInSeconds: 600,
    });
  } catch (err) {
    console.error("[API] POST /clients/send-otp error:", err);
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

// POST /api/clients/verify-otp — Verify OTP, save user information, and issue token
router.post("/clients/verify-otp", async (req, res) => {
  try {
    const { phone, otp, name } = req.body || {};
    const formattedPhone = formatPhoneNumber(phone);
    const cleanOtp = String(otp || "").trim();

    if (!formattedPhone) {
      return res.status(400).json({ error: "Mobile number is required." });
    }
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res
        .status(400)
        .json({ error: "Please enter the valid 6-digit OTP code." });
    }

    const challenge = otpStore.get(formattedPhone);

    // Verify against active challenge
    const isValidOtp = Boolean(
      challenge &&
      challenge.otp === cleanOtp &&
      challenge.expiresAt > Date.now(),
    );

    if (!isValidOtp) {
      if (challenge) {
        challenge.attempts = (challenge.attempts || 0) + 1;
        if (challenge.attempts >= 5) {
          otpStore.delete(formattedPhone);
          return res
            .status(400)
            .json({
              error: "Too many invalid attempts. Please request a new OTP.",
            });
        }
      }
      return res
        .status(400)
        .json({
          error:
            "Invalid or expired OTP verification code. Please check your SMS and try again.",
        });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    const clientsCol = db.collection("clients");
    const contactsCol = db.collection("contacts");
    const now = new Date();

    const finalName = (name || (challenge && challenge.name) || "").trim();

    // 1. Find or create client in MongoDB
    let clientUser = await clientsCol.findOne({ phone: formattedPhone });

    if (clientUser) {
      await clientsCol.updateOne(
        { _id: clientUser._id },
        {
          $set: {
            lastLoginAt: now,
            updatedAt: now,
            isPhoneVerified: true,
            phoneVerifiedAt: now,
            authMethod: "phone_otp",
            ...(finalName ? { name: finalName } : {}),
          },
        },
      );
      clientUser = await clientsCol.findOne({ _id: clientUser._id });
    } else {
      const newClient = {
        clientId: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        phone: formattedPhone,
        name: finalName || `Member ${formattedPhone.slice(-4)}`,
        email: null,
        isPhoneVerified: true,
        phoneVerifiedAt: now,
        authMethod: "phone_otp",
        createdAt: now,
        lastLoginAt: now,
        updatedAt: now,
      };
      const result = await clientsCol.insertOne(newClient);
      clientUser = { ...newClient, _id: result.insertedId };
    }

    // 2. Ensure user information is saved to Contacts / CRM & Google Sheets
    try {
      const existingContact = await contactsCol.findOne({
        phone: formattedPhone,
      });
      if (!existingContact) {
        const assignedCaller = await getAutoAssignedCaller(db);
        const contactDoc = {
          name: clientUser.name || `Member ${formattedPhone.slice(-4)}`,
          phone: formattedPhone,
          email: clientUser.email || "",
          propertyName: "RE-ON Shortlist / Portal Registration",
          propertyId: "",
          location: "Navi Mumbai",
          budget: "",
          message: "Client verified and logged in via Secure Phone OTP system.",
          type: "Verified Member Signup",
          source: "Phone OTP Auth",
          status: "New",
          notes: "Phone verified via 6-digit OTP",
          assignedTo: assignedCaller,
          assignedCallerName: assignedCaller?.name || "",
          callStatus: "Pending",
          submittedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        const insertRes = await contactsCol.insertOne(contactDoc);
        const savedContact = { ...contactDoc, _id: insertRes.insertedId };

        // Sync to Google Sheets in background
        syncContactToSheet(savedContact).catch((err) =>
          console.error(
            "[Sheets Sync] Client signup contact error:",
            err.message,
          ),
        );
      }
    } catch (crmErr) {
      console.warn("[API] Contact CRM sync warning:", crmErr.message);
    }

    // 3. Generate JWT token
    const clientToken = generateToken({
      id: clientUser.clientId || clientUser._id,
      phone: clientUser.phone,
      email: clientUser.email,
      name: clientUser.name,
      role: "client",
    });

    // OTPs are one-time credentials, even when the database update succeeds.
    otpStore.delete(formattedPhone);

    console.log(
      `[RE-ON Auth] User ${clientUser.name} (+91 ${formattedPhone}) successfully verified & logged in.`,
    );

    return res.json({
      success: true,
      token: clientToken,
      user: {
        id: clientUser.clientId || clientUser._id,
        phone: clientUser.phone,
        name: clientUser.name,
        email: clientUser.email,
      },
    });
  } catch (err) {
    console.error("[API] POST /clients/verify-otp error:", err);
    res
      .status(500)
      .json({ error: "OTP verification failed. Please try again." });
  }
});

// POST /api/clients/auth — Phone-first or Email client login/signup fallback
router.post("/clients/auth", async (req, res) => {
  try {
    const { phone, email, name, authMethod = "phone" } = req.body;

    const formattedPhone = formatPhoneNumber(phone);
    const formattedEmail = (email || "").trim().toLowerCase();

    if (authMethod === "phone" && !formattedPhone) {
      return res
        .status(400)
        .json({ error: "Please enter a valid 10-digit mobile number." });
    }
    if (authMethod === "email" && !formattedEmail) {
      return res
        .status(400)
        .json({ error: "Please enter a valid email address." });
    }

    const { db } = await connectToDatabase();
    const col = db.collection("clients");

    const now = new Date();

    // Find existing client by phone or email
    const query =
      authMethod === "phone"
        ? { phone: formattedPhone }
        : { email: formattedEmail };

    let clientUser = await col.findOne(query);

    if (clientUser) {
      // Update last login timestamp
      await col.updateOne(
        { _id: clientUser._id },
        {
          $set: {
            lastLoginAt: now,
            updatedAt: now,
            ...(name ? { name } : {}),
            ...(formattedEmail && !clientUser.email
              ? { email: formattedEmail }
              : {}),
            ...(formattedPhone && !clientUser.phone
              ? { phone: formattedPhone }
              : {}),
          },
        },
      );
      clientUser = await col.findOne({ _id: clientUser._id });
    } else {
      // Create new client record
      const newClient = {
        clientId: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        phone: formattedPhone || null,
        email: formattedEmail || null,
        name:
          name ||
          (formattedPhone
            ? `User ${formattedPhone.slice(-4)}`
            : formattedEmail.split("@")[0]),
        createdAt: now,
        lastLoginAt: now,
        updatedAt: now,
      };
      const result = await col.insertOne(newClient);
      clientUser = { ...newClient, _id: result.insertedId };
    }

    // 2. Ensure user information is saved to Contacts / CRM & Google Sheets
    try {
      const contactsCol = db.collection("contacts");
      const existingContact = await contactsCol.findOne({
        phone: formattedPhone || (formattedEmail ? formattedEmail : null),
      });

      if (!existingContact) {
        const assignedCaller = await getAutoAssignedCaller(db);
        const contactDoc = {
          name: clientUser.name || (formattedPhone ? `Member ${formattedPhone.slice(-4)}` : "Direct Visitor"),
          phone: formattedPhone || "",
          email: clientUser.email || formattedEmail || "",
          propertyName: "RE-ON Member Portal Access",
          propertyId: "",
          location: "Navi Mumbai",
          budget: "",
          message: "Client registered & accessed RE-ON Member Portal.",
          type: "Member Signup",
          source: "Website Member Login",
          status: "New",
          notes: "Lead registered directly via mobile access (no OTP)",
          assignedTo: assignedCaller,
          assignedCallerName: assignedCaller?.name || "",
          callStatus: "Pending",
          submittedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        const insertRes = await contactsCol.insertOne(contactDoc);
        const savedContact = { ...contactDoc, _id: insertRes.insertedId };

        // Sync to Google Sheets in background
        syncContactToSheet(savedContact).catch((err) =>
          console.error(
            "[Sheets Sync] Client direct signup contact error:",
            err.message,
          ),
        );
      } else {
        // If contact already exists, update name if previously missing/generic
        const updates = { updatedAt: now.toISOString() };
        if (name && (!existingContact.name || existingContact.name.startsWith("Member ") || existingContact.name.startsWith("User ") || existingContact.name.startsWith("Anonymous"))) {
          updates.name = name.trim();
        }
        await contactsCol.updateOne({ _id: existingContact._id }, { $set: updates });
      }
    } catch (crmErr) {
      console.warn("[API] Direct Login Contact CRM sync warning:", crmErr.message);
    }

    // Issue Client Token (JWT)
    const clientToken = generateToken({
      id: clientUser.clientId || clientUser._id,
      phone: clientUser.phone,
      email: clientUser.email,
      name: clientUser.name,
      role: "client",
    });

    return res.json({
      success: true,
      token: clientToken,
      user: {
        id: clientUser.clientId || clientUser._id,
        phone: clientUser.phone,
        email: clientUser.email,
        name: clientUser.name,
      },
    });
  } catch (err) {
    console.error("[API] POST /clients/auth error:", err);
    res.status(500).json({ error: "Authentication failed. Please try again." });
  }
});

// POST /api/clients — Upsert client user (Clerk sync fallback)
router.post("/clients", async (req, res) => {
  try {
    const { clerkId, phone, email, firstName, lastName, imageUrl } = req.body;
    if (!clerkId) {
      return res.status(400).json({ error: "clerkId is required" });
    }

    const { db } = await connectToDatabase();
    const col = db.collection("clients");

    const now = new Date();
    const result = await col.updateOne(
      { clerkId },
      {
        $set: {
          phone: phone || null,
          email: email || null,
          firstName: firstName || "",
          lastName: lastName || "",
          imageUrl: imageUrl || "",
          lastLoginAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          clerkId,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    res.json({ success: true, upserted: !!result.upsertedId });
  } catch (err) {
    console.error("[API] POST /clients error:", err);
    res.status(500).json({ error: "Failed to save client data" });
  }
});

// POST /api/clients/cart — Sync client cart items to MongoDB
router.post("/clients/cart", async (req, res) => {
  try {
    const { clientId, phone, email, name, items = [] } = req.body;

    const formattedPhone = formatPhoneNumber(phone);
    const formattedEmail = (email || "").trim().toLowerCase();

    if (!clientId && !formattedPhone && !formattedEmail) {
      return res
        .status(400)
        .json({
          error: "Client identification (ID, phone, or email) is required.",
        });
    }

    const { db } = await connectToDatabase();
    const col = db.collection("clients");

    const now = new Date();

    // Query by clientId, phone, or email
    const query = [];
    if (clientId) query.push({ clientId });
    if (formattedPhone) query.push({ phone: formattedPhone });
    if (formattedEmail) query.push({ email: formattedEmail });

    const filter = query.length > 1 ? { $or: query } : query[0];

    const updateDoc = {
      $set: {
        cart: items,
        cartCount: items.length,
        cartUpdatedAt: now,
        updatedAt: now,
        ...(name ? { name } : {}),
        ...(formattedPhone ? { phone: formattedPhone } : {}),
        ...(formattedEmail ? { email: formattedEmail } : {}),
      },
      $setOnInsert: {
        clientId:
          clientId ||
          `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        lastLoginAt: now,
      },
    };

    const result = await col.updateOne(filter, updateDoc, { upsert: true });

    res.json({
      success: true,
      message: "Cart synced to MongoDB",
      itemCount: items.length,
      upserted: !!result.upsertedId,
    });
  } catch (err) {
    console.error("[API] POST /clients/cart error:", err);
    res.status(500).json({ error: "Failed to sync cart data to database." });
  }
});

// GET /api/admin/carts — View all user carts with shortlisted properties
router.get(
  "/admin/carts",
  withDb(async (req, res, db) => {
    try {
      const clientsWithCarts = await db
        .collection("clients")
        .find({
          $or: [{ "cart.0": { $exists: true } }, { cartCount: { $gt: 0 } }],
        })
        .sort({ cartUpdatedAt: -1, lastLoginAt: -1, updatedAt: -1 })
        .limit(500)
        .toArray();

      res.json(clientsWithCarts);
    } catch (err) {
      console.error("[API] GET /admin/carts error:", err);
      res.status(500).json({ error: "Failed to fetch user carts." });
    }
  }),
);

export default router;
