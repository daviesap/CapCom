import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider.jsx";
import EventEditorHeader from "../../components/event-edit/EventEditorHeader.jsx";
import EventEditorStatusMessages from "../../components/event-edit/EventEditorStatusMessages.jsx";
import EventEditorTabs from "../../components/event-edit/EventEditorTabs.jsx";
import DetailFilters from "../../components/event-edit/DetailFilters.jsx";
import DetailPanel from "../../components/event-edit/DetailPanel.jsx";
import InfoPanel from "../../components/event-edit/InfoPanel.jsx";
import SettingsPanel from "../../components/event-edit/SettingsPanel.jsx";
import SharePanel from "../../components/event-edit/SharePanel.jsx";
import TruckingPanel from "../../components/event-edit/TruckingPanel.jsx";
import Loading from "../../components/Loading.jsx";
import useOnlineStatus from "../../hooks/useOnlineStatus.js";
import {
  emptyTagForm,
  eventEditTabs,
} from "./eventEditorConstants.js";
import {
  formatDetailDate,
  getRowTagStyle,
  getTagStyle,
  normaliseHexColour,
} from "./eventEditorUtils.js";
import useEventSettingsEditor from "./useEventSettingsEditor.js";
import useEventEditorData from "./useEventEditorData.js";
import useScheduleDetailsEditor from "./useScheduleDetailsEditor.js";
import useTruckingEditor from "./useTruckingEditor.js";
import useEventInfoEditor from "./useEventInfoEditor.js";
import useEventShareEditor from "./useEventShareEditor.js";
import useScheduleDayEditor from "./useScheduleDayEditor.js";
import useEventHeaderEditor from "./useEventHeaderEditor.jsx";
import useScheduleDetailPersistence from "./useScheduleDetailPersistence.js";
import ScheduleDetailModals from "./ScheduleDetailModals.jsx";
import TruckDetailModals from "./TruckDetailModals.jsx";

const noopSetTopbarConfig = () => {};

