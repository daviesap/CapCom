import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { buildGenerateHomePayload } from "./generateHomePayloadBuilder.mjs";

const USER_ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  USER: "User",
};

const FIRESTORE_IN_QUERY_LIMIT = 30;

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

function buildAllowedEmailsFromCompanyContacts({ companies = [], companyContacts = [] }) {
  const companyIds = new Set(companies.map((company) => company.id).filter(Boolean));
  const seenEmails = new Set();

  return companyContacts.reduce((emails, contact) => {
    if (!companyIds.has(contact?.companyId)) return emails;
    if (typeof contact.email !== "string") return emails;

    const email = contact.email.trim().toLowerCase();
    if (!email || seenEmails.has(email)) return emails;

    seenEmails.add(email);
    emails.push(email);
    return emails;
  }, []);
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

  const allowedEmails = buildAllowedEmailsFromCompanyContacts({
    companies: generationData.companies,
    companyContacts: generationData.companyContacts,
  });

  const payload = buildGenerateHomePayload({
    apiKey,
    allowedEmails,
    previousData: getEventArchiveValue(generationData.eventRecord),
    ...generationData,
    callerUid: request.auth.uid,
    callerEmail: request.auth.token?.email || callerProfile.email || "",
  });

  const eventRef = db.collection("events").doc(eventId);
  let shareArchiveId = null;
  let apiCode = 0;
  let apiResponse = null;

  try {
    const response = await fetch(oldV2GenerateHomeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    apiCode = response.status;
    apiResponse = await parseResponseBody(response);

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
      throw new HttpsError("aborted", message, { apiCode, apiResponse });
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
      message: typeof apiResponse === "object" && apiResponse?.message
        ? apiResponse.message
        : "Share output updated.",
      apiResponse,
    };
  } catch (error) {
    if (apiCode === 0) {
      apiResponse = error instanceof Error ? error.message : String(error);
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
    });
  }
}
