import { useState } from "react";
import { updateEvent } from "../../services/eventService.js";
import {
  syncScheduleDaysToRange,
  updateScheduleDay,
} from "../../services/scheduleDayService.js";

const emptyEditingDayDraft = {
  summary: "",
  endOfDayTarget: "",
};

const emptyScheduleDateRangeDraft = {
  scheduleStartDate: "",
  scheduleEndDate: "",
};

export default function useScheduleDayEditor({
  eventId,
  userProfile,
  form,
  setForm,
  setSavedEventForm,
  setScheduleDays,
  applyScheduleDays,
  loadScheduleDays,
  isWriteDisabled,
  setError,
}) {
  const [editingDayId, setEditingDayId] = useState("");
  const [editingDayDraft, setEditingDayDraft] = useState(emptyEditingDayDraft);
  const [editingDayMode, setEditingDayMode] = useState("");
  const [isEditingScheduleDateRange, setIsEditingScheduleDateRange] = useState(false);
  const [scheduleDateRangeDraft, setScheduleDateRangeDraft] = useState(
    emptyScheduleDateRangeDraft
  );
  const [savingScheduleDateRange, setSavingScheduleDateRange] = useState(false);
  const [savingDayId, setSavingDayId] = useState("");

  const updateDayField = (dayId, field, value) => {
    setScheduleDays((current) =>
      current.map((day) => (day.id === dayId ? { ...day, [field]: value } : day))
    );
  };

  const startEditingDay = (day, mode = "inline") => {
    setEditingDayId(day.id);
    setEditingDayMode(mode);
    setEditingDayDraft({
      summary: day.summary || "",
      endOfDayTarget: day.endOfDayTarget || "",
    });
    setError("");
  };

  const updateEditingDayField = (field, value) => {
    setEditingDayDraft((current) => ({ ...current, [field]: value }));
  };

  const cancelEditingDay = () => {
    setEditingDayId("");
    setEditingDayMode("");
    setEditingDayDraft(emptyEditingDayDraft);
  };

  const saveDay = async (day, values = day) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingDayId(day.id);
    setError("");

    try {
      await updateScheduleDay(day.id, {
        summary: values.summary || "",
        endOfDayTarget: values.endOfDayTarget || "",
      });
      updateDayField(day.id, "summary", values.summary || "");
      updateDayField(day.id, "endOfDayTarget", values.endOfDayTarget || "");
      cancelEditingDay();
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save schedule day.");
      await loadScheduleDays();
    } finally {
      setSavingDayId("");
    }
  };

  const startEditingScheduleDateRange = () => {
    setScheduleDateRangeDraft({
      scheduleStartDate: form.scheduleStartDate || form.startDate || "",
      scheduleEndDate: form.scheduleEndDate || form.endDate || "",
    });
    setError("");
    setIsEditingScheduleDateRange(true);
  };

  const updateScheduleDateRangeField = (field, value) => {
    setScheduleDateRangeDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const cancelEditingScheduleDateRange = () => {
    setIsEditingScheduleDateRange(false);
    setScheduleDateRangeDraft(emptyScheduleDateRangeDraft);
  };

  const saveScheduleDateRange = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    if (!scheduleDateRangeDraft.scheduleStartDate || !scheduleDateRangeDraft.scheduleEndDate) {
      setError("Schedule start and end dates are required.");
      return;
    }

    if (scheduleDateRangeDraft.scheduleStartDate > scheduleDateRangeDraft.scheduleEndDate) {
      setError("Schedule start date must be before or equal to schedule end date.");
      return;
    }

    setSavingScheduleDateRange(true);
    setError("");

    try {
      const nextEventForm = {
        ...form,
        scheduleStartDate: scheduleDateRangeDraft.scheduleStartDate,
        scheduleEndDate: scheduleDateRangeDraft.scheduleEndDate,
      };

      await updateEvent(eventId, nextEventForm, userProfile);
      const days = await syncScheduleDaysToRange(
        eventId,
        nextEventForm.scheduleStartDate,
        nextEventForm.scheduleEndDate
      );

      setForm(nextEventForm);
      setSavedEventForm(nextEventForm);
      applyScheduleDays(days);
      setIsEditingScheduleDateRange(false);
    } catch (saveError) {
      console.error(saveError);
      setError("Could not update schedule date range.");
    } finally {
      setSavingScheduleDateRange(false);
    }
  };

  return {
    editingDayId,
    editingDayDraft,
    editingDayMode,
    isEditingScheduleDateRange,
    scheduleDateRangeDraft,
    savingScheduleDateRange,
    savingDayId,
    startEditingDay,
    updateEditingDayField,
    cancelEditingDay,
    saveDay,
    startEditingScheduleDateRange,
    updateScheduleDateRangeField,
    cancelEditingScheduleDateRange,
    saveScheduleDateRange,
  };
}
