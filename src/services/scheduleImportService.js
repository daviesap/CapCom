import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../firebase/firestore";
import { assertOnline } from "./localScheduleCache.js";

const REQUIRED_COLUMNS = ["date", "time", "description"];
const MAX_BATCH_WRITES = 450;
const FIRESTORE_IN_QUERY_LIMIT = 30;

const scheduleDaysRef = collection(db, "scheduleDays");
const scheduleDetailsRef = collection(db, "scheduleDetails");

function normaliseHeader(value) {
  return String(value || "").trim().toLowerCase();
}

function isBlankCell(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function isBlankRow(row) {
  return row.every(isBlankCell);
}

function padNumber(value) {
  return String(value).padStart(2, "0");
}

function formatDateParts(year, month, day) {
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);

  if (
    !Number.isInteger(numericYear) ||
    !Number.isInteger(numericMonth) ||
    !Number.isInteger(numericDay) ||
    numericYear < 1900 ||
    numericMonth < 1 ||
    numericMonth > 12 ||
    numericDay < 1 ||
    numericDay > 31
  ) {
    return "";
  }

  const date = new Date(Date.UTC(numericYear, numericMonth - 1, numericDay));
  if (
    date.getUTCFullYear() !== numericYear ||
    date.getUTCMonth() !== numericMonth - 1 ||
    date.getUTCDate() !== numericDay
  ) {
    return "";
  }

  return `${numericYear}-${padNumber(numericMonth)}-${padNumber(numericDay)}`;
}

function normaliseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsedDate = XLSX.SSF.parse_date_code(value);
    if (parsedDate) return formatDateParts(parsedDate.y, parsedDate.m, parsedDate.d);
  }

  const text = String(value || "").trim();
  if (!text) return "";

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) return formatDateParts(isoMatch[1], isoMatch[2], isoMatch[3]);

  const slashMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return formatDateParts(fullYear, month, day);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }

  return "";
}

