import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import {
  assertOnline,
  cacheHelpItems,
  getCachedHelpItems,
  isBrowserOffline,
} from "./localScheduleCache.js";

export const HELP_ITEM_TYPES = {
  INFORMATION: "information",
  FAQ: "faq",
};

export const HELP_TYPE_LABELS = {
  [HELP_ITEM_TYPES.INFORMATION]: "Information",
  [HELP_ITEM_TYPES.FAQ]: "FAQ",
};

export const HELP_DEFAULT_FORM = {
  type: HELP_ITEM_TYPES.INFORMATION,
  category: "",
  title: "",
  detail: "",
  sort: "0",
};

const helpItemsRef = collection(db, "helpItems");

function logWriteError(action, error, context = {}) {
  console.error(`Firestore write failed: ${action}`, { ...context, error });
}

function normaliseHelpItem(helpItemData) {
  const type = Object.values(HELP_ITEM_TYPES).includes(helpItemData.type)
    ? helpItemData.type
    : HELP_ITEM_TYPES.INFORMATION;
  const sortNumber = Number(helpItemData.sort);

  return {
    type,
    category: String(helpItemData.category || "General").trim() || "General",
    title: String(helpItemData.title || "").trim(),
    detail: String(helpItemData.detail || "").trim(),
    sort: Number.isFinite(sortNumber) ? sortNumber : 0,
  };
}

function sortHelpItems(helpItems) {
  return [...helpItems].sort((a, b) => {
    const categoryComparison = String(a.category || "General").localeCompare(
      String(b.category || "General")
    );
    if (categoryComparison !== 0) return categoryComparison;

    const sortComparison = Number(a.sort || 0) - Number(b.sort || 0);
    if (sortComparison !== 0) return sortComparison;

    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

export async function getHelpItems() {
  if (isBrowserOffline()) return getCachedHelpItems();

  try {
    const snapshot = await getDocs(helpItemsRef);
    const helpItems = sortHelpItems(
      snapshot.docs.map((helpItemDoc) => ({
        id: helpItemDoc.id,
        ...helpItemDoc.data(),
      }))
    );
    cacheHelpItems(helpItems);
    return helpItems;
  } catch (error) {
    const cachedHelpItems = getCachedHelpItems();
    if (cachedHelpItems.length > 0) return cachedHelpItems;
    throw error;
  }
}

export { getCachedHelpItems };

export async function createHelpItem(helpItemData) {
  assertOnline();
  const normalisedHelpItem = normaliseHelpItem(helpItemData);
  if (!normalisedHelpItem.title) {
    throw new Error("Help item title is required.");
  }

  try {
    return await addDoc(helpItemsRef, {
      ...normalisedHelpItem,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("create help item", error, {
      type: normalisedHelpItem.type,
      title: normalisedHelpItem.title,
    });
    throw error;
  }
}

export async function updateHelpItem(helpItemId, helpItemData) {
  assertOnline();
  const normalisedHelpItem = normaliseHelpItem(helpItemData);
  if (!normalisedHelpItem.title) {
    throw new Error("Help item title is required.");
  }

  try {
    return await updateDoc(doc(db, "helpItems", helpItemId), {
      ...normalisedHelpItem,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logWriteError("update help item", error, {
      helpItemId,
      type: normalisedHelpItem.type,
      title: normalisedHelpItem.title,
    });
    throw error;
  }
}

export async function deleteHelpItem(helpItemId) {
  assertOnline();
  try {
    return await deleteDoc(doc(db, "helpItems", helpItemId));
  } catch (error) {
    logWriteError("delete help item", error, { helpItemId });
    throw error;
  }
}
