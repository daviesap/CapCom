import { useMemo, useState } from "react";
import {
  createScheduleDetail,
  updateScheduleDetail,
  updateScheduleDetailOrder,
} from "../../services/scheduleDetailService.js";
import { cacheScheduleDetails } from "../../services/localScheduleCache.js";
import { emptyDetailEditForm, truckDetailActions } from "./eventEditorConstants.js";
import {
  normaliseHexColour,
  sortDetailsForDisplay,
} from "./eventEditorUtils.js";

export default function useTruckingEditor({
  eventId,
  isWriteDisabled,
  scheduleDays,
  setDetailsByDayId,
  setSavedDetailsById,
  truckScheduleDetails,
  scheduleDayById,
  trucks,
  companies,
  locationOptions,
  showTruckDestinationColumn,
  setError,
  loadScheduleDetails,
  detailEditForm,
  setDetailEditForm,
  addingTruckDetailTruckId,
  setAddingTruckDetailTruckId,
  savingDetailId,
  setSavingDetailId,
  setSavingDraftDayId,
  reorderingDayId,
  setReorderingDayId,
  cancelEditingDetail,
  closeActionMenu,
  parseTruckDestinationValue,
  getTruckDestinationValue,
  ensureTruckTag,
  getNextSortOrder,
  addCreatedDetailToDay,
  moveDetailLocally,
}) {
  const [draftTruckDetailsByTruckId, setDraftTruckDetailsByTruckId] = useState({});

  const addingTruckDetailTruck = useMemo(
    () =>
      addingTruckDetailTruckId
        ? trucks.find((truck) => truck.id === addingTruckDetailTruckId)
        : null,
    [addingTruckDetailTruckId, trucks]
  );

  const getTruckDetails = (truck) => {
    return truckScheduleDetails
      .filter((detail) => detail.truckId === truck.id)
      .sort((detailA, detailB) => {
        const dateA = String(scheduleDayById.get(detailA.scheduleDayId)?.date || "");
        const dateB = String(scheduleDayById.get(detailB.scheduleDayId)?.date || "");
        const dateComparison = dateA.localeCompare(dateB);
        if (dateComparison !== 0) return dateComparison;

        const orderA = typeof detailA.sortOrder === "number" ? detailA.sortOrder : 0;
        const orderB = typeof detailB.sortOrder === "number" ? detailB.sortOrder : 0;
        const timeComparison = String(detailA.time || "").localeCompare(String(detailB.time || ""));
        if (timeComparison !== 0) return timeComparison;
        if (orderA !== orderB) return orderA - orderB;

        return String(detailA.id || "").localeCompare(String(detailB.id || ""));
      });
  };

  const getNextTruckDetailSortOrder = (truckId) => {
    return (
      truckScheduleDetails
        .filter((detail) => detail.truckId === truckId)
        .reduce(
          (maxSortOrder, detail, detailIndex) =>
            Math.max(
              maxSortOrder,
              typeof detail.sortOrder === "number" ? detail.sortOrder : detailIndex
            ),
          -1
        ) + 1
    );
  };

  const buildDefaultTruckDestination = () => {
    const hasSingleDestination =
      showTruckDestinationColumn &&
      locationOptions.length + companies.length === 1;
    return hasSingleDestination && locationOptions.length === 1
      ? { locationId: locationOptions[0].id, companyIds: [] }
      : hasSingleDestination && companies.length === 1
        ? { locationId: "", companyIds: [companies[0].id] }
        : { locationId: "", companyIds: [] };
  };

  const addDraftTruckDetail = (truckId) => {
    if (isWriteDisabled) return;
    const defaultTruckDestination = buildDefaultTruckDestination();

    if (window.matchMedia("(max-width: 700px)").matches) {
      setAddingTruckDetailTruckId(truckId);
      setDetailEditForm({
        ...emptyDetailEditForm,
        scheduleDayId: scheduleDays[0]?.id || "",
        destinationValue: getTruckDestinationValue(defaultTruckDestination),
        ...defaultTruckDestination,
      });
      setError("");
      return;
    }

    setDraftTruckDetailsByTruckId((current) => ({
      ...current,
      [truckId]: [
        ...(current[truckId] || []),
        {
          scheduleDayId: scheduleDays[0]?.id || "",
          action: "",
          time: "",
          description: "",
          colour: "",
          tagId: "",
          notes: "",
          ...defaultTruckDestination,
        },
      ],
    }));
  };

  const updateDraftTruckDetail = (truckId, draftIndex, field, value) => {
    setDraftTruckDetailsByTruckId((current) => ({
      ...current,
      [truckId]: (current[truckId] || []).map((draft, index) =>
        index === draftIndex ? { ...draft, [field]: value } : draft
      ),
    }));
  };

  const updateDraftTruckDestination = (truckId, draftIndex, value) => {
    const destination = parseTruckDestinationValue(value);
    setDraftTruckDetailsByTruckId((current) => ({
      ...current,
      [truckId]: (current[truckId] || []).map((draft, index) =>
        index === draftIndex ? { ...draft, ...destination } : draft
      ),
    }));
  };

  const removeDraftTruckDetail = (truckId, draftIndex) => {
    setDraftTruckDetailsByTruckId((current) => ({
      ...current,
      [truckId]: (current[truckId] || []).filter((_, index) => index !== draftIndex),
    }));
  };

  const saveDraftTruckDetail = async (truck, draftIndex, draft) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!draft.scheduleDayId) {
      setError("Date is required.");
      return;
    }
    setSavingDraftDayId(truck.id);
    setError("");

    try {
      const truckTag = await ensureTruckTag();
      const detailData = {
        eventId,
        scheduleDayId: draft.scheduleDayId,
        truckId: truck.id,
        truckNumber: truck.truckNumber || "",
        action: draft.action || "",
        time: draft.time,
        description: String(draft.description || "").trim(),
        notes: draft.notes || "",
        sortOrder: getNextTruckDetailSortOrder(truck.id),
        colour: normaliseHexColour(truckTag.colour),
        tagId: truckTag.id,
        locationId: draft.locationId || "",
        companyIds: draft.locationId ? [] : draft.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      removeDraftTruckDetail(truck.id, draftIndex);
      addCreatedDetailToDay(draft.scheduleDayId, detailRef, detailData);
    } catch (saveError) {
      console.error(saveError);
      setError("Could not add truck detail.");
    } finally {
      setSavingDraftDayId("");
    }
  };

  const saveMobileAddTruckDetailForm = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!addingTruckDetailTruck) return;
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!detailEditForm.scheduleDayId) {
      setError("Date is required.");
      return;
    }

    setSavingDraftDayId(addingTruckDetailTruck.id);
    setError("");

    try {
      const truckTag = await ensureTruckTag();
      const destination = parseTruckDestinationValue(detailEditForm.destinationValue);
      const detailData = {
        eventId,
        scheduleDayId: detailEditForm.scheduleDayId,
        truckId: addingTruckDetailTruck.id,
        truckNumber: addingTruckDetailTruck.truckNumber || "",
        action: detailEditForm.action || "",
        time: detailEditForm.time || "",
        description: "",
        notes: detailEditForm.notes || "",
        sortOrder: getNextTruckDetailSortOrder(addingTruckDetailTruck.id),
        colour: normaliseHexColour(truckTag.colour),
        tagId: truckTag.id,
        locationId: destination.locationId || "",
        companyIds: destination.locationId ? [] : destination.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      addCreatedDetailToDay(detailEditForm.scheduleDayId, detailRef, detailData);
      cancelEditingDetail();
    } catch (saveError) {
      console.error(saveError);
      setError("Could not add truck detail.");
    } finally {
      setSavingDraftDayId("");
    }
  };

  const assignTruckDetailDate = async (sourceDayId, detail, targetDayId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!targetDayId || targetDayId === sourceDayId) return;

    setSavingDetailId(detail.id);
    setError("");

    try {
      const truckTag = await ensureTruckTag();
      const updates = {
        eventId,
        scheduleDayId: targetDayId,
        truckId: detail.truckId || "",
        truckNumber: detail.truckNumber || "",
        action: detail.action || "",
        time: detail.time || "",
        description: detail.description || "",
        sortOrder: getNextSortOrder(targetDayId),
        colour: normaliseHexColour(detail.colour),
        tagId: truckTag.id,
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      };
      await updateScheduleDetail(detail.id, {
        ...updates,
      });
      moveDetailLocally(sourceDayId, targetDayId, detail, updates);
    } catch (dateError) {
      console.error(dateError);
      setError("Could not update truck detail date.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const persistTruckDetailOrder = async (truckId, nextDetails) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    const orderedDetails = nextDetails.map((detail, detailIndex) => ({
      ...detail,
      sortOrder: detailIndex,
    }));
    const changedDetails = orderedDetails.filter((detail, detailIndex) =>
      detail.sortOrder !== nextDetails[detailIndex]?.sortOrder
    );

    setDetailsByDayId((current) => {
      const orderedById = new Map(orderedDetails.map((detail) => [detail.id, detail]));
      const nextDetailsByDayId = Object.fromEntries(
        Object.entries(current).map(([dayId, details]) => [
          dayId,
          details.map((detail) => orderedById.get(detail.id) || detail),
        ])
      );
      Object.entries(nextDetailsByDayId).forEach(([dayId, details]) => {
        cacheScheduleDetails(dayId, sortDetailsForDisplay(details));
      });
      return nextDetailsByDayId;
    });
    setReorderingDayId(truckId);
    setError("");

    try {
      await updateScheduleDetailOrder(changedDetails);
    } catch (reorderError) {
      console.error(reorderError);
      setError("Could not reorder truck details.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setReorderingDayId("");
    }
  };

  const getNextTruckDetailAction = (currentAction) => {
    const normalisedAction =
      currentAction === "Collect" ? "Deliver" : currentAction || "";
    const currentActionIndex = truckDetailActions.indexOf(normalisedAction);
    return truckDetailActions[(currentActionIndex + 1) % truckDetailActions.length];
  };

  const toggleTruckDetailAction = async (dayId, detail) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    const nextAction = getNextTruckDetailAction(detail.action);
    setSavingDetailId(detail.id);
    setError("");
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((nextDetail) =>
        nextDetail.id === detail.id ? { ...nextDetail, action: nextAction } : nextDetail
      ),
    }));

    try {
      const truckTag = await ensureTruckTag();
      await updateScheduleDetail(detail.id, {
        eventId,
        scheduleDayId: dayId,
        truckId: detail.truckId || "",
        truckNumber: detail.truckNumber || "",
        action: nextAction,
        time: detail.time || "",
        description: detail.description || "",
        sortOrder: detail.sortOrder,
        colour: normaliseHexColour(detail.colour),
        tagId: truckTag.id,
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      });
    } catch (actionError) {
      console.error(actionError);
      setError("Could not update truck action.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const assignTruckDetailDestination = async (dayId, detail, value) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    const destination = parseTruckDestinationValue(value);
    setSavingDetailId(detail.id);
    setError("");
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((nextDetail) =>
        nextDetail.id === detail.id ? { ...nextDetail, ...destination } : nextDetail
      ),
    }));

    try {
      const truckTag = await ensureTruckTag();
      await updateScheduleDetail(detail.id, {
        eventId,
        tagId: truckTag.id,
        locationId: destination.locationId,
        companyIds: destination.companyIds,
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
          tagId: truckTag.id,
          locationId: destination.locationId,
          companyIds: destination.companyIds,
        },
      }));
    } catch (destinationError) {
      console.error(destinationError);
      setError("Could not update truck destination.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const moveTruckDetail = async (truckId, truckDetails, detailId, direction) => {
    if (reorderingDayId) return;

    const detailIndex = truckDetails.findIndex((detail) => detail.id === detailId);
    const targetIndex = detailIndex + direction;
    if (detailIndex < 0 || targetIndex < 0 || targetIndex >= truckDetails.length) return;

    const nextDetails = [...truckDetails];
    [nextDetails[detailIndex], nextDetails[targetIndex]] = [
      nextDetails[targetIndex],
      nextDetails[detailIndex],
    ];
    closeActionMenu();
    await persistTruckDetailOrder(truckId, nextDetails);
  };

  const duplicateTruckDetail = async (truck, detail) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (savingDetailId === detail.id) return;

    setSavingDetailId(detail.id);
    setError("");
    closeActionMenu();

    try {
      const truckTag = await ensureTruckTag();
      const detailData = {
        eventId,
        scheduleDayId: detail.scheduleDayId,
        truckId: truck.id,
        truckNumber: truck.truckNumber || "",
        action: detail.action || "",
        time: detail.time || "",
        description: detail.description || "",
        notes: detail.notes || "",
        sortOrder: getNextTruckDetailSortOrder(truck.id),
        colour: normaliseHexColour(truckTag.colour),
        tagId: truckTag.id,
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      addCreatedDetailToDay(detail.scheduleDayId, detailRef, detailData);
    } catch (duplicateError) {
      console.error(duplicateError);
      setError("Could not duplicate truck detail.");
    } finally {
      setSavingDetailId("");
    }
  };

  return {
    draftTruckDetailsByTruckId,
    addingTruckDetailTruck,
    getTruckDetails,
    addDraftTruckDetail,
    updateDraftTruckDetail,
    updateDraftTruckDestination,
    removeDraftTruckDetail,
    saveDraftTruckDetail,
    saveMobileAddTruckDetailForm,
    assignTruckDetailDate,
    persistTruckDetailOrder,
    getNextTruckDetailAction,
    toggleTruckDetailAction,
    assignTruckDetailDestination,
    moveTruckDetail,
    duplicateTruckDetail,
  };
}
