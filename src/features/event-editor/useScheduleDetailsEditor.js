import { useEffect, useRef, useState } from "react";
import {
  emptyDetailEditForm,
  timePickerHours,
  timePickerMinutes,
} from "./eventEditorConstants.js";

export default function useScheduleDetailsEditor({
  isWriteDisabled,
  setError,
  usedTagIds,
  usedLocationFilterIds,
  usedLocationIds,
  usedCompanyIds,
  locationById,
  locationOptions,
  companyById,
  companies,
  showCompanyColumn,
  showLocationColumn,
  getTagById,
  isReservedTruckTagId,
  getEditableDetailTagId,
  getTruckDestinationValue,
  toggleCompanyIds,
}) {
  const [draftDetailsByDayId, setDraftDetailsByDayId] = useState({});
  const [editingDetailCell, setEditingDetailCell] = useState(null);
  const [editingDetailModal, setEditingDetailModal] = useState(null);
  const [editingDetailTimeModal, setEditingDetailTimeModal] = useState(null);
  const [addingDetailDayId, setAddingDetailDayId] = useState("");
  const [addingTruckDetailTruckId, setAddingTruckDetailTruckId] = useState("");
  const [detailEditForm, setDetailEditForm] = useState(emptyDetailEditForm);
  const [openActionMenuId, setOpenActionMenuId] = useState("");
  const [openNotesDetailId, setOpenNotesDetailId] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [selectedTagFilterIds, setSelectedTagFilterIds] = useState([]);
  const [selectedLocationFilterIds, setSelectedLocationFilterIds] = useState([]);
  const [selectedSubLocationFilterIds, setSelectedSubLocationFilterIds] = useState([]);
  const [selectedCompanyFilterIds, setSelectedCompanyFilterIds] = useState([]);
  const [savingDetailId, setSavingDetailId] = useState("");
  const [savingDraftDayId, setSavingDraftDayId] = useState("");
  const [reorderingDayId, setReorderingDayId] = useState("");
  const suppressDetailBlurRef = useRef(false);
  const detailCellInputRef = useRef(null);
  const draggedDetailIdRef = useRef("");

  useEffect(() => {
    if (!openActionMenuId) return undefined;

    const closeMenuOnOutsideClick = (event) => {
      if (!event.target.closest(".action-menu")) {
        setOpenActionMenuId("");
      }
    };

    document.addEventListener("mousedown", closeMenuOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeMenuOnOutsideClick);
  }, [openActionMenuId]);

  useEffect(() => {
    if (!editingDetailCell) return;
    window.requestAnimationFrame(() => {
      detailCellInputRef.current?.focus();
      detailCellInputRef.current?.select?.();
    });
  }, [editingDetailCell]);

  useEffect(() => {
    if (selectedTagFilterIds.some((tagId) => !usedTagIds.has(tagId))) {
      setSelectedTagFilterIds((current) =>
        current.filter((tagId) => usedTagIds.has(tagId))
      );
    }
  }, [selectedTagFilterIds, usedTagIds]);

  useEffect(() => {
    setSelectedLocationFilterIds((current) =>
      current.filter((locationId) => usedLocationFilterIds.has(locationId))
    );
  }, [usedLocationFilterIds]);

  useEffect(() => {
    setSelectedSubLocationFilterIds((current) =>
      current.filter((locationId) => usedLocationIds.has(locationId))
    );
  }, [usedLocationIds]);

  useEffect(() => {
    setSelectedCompanyFilterIds((current) =>
      current.filter((companyId) => usedCompanyIds.has(companyId))
    );
  }, [usedCompanyIds]);

  const toggleCompanyFilter = (companyId) => {
    setSelectedCompanyFilterIds((current) =>
      current.includes(companyId)
        ? current.filter((currentCompanyId) => currentCompanyId !== companyId)
        : [...current, companyId]
    );
  };

  const toggleTagFilter = (tagId) => {
    setSelectedTagFilterIds((current) =>
      current.includes(tagId)
        ? current.filter((currentTagId) => currentTagId !== tagId)
        : [...current, tagId]
    );
  };

  const toggleLocationFilter = (locationId) => {
    setSelectedLocationFilterIds((current) =>
      current.includes(locationId)
        ? current.filter((currentLocationId) => currentLocationId !== locationId)
        : [...current, locationId]
    );
  };

  const toggleSubLocationFilter = (locationId) => {
    setSelectedSubLocationFilterIds((current) =>
      current.includes(locationId)
        ? current.filter((currentLocationId) => currentLocationId !== locationId)
        : [...current, locationId]
    );
  };

  const activeScheduleFilterCount = [
    selectedTagFilterIds.length > 0,
    selectedLocationFilterIds.length > 0,
    selectedSubLocationFilterIds.length > 0,
    selectedCompanyFilterIds.length > 0,
  ].filter(Boolean).length;
  const hasActiveScheduleFilters = activeScheduleFilterCount > 0;

  const clearScheduleFilters = () => {
    setSelectedTagFilterIds([]);
    setSelectedLocationFilterIds([]);
    setSelectedSubLocationFilterIds([]);
    setSelectedCompanyFilterIds([]);
  };

  const beginRowAction = () => {
    suppressDetailBlurRef.current = true;
    endRowAction();
  };

  const endRowAction = () => {
    setTimeout(() => {
      suppressDetailBlurRef.current = false;
    }, 0);
  };

  const closeActionMenu = () => {
    setOpenActionMenuId("");
  };

  const openNotesEditor = (detail) => {
    if (isWriteDisabled) return;
    setOpenActionMenuId("");
    setOpenNotesDetailId((current) => {
      if (current === detail.id) return "";
      setNotesDraft(detail.notes || "");
      return detail.id;
    });
    setError("");
  };

  const closeNotesEditor = () => {
    setOpenNotesDetailId("");
    setNotesDraft("");
  };

  const isEditingDetailCell = (detailId, field) =>
    editingDetailCell?.detailId === detailId && editingDetailCell?.field === field;

  const startEditingDetailCell = (dayId, detailId, field) => {
    if (isWriteDisabled) return;
    setEditingDetailCell({ dayId, detailId, field });
    setOpenActionMenuId("");
    setError("");
  };

  const startEditingDetail = (dayId, detail) => {
    const tagId = detail.truckId
      ? detail.tagId || ""
      : getEditableDetailTagId(detail.tagId);
    setEditingDetailModal({ dayId, detailId: detail.id });
    setDetailEditForm({
      time: detail.time || "",
      description: detail.description || "",
      action: detail.action || "",
      destinationValue: getTruckDestinationValue(detail),
      tagId,
      locationId: detail.locationId || "",
      companyIds: Array.isArray(detail.companyIds) ? detail.companyIds : [],
      notes: detail.notes || "",
    });
    setOpenActionMenuId("");
    setError("");
  };

  const startEditingDetailTime = (dayId, detail) => {
    const tagId = detail.truckId
      ? detail.tagId || ""
      : getEditableDetailTagId(detail.tagId);
    setEditingDetailTimeModal({ dayId, detailId: detail.id });
    setDetailEditForm({
      time: detail.time || "",
      description: detail.description || "",
      action: detail.action || "",
      destinationValue: getTruckDestinationValue(detail),
      tagId,
      locationId: detail.locationId || "",
      companyIds: Array.isArray(detail.companyIds) ? detail.companyIds : [],
      notes: detail.notes || "",
    });
    setOpenActionMenuId("");
    setError("");
  };

  const cancelEditingDetail = () => {
    setEditingDetailModal(null);
    setEditingDetailTimeModal(null);
    setAddingDetailDayId("");
    setAddingTruckDetailTruckId("");
    setDetailEditForm(emptyDetailEditForm);
  };

  const updateDetailEditFormField = (field, value) => {
    setDetailEditForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateDetailEditTimePart = (part, value) => {
    setDetailEditForm((currentForm) => {
      const [currentHour = "00", currentMinute = "00"] =
        (currentForm.time || "00:00").split(":");
      const nextHour = part === "hour" ? value : currentHour.padStart(2, "0");
      const nextMinute = part === "minute" ? value : currentMinute.padStart(2, "0");

      return {
        ...currentForm,
        time: `${nextHour}:${nextMinute}`,
      };
    });
  };

  const handleDetailTimeWheelKeyDown = (part, event) => {
    const handledKeys = ["ArrowUp", "ArrowDown", "Home", "End"];
    if (!handledKeys.includes(event.key)) return;

    event.preventDefault();
    const values = part === "hour" ? timePickerHours : timePickerMinutes;
    const [currentHour = "00", currentMinute = "00"] =
      (detailEditForm.time || "00:00").split(":");
    const currentValue =
      part === "hour" ? currentHour.padStart(2, "0") : currentMinute.padStart(2, "0");
    const currentIndex = Math.max(0, values.indexOf(currentValue));
    let nextIndex = currentIndex;

    if (event.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - 1);
    if (event.key === "ArrowDown") nextIndex = Math.min(values.length - 1, currentIndex + 1);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = values.length - 1;

    updateDetailEditTimePart(part, values[nextIndex]);
  };

  const toggleDetailEditCompany = (companyId) => {
    setDetailEditForm((currentForm) => ({
      ...currentForm,
      companyIds: toggleCompanyIds(currentForm.companyIds || [], companyId),
    }));
  };

  const buildDraftDetailDefaultsFromFilters = () => {
    const validTagFilterIds = selectedTagFilterIds.filter(
      (tagId) => getTagById(tagId) && !isReservedTruckTagId(tagId)
    );
    const tagId = validTagFilterIds.length > 0
      ? validTagFilterIds[0]
      : "";

    const filteredCompanyIds = selectedCompanyFilterIds.filter((companyId) =>
      companyById.has(companyId)
    );
    const defaultCompanyIds =
      showCompanyColumn
        ? (filteredCompanyIds.length > 0
          ? filteredCompanyIds
          : (showCompanyColumn && companies.length === 1 ? [companies[0].id] : []))
        : [];

    let locationId = "";
    if (showLocationColumn) {
      const validSubLocationId = selectedSubLocationFilterIds.find((locationId) =>
        locationById.has(locationId) &&
        locationOptions.some((location) => location.id === locationId)
      );
      if (validSubLocationId) {
        locationId = validSubLocationId;
      } else if (selectedLocationFilterIds.length > 0) {
        const selectedLocation = locationById.get(selectedLocationFilterIds[0]);
        if (selectedLocation) {
          const topLocationId = selectedLocation.parentLocationId || selectedLocation.id;
          const defaultSubLocation = locationOptions.find(
            (location) =>
              location.parentLocationId === topLocationId || location.id === topLocationId
          );
          if (defaultSubLocation) {
            locationId = defaultSubLocation.id;
          }
        }
      }
    }

    if (!locationId && showLocationColumn && locationOptions.length === 1) {
      locationId = locationOptions[0].id;
    }

    return {
      tagId,
      locationId,
      companyIds: defaultCompanyIds,
    };
  };

  const addDraftDetail = (dayId) => {
    if (isWriteDisabled) return;
    const defaults = buildDraftDetailDefaultsFromFilters();

    if (window.matchMedia("(max-width: 700px)").matches) {
      setAddingDetailDayId(dayId);
      setDetailEditForm({
        ...emptyDetailEditForm,
        tagId: defaults.tagId,
        locationId: defaults.locationId,
        companyIds: defaults.companyIds,
      });
      setError("");
      return;
    }

    setDraftDetailsByDayId((current) => ({
      ...current,
      [dayId]: [
        {
          time: "",
          description: "",
          colour: "",
          tagId: defaults.tagId,
          locationId: defaults.locationId,
          companyIds: defaults.companyIds,
        },
        ...(current[dayId] || []),
      ],
    }));
  };

  const updateDraftDetail = (dayId, draftIndex, field, value) => {
    const nextValue = field === "tagId" ? getEditableDetailTagId(value) : value;
    setDraftDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((draft, index) =>
        index === draftIndex ? { ...draft, [field]: nextValue } : draft
      ),
    }));
  };

  const removeDraftDetail = (dayId, draftIndex) => {
    setDraftDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).filter((_, index) => index !== draftIndex),
    }));
  };

  return {
    draftDetailsByDayId,
    setDraftDetailsByDayId,
    editingDetailCell,
    setEditingDetailCell,
    editingDetailModal,
    editingDetailTimeModal,
    addingDetailDayId,
    setAddingDetailDayId,
    addingTruckDetailTruckId,
    setAddingTruckDetailTruckId,
    detailEditForm,
    setDetailEditForm,
    openActionMenuId,
    setOpenActionMenuId,
    openNotesDetailId,
    notesDraft,
    setNotesDraft,
    selectedTagFilterIds,
    setSelectedTagFilterIds,
    selectedLocationFilterIds,
    setSelectedLocationFilterIds,
    selectedSubLocationFilterIds,
    setSelectedSubLocationFilterIds,
    selectedCompanyFilterIds,
    setSelectedCompanyFilterIds,
    savingDetailId,
    setSavingDetailId,
    savingDraftDayId,
    setSavingDraftDayId,
    reorderingDayId,
    setReorderingDayId,
    suppressDetailBlurRef,
    detailCellInputRef,
    draggedDetailIdRef,
    hasActiveScheduleFilters,
    toggleCompanyFilter,
    toggleTagFilter,
    toggleLocationFilter,
    toggleSubLocationFilter,
    clearScheduleFilters,
    beginRowAction,
    endRowAction,
    closeActionMenu,
    openNotesEditor,
    closeNotesEditor,
    isEditingDetailCell,
    startEditingDetailCell,
    startEditingDetail,
    startEditingDetailTime,
    cancelEditingDetail,
    updateDetailEditFormField,
    updateDetailEditTimePart,
    handleDetailTimeWheelKeyDown,
    toggleDetailEditCompany,
    addDraftDetail,
    updateDraftDetail,
    removeDraftDetail,
  };
}
