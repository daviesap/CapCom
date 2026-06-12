import { FALLBACK_FILTERED_VIEW_SORT_ORDER } from "./eventEditorConstants.js";

export function validateEventForm(eventForm, userProfile) {
  if (!eventForm.name.trim()) return "Event name is required.";
  if (!eventForm.firstLiveDay) return "First live day is required.";
  if (!eventForm.lastLiveDay) return "Last live day is required.";
  if (!eventForm.scheduleStartDate) return "Schedule start date is required.";
  if (!eventForm.scheduleEndDate) return "Schedule end date is required.";
  if (userProfile?.role === "SuperAdmin" && !eventForm.clientId) {
    return "Event client is required.";
  }
  if (eventForm.firstLiveDay > eventForm.lastLiveDay) {
    return "First live day must be before or equal to last live day.";
  }
  if (eventForm.scheduleStartDate > eventForm.scheduleEndDate) {
    return "Schedule start date must be before or equal to schedule end date.";
  }
  return "";
}

export function getScheduleDateRangeFromDays(scheduleDays) {
  const dates = scheduleDays
    .map((day) => day.date)
    .filter(Boolean)
    .sort((dateA, dateB) => String(dateA).localeCompare(String(dateB)));

  if (dates.length === 0) return null;

  return {
    scheduleStartDate: dates[0],
    scheduleEndDate: dates[dates.length - 1],
  };
}

export function applyScheduleDateRangeToEventForm(eventForm, scheduleDays) {
  const scheduleDateRange = getScheduleDateRangeFromDays(scheduleDays);
  if (!scheduleDateRange) return eventForm;

  return {
    ...eventForm,
    ...scheduleDateRange,
  };
}

export function getScheduleDaysOutsideRange(scheduleDays, startDate, endDate) {
  return scheduleDays.filter((day) => {
    if (!day.date) return false;
    return day.date < startDate || day.date > endDate;
  });
}

export function getArrayValue(primary, fallback) {
  if (Array.isArray(primary)) return primary;
  if (typeof primary === "string") {
    return primary
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (Array.isArray(fallback)) return fallback;
  if (typeof fallback === "string") {
    return fallback
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

export function readBooleanValue(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalised = value.trim().toLowerCase();
    if (normalised === "true") return true;
    if (normalised === "false") return false;
  }
  return fallback;
}

export function normaliseString(value) {
  if (typeof value === "string") return value.trim();
  return "";
}

export function normaliseSortOrderValue(
  value,
  fallback = FALLBACK_FILTERED_VIEW_SORT_ORDER
) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

export function getNextFilteredViewSortOrder(existingViews) {
  const maxSortOrder = existingViews.reduce((maxValue, view) => {
    const nextValue = Number(view?.sortOrder);
    if (!Number.isFinite(nextValue)) return maxValue;
    return nextValue > maxValue ? nextValue : maxValue;
  }, 0);

  return Number.isFinite(maxSortOrder) && maxSortOrder > 0
    ? maxSortOrder + 1
    : FALLBACK_FILTERED_VIEW_SORT_ORDER;
}

export function formatFriendlyDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

export function formatDetailDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);
  return `${weekday} ${day}${suffix} ${month}`;
}

export function formatDateOrdinal(date) {
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return `${day}${suffix}`;
}

export function formatEventDateRange(startDateString, endDateString) {
  if (!startDateString && !endDateString) return "";
  if (!startDateString) return formatFriendlyDate(endDateString);
  if (!endDateString || startDateString === endDateString) {
    return formatFriendlyDate(startDateString);
  }

  const startDate = new Date(`${startDateString}T00:00:00`);
  const endDate = new Date(`${endDateString}T00:00:00`);
  const startMonth = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(startDate);
  const endMonth = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    return `${formatDateOrdinal(startDate)} to ${formatDateOrdinal(endDate)} ${endMonth} ${endYear}`;
  }

  if (startYear === endYear) {
    return `${formatDateOrdinal(startDate)} ${startMonth} to ${formatDateOrdinal(endDate)} ${endMonth} ${endYear}`;
  }

  return `${formatDateOrdinal(startDate)} ${startMonth} ${startYear} to ${formatDateOrdinal(endDate)} ${endMonth} ${endYear}`;
}

export function toDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const dateText = typeof value === "string" ? value.trim() : value;
  const timezoneLessIsoDate =
    typeof dateText === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateText) &&
    !/[zZ]|[+-]\d{2}:?\d{2}$/.test(dateText);
  const parsed = new Date(timezoneLessIsoDate ? `${dateText}Z` : dateText);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRelativeDate(value) {
  const date = toDateValue(value);
  if (!date) return "";

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const units = [
    { name: "year", seconds: 60 * 60 * 24 * 365 },
    { name: "month", seconds: 60 * 60 * 24 * 30 },
    { name: "week", seconds: 60 * 60 * 24 * 7 },
    { name: "day", seconds: 60 * 60 * 24 },
    { name: "hour", seconds: 60 * 60 },
    { name: "minute", seconds: 60 },
  ];
  const unit = units.find((candidate) => absSeconds >= candidate.seconds);

  if (!unit) return "just now";
  const valueForUnit = Math.round(diffSeconds / unit.seconds);
  return new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" }).format(
    valueForUnit,
    unit.name
  );
}

export function formatArchiveDate(value) {
  const date = toDateValue(value);
  if (!date) return "n/a";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function normaliseApiResponse(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function getShareSnapshotNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

export function normaliseHexColour(colour) {
  const trimmedColour = String(colour || "").trim();
  if (!trimmedColour) return "";
  const withHash = trimmedColour.startsWith("#") ? trimmedColour : `#${trimmedColour}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : "";
}

export function getDetailSortOrder(detail) {
  return typeof detail?.sortOrder === "number" ? detail.sortOrder : 0;
}

export function sortDetailsForDisplay(details = []) {
  return [...details].sort((a, b) => {
    const timeComparison = String(a.time || "").localeCompare(String(b.time || ""));
    if (timeComparison !== 0) return timeComparison;

    const orderComparison = getDetailSortOrder(a) - getDetailSortOrder(b);
    if (orderComparison !== 0) return orderComparison;

    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

export function hexToRgba(colour, alpha) {
  const normalisedColour = normaliseHexColour(colour);
  if (!normalisedColour) return "";
  const red = parseInt(normalisedColour.slice(1, 3), 16);
  const green = parseInt(normalisedColour.slice(3, 5), 16);
  const blue = parseInt(normalisedColour.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function getTagStyle(tag) {
  const colour = normaliseHexColour(tag?.colour);
  if (!colour) return undefined;
  return {
    backgroundColor: hexToRgba(colour, 0.16),
    borderColor: hexToRgba(colour, 0.36),
  };
}

export function getSortOrder(contact, fallbackIndex = 0) {
  return typeof contact?.sortOrder === "number" ? contact.sortOrder : fallbackIndex;
}

export function getRowTagStyle(tag) {
  const colour = normaliseHexColour(tag?.colour);
  if (!colour) return undefined;
  return {
    backgroundColor: hexToRgba(colour, 0.12),
    borderColor: hexToRgba(colour, 0.28),
  };
}
