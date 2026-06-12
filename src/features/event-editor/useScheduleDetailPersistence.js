import {
  createScheduleDetail,
  deleteScheduleDetail,
  updateScheduleDetail,
  updateScheduleDetailOrder,
} from "../../services/scheduleDetailService.js";
import { cacheScheduleDetails } from "../../services/localScheduleCache.js";
import { createTag } from "../../services/tagService.js";
import { emptyTagForm } from "./eventEditorConstants.js";
import {
  normaliseHexColour,
  sortDetailsForDisplay,
} from "./eventEditorUtils.js";

export default function useScheduleDetailPersistence({
  eventId,
  isWriteDisabled,
  setError,
  scheduleDays,
  scheduleDayById,
  detailsByDayId,
  setDetailsByDayId,
  savedDetailsById,
  setSavedDetailsById,
  setDayDetails,
  tags,
  setTags,
  isReservedTruckTag,
  getEditableDetailTagId,
  detailEditForm,
  editingDetailModal,
  editingDetailTimeModal,
  addingDetailDayId,
  notesDraft,
  closeNotesEditor,
  cancelEditingDetail,
  setEditingDetailCell,
  setOpenActionMenuId,
  closeActionMenu,
  suppressDetailBlurRef,
  savingDetailId,
  setSavingDetailId,
  setSavingDraftDayId,
  setReorderingDayId,
  removeDraftDetail,
  loadScheduleDetails,
  parseTruckDestinationValue,
}) {
  const removeDetailFromDay = (dayId, detailId) => {
    setDayDetails(
      dayId,
      (detailsByDayId[dayId] || []).filter((detail) => detail.id !== detailId)
    );
    setSavedDetailsById((current) => {
      const remainingDetails = { ...current };
      delete remainingDetails[detailId];
      return remainingDetails;
    });
  };

  const addCreatedDetailToDay = (dayId, detailRef, detailData) => {
    const createdDetail = {
      id: detailRef.id,
      eventId,
      scheduleDayId: dayId,
      truckId: "",
      truckNumber: "",
      action: "",
      notes: "",
      colour: "",
      tagId: "",
      locationId: "",
      companyIds: [],
      ...detailData,
    };
    setDayDetails(dayId, [...(detailsByDayId[dayId] || []), createdDetail]);
    return createdDetail;
  };

  const moveDetailLocally = (sourceDayId, targetDayId, detail, updates) => {
    if (sourceDayId === targetDayId) {
      setDayDetails(
        targetDayId,
        (detailsByDayId[targetDayId] || []).map((currentDetail) =>
          currentDetail.id === detail.id ? { ...currentDetail, ...updates } : currentDetail
        )
      );
      return;
    }

    setDayDetails(
      sourceDayId,
      (detailsByDayId[sourceDayId] || []).filter((currentDetail) => currentDetail.id !== detail.id)
    );
    setDayDetails(targetDayId, [
      ...(detailsByDayId[targetDayId] || []),
      {
        ...detail,
        ...updates,
      },
    ]);
  };

  const updateDetailField = (dayId, detailId, field, value) => {
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((detail) =>
        detail.id === detailId ? { ...detail, [field]: value } : detail
      ),
    }));
  };

  const updateDetailAcrossDays = (detailId, fields) => {
    setDetailsByDayId((current) =>
      Object.fromEntries(
        Object.entries(current).map(([dayId, details]) => [
          dayId,
          details.map((detail) =>
            detail.id === detailId ? { ...detail, ...fields } : detail
          ),
        ])
      )
    );
  };

  const ensureTruckTag = async () => {
    const existingTruckTag = tags.find(isReservedTruckTag);
    if (existingTruckTag) return existingTruckTag;

    const truckTag = {
      eventId,
      name: "Truck",
      colour: emptyTagForm.colour,
    };
    const truckTagRef = await createTag(truckTag);
    const createdTruckTag = {
      id: truckTagRef.id,
      ...truckTag,
    };
    setTags((current) =>
      [...current, createdTruckTag].sort((tagA, tagB) =>
        String(tagA.name || "").localeCompare(String(tagB.name || ""))
      )
    );
    return createdTruckTag;
  };

  const assignDetailTag = async (dayId, detail, tagId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingDetailId(detail.id);
    setError("");

    try {
      const nextTagId = detail.truckId
        ? (await ensureTruckTag()).id
        : getEditableDetailTagId(tagId);
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: (current[dayId] || []).map((nextDetail) =>
          nextDetail.id === detail.id ? { ...nextDetail, tagId: nextTagId } : nextDetail
        ),
      }));
      await updateScheduleDetail(detail.id, {
        eventId,
        tagId: nextTagId,
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
          tagId: nextTagId,
        },
      }));
    } catch (tagError) {
      console.error(tagError);
      setError("Could not update row tag.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const assignDetailLocation = async (dayId, detail, locationId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingDetailId(detail.id);
    setError("");
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((nextDetail) =>
        nextDetail.id === detail.id ? { ...nextDetail, locationId } : nextDetail
      ),
    }));

    try {
      await updateScheduleDetail(detail.id, {
        eventId,
        locationId,
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
          locationId,
        },
      }));
    } catch (locationError) {
      console.error(locationError);
      setError("Could not update row location.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const assignDetailCompanies = async (dayId, detail, companyIds) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingDetailId(detail.id);
    setError("");
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((nextDetail) =>
        nextDetail.id === detail.id ? { ...nextDetail, companyIds } : nextDetail
      ),
    }));

    try {
      await updateScheduleDetail(detail.id, {
        eventId,
        companyIds,
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
          companyIds,
        },
      }));
    } catch (companyError) {
      console.error(companyError);
      setError("Could not update row company.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const saveDetailNotes = async (detail, nextNotes = notesDraft) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    setSavingDetailId(detail.id);
    setError("");

    try {
      await updateScheduleDetail(detail.id, {
        notes: nextNotes,
      });
      updateDetailAcrossDays(detail.id, { notes: nextNotes });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
          notes: nextNotes,
        },
      }));
      closeNotesEditor();
    } catch (notesError) {
      console.error(notesError);
      setError("Could not save notes.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const saveDetailEditForm = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!editingDetailModal) return;
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    const currentDetail = detailsByDayId[editingDetailModal.dayId]?.find(
      (detail) => detail.id === editingDetailModal.detailId
    );
    if (!currentDetail) {
      setError("Could not find schedule detail.");
      return;
    }

    setSavingDetailId(currentDetail.id);
    setError("");

    try {
      const truckDestination = currentDetail.truckId
        ? parseTruckDestinationValue(detailEditForm.destinationValue)
        : null;
      const tagId = currentDetail.truckId
        ? (await ensureTruckTag()).id
        : getEditableDetailTagId(detailEditForm.tagId);
      const updates = {
        eventId,
        time: detailEditForm.time || "",
        description: currentDetail.truckId
          ? currentDetail.description || ""
          : detailEditForm.description || "",
        action: currentDetail.truckId ? detailEditForm.action || "" : currentDetail.action || "",
        notes: detailEditForm.notes || "",
        sortOrder: currentDetail.sortOrder,
        colour: normaliseHexColour(currentDetail.colour),
        tagId,
        locationId: currentDetail.truckId
          ? truckDestination.locationId
          : detailEditForm.locationId || "",
        companyIds: currentDetail.truckId
          ? truckDestination.companyIds
          : detailEditForm.companyIds || [],
      };

      await updateScheduleDetail(currentDetail.id, updates);

      setDetailsByDayId((current) => ({
        ...current,
        [editingDetailModal.dayId]: sortDetailsForDisplay(
          (current[editingDetailModal.dayId] || []).map((detail) =>
            detail.id === currentDetail.id
              ? {
                  ...detail,
                  ...updates,
                }
              : detail
          )
        ),
      }));
      setSavedDetailsById((current) => ({
        ...current,
        [currentDetail.id]: {
          ...(current[currentDetail.id] || {}),
          ...updates,
        },
      }));
      cancelEditingDetail();
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save schedule row.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const saveDetailTimeForm = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!editingDetailTimeModal) return;
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    const currentDetail = detailsByDayId[editingDetailTimeModal.dayId]?.find(
      (detail) => detail.id === editingDetailTimeModal.detailId
    );
    if (!currentDetail) {
      setError("Could not find schedule detail.");
      return;
    }

    setSavingDetailId(currentDetail.id);
    setError("");

    try {
      await updateScheduleDetail(currentDetail.id, {
        eventId,
        time: detailEditForm.time || "",
      });
      setDetailsByDayId((current) => ({
        ...current,
        [editingDetailTimeModal.dayId]: sortDetailsForDisplay(
          (current[editingDetailTimeModal.dayId] || []).map((detail) =>
            detail.id === currentDetail.id
              ? { ...detail, time: detailEditForm.time || "" }
              : detail
          )
        ),
      }));
      setSavedDetailsById((current) => ({
        ...current,
        [currentDetail.id]: {
          ...(current[currentDetail.id] || {}),
          time: detailEditForm.time || "",
        },
      }));
      cancelEditingDetail();
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save time.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const cancelEditingDetailCell = (dayId, detailId, field) => {
    const savedDetail = savedDetailsById[detailId];
    if (savedDetail) {
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: (current[dayId] || []).map((detail) =>
          detail.id === detailId ? { ...detail, [field]: savedDetail[field] || "" } : detail
        ),
      }));
    }
    setEditingDetailCell(null);
    setOpenActionMenuId("");
  };

  const saveDetailCell = async (dayId, detail, nextCell = null) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    const savedDetail = savedDetailsById[detail.id] || {};
    const hasCellChanges =
      (detail.time || "") !== (savedDetail.time || "") ||
      (detail.description || "") !== (savedDetail.description || "");

    if (!hasCellChanges) {
      setEditingDetailCell(nextCell);
      return;
    }

    setSavingDetailId(detail.id);
    setError("");

    try {
      await updateScheduleDetail(detail.id, {
        eventId,
        time: detail.time || "",
        description: detail.description || "",
        sortOrder: detail.sortOrder,
      });
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: sortDetailsForDisplay(
          (current[dayId] || []).map((nextDetail) =>
            nextDetail.id === detail.id
              ? {
                  ...nextDetail,
                  time: detail.time || "",
                  description: detail.description || "",
                  sortOrder: detail.sortOrder,
                }
              : nextDetail
          )
        ),
      }));
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
          time: detail.time || "",
          description: detail.description || "",
          sortOrder: detail.sortOrder,
        },
      }));
      setEditingDetailCell(nextCell);
      setOpenActionMenuId("");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save schedule detail.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const getNextDetailCell = (dayId, dayDetails, detailIndex, field, shiftKey) => {
    if (shiftKey) {
      if (field === "description") {
        return { dayId, detailId: dayDetails[detailIndex].id, field: "time" };
      }
      const previousDetail = dayDetails[detailIndex - 1];
      return previousDetail
        ? {
            dayId: previousDetail.scheduleDayId || dayId,
            detailId: previousDetail.id,
            field: "description",
          }
        : null;
    }

    if (field === "time") {
      return { dayId, detailId: dayDetails[detailIndex].id, field: "description" };
    }
    const nextDetail = dayDetails[detailIndex + 1];
    return nextDetail
      ? { dayId: nextDetail.scheduleDayId || dayId, detailId: nextDetail.id, field: "time" }
      : null;
  };

  const handleDetailCellKeyDown = (event, dayId, dayDetails, detail, detailIndex, field) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditingDetailCell(dayId, detail.id, field);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      suppressDetailBlurRef.current = true;
      saveDetailCell(
        dayId,
        detail,
        getNextDetailCell(dayId, dayDetails, detailIndex, field, event.shiftKey)
      ).finally(() => {
        setTimeout(() => {
          suppressDetailBlurRef.current = false;
        }, 0);
      });
    }
  };

  const deleteDetail = async (dayId, detailId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    setSavingDetailId(detailId);
    setError("");

    try {
      await deleteScheduleDetail(detailId);
      removeDetailFromDay(dayId, detailId);
      setEditingDetailCell((current) => (current?.detailId === detailId ? null : current));
      setOpenActionMenuId("");
    } catch (deleteError) {
      console.error(deleteError);
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const getAdjacentDay = (dayId, direction) => {
    const dayIndex = scheduleDays.findIndex((day) => day.id === dayId);
    if (dayIndex < 0) return null;
    return scheduleDays[dayIndex + direction] || null;
  };

  const getNextSortOrder = (dayId) => {
    return (
      (detailsByDayId[dayId] || []).reduce(
        (maxSortOrder, detail, detailIndex) =>
          Math.max(
            maxSortOrder,
            typeof detail.sortOrder === "number" ? detail.sortOrder : detailIndex
          ),
        -1
      ) + 1
    );
  };

  const moveDetailToDay = async (sourceDayId, targetDayId, detail) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!targetDayId || savingDetailId === detail.id) return;

    setSavingDetailId(detail.id);
    setError("");
    closeActionMenu();

    try {
      const tagId = detail.truckId
        ? (await ensureTruckTag()).id
        : getEditableDetailTagId(detail.tagId);
      const sortOrder = getNextSortOrder(targetDayId);
      await updateScheduleDetail(detail.id, {
        eventId,
        time: detail.time || "",
        description: detail.description || "",
        sortOrder,
        scheduleDayId: targetDayId,
        truckId: detail.truckId || "",
        truckNumber: detail.truckNumber || "",
        action: detail.action || "",
        colour: normaliseHexColour(detail.colour),
        tagId,
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      });
      moveDetailLocally(sourceDayId, targetDayId, detail, {
        scheduleDayId: targetDayId,
        sortOrder,
        tagId,
      });
      setEditingDetailCell((current) => (current?.detailId === detail.id ? null : current));
    } catch (moveError) {
      console.error(moveError);
      setError("Could not move schedule detail.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const duplicateDetail = async (dayId, detail) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (savingDetailId === detail.id) return;

    setSavingDetailId(detail.id);
    setError("");
    closeActionMenu();

    try {
      const tagId = detail.truckId
        ? (await ensureTruckTag()).id
        : getEditableDetailTagId(detail.tagId);
      const detailData = {
        eventId,
        scheduleDayId: dayId,
        truckId: detail.truckId || "",
        truckNumber: detail.truckNumber || "",
        time: detail.time || "",
        description: detail.description || "",
        notes: detail.notes || "",
        sortOrder: getNextSortOrder(dayId),
        colour: normaliseHexColour(detail.colour),
        tagId,
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      addCreatedDetailToDay(dayId, detailRef, detailData);
    } catch (duplicateError) {
      console.error(duplicateError);
      setError("Could not duplicate schedule detail.");
    } finally {
      setSavingDetailId("");
    }
  };

  const persistScheduleDetailOrder = async (dayId, nextGroupDetails) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!dayId || nextGroupDetails.length === 0) return;

    const currentDayDetails = detailsByDayId[dayId] || [];
    const groupIds = new Set(nextGroupDetails.map((detail) => detail.id));
    const originalGroupDetails = currentDayDetails.filter((detail) => groupIds.has(detail.id));
    const orderedDetails = nextGroupDetails.map((detail, detailIndex) => ({
      ...detail,
      sortOrder: detailIndex,
    }));
    const changedDetails = orderedDetails.filter((detail) => {
      const originalDetail = originalGroupDetails.find(
        (currentDetail) => currentDetail.id === detail.id
      );
      return originalDetail?.sortOrder !== detail.sortOrder;
    });

    if (changedDetails.length === 0) return;

    const orderedById = new Map(orderedDetails.map((detail) => [detail.id, detail]));
    setDayDetails(
      dayId,
      sortDetailsForDisplay(
        currentDayDetails.map((detail) => orderedById.get(detail.id) || detail)
      )
    );
    cacheScheduleDetails(
      dayId,
      sortDetailsForDisplay(
        currentDayDetails.map((detail) => orderedById.get(detail.id) || detail)
      )
    );
    setSavedDetailsById((current) => ({
      ...current,
      ...Object.fromEntries(
        orderedDetails.map((detail) => [
          detail.id,
          {
            ...(current[detail.id] || {}),
            sortOrder: detail.sortOrder,
          },
        ])
      ),
    }));
    setReorderingDayId(dayId);
    setError("");

    try {
      await updateScheduleDetailOrder(changedDetails);
    } catch (reorderError) {
      console.error(reorderError);
      setError("Could not reorder schedule rows.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setReorderingDayId("");
    }
  };

  const saveDraftDetail = async (dayId, draftIndex, draft) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!draft.description?.trim()) {
      setError("Description is required.");
      return;
    }
    if (!scheduleDayById.get(dayId)?.date) {
      setError("Date is required.");
      return;
    }
    setSavingDraftDayId(dayId);
    setError("");

    try {
      const detailData = {
        eventId,
        scheduleDayId: dayId,
        time: draft.time,
        description: draft.description.trim(),
        notes: draft.notes || "",
        sortOrder: getNextSortOrder(dayId),
        colour: normaliseHexColour(draft.colour),
        tagId: getEditableDetailTagId(draft.tagId),
        locationId: draft.locationId || "",
        companyIds: draft.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      removeDraftDetail(dayId, draftIndex);
      addCreatedDetailToDay(dayId, detailRef, detailData);
    } catch (saveError) {
      console.error(saveError);
      setError("Could not add schedule detail.");
    } finally {
      setSavingDraftDayId("");
    }
  };

  const saveMobileAddDetailForm = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!addingDetailDayId) return;
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!detailEditForm.description?.trim()) {
      setError("Description is required.");
      return;
    }
    if (!scheduleDayById.get(addingDetailDayId)?.date) {
      setError("Date is required.");
      return;
    }

    setSavingDraftDayId(addingDetailDayId);
    setError("");

    try {
      const detailData = {
        eventId,
        scheduleDayId: addingDetailDayId,
        time: detailEditForm.time || "",
        description: detailEditForm.description.trim(),
        notes: detailEditForm.notes || "",
        sortOrder: getNextSortOrder(addingDetailDayId),
        colour: "",
        tagId: getEditableDetailTagId(detailEditForm.tagId),
        locationId: detailEditForm.locationId || "",
        companyIds: detailEditForm.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      addCreatedDetailToDay(addingDetailDayId, detailRef, detailData);
      cancelEditingDetail();
    } catch (saveError) {
      console.error(saveError);
      setError("Could not add schedule detail.");
    } finally {
      setSavingDraftDayId("");
    }
  };

  return {
    updateDetailField,
    assignDetailTag,
    assignDetailLocation,
    assignDetailCompanies,
    saveDetailNotes,
    saveDetailEditForm,
    saveDetailTimeForm,
    saveDetailCell,
    handleDetailCellKeyDown,
    deleteDetail,
    getAdjacentDay,
    getNextSortOrder,
    moveDetailToDay,
    duplicateDetail,
    persistScheduleDetailOrder,
    saveDraftDetail,
    saveMobileAddDetailForm,
    ensureTruckTag,
    addCreatedDetailToDay,
    moveDetailLocally,
  };
}