function normaliseTime(value) {
  if (isBlankCell(value)) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${padNumber(value.getHours())}:${padNumber(value.getMinutes())}`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsedTime = XLSX.SSF.parse_date_code(value);
    if (parsedTime) return `${padNumber(parsedTime.H)}:${padNumber(parsedTime.M)}`;
  }

  const text = String(value).trim();
  const timeMatch = text.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/i);
  if (!timeMatch) return text;

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2] || "0");
  const meridiem = timeMatch[3]?.toLowerCase();

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;

  if (hours > 23 || minutes > 59) return text;

  return `${padNumber(hours)}:${padNumber(minutes)}`;
}

function getWorksheetRows(workbook) {
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The import file does not contain a worksheet.");
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    raw: true,
    defval: "",
  });
}

async function readWorkbook(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return XLSX.read(await file.text(), {
      type: "string",
      cellDates: true,
    });
  }

  if (extension === "xlsx") {
    return XLSX.read(await file.arrayBuffer(), {
      type: "array",
      cellDates: true,
    });
  }

  throw new Error("Import file must be a CSV or XLSX file.");
}

function buildColumnIndexes(headerRow) {
  const headers = headerRow.map(normaliseHeader);
  const indexes = Object.fromEntries(
    REQUIRED_COLUMNS.map((columnName) => [columnName, headers.indexOf(columnName)])
  );
  const missingColumns = REQUIRED_COLUMNS.filter((columnName) => indexes[columnName] === -1);

  if (missingColumns.length > 0) {
    throw new Error(`Missing required column${missingColumns.length === 1 ? "" : "s"}: ${missingColumns.join(", ")}.`);
  }

  return indexes;
}

function isBlankImportRow(row, columnIndexes) {
  return REQUIRED_COLUMNS.every((columnName) => isBlankCell(row[columnIndexes[columnName]]));
}

export async function parseScheduleImportFile(file) {
  if (!file) throw new Error("Choose a CSV or XLSX file to import.");

  const workbook = await readWorkbook(file);
  const rows = getWorksheetRows(workbook);
  const headerIndex = rows.findIndex((row) => !isBlankRow(row));

  if (headerIndex === -1) {
    throw new Error("The import file is empty.");
  }

  const columnIndexes = buildColumnIndexes(rows[headerIndex]);
  const importRows = [];
  const rowErrors = [];

  rows.slice(headerIndex + 1).forEach((row, rowOffset) => {
    if (isBlankImportRow(row, columnIndexes)) return;

    const rowNumber = headerIndex + rowOffset + 2;
    const date = normaliseDate(row[columnIndexes.date]);
    const time = normaliseTime(row[columnIndexes.time]);
    const description = String(row[columnIndexes.description] || "").trim();

    if (!description) return;
    if (!date) rowErrors.push(`Row ${rowNumber}: Date is invalid.`);

    importRows.push({
      rowNumber,
      date,
      time,
      description,
    });
  });

  if (rowErrors.length > 0) {
    throw new Error(rowErrors.slice(0, 8).join(" "));
  }

  if (importRows.length === 0) {
    throw new Error("The import file does not contain any schedule rows.");
  }

  return importRows;
}

async function getEventScheduleState(eventId) {
  const daysSnapshot = await getDocs(query(scheduleDaysRef, where("eventId", "==", eventId)));
  const dayDocs = daysSnapshot.docs;
  const detailDocsById = new Map();

  const eventScopedDetailsSnapshot = await getDocs(
    query(scheduleDetailsRef, where("eventId", "==", eventId))
  );
  eventScopedDetailsSnapshot.docs.forEach((detailDoc) => {
    detailDocsById.set(detailDoc.id, detailDoc);
  });

  for (let index = 0; index < dayDocs.length; index += FIRESTORE_IN_QUERY_LIMIT) {
    const dayIdChunk = dayDocs.slice(index, index + FIRESTORE_IN_QUERY_LIMIT).map((dayDoc) => dayDoc.id);
    const dayScopedDetailsSnapshot = await getDocs(
      query(scheduleDetailsRef, where("scheduleDayId", "in", dayIdChunk))
    );
    dayScopedDetailsSnapshot.docs.forEach((detailDoc) => {
      detailDocsById.set(detailDoc.id, detailDoc);
    });
  }

  return {
    dayDocs,
    detailDocs: [...detailDocsById.values()],
  };
}

async function commitBatches(writes) {
  for (let index = 0; index < writes.length; index += MAX_BATCH_WRITES) {
    const batch = writeBatch(db);
    writes.slice(index, index + MAX_BATCH_WRITES).forEach((write) => write(batch));
    await batch.commit();
  }
}

export async function importScheduleRows({ eventId, rows }) {
  assertOnline();

  if (!eventId) throw new Error("Event ID is required.");
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No schedule rows were found to import.");
  }

  const existingSchedule = await getEventScheduleState(eventId);

  if (existingSchedule.detailDocs.length > 0) {
    throw new Error("Import is only available while the event schedule detail rows are empty.");
  }

  const sortedRows = [...rows].sort((rowA, rowB) => {
    const dateComparison = rowA.date.localeCompare(rowB.date);
    if (dateComparison !== 0) return dateComparison;

    const timeComparison = rowA.time.localeCompare(rowB.time);
    if (timeComparison !== 0) return timeComparison;

    return rowA.rowNumber - rowB.rowNumber;
  });
  const uniqueDates = [...new Set(sortedRows.map((row) => row.date))];
  const dayRefByDate = new Map(uniqueDates.map((date) => [date, doc(scheduleDaysRef)]));
  const sortOrderByDate = new Map();
  const writes = [];

  existingSchedule.dayDocs.forEach((dayDoc) => {
    writes.push((batch) => {
      batch.delete(dayDoc.ref);
    });
  });

  uniqueDates.forEach((date) => {
    const dayRef = dayRefByDate.get(date);
    writes.push((batch) => {
      batch.set(dayRef, {
        eventId,
        date,
        summary: "",
        endOfDayTarget: "",
        createdAt: serverTimestamp(),
      });
    });
  });

  sortedRows.forEach((row) => {
    const dayRef = dayRefByDate.get(row.date);
    const nextSortOrder = sortOrderByDate.get(row.date) || 0;
    sortOrderByDate.set(row.date, nextSortOrder + 1);

    writes.push((batch) => {
      batch.set(doc(scheduleDetailsRef), {
        eventId,
        scheduleDayId: dayRef.id,
        truckId: "",
        truckNumber: "",
        action: "",
        time: row.time,
        description: row.description,
        notes: "",
        sortOrder: nextSortOrder,
        colour: "",
        tagId: "",
        locationId: "",
        companyIds: [],
        createdAt: serverTimestamp(),
      });
    });
  });

  await commitBatches(writes);

  return {
    dayCount: uniqueDates.length,
    detailCount: sortedRows.length,
  };
}
