import { HttpsError } from "firebase-functions/v2/https";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { buildGenerateHomePayload } from "./generateHomePayloadBuilder.mjs";
import fs from "fs";
import path from "path";

const USER_ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  USER: "User",
  VIEWER: "Viewer",
};

const FIRESTORE_IN_QUERY_LIMIT = 30;

function safeFileName(value) {
  return String(value || "payload")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 120)
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function writeLocalTestingJson({ outputDir, eventId, suffix, data }) {
  if (!outputDir) return null;

  try {
    fs.mkdirSync(outputDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(
      outputDir,
      `${timestamp}-${safeFileName(eventId)}-${suffix}.json`
    );
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    return filePath;
  } catch (error) {
    console.error("Failed to write local testing JSON for generateHomeForEvent.", {
      eventId,
      suffix,
      error,
    });
    return null;
  }
}

function redactPayloadForDisk(payload, apiKeyDiagnostics = null) {
  return {
    ...payload,
    api_key: payload?.api_key ? "REDACTED" : payload?.api_key,
    ...(apiKeyDiagnostics ? { localTestingApiKey: apiKeyDiagnostics } : {}),
  };
}

function requireString(value, fieldName) {
  const normalised = String(value || "").trim();
  if (!normalised) {
    throw new HttpsError("invalid-argument", `${fieldName} is required.`);
  }
  return normalised;
}

function isSuperAdmin(profile) {
  return profile?.role === USER_ROLES.SUPER_ADMIN;
}

function canManageEvent(profile, eventRecord, assignment = null) {
  if (!profile?.isActive || !eventRecord) return false;
  if (isSuperAdmin(profile)) return true;
  if (!profile.clientId || profile.clientId !== eventRecord.clientId) return false;
  if (profile.role === USER_ROLES.ADMIN) return true;
  return profile.role === USER_ROLES.USER
    && assignment?.eventId === eventRecord.id
    && assignment?.userId === profile.id
    && assignment?.clientId === eventRecord.clientId
    && assignment?.accessRole === USER_ROLES.USER;
}

function sortByString(fieldName) {
  return (a, b) => String(a?.[fieldName] || "").localeCompare(String(b?.[fieldName] || ""));
}

function sortScheduleDetails(details) {
  return [...details].sort((a, b) => {
    const dayComparison = String(a.scheduleDayId || "").localeCompare(String(b.scheduleDayId || ""));
    if (dayComparison !== 0) return dayComparison;

    const timeComparison = String(a.time || "").localeCompare(String(b.time || ""));
    if (timeComparison !== 0) return timeComparison;

    const sortA = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const sortB = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    if (sortA !== sortB) return sortA - sortB;

    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

function normaliseSortOrder(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function addNormalisedEmail(emails, seenEmails, value) {
  if (typeof value !== "string") return;

  const email = value.trim().toLowerCase();
  if (!email || seenEmails.has(email)) return;

  seenEmails.add(email);
  emails.push(email);
}

function parseArchiveValue(value) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value;
  return null;
}

function getEventArchiveValue(eventRecord) {
  return parseArchiveValue(eventRecord?.Archive ?? eventRecord?.archive);
}

function deriveShareArchiveRow(apiResponse) {
  if (!apiResponse || typeof apiResponse !== "object") return null;
  const diff = apiResponse.diff;
  if (!diff || typeof diff !== "object") return null;

  const changeCount = Number(diff.changeCount);
  const text = String(diff.text ?? "").trim();
  const timestamp = apiResponse.timestamp ?? "";
  const createdAt = typeof timestamp === "string" && timestamp.trim()
    ? timestamp.trim()
    : null;

  return {
    numberOfChanges: Number.isFinite(changeCount) ? changeCount : 0,
    text,
    timestamp: createdAt,
    raw: {
      diffText: diff.text ?? null,
      responseTimestamp: timestamp || null,
    },
  };
}

async function writeShareArchive({ db, eventId, previousApiResponse }) {
  const row = deriveShareArchiveRow(previousApiResponse);
  if (!row) return null;

  const shareArchiveRef = await db.collection("shareArchive").add({
    eventId,
    timestamp: row.timestamp,
    numberOfChanges: row.numberOfChanges,
    text: row.text,
    raw: row.raw,
    createdAt: FieldValue.serverTimestamp(),
  });
  return shareArchiveRef.id;
}

function docToRecord(docSnap) {
  return {
    id: docSnap.id,
    ...docSnap.data(),
  };
}

async function getCollectionWhere(db, collectionName, fieldName, operator, value) {
  const snapshot = await db.collection(collectionName).where(fieldName, operator, value).get();
  return snapshot.docs.map(docToRecord);
}

async function getScheduleDetailsForEvent(db, eventId, scheduleDayIds) {
  const eventScopedDetails = await getCollectionWhere(db, "scheduleDetails", "eventId", "==", eventId);
  if (eventScopedDetails.length > 0) {
    return sortScheduleDetails(eventScopedDetails);
  }

  const details = [];
  const dayIds = [...new Set(scheduleDayIds.filter(Boolean))];
  for (let index = 0; index < dayIds.length; index += FIRESTORE_IN_QUERY_LIMIT) {
    const dayIdChunk = dayIds.slice(index, index + FIRESTORE_IN_QUERY_LIMIT);
    if (dayIdChunk.length === 0) continue;
    const chunk = await getCollectionWhere(db, "scheduleDetails", "scheduleDayId", "in", dayIdChunk);
    details.push(...chunk);
  }
  return sortScheduleDetails(details);
}

async function getCompanyContactsForCompanies(db, companyIds) {
  const uniqueCompanyIds = [...new Set(companyIds.filter(Boolean))];
  if (uniqueCompanyIds.length === 0) return [];

  const contacts = [];
  for (let index = 0; index < uniqueCompanyIds.length; index += FIRESTORE_IN_QUERY_LIMIT) {
    const companyIdChunk = uniqueCompanyIds.slice(index, index + FIRESTORE_IN_QUERY_LIMIT);
    const chunk = await getCollectionWhere(db, "companyContacts", "companyId", "in", companyIdChunk);
    contacts.push(...chunk);
  }

  return contacts.sort((a, b) => {
    const companyComparison = String(a.companyId || "").localeCompare(String(b.companyId || ""));
    if (companyComparison !== 0) return companyComparison;

    const sortA = typeof a.sortOrder === "number" ? a.sortOrder : Number.MAX_SAFE_INTEGER;
    const sortB = typeof b.sortOrder === "number" ? b.sortOrder : Number.MAX_SAFE_INTEGER;
    const orderComparison = sortA - sortB;
    if (orderComparison !== 0) return orderComparison;

    return String(a.email || "").localeCompare(String(b.email || ""));
  });
}

async function getUsersByIds(db, userIds) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueUserIds.length === 0) return [];

  const users = [];
  for (let index = 0; index < uniqueUserIds.length; index += FIRESTORE_IN_QUERY_LIMIT) {
    const userIdChunk = uniqueUserIds.slice(index, index + FIRESTORE_IN_QUERY_LIMIT);
    const snapshot = await db
      .collection("users")
      .where(FieldPath.documentId(), "in", userIdChunk)
      .get();
    users.push(...snapshot.docs.map(docToRecord));
  }

  return users;
}

async function getAllowedUserProfilesForEvent(db, eventRecord) {
  const [
    eventAssignments,
    superAdminUsers,
  ] = await Promise.all([
    getCollectionWhere(db, "eventAssignments", "eventId", "==", eventRecord.id),
    getCollectionWhere(db, "users", "role", "==", USER_ROLES.SUPER_ADMIN),
  ]);
  const assignedUserIds = eventAssignments
    .filter((assignment) =>
      assignment?.eventId === eventRecord.id
      && assignment?.clientId === eventRecord.clientId
      && [USER_ROLES.USER, USER_ROLES.VIEWER].includes(assignment?.accessRole)
    )
    .map((assignment) => assignment.userId);
  const assignedUsers = (await getUsersByIds(db, assignedUserIds))
    .filter((user) => user?.clientId === eventRecord.clientId);
  const clientUsers = eventRecord.clientId
    ? await getCollectionWhere(db, "users", "clientId", "==", eventRecord.clientId)
    : [];
  const clientAdminUsers = clientUsers.filter((user) => user?.role === USER_ROLES.ADMIN);

  return [
    ...assignedUsers,
    ...clientAdminUsers,
    ...superAdminUsers,
  ].filter((user) => user?.isActive === true);
}

function buildAllowedEmails({ companies = [], companyContacts = [], userProfiles = [] }) {
  const companyIds = new Set(companies.map((company) => company.id).filter(Boolean));
  const seenEmails = new Set();
  const emails = [];

  companyContacts.forEach((contact) => {
    if (!companyIds.has(contact?.companyId)) return;
    addNormalisedEmail(emails, seenEmails, contact.email);
  });

  userProfiles.forEach((userProfile) => {
    addNormalisedEmail(emails, seenEmails, userProfile.email);
  });

  return emails;
}

async function loadEventGenerationData(db, eventId) {
  const eventSnap = await db.collection("events").doc(eventId).get();
  if (!eventSnap.exists) {
    throw new HttpsError("not-found", "Event not found.");
  }

  const eventRecord = docToRecord(eventSnap);
  const [
    scheduleDays,
    tags,
    locations,
    trucks,
    filteredViews,
    eventContacts,
    keyInfo,
    companies,
  ] = await Promise.all([
    getCollectionWhere(db, "scheduleDays", "eventId", "==", eventId),
    getCollectionWhere(db, "tags", "eventId", "==", eventId),
    getCollectionWhere(db, "locations", "eventId", "==", eventId),
    getCollectionWhere(db, "trucks", "eventId", "==", eventId),
    getCollectionWhere(db, "filteredViews", "eventId", "==", eventId),
    getCollectionWhere(db, "eventContacts", "eventId", "==", eventId),
    getCollectionWhere(db, "keyInfo", "eventId", "==", eventId),
    eventRecord.clientId
      ? getCollectionWhere(db, "companies", "clientId", "==", eventRecord.clientId)
      : Promise.resolve([]),
  ]);

  const sortedScheduleDays = [...scheduleDays].sort(sortByString("date"));
  const scheduleDetails = await getScheduleDetailsForEvent(
    db,
    eventId,
    sortedScheduleDays.map((day) => day.id)
  );
  const companyContacts = await getCompanyContactsForCompanies(
    db,
    companies.map((company) => company.id)
  );
  const allowedUserProfiles = await getAllowedUserProfilesForEvent(db, eventRecord);

  return {
    eventRecord,
    scheduleDays: sortedScheduleDays,
    scheduleDetails,
    tags: [...tags].sort(sortByString("name")),
    locations,
    trucks: [...trucks].sort(sortByString("truckNumber")),
    filteredViews: [...filteredViews].sort((a, b) =>
      normaliseSortOrder(a.sortOrder, Number.MAX_SAFE_INTEGER)
      - normaliseSortOrder(b.sortOrder, Number.MAX_SAFE_INTEGER)
      || String(a.name || "").localeCompare(String(b.name || ""))
    ),
    eventContacts,
    keyInfo: [...keyInfo].sort((a, b) =>
      normaliseSortOrder(a.sortOrder, Number.MAX_SAFE_INTEGER)
      - normaliseSortOrder(b.sortOrder, Number.MAX_SAFE_INTEGER)
      || String(a.title || "").localeCompare(String(b.title || ""))
    ),
    companies,
    companyContacts,
    allowedUserProfiles,
  };
}

async function parseResponseBody(response) {
  const responseText = await response.text();
  if (!responseText) return null;
  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

export async function generateHomeForEventCallable({
  request,
  db,
  apiKey,
  oldV2GenerateHomeUrl,
  localTestingOutputDir = null,
  apiKeyDiagnostics = null,
}) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const eventId = requireString(request.data?.eventId, "eventId");
  const callerProfileSnap = await db.collection("users").doc(request.auth.uid).get();
  if (!callerProfileSnap.exists || callerProfileSnap.data()?.isActive !== true) {
    throw new HttpsError("permission-denied", "Your user profile is not active.");
  }

  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Server missing old PDF Generator API key configuration.");
  }

  if (!oldV2GenerateHomeUrl) {
    throw new HttpsError("failed-precondition", "Server missing old v2 generate home URL configuration.");
  }

  const callerProfile = {
    id: callerProfileSnap.id,
    ...callerProfileSnap.data(),
  };
  const generationData = await loadEventGenerationData(db, eventId);
  const assignmentSnap = await db.collection("eventAssignments").doc(`${eventId}_${request.auth.uid}`).get();
  const assignment = assignmentSnap.exists ? assignmentSnap.data() : null;
  if (!canManageEvent(callerProfile, generationData.eventRecord, assignment)) {
    throw new HttpsError("permission-denied", "You do not have permission to update this event.");
  }

  const allowedEmails = buildAllowedEmails({
    companies: generationData.companies,
    companyContacts: generationData.companyContacts,
    userProfiles: generationData.allowedUserProfiles,
  });

  const payload = buildGenerateHomePayload({
    apiKey,
    allowedEmails,
    previousData: getEventArchiveValue(generationData.eventRecord),
    ...generationData,
    callerUid: request.auth.uid,
    callerEmail: request.auth.token?.email || callerProfile.email || "",
  });
  const localTestingEnabled = Boolean(localTestingOutputDir);
  const debugStatus = {
    enabled: localTestingEnabled,
    reason: localTestingEnabled ? "local_testing_enabled" : "not_running_locally",
  };
  const debugPayloadPath = writeLocalTestingJson({
    outputDir: localTestingOutputDir,
    eventId,
    suffix: "payload",
    data: redactPayloadForDisk(payload, apiKeyDiagnostics),
  });
  if (localTestingEnabled && !debugPayloadPath) {
    debugStatus.reason = "failed_to_write_payload";
  }

  const eventRef = db.collection("events").doc(eventId);
  let shareArchiveId = null;
  let apiCode = 0;
  let apiResponse = null;
  let debugResponsePath = null;

  try {
    const response = await fetch(oldV2GenerateHomeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    apiCode = response.status;
    apiResponse = await parseResponseBody(response);
    debugResponsePath = writeLocalTestingJson({
      outputDir: localTestingOutputDir,
      eventId,
      suffix: "response",
      data: apiResponse,
    });
    if (localTestingEnabled && !debugResponsePath) {
      debugStatus.reason = "failed_to_write_response";
    }

    const eventUpdate = {
      "API Code": apiCode,
      "API Response": apiResponse,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!response.ok) {
      await eventRef.update(eventUpdate);
      const message = typeof apiResponse === "object" && apiResponse?.message
        ? apiResponse.message
        : "Generate home failed.";
      throw new HttpsError("aborted", message, {
        apiCode,
        apiResponse,
        debug: debugStatus,
        debugPayloadPath,
        debugResponsePath,
      });
    }

    await eventRef.update({
      ...eventUpdate,
      archive: payload.data,
    });
    shareArchiveId = await writeShareArchive({
      db,
      eventId,
      previousApiResponse: apiResponse,
    });
    if (shareArchiveId) {
      await eventRef.update({
        lastShareArchiveId: shareArchiveId,
      });
    }

    return {
      success: true,
      apiCode,
      shareArchiveId,
      debug: debugStatus,
      debugPayloadPath,
      debugResponsePath,
      message: typeof apiResponse === "object" && apiResponse?.message
        ? apiResponse.message
        : "Share output updated.",
      apiResponse,
    };
  } catch (error) {
    if (apiCode === 0) {
      apiResponse = error instanceof Error ? error.message : String(error);
      debugResponsePath = writeLocalTestingJson({
        outputDir: localTestingOutputDir,
        eventId,
        suffix: "response",
        data: apiResponse,
      });
      if (localTestingEnabled && !debugResponsePath) {
        debugStatus.reason = "failed_to_write_response";
      }
      await eventRef.update({
        "API Code": apiCode,
        "API Response": apiResponse,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    if (error instanceof HttpsError) throw error;
    console.error("Failed to generate home for event.", { eventId, error });
    throw new HttpsError("internal", "Could not update share output.", {
      apiCode,
      apiResponse,
      debug: debugStatus,
      debugPayloadPath,
      debugResponsePath,
    });
  }
}
