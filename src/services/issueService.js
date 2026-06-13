import {
  collection,
  deleteField,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db } from "../firebase/firestore";
import { storage } from "../firebase/storage.js";

export const ISSUE_STATUSES = ["Open", "Closed"];
export const ISSUE_TYPES = ["Major Bug", "Minor Bug", "Friction", "Future"];

export const ISSUE_DEFAULTS = {
  title: "",
  detail: "",
  status: "Open",
  type: "Friction",
};

const ISSUE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const issuesRef = collection(db, "issues");

function getImageExtension(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]+$/.test(extension)) return extension;
  return file.type.split("/").pop()?.toLowerCase() || "jpg";
}

function normaliseIssueData(issueData) {
  return {
    title: String(issueData.title || "").trim(),
    detail: String(issueData.detail || "").trim(),
    status: ISSUE_STATUSES.includes(issueData.status) ? issueData.status : ISSUE_DEFAULTS.status,
    type: ISSUE_TYPES.includes(issueData.type) ? issueData.type : ISSUE_DEFAULTS.type,
  };
}

export function validateIssueImageFile(file) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) {
    return "Choose an image file.";
  }
  if (file.size > ISSUE_IMAGE_MAX_BYTES) {
    return "Issue image must be 2 MB or smaller.";
  }
  return "";
}

export async function getIssues({ limitCount = 50 } = {}) {
  const issuesQuery = query(issuesRef, orderBy("createdAt", "desc"), limit(limitCount));
  const snapshot = await getDocs(issuesQuery);
  return snapshot.docs.map((issueDoc) => ({
    id: issueDoc.id,
    ...issueDoc.data(),
  }));
}

export async function uploadIssueImage(issueId, file) {
  const validationError = validateIssueImageFile(file);
  if (validationError) throw new Error(validationError);

  const extension = getImageExtension(file);
  const imagePath = `issue-images/${issueId}/issue-image.${extension}`;
  const imageRef = ref(storage, imagePath);

  await uploadBytes(imageRef, file, {
    contentType: file.type,
    customMetadata: {
      issueId,
    },
  });

  return {
    imagePath,
    imageUrl: await getDownloadURL(imageRef),
  };
}

async function deleteIssueImage(imagePath) {
  if (!imagePath) return;
  await deleteObject(ref(storage, imagePath));
}

export async function createIssue(issueData, imageFile, currentUserProfile) {
  const normalisedIssue = normaliseIssueData(issueData);
  if (!normalisedIssue.title) {
    throw new Error("Issue title is required.");
  }

  const issueRef = doc(issuesRef);
  await setDoc(issueRef, {
    ...normalisedIssue,
    createdAt: serverTimestamp(),
    createdBy: currentUserProfile?.id || currentUserProfile?.uid || null,
    createdByName: currentUserProfile?.displayName || currentUserProfile?.email || "",
    updatedAt: serverTimestamp(),
  });

  if (!imageFile) {
    return { id: issueRef.id, imageUploadWarning: "" };
  }

  try {
    const imageData = await uploadIssueImage(issueRef.id, imageFile);
    await updateDoc(issueRef, {
      ...imageData,
      updatedAt: serverTimestamp(),
    });
    return { id: issueRef.id, imageUploadWarning: "" };
  } catch (imageError) {
    console.error("Issue image upload failed", imageError);
    return {
      id: issueRef.id,
      imageUploadWarning: imageError?.message || "Issue saved, but the image could not be uploaded.",
    };
  }
}

export async function updateIssue(issueId, issueData, imageFile, options = {}) {
  const normalisedIssue = normaliseIssueData(issueData);
  if (!normalisedIssue.title) {
    throw new Error("Issue title is required.");
  }

  const issueRef = doc(db, "issues", issueId);
  await updateDoc(issueRef, {
    ...normalisedIssue,
    ...(options.removeImage ? { imagePath: deleteField(), imageUrl: deleteField() } : {}),
    updatedAt: serverTimestamp(),
  });

  if (options.removeImage && options.existingImagePath) {
    try {
      await deleteIssueImage(options.existingImagePath);
    } catch (imageError) {
      console.error("Issue image delete failed", imageError);
      return {
        id: issueId,
        imageUploadWarning: imageError?.message || "Issue saved, but the image file could not be deleted.",
      };
    }
  }

  if (!imageFile) {
    return { id: issueId, imageUploadWarning: "" };
  }

  try {
    const imageData = await uploadIssueImage(issueId, imageFile);
    await updateDoc(issueRef, {
      ...imageData,
      updatedAt: serverTimestamp(),
    });
    return { id: issueId, imageUploadWarning: "" };
  } catch (imageError) {
    console.error("Issue image upload failed", imageError);
    return {
      id: issueId,
      imageUploadWarning: imageError?.message || "Issue saved, but the image could not be uploaded.",
    };
  }
}

export async function updateIssueStatus(issueId, status) {
  if (!ISSUE_STATUSES.includes(status)) {
    throw new Error("Choose a valid issue status.");
  }

  return updateDoc(doc(db, "issues", issueId), {
    status,
    updatedAt: serverTimestamp(),
  });
}
