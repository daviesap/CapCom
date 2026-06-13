// scripts/update-help-item-category.js
import admin from "firebase-admin";

const PROJECT_ID = "capcom-d2cc0";
const COLLECTION = "helpItems";
const FROM_CATEGORY = "Sausages";
const TO_CATEGORY = "Schedule";
const DRY_RUN = !process.argv.includes("--apply");
const USE_EMULATOR = process.argv.includes("--emulator");

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

console.log(`Project: ${PROJECT_ID}`);
console.log(`Collection: ${COLLECTION}`);
console.log(`Query: category == "${FROM_CATEGORY}"`);
console.log(`Mode: ${DRY_RUN ? "dry run" : "apply"}`);

const snapshot = await db
  .collection(COLLECTION)
  .where("category", "==", FROM_CATEGORY)
  .get();

console.log(
  `Found ${snapshot.size} ${COLLECTION} documents where category == "${FROM_CATEGORY}".`
);

if (DRY_RUN) {
  snapshot.docs.forEach((doc) => {
    console.log(
      `[dry-run] Would update ${COLLECTION}/${doc.id}: category "${FROM_CATEGORY}" -> "${TO_CATEGORY}"`
    );
  });

  console.log("Dry run only. Re-run with --apply to write changes.");
  process.exit(0);
}

let batch = db.batch();
let batchCount = 0;
let totalUpdated = 0;

for (const doc of snapshot.docs) {
  batch.update(doc.ref, {
    category: TO_CATEGORY,
  });

  batchCount += 1;
  totalUpdated += 1;

  if (batchCount === 500) {
    await batch.commit();
    batch = db.batch();
    batchCount = 0;
  }
}

if (batchCount > 0) {
  await batch.commit();
}

console.log(
  `Updated ${totalUpdated} ${COLLECTION} documents from category "${FROM_CATEGORY}" to "${TO_CATEGORY}".`
);
