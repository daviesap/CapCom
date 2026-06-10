import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import path from "path";
import process from "process";
import { generateHomeForEventCallable } from "./generateSchedules/generateHomeForEventCallable.mjs";

initializeApp();

const db = getFirestore();
const adminAuth = getAuth();

const OLD_PDF_GENERATOR_API_KEY = defineSecret("OLD_PDF_GENERATOR_API_KEY");
const DEFAULT_OLD_V2_GENERATE_HOME_URL =
  "https://api.capcom.london/v2?action=generateHome";
const CALLABLE_ALLOWED_ORIGINS = [
  "https://app.capcom.london",
  "https://capcom-d2cc0.web.app",
  "https://capcom-d2cc0.firebaseapp.com",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
];

const USER_ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  USER: "User",
  VIEWER: "Viewer",
};

function requireString(value, fieldName) {
  const normalised = String(value || "").trim();
  if (!normalised) {
    throw new HttpsError("invalid-argument", `${fieldName} is required.`);
  }
  return normalised;
}

function getLocalTestingOutputDir() {
  if (!process.env.FUNCTIONS_EMULATOR) return null;
  if (process.env.LOCAL_TESTING_OUTPUT_DIR) {
    return path.resolve(process.env.LOCAL_TESTING_OUTPUT_DIR);
  }

  const cwd = process.cwd();
  return path.basename(cwd) === "functions"
    ? path.resolve(cwd, "..", "local_testing")
    : path.resolve(cwd, "local_testing");
}

function normaliseNewUserPayload(data) {
  const role = requireString(data?.role, "role");
  if (![USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.VIEWER].includes(role)) {
    throw new HttpsError("invalid-argument", "Only Admin, User, and Viewer roles can be created here.");
  }

  return {
    email: requireString(data?.email, "email").toLowerCase(),
    displayName: requireString(data?.displayName, "displayName"),
    role,
    clientId: requireString(data?.clientId, "clientId"),
  };
}

async function getActiveCallerProfile(uid) {
  const profileSnap = await db.collection("users").doc(uid).get();
  if (!profileSnap.exists || profileSnap.data()?.isActive !== true) {
    throw new HttpsError("permission-denied", "Your user profile is not active.");
  }

  return {
    id: profileSnap.id,
    ...profileSnap.data(),
  };
}

function canCreateRequestedRole(callerProfile, newUserData) {
  if (callerProfile.role === USER_ROLES.SUPER_ADMIN) {
    return [USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.VIEWER].includes(newUserData.role);
  }

  return callerProfile.role === USER_ROLES.ADMIN
    && callerProfile.clientId === newUserData.clientId
    && [USER_ROLES.USER, USER_ROLES.VIEWER].includes(newUserData.role);
}

async function requireActiveClient(clientId) {
  const clientSnap = await db.collection("clients").doc(clientId).get();
  if (!clientSnap.exists) {
    throw new HttpsError("not-found", "Client not found.");
  }

  if (clientSnap.data()?.isActive === false) {
    throw new HttpsError("failed-precondition", "Cannot create users for an inactive client.");
  }

  return {
    id: clientSnap.id,
    ...clientSnap.data(),
  };
}

export const createAuthUserProfile = onCall({
  region: "europe-west2",
  cors: CALLABLE_ALLOWED_ORIGINS,
  invoker: "public",
}, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const callerProfile = await getActiveCallerProfile(request.auth.uid);
  const newUserData = normaliseNewUserPayload(request.data);

  if (!canCreateRequestedRole(callerProfile, newUserData)) {
    throw new HttpsError("permission-denied", "You do not have permission to create this user.");
  }

  await requireActiveClient(newUserData.clientId);

  const existingAuthUser = await adminAuth.getUserByEmail(newUserData.email).catch((error) => {
    if (error?.code === "auth/user-not-found") return null;
    throw error;
  });

  if (existingAuthUser) {
    throw new HttpsError("already-exists", "A Firebase Auth user already exists for this email.");
  }

  let authUser = null;
  try {
    authUser = await adminAuth.createUser({
      email: newUserData.email,
      displayName: newUserData.displayName,
      disabled: false,
      emailVerified: false,
    });

    const profileRef = db.collection("users").doc(authUser.uid);
    const existingProfile = await profileRef.get();
    if (existingProfile.exists) {
      throw new HttpsError("already-exists", "A Firestore user profile already exists for this UID.");
    }

    await profileRef.set({
      email: newUserData.email,
      displayName: newUserData.displayName,
      role: newUserData.role,
      clientId: newUserData.clientId,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      uid: authUser.uid,
      email: newUserData.email,
    };
  } catch (error) {
    if (authUser?.uid) {
      await adminAuth.deleteUser(authUser.uid).catch((deleteError) => {
        console.error("Failed to roll back Auth user after Firestore profile error.", {
          uid: authUser.uid,
          deleteError,
        });
      });
    }

    if (error instanceof HttpsError) throw error;
    console.error("Failed to create auth user profile.", error);
    throw new HttpsError("internal", "Could not create user.");
  }
});

export const generateHomeForEvent = onCall({
  region: "europe-west2",
  cors: CALLABLE_ALLOWED_ORIGINS,
  invoker: "public",
  secrets: [OLD_PDF_GENERATOR_API_KEY],
  timeoutSeconds: 540,
  memory: "1GiB",
}, async (request) => {
  const localApiKey = process.env.LOCAL_OLD_PDF_GENERATOR_API_KEY || "";
  const apiKey = process.env.FUNCTIONS_EMULATOR
    ? (localApiKey || "dev-key")
    : OLD_PDF_GENERATOR_API_KEY.value();

  const oldV2GenerateHomeUrl = process.env.FUNCTIONS_EMULATOR
    ? (process.env.LOCAL_OLD_V2_GENERATE_HOME_URL || DEFAULT_OLD_V2_GENERATE_HOME_URL)
    : (process.env.OLD_V2_GENERATE_HOME_URL || DEFAULT_OLD_V2_GENERATE_HOME_URL);

  return generateHomeForEventCallable({
    request,
    db,
    apiKey,
    oldV2GenerateHomeUrl,
    localTestingOutputDir: getLocalTestingOutputDir(),
    apiKeyDiagnostics: process.env.FUNCTIONS_EMULATOR
      ? {
          source: localApiKey ? "LOCAL_OLD_PDF_GENERATOR_API_KEY" : "fallback-dev-key",
          provided: Boolean(localApiKey),
          fallbackUsed: !localApiKey,
          length: apiKey.length,
        }
      : null,
  });
});