export default function EventEditPage() {
  const { eventId } = useParams();
  const outletContext = useOutletContext();
  const setTopbarConfig = outletContext?.setTopbarConfig || noopSetTopbarConfig;
  const { userProfile, profileLoading, isSuperAdmin, isAdmin, isUser, isViewer } = useAuth();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const isEventReadOnly = isViewer;
  const isWriteDisabled = isOffline || isEventReadOnly;
  const resetEventContactsRef = useRef(() => {});
  const {
    form,
    setForm,
    savedEventForm,
    setSavedEventForm,
    scheduleDays,
    setScheduleDays,
    detailsByDayId,
    setDetailsByDayId,
    savedDetailsById,
    setSavedDetailsById,
    tags,
    setTags,
    locations,
    setLocations,
    truckSizes,
    trucks,
    companies,
    filteredViews,
    keyInfoItems,
    setKeyInfoItems,
    shareArchive,
    setShareArchive,
    loading,
    detailsLoading,
    tagsLoading,
    locationsLoading,
    truckSizesLoading,
    trucksLoading,
    companiesLoading,
    filteredViewsLoading,
    keyInfoLoading,
    shareArchiveLoading,
    error,
    setError,
    warning,
    setWarning,
    loadScheduleDays,
    loadTags,
    loadLocations,
    loadTruckSizes,
    loadTrucks,
    loadFilteredViews,
    loadCompanies,
    applyScheduleDays,
    loadScheduleDetails,
    setDayDetails,
  } = useEventEditorData({
    eventId,
    profileLoading,
    userProfile,
    resetEventContacts: () => resetEventContactsRef.current(),
  });
  const [activeTab, setActiveTab] = useState("info");
  const [activeSettingsTab, setActiveSettingsTab] = useState("tags");
  const draggedLocationIdRef = useRef("");
  const canManageCompanyContacts = !isEventReadOnly && (isSuperAdmin || isAdmin);
  const canManageFilteredViews = !isEventReadOnly && (isSuperAdmin || isAdmin || isUser);
  const canUpdateShareOutput = !isEventReadOnly && (isSuperAdmin || isAdmin || isUser);
  const canUseDebugJson = Boolean(userProfile?.debugMode);
  const canManageContactCompanyOrder = canManageCompanyContacts;

  useEffect(() => {
    const closeCompanyDropdownsOnOutsideClick = (event) => {
      if (event.target.closest(".company-dropdown")) return;
      document
        .querySelectorAll(".company-dropdown[open]")
        .forEach((dropdown) => dropdown.removeAttribute("open"));
    };

    document.addEventListener("mousedown", closeCompanyDropdownsOnOutsideClick);
    return () =>
      document.removeEventListener("mousedown", closeCompanyDropdownsOnOutsideClick);
  }, []);

  const scheduleDetails = useMemo(() => {
    return Object.values(detailsByDayId).flat();
  }, [detailsByDayId]);

  const {
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
    startEditingEventScheduleRange,
    handleScheduleImportFileChange,
    triggerScheduleImport,
  } = useEventHeaderEditor({
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
  });

  const truckScheduleDetails = useMemo(() => {
    return scheduleDetails.filter((detail) => detail.truckId);
  }, [scheduleDetails]);

  const scheduleDayById = useMemo(() => {
    return new Map(scheduleDays.map((day) => [day.id, day]));
  }, [scheduleDays]);

  const usedTagIds = useMemo(() => {
    return new Set(
      scheduleDetails
        .map((detail) => detail.tagId)
        .filter(Boolean)
    );
  }, [scheduleDetails]);

  const usedTags = useMemo(() => {
    return tags.filter((tag) => usedTagIds.has(tag.id));
  }, [tags, usedTagIds]);

  const isReservedTruckTag = (tag) =>
    String(tag?.name || "").trim().toLowerCase() === "truck";

  const isReservedTruckTagId = (tagId) => isReservedTruckTag(getTagById(tagId));

  const getEditableDetailTagId = (tagId) =>
    isReservedTruckTagId(tagId) ? "" : tagId || "";

  const normalDetailTags = useMemo(
    () => tags.filter((tag) => !isReservedTruckTag(tag)),
    [tags]
  );

  const detailCountByTagId = useMemo(() => {
    return scheduleDetails.reduce((counts, detail) => {
      if (!detail.tagId) return counts;
      counts[detail.tagId] = (counts[detail.tagId] || 0) + 1;
      return counts;
    }, {});
  }, [scheduleDetails]);

  const locationOptions = useMemo(() => {
    const mainLocations = locations.filter((location) => !location.parentLocationId);
    return mainLocations.flatMap((location) => [
      { ...location, displayName: location.name || "" },
      ...locations
        .filter((subLocation) => subLocation.parentLocationId === location.id)
        .map((subLocation) => ({
          ...subLocation,
          displayName: `${location.name || "Location"} / ${subLocation.name || ""}`,
        })),
    ]);
  }, [locations]);

  const locationTree = useMemo(() => {
    return locations
      .filter((location) => !location.parentLocationId)
      .sort((locationA, locationB) =>
        String(locationA.name || "").localeCompare(String(locationB.name || ""))
      )
      .map((location) => ({
        ...location,
        children: locations
          .filter((subLocation) => subLocation.parentLocationId === location.id)
          .sort((locationA, locationB) =>
            String(locationA.name || "").localeCompare(String(locationB.name || ""))
          ),
      }));
  }, [locations]);

  const locationById = useMemo(() => {
    return new Map(locations.map((location) => [location.id, location]));
  }, [locations]);

  const truckSizeById = useMemo(() => {
    return new Map(truckSizes.map((truckSize) => [truckSize.id, truckSize]));
  }, [truckSizes]);

  const truckById = useMemo(() => {
    return new Map(trucks.map((truck) => [truck.id, truck]));
  }, [trucks]);

  const companyById = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const usedLocationIds = useMemo(() => {
    return new Set(
      scheduleDetails
        .map((detail) => detail.locationId)
        .filter(Boolean)
    );
  }, [scheduleDetails]);

  const usedLocationFilterIds = useMemo(() => {
    const filterIds = new Set();
    usedLocationIds.forEach((locationId) => {
      const location = locationById.get(locationId);
      if (!location) return;
      filterIds.add(location.parentLocationId || location.id);
    });
    return filterIds;
  }, [locationById, usedLocationIds]);

  const usedLocationFilters = useMemo(() => {
    return locations.filter(
      (location) => !location.parentLocationId && usedLocationFilterIds.has(location.id)
    );
  }, [locations, usedLocationFilterIds]);

  const detailCountByLocationFilterId = useMemo(() => {
    return scheduleDetails.reduce((counts, detail) => {
      if (!detail.locationId) return counts;
      const location = locationById.get(detail.locationId);
      if (!location) return counts;
      const filterLocationId = location.parentLocationId || location.id;
      counts[filterLocationId] = (counts[filterLocationId] || 0) + 1;
      return counts;
    }, {});
  }, [locationById, scheduleDetails]);

  const usedSubLocationFilters = useMemo(() => {
    return locationOptions.filter(
      (location) => location.parentLocationId && usedLocationIds.has(location.id)
    );
  }, [locationOptions, usedLocationIds]);

  const detailCountBySubLocationId = useMemo(() => {
    return scheduleDetails.reduce((counts, detail) => {
      if (!detail.locationId) return counts;
      counts[detail.locationId] = (counts[detail.locationId] || 0) + 1;
      return counts;
    }, {});
  }, [scheduleDetails]);

  const usedCompanyIds = useMemo(() => {
    return new Set(
      scheduleDetails
        .flatMap((detail) => detail.companyIds || [])
        .filter(Boolean)
    );
  }, [scheduleDetails]);

  const usedCompanies = useMemo(() => {
    return companies.filter((company) => usedCompanyIds.has(company.id));
  }, [companies, usedCompanyIds]);

  const detailCountByCompanyId = useMemo(() => {
    return scheduleDetails.reduce((counts, detail) => {
      (detail.companyIds || []).forEach((companyId) => {
        if (!companyId) return;
        counts[companyId] = (counts[companyId] || 0) + 1;
      });
      return counts;
    }, {});
  }, [scheduleDetails]);

  const {
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
    updateScheduleDateRangeField,
    cancelEditingScheduleDateRange,
    saveScheduleDateRange,
  } = useScheduleDayEditor({
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
  });

  const {
    shareLastUpdatedText,
    shareProtectedHomeUrl,
    shareHtmlUrl,
    protectedSnapshotHtmlUrlByName,
    filteredViewCompanyOptions,
    filteredViewTagOptions,
    isShareArchiveOpen,
    setIsShareArchiveOpen,
    filteredViewFormMode,
    editingFilteredViewId,
    filteredViewForm,
    savingFilteredView,
    deletingFilteredViewId,
    updatingShareOutput,
    resetFilteredViewForm,
    updateFilteredViewFormField,
    toggleFilteredViewMultiSelectField,
    clearFilteredViewFilters,
    updateShareOutput,
    updateShowMomContacts,
    updateShowMomKeyInfo,
    startAddingFilteredView,
    startEditingFilteredView,
    saveFilteredView,
    removeFilteredView,
  } = useEventShareEditor({
    eventId,
    userProfile,
    form,
    setForm,
    setSavedEventForm,
    setShareArchive,
    filteredViews,
    loadFilteredViews,
    tags,
    companies,
    usedCompanyIds,
    locationById,
    isWriteDisabled,
    canUpdateShareOutput,
    canManageFilteredViews,
    canUseDebugJson,
    setError,
  });

  const showTagColumn = tags.length > 0;
  const showLocationColumn = locationOptions.length > 0;
  const showCompanyColumn = companies.length > 0;
  const showTruckDestinationColumn = showLocationColumn || showCompanyColumn;
  const detailRowGridColumnParts = [
    "76px",
    "minmax(0, 1fr)",
    showTagColumn ? "128px" : "",
    showLocationColumn ? "150px" : "",
    showCompanyColumn ? "150px" : "",
    "auto",
  ].filter(Boolean);
  const detailRowGridColumns = detailRowGridColumnParts.join(" ");
  const detailActionGridColumn = detailRowGridColumnParts.length;
  const getDetailRowStyle = (rowStyle) => ({
    ...rowStyle,
    "--detail-row-columns": detailRowGridColumns,
    "--detail-actions-column": detailActionGridColumn,
  });
  const truckDetailRowGridColumnParts = [
    "150px",
    "76px",
    "92px",
    showTruckDestinationColumn ? "180px" : "",
    "auto",
  ].filter(Boolean);
  const truckDetailRowGridColumns = truckDetailRowGridColumnParts.join(" ");
  const truckDetailActionGridColumn = truckDetailRowGridColumnParts.length;
  const getTruckDetailRowStyle = (rowStyle) => ({
    ...rowStyle,
    "--detail-row-columns": truckDetailRowGridColumns,
    "--detail-actions-column": truckDetailActionGridColumn,
  });
  const detailTruckRowGridColumnParts = [
    "76px",
    "minmax(0, 1fr)",
    showTruckDestinationColumn ? "180px" : "",
    "auto",
  ].filter(Boolean);
  const detailTruckRowGridColumns = detailTruckRowGridColumnParts.join(" ");
  const detailTruckActionGridColumn = detailTruckRowGridColumnParts.length;
  const getDetailTruckDetailRowStyle = (rowStyle) => ({
    ...rowStyle,
    "--detail-row-columns": detailTruckRowGridColumns,
    "--detail-actions-column": detailTruckActionGridColumn,
  });

  const contactCompanies = useMemo(() => {
    const companyOrder = Array.isArray(form.contactCompanyOrder)
      ? form.contactCompanyOrder
      : [];
    const orderByCompanyId = new Map(
      companyOrder.map((companyId, companyIndex) => [companyId, companyIndex])
    );

    return usedCompanies
      .map((company) => ({
        ...company,
        scheduleDetailCount: detailCountByCompanyId[company.id] || 0,
      }))
      .sort((companyA, companyB) => {
        const companyAOrder = orderByCompanyId.has(companyA.id)
          ? orderByCompanyId.get(companyA.id)
          : Number.MAX_SAFE_INTEGER;
        const companyBOrder = orderByCompanyId.has(companyB.id)
          ? orderByCompanyId.get(companyB.id)
          : Number.MAX_SAFE_INTEGER;

        if (companyAOrder !== companyBOrder) return companyAOrder - companyBOrder;
        return String(companyA.companyName || "").localeCompare(
          String(companyB.companyName || "")
        );
      });
  }, [detailCountByCompanyId, form.contactCompanyOrder, usedCompanies]);

  const contactCompanyIds = useMemo(
    () => contactCompanies.map((company) => company.id),
    [contactCompanies]
  );

  const {
    activeInfoTab,
    setActiveInfoTab,
    eventContactsByCompanyId,
    companyContactForm,
    editingCompanyContactId,
    editingCompanyContactCompanyId,
    openContactCompanyIds,
    eventContactsLoading,
    savingCompanyContact,
    savingEventContact,
    reorderingCompanyContactId,
    savingContactCompanyOrder,
    keyInfoForm,
    keyInfoFormMode,
    editingKeyInfoId,
    savingKeyInfo,
    deletingKeyInfoId,
    reorderingKeyInfoId,
    contactCompanyDropTargetId,
    setContactCompanyDropTargetId,
    companyContactDropTargetId,
    setCompanyContactDropTargetId,
    draggedContactCompanyIdRef,
    draggedCompanyContactIdRef,
    draggedKeyInfoIdRef,
    resetEventContacts,
    toggleContactCompanyOpen,
    startAddingCompanyContact,
    startEditingCompanyContact,
    updateCompanyContactFormField,
    saveCompanyContact,
    toggleEventContactHidden,
    resetCompanyContactForm,
    startAddingKeyInfo,
    startEditingKeyInfo,
    updateKeyInfoFormField,
    saveKeyInfo,
    removeKeyInfo,
    reorderKeyInfo,
    resetKeyInfoForm,
    reorderCompanyContact,
    reorderContactCompany,
  } = useEventInfoEditor({
    eventId,
    userProfile,
    isWriteDisabled,
    contactCompanies,
    contactCompanyIds,
    canManageCompanyContacts,
    canManageContactCompanyOrder,
    savedEventForm,
    setForm,
    setSavedEventForm,
    keyInfoItems,
    setKeyInfoItems,
    setError,
    setWarning,
  });
  resetEventContactsRef.current = resetEventContacts;

  const getTagById = (tagId) => tags.find((tag) => tag.id === tagId) || null;
  const getLocationById = (locationId) =>
    locationOptions.find((location) => location.id === locationId) || null;
  const getCompanyLabel = (companyIds = []) => {
    const selectedCompanies = companies.filter((company) => companyIds.includes(company.id));
    if (selectedCompanies.length === 0) return "No company";
    if (selectedCompanies.length === 1) return selectedCompanies[0].companyName;
    return `${selectedCompanies.length} companies`;
  };
  const getTruckDestinationValue = ({ locationId = "", companyIds = [] } = {}) => {
    if (locationId) return `location:${locationId}`;
    if (companyIds[0]) return `company:${companyIds[0]}`;
    return "";
  };
  const parseTruckDestinationValue = (value) => {
    const [type, id] = String(value || "").split(":");
    if (type === "location" && id) return { locationId: id, companyIds: [] };
    if (type === "company" && id) return { locationId: "", companyIds: [id] };
    return { locationId: "", companyIds: [] };
  };
  const toggleCompanyIds = (companyIds = [], companyId) =>
    companyIds.includes(companyId)
      ? companyIds.filter((currentCompanyId) => currentCompanyId !== companyId)
      : [...companyIds, companyId];
  const {
    draftDetailsByDayId,
    setEditingDetailCell,
    editingDetailModal,
    editingDetailTimeModal,
    addingDetailDayId,
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
  } = useScheduleDetailsEditor({
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
  });

  const {
    tagForm,
    locationForm,
    truckSizeForm,
    truckForm,
    tagFormMode,
    locationFormMode,
    truckSizeFormMode,
    truckFormMode,
    editingTagId,
    editingTruckSizeId,
    editingTruckId,
    editingLocationId,
    savingTruckSize,
    deletingTruckSizeId,
    savingTruck,
    deletingTruckId,
    savingTag,
    deletingTagId,
    savingLocation,
    deletingLocationId,
    movingLocationId,
    locationDropTargetId,
    setLocationDropTargetId,
    updateTagFormField,
    resetTagForm,
    startAddingTag,
    startEditingTag,
    saveTag,
    removeTag,
    updateTruckSizeFormField,
    resetTruckSizeForm,
    startAddingTruckSize,
    startEditingTruckSize,
    saveTruckSize,
    removeTruckSize,
    updateTruckFormField,
    resetTruckForm,
    startAddingTruck,
    startEditingTruck,
    saveTruck,
    removeTruck,
    updateLocationFormField,
    resetLocationForm,
    startAddingLocation,
    startEditingLocation,
    startAddingSubLocation,
    saveLocation,
    moveLocation,
    removeLocation,
  } = useEventSettingsEditor({
    eventId,
    tags,
    locations,
    setLocations,
    truckSizes,
    companies,
    isWriteDisabled,
    setError,
    loadTags,
    loadLocations,
    loadTruckSizes,
    loadTrucks,
    truckScheduleDetails,
    isReservedTruckTag,
  });

  const {
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
    saveDraftDetail,
    saveMobileAddDetailForm,
    ensureTruckTag,
    addCreatedDetailToDay,
    moveDetailLocally,
  } = useScheduleDetailPersistence({
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
    reorderingDayId,
    setReorderingDayId,
    removeDraftDetail,
    loadScheduleDetails,
    parseTruckDestinationValue,
  });

  const {
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
  } = useTruckingEditor({
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
  });

  if (loading) return <Loading />;

  const editingDetailDay = editingDetailModal
    ? scheduleDays.find((day) => day.id === editingDetailModal.dayId)
    : null;
  const editingDetail = editingDetailModal
    ? detailsByDayId[editingDetailModal.dayId]?.find(
        (detail) => detail.id === editingDetailModal.detailId
      )
    : null;
  const addingDetailDay = addingDetailDayId
    ? scheduleDays.find((day) => day.id === addingDetailDayId)
    : null;
  const editingDetailTimeDay = editingDetailTimeModal
    ? scheduleDays.find((day) => day.id === editingDetailTimeModal.dayId)
    : null;
  const editingDetailTime = editingDetailTimeModal
    ? detailsByDayId[editingDetailTimeModal.dayId]?.find(
        (detail) => detail.id === editingDetailTimeModal.detailId
      )
    : null;

  return (
    <main className="page">
      <input
        ref={scheduleImportInputRef}
        className="sr-only"
        type="file"
        accept=".csv,.xlsx"
        tabIndex={-1}
        onChange={handleScheduleImportFileChange}
      />

      <EventEditorHeader
        eventId={eventId}
        form={form}
        imageUrl={eventHeaderImageUrl}
        dateRangeLabel={eventDateRangeLabel}
        isEditing={isEditingEventDetails}
        isOffline={isOffline}
        canEditEvent={!isEventReadOnly}
        savingEvent={savingEvent}
        importingSchedule={importingSchedule}
        canImportSchedule={canImportSchedule}
        hasScheduleDays={hasScheduleDays}
        isEditingScheduleRange={isEditingEventScheduleRange}
        currentScheduleRangeLabel={currentScheduleRangeLabel}
        onStartEditing={startEditingEventDetails}
        onSubmit={handleEventSave}
        onCancel={cancelEditingEventDetails}
        onUpdateField={updateField}
        onImageChange={handleEventImageChange}
        onRemoveImage={removeEventImage}
        onStartEditingScheduleRange={startEditingEventScheduleRange}
        onImportSchedule={triggerScheduleImport}
        showSummary={false}
      />

      <EventEditorStatusMessages
        error={error}
        warning={warning}
        isOffline={isWriteDisabled}
      />

      <EventEditorTabs
        tabs={eventEditTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "info" ? (
      <InfoPanel
        activeInfoTab={activeInfoTab}
        setActiveInfoTab={setActiveInfoTab}
        detailsLoading={detailsLoading}
        companiesLoading={companiesLoading}
        keyInfoItems={keyInfoItems}
        keyInfoLoading={keyInfoLoading}
        keyInfoForm={keyInfoForm}
        keyInfoFormMode={keyInfoFormMode}
        editingKeyInfoId={editingKeyInfoId}
        savingKeyInfo={savingKeyInfo}
        deletingKeyInfoId={deletingKeyInfoId}
        reorderingKeyInfoId={reorderingKeyInfoId}
        draggedKeyInfoIdRef={draggedKeyInfoIdRef}
        contactCompanies={contactCompanies}
        companyContactsByCompanyId={eventContactsByCompanyId}
        editingCompanyContactCompanyId={editingCompanyContactCompanyId}
        openContactCompanyIds={openContactCompanyIds}
        canManageContactCompanyOrder={canManageContactCompanyOrder}
        canManageCompanyContacts={canManageCompanyContacts}
        isOffline={isWriteDisabled}
        savingContactCompanyOrder={savingContactCompanyOrder}
        contactCompanyDropTargetId={contactCompanyDropTargetId}
        draggedContactCompanyIdRef={draggedContactCompanyIdRef}
        companyContactsLoading={eventContactsLoading}
        companyContactDropTargetId={companyContactDropTargetId}
        reorderingCompanyContactId={reorderingCompanyContactId}
        draggedCompanyContactIdRef={draggedCompanyContactIdRef}
        savingCompanyContact={savingCompanyContact}
        companyContactForm={companyContactForm}
        editingCompanyContactId={editingCompanyContactId}
        reorderContactCompany={reorderContactCompany}
        reorderCompanyContact={reorderCompanyContact}
        setContactCompanyDropTargetId={setContactCompanyDropTargetId}
        setCompanyContactDropTargetId={setCompanyContactDropTargetId}
        toggleContactCompanyOpen={toggleContactCompanyOpen}
        startAddingCompanyContact={startAddingCompanyContact}
        startEditingCompanyContact={startEditingCompanyContact}
        updateCompanyContactFormField={updateCompanyContactFormField}
        saveCompanyContact={saveCompanyContact}
        toggleEventContactHidden={toggleEventContactHidden}
        savingEventContact={savingEventContact}
        resetCompanyContactForm={resetCompanyContactForm}
        startAddingKeyInfo={startAddingKeyInfo}
        startEditingKeyInfo={startEditingKeyInfo}
        updateKeyInfoFormField={updateKeyInfoFormField}
        saveKeyInfo={saveKeyInfo}
        removeKeyInfo={removeKeyInfo}
        reorderKeyInfo={reorderKeyInfo}
        resetKeyInfoForm={resetKeyInfoForm}
      />
      ) : null}

      {activeTab === "detail" ? (
      <section className="panel">
        <DetailFilters
          usedTags={usedTags}
          usedLocationFilters={usedLocationFilters}
          usedSubLocationFilters={usedSubLocationFilters}
          usedCompanies={usedCompanies}
          detailCountByTagId={detailCountByTagId}
          detailCountByLocationFilterId={detailCountByLocationFilterId}
          detailCountBySubLocationId={detailCountBySubLocationId}
          detailCountByCompanyId={detailCountByCompanyId}
          hasActiveScheduleFilters={hasActiveScheduleFilters}
          selectedTagFilterIds={selectedTagFilterIds}
          selectedLocationFilterIds={selectedLocationFilterIds}
          selectedSubLocationFilterIds={selectedSubLocationFilterIds}
          selectedCompanyFilterIds={selectedCompanyFilterIds}
          normaliseHexColour={normaliseHexColour}
          clearScheduleFilters={clearScheduleFilters}
          setSelectedTagFilterIds={setSelectedTagFilterIds}
          toggleTagFilter={toggleTagFilter}
          setSelectedLocationFilterIds={setSelectedLocationFilterIds}
          setSelectedSubLocationFilterIds={setSelectedSubLocationFilterIds}
          setSelectedCompanyFilterIds={setSelectedCompanyFilterIds}
          toggleLocationFilter={toggleLocationFilter}
          toggleSubLocationFilter={toggleSubLocationFilter}
          toggleCompanyFilter={toggleCompanyFilter}
        />
        <DetailPanel
          scheduleDays={scheduleDays}
          detailsByDayId={detailsByDayId}
          selectedTagFilterIds={selectedTagFilterIds}
          locationById={locationById}
          selectedLocationFilterIds={selectedLocationFilterIds}
          selectedSubLocationFilterIds={selectedSubLocationFilterIds}
          selectedCompanyFilterIds={selectedCompanyFilterIds}
          draftDetailsByDayId={draftDetailsByDayId}
          formatDetailDate={formatDetailDate}
          isOffline={isWriteDisabled}
          addDraftDetail={addDraftDetail}
          startEditingDay={startEditingDay}
          isEditingDetailCell={isEditingDetailCell}
          getAdjacentDay={getAdjacentDay}
          getDetailRowStyle={getDetailRowStyle}
          getTruckDetailRowStyle={getDetailTruckDetailRowStyle}
          getRowTagStyle={getRowTagStyle}
          getTagById={getTagById}
          truckById={truckById}
          companyById={companyById}
          detailCellInputRef={detailCellInputRef}
          suppressDetailBlurRef={suppressDetailBlurRef}
          saveDetailCell={saveDetailCell}
          updateDetailField={updateDetailField}
          handleDetailCellKeyDown={handleDetailCellKeyDown}
          startEditingDetailCell={startEditingDetailCell}
          showTagColumn={showTagColumn}
          getTagStyle={getTagStyle}
          normaliseHexColour={normaliseHexColour}
          savingDetailId={savingDetailId}
          assignDetailTag={assignDetailTag}
          tags={normalDetailTags}
          showLocationColumn={showLocationColumn}
          getLocationById={getLocationById}
          assignDetailLocation={assignDetailLocation}
          locationOptions={locationOptions}
          showCompanyColumn={showCompanyColumn}
          getCompanyLabel={getCompanyLabel}
          companies={companies}
          assignDetailCompanies={assignDetailCompanies}
          toggleCompanyIds={toggleCompanyIds}
          showTruckDestinationColumn={showTruckDestinationColumn}
          getTruckDestinationValue={getTruckDestinationValue}
          assignTruckDetailDestination={assignTruckDetailDestination}
          openNotesDetailId={openNotesDetailId}
          closeNotesEditor={closeNotesEditor}
          openNotesEditor={openNotesEditor}
          notesDraft={notesDraft}
          setNotesDraft={setNotesDraft}
          saveDetailNotes={saveDetailNotes}
          openActionMenuId={openActionMenuId}
          setOpenActionMenuId={setOpenActionMenuId}
          beginRowAction={beginRowAction}
          endRowAction={endRowAction}
          moveDetailToDay={moveDetailToDay}
          duplicateDetail={duplicateDetail}
          startEditingDetail={startEditingDetail}
          startEditingDetailTime={startEditingDetailTime}
          closeActionMenu={closeActionMenu}
          deleteDetail={deleteDetail}
          updateDraftDetail={updateDraftDetail}
          removeDraftDetail={removeDraftDetail}
          savingDraftDayId={savingDraftDayId}
          saveDraftDetail={saveDraftDetail}
        />
      </section>
      ) : null}

      <ScheduleDetailModals
        isEditingScheduleDateRange={isEditingScheduleDateRange}
        cancelEditingScheduleDateRange={cancelEditingScheduleDateRange}
        saveScheduleDateRange={saveScheduleDateRange}
        scheduleDateRangeDraft={scheduleDateRangeDraft}
        isWriteDisabled={isWriteDisabled}
        savingScheduleDateRange={savingScheduleDateRange}
        updateScheduleDateRangeField={updateScheduleDateRangeField}
        addingDetailDayId={addingDetailDayId}
        addingDetailDay={addingDetailDay}
        formatDetailDate={formatDetailDate}
        cancelEditingDetail={cancelEditingDetail}
        saveMobileAddDetailForm={saveMobileAddDetailForm}
        detailEditForm={detailEditForm}
        savingDraftDayId={savingDraftDayId}
        updateDetailEditFormField={updateDetailEditFormField}
        showTagColumn={showTagColumn}
        normalDetailTags={normalDetailTags}
        showLocationColumn={showLocationColumn}
        locationOptions={locationOptions}
        showCompanyColumn={showCompanyColumn}
        companies={companies}
        toggleDetailEditCompany={toggleDetailEditCompany}
        editingDetail={editingDetail}
        editingDetailDay={editingDetailDay}
        saveDetailEditForm={saveDetailEditForm}
        savingDetailId={savingDetailId}
        editingDetailTime={editingDetailTime}
        editingDetailTimeDay={editingDetailTimeDay}
        saveDetailTimeForm={saveDetailTimeForm}
        updateDetailEditTimePart={updateDetailEditTimePart}
        handleDetailTimeWheelKeyDown={handleDetailTimeWheelKeyDown}
        editingDayMode={editingDayMode}
        editingDayId={editingDayId}
        scheduleDays={scheduleDays}
        editingDayDraft={editingDayDraft}
        isOffline={isOffline}
        updateEditingDayField={updateEditingDayField}
        savingDayId={savingDayId}
        saveDay={saveDay}
        cancelEditingDay={cancelEditingDay}
      />

      <TruckDetailModals
        addingTruckDetailTruck={addingTruckDetailTruck}
        cancelEditingDetail={cancelEditingDetail}
        saveMobileAddTruckDetailForm={saveMobileAddTruckDetailForm}
        detailEditForm={detailEditForm}
        isWriteDisabled={isWriteDisabled}
        savingDraftDayId={savingDraftDayId}
        updateDetailEditFormField={updateDetailEditFormField}
        scheduleDays={scheduleDays}
        formatDetailDate={formatDetailDate}
        showTruckDestinationColumn={showTruckDestinationColumn}
        companies={companies}
        locationOptions={locationOptions}
      />

      {activeTab === "trucks" ? (
      <TruckingPanel
        truckFormMode={truckFormMode}
        isOffline={isWriteDisabled}
        startAddingTruck={startAddingTruck}
        saveTruck={saveTruck}
        truckForm={truckForm}
        truckSizes={truckSizes}
        updateTruckFormField={updateTruckFormField}
        companies={companies}
        savingTruck={savingTruck}
        editingTruckId={editingTruckId}
        resetTruckForm={resetTruckForm}
        trucksLoading={trucksLoading}
        trucks={trucks}
        getTruckDetails={getTruckDetails}
        draftTruckDetailsByTruckId={draftTruckDetailsByTruckId}
        truckSizeById={truckSizeById}
        companyById={companyById}
        scheduleDays={scheduleDays}
        addDraftTruckDetail={addDraftTruckDetail}
        startEditingTruck={startEditingTruck}
        deletingTruckId={deletingTruckId}
        removeTruck={removeTruck}
        getTruckDetailRowStyle={getTruckDetailRowStyle}
        getRowTagStyle={getRowTagStyle}
        getTagById={getTagById}
        draggedDetailIdRef={draggedDetailIdRef}
        persistTruckDetailOrder={persistTruckDetailOrder}
        isEditingDetailCell={isEditingDetailCell}
        savingDetailId={savingDetailId}
        assignTruckDetailDate={assignTruckDetailDate}
        formatDetailDate={formatDetailDate}
        detailCellInputRef={detailCellInputRef}
        suppressDetailBlurRef={suppressDetailBlurRef}
        saveDetailCell={saveDetailCell}
        updateDetailField={updateDetailField}
        handleDetailCellKeyDown={handleDetailCellKeyDown}
        startEditingDetailCell={startEditingDetailCell}
        startEditingDetailTime={startEditingDetailTime}
        startEditingDetail={startEditingDetail}
        toggleTruckDetailAction={toggleTruckDetailAction}
        showTruckDestinationColumn={showTruckDestinationColumn}
        getTruckDestinationValue={getTruckDestinationValue}
        assignTruckDetailDestination={assignTruckDetailDestination}
        locationOptions={locationOptions}
        openNotesDetailId={openNotesDetailId}
        closeNotesEditor={closeNotesEditor}
        openNotesEditor={openNotesEditor}
        notesDraft={notesDraft}
        setNotesDraft={setNotesDraft}
        saveDetailNotes={saveDetailNotes}
        openActionMenuId={openActionMenuId}
        setOpenActionMenuId={setOpenActionMenuId}
        beginRowAction={beginRowAction}
        endRowAction={endRowAction}
        reorderingDayId={reorderingDayId}
        moveTruckDetail={moveTruckDetail}
        duplicateTruckDetail={duplicateTruckDetail}
        closeActionMenu={closeActionMenu}
        deleteDetail={deleteDetail}
        updateDraftTruckDetail={updateDraftTruckDetail}
        getNextTruckDetailAction={getNextTruckDetailAction}
        updateDraftTruckDestination={updateDraftTruckDestination}
        removeDraftTruckDetail={removeDraftTruckDetail}
        savingDraftDayId={savingDraftDayId}
        saveDraftTruckDetail={saveDraftTruckDetail}
      />
      ) : null}

      {activeTab === "share" ? (
        <SharePanel
          shareLastUpdatedText={shareLastUpdatedText}
          canUpdateShareOutput={canUpdateShareOutput}
          isWriteDisabled={isWriteDisabled}
          updatingShareOutput={updatingShareOutput}
          filteredViewsLoading={filteredViewsLoading}
          detailsLoading={detailsLoading}
          tagsLoading={tagsLoading}
          locationsLoading={locationsLoading}
          trucksLoading={trucksLoading}
          companiesLoading={companiesLoading}
          updateShareOutput={updateShareOutput}
          shareProtectedHomeUrl={shareProtectedHomeUrl}
          shareHtmlUrl={shareHtmlUrl}
          showMomContacts={form.showMomContacts}
          showMomKeyInfo={form.showMomKeyInfo}
          updateShowMomContacts={updateShowMomContacts}
          updateShowMomKeyInfo={updateShowMomKeyInfo}
          filteredViewFormMode={filteredViewFormMode}
          editingFilteredViewId={editingFilteredViewId}
          resetFilteredViewForm={resetFilteredViewForm}
          saveFilteredView={saveFilteredView}
          filteredViewForm={filteredViewForm}
          isOffline={isOffline}
          updateFilteredViewFormField={updateFilteredViewFormField}
          clearFilteredViewFilters={clearFilteredViewFilters}
          filteredViewTagOptions={filteredViewTagOptions}
          filteredViewCompanyOptions={filteredViewCompanyOptions}
          locationTree={locationTree}
          toggleFilteredViewMultiSelectField={toggleFilteredViewMultiSelectField}
          savingFilteredView={savingFilteredView}
          canManageFilteredViews={canManageFilteredViews}
          startAddingFilteredView={startAddingFilteredView}
          filteredViews={filteredViews}
          protectedSnapshotHtmlUrlByName={protectedSnapshotHtmlUrlByName}
          startEditingFilteredView={startEditingFilteredView}
          deletingFilteredViewId={deletingFilteredViewId}
          removeFilteredView={removeFilteredView}
          shareArchiveLoading={shareArchiveLoading}
          shareArchive={shareArchive}
          isShareArchiveOpen={isShareArchiveOpen}
          setIsShareArchiveOpen={setIsShareArchiveOpen}
        />
      ) : null}

      {activeTab === "settings" ? (
      <SettingsPanel
        activeSettingsTab={activeSettingsTab}
        setActiveSettingsTab={setActiveSettingsTab}
        isOffline={isWriteDisabled}
        tagFormMode={tagFormMode}
        tagForm={tagForm}
        tags={tags}
        tagsLoading={tagsLoading}
        editingTagId={editingTagId}
        savingTag={savingTag}
        deletingTagId={deletingTagId}
        defaultTagColour={emptyTagForm.colour}
        locations={locations}
        locationTree={locationTree}
        locationFormMode={locationFormMode}
        locationForm={locationForm}
        locationsLoading={locationsLoading}
        editingLocationId={editingLocationId}
        savingLocation={savingLocation}
        deletingLocationId={deletingLocationId}
        movingLocationId={movingLocationId}
        locationDropTargetId={locationDropTargetId}
        truckSizes={truckSizes}
        truckSizesLoading={truckSizesLoading}
        truckSizeFormMode={truckSizeFormMode}
        truckSizeForm={truckSizeForm}
        editingTruckSizeId={editingTruckSizeId}
        savingTruckSize={savingTruckSize}
        deletingTruckSizeId={deletingTruckSizeId}
        draggedLocationIdRef={draggedLocationIdRef}
        normaliseHexColour={normaliseHexColour}
        getTagStyle={getTagStyle}
        startAddingTag={startAddingTag}
        startEditingTag={startEditingTag}
        updateTagFormField={updateTagFormField}
        saveTag={saveTag}
        resetTagForm={resetTagForm}
        removeTag={removeTag}
        startAddingLocation={startAddingLocation}
        startAddingSubLocation={startAddingSubLocation}
        startEditingLocation={startEditingLocation}
        updateLocationFormField={updateLocationFormField}
        saveLocation={saveLocation}
        resetLocationForm={resetLocationForm}
        removeLocation={removeLocation}
        moveLocation={moveLocation}
        setLocationDropTargetId={setLocationDropTargetId}
        startAddingTruckSize={startAddingTruckSize}
        startEditingTruckSize={startEditingTruckSize}
        updateTruckSizeFormField={updateTruckSizeFormField}
        saveTruckSize={saveTruckSize}
        resetTruckSizeForm={resetTruckSizeForm}
        removeTruckSize={removeTruckSize}
      />
      ) : null}

    </main>
  );
}
