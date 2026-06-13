import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import admin from "firebase-admin";

const PROJECT_ID = "capcom-d2cc0";
const USE_EMULATOR = process.argv.includes("--emulator");
const MAX_RESULTS = 100;
const FIELD_SAMPLE_LIMIT = 50;

if (process.env.FIRESTORE_EMULATOR_HOST && !USE_EMULATOR) {
  console.error(
    `FIRESTORE_EMULATOR_HOST is set to ${process.env.FIRESTORE_EMULATOR_HOST}. ` +
    "Unset it or pass --emulator if you intend to query the emulator."
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
});

const db = admin.firestore();
const prompt = createInterface({ input, output });

function cleanCollectionPath(collectionPath) {
  return collectionPath.trim().replace(/^\/+|\/+$/g, "");
}

function assertCollectionPath(collectionPath) {
  if (!collectionPath) {
    throw new Error("Collection is required.");
  }

  const pathSegments = collectionPath.split("/");
  if (pathSegments.length % 2 === 0) {
    throw new Error(
      "Collection path must point to a collection, for example `helpItems` or `events/eventId/items`."
    );
  }
}

async function askRequired(question) {
  const answer = (await prompt.question(question)).trim();
  if (!answer) throw new Error("A value is required.");
  return answer;
}

async function chooseFromList({ title, items, manualLabel, manualQuestion }) {
  if (items.length > 0) {
    console.log(title);
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item}`);
    });
    console.log(`0. ${manualLabel}`);
    console.log("");

    const answer = (await prompt.question("Choose a number: ")).trim();
    const chosenNumber = Number(answer);

    if (Number.isInteger(chosenNumber) && chosenNumber >= 1 && chosenNumber <= items.length) {
      return items[chosenNumber - 1];
    }

    if (answer !== "0") {
      console.log("Invalid choice. Using manual entry.");
    }
  } else {
    console.log(`${title}: none found.`);
  }

  return askRequired(manualQuestion);
}

async function chooseCollectionPath() {
  const collections = await db.listCollections();
  const collectionPaths = collections.map((collectionRef) => collectionRef.path).sort();

  const collectionPath = cleanCollectionPath(
    await chooseFromList({
      title: "Available top-level collections:",
      items: collectionPaths,
      manualLabel: "Type collection path manually",
      manualQuestion: "Collection path: ",
    })
  );

  assertCollectionPath(collectionPath);
  return collectionPath;
}

function collectFieldPaths(value, prefix = "", fieldPaths = new Set()) {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.toDate === "function" ||
    Array.isArray(value)
  ) {
    return fieldPaths;
  }

  Object.entries(value).forEach(([fieldName, fieldValue]) => {
    const fieldPath = prefix ? `${prefix}.${fieldName}` : fieldName;
    fieldPaths.add(fieldPath);

    if (
      fieldValue &&
      typeof fieldValue === "object" &&
      typeof fieldValue.toDate !== "function" &&
      !Array.isArray(fieldValue)
    ) {
      collectFieldPaths(fieldValue, fieldPath, fieldPaths);
    }
  });

  return fieldPaths;
}

async function chooseFieldName(collectionPath) {
  const sampleSnapshot = await db.collection(collectionPath).limit(FIELD_SAMPLE_LIMIT).get();
  const fieldNames = new Set();

  sampleSnapshot.docs.forEach((doc) => {
    collectFieldPaths(doc.data(), "", fieldNames);
  });

  return chooseFromList({
    title:
      `Fields found in first ${sampleSnapshot.size} ` +
      `document${sampleSnapshot.size === 1 ? "" : "s"}:`,
    items: [...fieldNames].sort(),
    manualLabel: "Type field manually",
    manualQuestion: "Field to query: ",
  });
}

function formatValue(value) {
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(formatValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, formatValue(entryValue)])
    );
  }
  return value;
}

function getFieldValue(data, fieldPath) {
  return fieldPath.split(".").reduce((currentValue, pathPart) => {
    if (!currentValue || typeof currentValue !== "object") return undefined;
    return currentValue[pathPart];
  }, data);
}

function valueContains(value, searchText) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) {
    return value.some((item) => valueContains(item, searchText));
  }
  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString().toLocaleLowerCase().includes(searchText);
  }
  if (typeof value === "object") {
    return JSON.stringify(formatValue(value)).toLocaleLowerCase().includes(searchText);
  }

  return String(value).toLocaleLowerCase().includes(searchText);
}

async function getContainsMatches(collectionPath, fieldName, queryValue) {
  const searchText = queryValue.toLocaleLowerCase();
  const snapshot = await db.collection(collectionPath).get();
  const matchingDocs = snapshot.docs.filter((doc) =>
    valueContains(getFieldValue(doc.data(), fieldName), searchText)
  );

  return {
    docs: matchingDocs.slice(0, MAX_RESULTS),
    matchedCount: matchingDocs.length,
    scannedCount: snapshot.size,
  };
}

async function deleteDocs(docs) {
  let batch = db.batch();
  let batchCount = 0;
  let deletedCount = 0;

  for (const doc of docs) {
    batch.delete(doc.ref);
    batchCount += 1;
    deletedCount += 1;

    if (batchCount === 500) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();

  return deletedCount;
}

try {
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Mode: ${USE_EMULATOR ? "emulator" : "production"}`);
  console.log(`Result limit: ${MAX_RESULTS}`);
  console.log(`Field sample limit: ${FIELD_SAMPLE_LIMIT}`);
  console.log("");

  const collectionPath = await chooseCollectionPath();
  console.log("");
  const fieldName = await chooseFieldName(collectionPath);
  console.log("");
  const queryValue = await prompt.question("Value the field should contain: ");

  console.log("");
  console.log(`Contains query: ${collectionPath} where ${fieldName} contains "${queryValue}"`);
  console.log("Note: Firestore does not support substring contains queries on arbitrary fields.");
  console.log("This script will scan the collection and filter matching documents locally.");

  const matchResult = await getContainsMatches(collectionPath, fieldName, queryValue);

  console.log(
    `Scanned ${matchResult.scannedCount} ` +
    `document${matchResult.scannedCount === 1 ? "" : "s"}.`
  );

  if (matchResult.matchedCount === 0) {
    console.log("No matching documents found.");
    process.exit(0);
  }

  console.log(
    `Found ${matchResult.matchedCount} matching document${matchResult.matchedCount === 1 ? "" : "s"}.`
  );
  console.log("");

  matchResult.docs.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.ref.path}`);
    console.log(JSON.stringify(formatValue(doc.data()), null, 2));
    console.log("");
  });

  if (matchResult.matchedCount > MAX_RESULTS) {
    console.log(
      `Only the first ${MAX_RESULTS} matches were returned. Re-run after deleting if more matches exist.`
    );
    console.log("");
  }

  const deleteAnswer = (await prompt.question("Delete these documents? Type Yes to delete: "))
    .trim();

  if (deleteAnswer !== "Yes") {
    console.log("No documents deleted.");
    process.exit(0);
  }

  const deletedCount = await deleteDocs(matchResult.docs);
  console.log(`Deleted ${deletedCount} document${deletedCount === 1 ? "" : "s"}.`);
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  prompt.close();
}
