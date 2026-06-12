import { useEffect, useRef, useState } from "react";
import { CapcomIcon } from "../../icons/capcomIcons.jsx";
import { updateEvent } from "../../services/eventService.js";
import {
  uploadEventImage,
  validateEventImageFile,
} from "../../services/eventImageService.js";
import {
  getScheduleDays,
  syncScheduleDaysToRange,
} from "../../services/scheduleDayService.js";
import {
  deleteScheduleDetailsForEvent,
  getScheduleDetailsForEvent,
} from "../../services/scheduleDetailService.js";
import {
  importScheduleRows,
  parseScheduleImportFile,
} from "../../services/scheduleImportService.js";
import { notify } from "../../utils/notify.js";
import {
  applyScheduleDateRangeToEventForm,
  formatEventDateRange,
  getScheduleDateRangeFromDays,
  getScheduleDaysOutsideRange,
  validateEventForm,
} from "./eventEditorUtils.js";

export default function useEventHeaderEditor({
  eventId,
  userProfile,
  form,
  setForm,
  savedEventForm,
  setSavedEventForm,
  scheduleDays,
  setScheduleDays,
  scheduleDetails,
  applyScheduleDays,
  loadScheduleDetails,
  loadTags,
  loadCompanies,
  loading,
  detailsLoading,
  isWriteDisabled,
  isEventReadOnly,
  isOffline,
  isSuperAdmin,
  setError,
  setTopbarConfig,
}) {
  const [isEditingEventDetails, setIsEditingEventDetails] = useState(false);
  const [isEditingEventScheduleRange, setIsEditingEventScheduleRange] = useState(false);
  const [eventImageFile, setEventImageFile] = useState(null);
  const [eventImagePreviewUrl, setEventImagePreviewUrl] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [importingSchedule, setImportingSchedule] = useState(false);
  const [clearingScheduleDetails, setClearingScheduleDetails] = useState(false);
  const scheduleImportInputRef = useRef(null);

  useEffect(() => {
    if (!eventImageFile) {
      setEventImagePreviewUrl("");
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(eventImageFile);
    setEventImagePreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [eventImageFile]);

  const currentScheduleDateRange = getScheduleDateRangeFromDays(scheduleDays);
  const hasScheduleDays = scheduleDays.length > 0;
  const currentScheduleRangeLabel = currentScheduleDateRange
    ? formatEventDateRange(
        currentScheduleDateRange.scheduleStartDate,
        currentScheduleDateRange.scheduleEndDate
      )
    : "";
  const showImportSchedule = !loading && !isWriteDisabled && !isEventReadOnly;
  const canImportSchedule = showImportSchedule && !importingSchedule && !detailsLoading;
  const showClearScheduleDetails = isSuperAdmin && !loading && !isOffline;
  const canClearScheduleDetails =
    showClearScheduleDetails &&
    !detailsLoading &&
    !clearingScheduleDetails &&
    scheduleDetails.length > 0;
  const eventHeaderImageUrl = eventImagePreviewUrl || form.imageUrl;
  const eventDateRangeLabel = formatEventDateRange(form.startDate, form.endDate);
  const eventTopbarDate = eventDateRangeLabel || "No event dates";

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const startEditingEventDetails = () => {
    setForm((current) => applyScheduleDateRangeToEventForm(current, scheduleDays));
    setIsEditingEventScheduleRange(false);
    setIsEditingEventDetails(true);
    setError("");
  };

  const handleEventImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setEventImageFile(null);
      return;
    }

    const validationMessage = validateEventImageFile(file);
    if (validationMessage) {
      setError(validationMessage);
      event.target.value = "";
      setEventImageFile(null);
      return;
    }

    setError("");
    setEventImageFile(file);
  };

  const removeEventImage = () => {
    setEventImageFile(null);
    updateField("imageUrl", "");
  };

  const cancelEditingEventDetails = () => {
    setForm(savedEventForm);
    setEventImageFile(null);
    setIsEditingEventScheduleRange(false);
    setIsEditingEventDetails(false);
    setError("");
  };

  const handleEventSave = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingEvent(true);
    setError("");

    try {
      const shouldUseEditedScheduleRange = !hasScheduleDays || isEditingEventScheduleRange;
      const nextEventForm = shouldUseEditedScheduleRange
        ? form
        : applyScheduleDateRangeToEventForm(form, scheduleDays);
      const validationMessage = validateEventForm(nextEventForm, userProfile);
      if (validationMessage) {
        setError(validationMessage);
        return;
      }

      if (hasScheduleDays && isEditingEventScheduleRange) {
        const daysToRemove = getScheduleDaysOutsideRange(
          scheduleDays,
          nextEventForm.scheduleStartDate,
          nextEventForm.scheduleEndDate
        );

        if (daysToRemove.length > 0) {
          const detailsByRemovedDayId = await getScheduleDetailsForEvent(
            eventId,
            daysToRemove.map((day) => day.id)
          );
          const hasDetailsToRemove = Object.values(detailsByRemovedDayId).some(
            (details) => details.length > 0
          );

          if (hasDetailsToRemove) {
            notify.error("Cannot remove schedule dates that contain schedule rows.");
            return;
          }
        }
      }

      const imageUrl = eventImageFile
        ? await uploadEventImage(eventId, eventImageFile)
        : nextEventForm.imageUrl;
      const eventFormToSave = {
        ...nextEventForm,
        imageUrl,
      };
      await updateEvent(eventId, eventFormToSave, userProfile);
      const days = await syncScheduleDaysToRange(
        eventId,
        eventFormToSave.scheduleStartDate,
        eventFormToSave.scheduleEndDate
      );
      setForm(eventFormToSave);
      setSavedEventForm(eventFormToSave);
      setEventImageFile(null);
      setIsEditingEventScheduleRange(false);
      setIsEditingEventDetails(false);
      applyScheduleDays(days);
      await loadCompanies(eventFormToSave.clientId);
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save event or sync schedule days.");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleScheduleImportFileChange = async (changeEvent) => {
    const file = changeEvent.target.files?.[0];
    changeEvent.target.value = "";
    if (!file) return;

    if (!canImportSchedule) {
      setError("Import is not available while schedule data is still loading.");
      return;
    }

    setImportingSchedule(true);
    setError("");

    try {
      const rows = await parseScheduleImportFile(file);
      await importScheduleRows({ eventId, rows });
      const days = await getScheduleDays(eventId);
      setScheduleDays(days);
      setForm((current) => applyScheduleDateRangeToEventForm(current, days));
      await Promise.all([
        loadScheduleDetails(days),
        loadTags(),
      ]);
    } catch (importError) {
      console.error("Could not import schedule.", importError);
      setError(importError instanceof Error ? importError.message : "Could not import schedule.");
    } finally {
      setImportingSchedule(false);
    }
  };

  const triggerScheduleImport = () => {
    setError("");
    scheduleImportInputRef.current?.click();
  };

  const clearScheduleDetailsForTesting = async () => {
    if (!isSuperAdmin) {
      setError("Only SuperAdmins can clear schedule detail rows.");
      return;
    }

    if (!canClearScheduleDetails) return;

    const confirmed = window.confirm(
      "Clear all schedule detail rows for this event? This is for testing only and cannot be undone."
    );
    if (!confirmed) return;

    setClearingScheduleDetails(true);
    setError("");

    try {
      await deleteScheduleDetailsForEvent(
        eventId,
        scheduleDays.map((day) => day.id)
      );
      const days = await getScheduleDays(eventId);
      setScheduleDays(days);
      await loadScheduleDetails(days);
    } catch (clearError) {
      console.error("Could not clear schedule detail rows.", clearError);
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Could not clear schedule detail rows."
      );
    } finally {
      setClearingScheduleDetails(false);
    }
  };

  useEffect(() => {
    if (loading) {
      setTopbarConfig(null);
      return;
    }

    setTopbarConfig({
      variant: "event",
      content: (
        <div className="event-topbar-content">
          <div className="event-topbar-copy">
            <h1 className="event-topbar-title">{form.name || eventId}</h1>
            {form.venue ? (
              <>
                <span className="event-topbar-separator">-</span>
                <p className="event-topbar-venue">{form.venue}</p>
              </>
            ) : null}
            <span className="event-topbar-separator">-</span>
            <p className="event-topbar-meta">{eventTopbarDate}</p>
          </div>
          {showClearScheduleDetails || (!isEditingEventDetails && !isEventReadOnly) ? (
            <div className="event-topbar-actions">
              {showClearScheduleDetails ? (
                <button
                  className="button event-topbar-edit-button"
                  type="button"
                  aria-label="Clear schedule detail rows for testing"
                  disabled={!canClearScheduleDetails}
                  onClick={clearScheduleDetailsForTesting}
                >
                  <CapcomIcon name="delete" size={18} weight="bold" />
                  <span className="button-label">
                    {clearingScheduleDetails ? "Clearing..." : "Clear rows"}
                  </span>
                </button>
              ) : null}
              {!isEditingEventDetails && !isEventReadOnly ? (
                <button
                  className="button event-topbar-edit-button"
                  type="button"
                  aria-label="Edit event"
                  disabled={isOffline}
                  onClick={startEditingEventDetails}
                >
                  <CapcomIcon name="edit" size={18} weight="bold" />
                  <span className="button-label">Edit</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ),
    });
  }, [
    eventId,
    eventTopbarDate,
    form.venue,
    form.name,
    canClearScheduleDetails,
    clearingScheduleDetails,
    isEditingEventDetails,
    isEventReadOnly,
    isOffline,
    loading,
    showClearScheduleDetails,
    setTopbarConfig,
  ]);

  useEffect(() => () => {
    setTopbarConfig(null);
  }, [setTopbarConfig]);

  return {
    scheduleImportInputRef,
    eventHeaderImageUrl,
    eventDateRangeLabel,
    isEditingEventDetails,
    isEditingEventScheduleRange,
    savingEvent,
    importingSchedule,
    canImportSchedule,
    hasScheduleDays,
    currentScheduleRangeLabel,
    updateField,
    startEditingEventDetails,
    handleEventSave,
    cancelEditingEventDetails,
    handleEventImageChange,
    removeEventImage,
    startEditingEventScheduleRange: () => setIsEditingEventScheduleRange(true),
    handleScheduleImportFileChange,
    triggerScheduleImport,
  };
}
