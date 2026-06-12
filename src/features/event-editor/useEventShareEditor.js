import { useMemo, useState } from "react";
import { getEvent, updateEvent } from "../../services/eventService.js";
import {
  createFilteredView,
  deleteFilteredView,
  updateFilteredView,
} from "../../services/filteredViewService.js";
import { generateHomeForEvent } from "../../services/functionService.js";
import { getShareArchive } from "../../services/shareArchiveService.js";
import {
  emptyFilteredViewForm,
  FALLBACK_FILTERED_VIEW_SORT_ORDER,
} from "./eventEditorConstants.js";
import {
  formatRelativeDate,
  getArrayValue,
  getNextFilteredViewSortOrder,
  getShareSnapshotNameKey,
  normaliseApiResponse,
  normaliseSortOrderValue,
  normaliseString,
  readBooleanValue,
} from "./eventEditorUtils.js";

export default function useEventShareEditor({
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
}) {
  const [isShareArchiveOpen, setIsShareArchiveOpen] = useState(false);
  const [filteredViewFormMode, setFilteredViewFormMode] = useState("");
  const [editingFilteredViewId, setEditingFilteredViewId] = useState("");
  const [filteredViewForm, setFilteredViewForm] = useState(emptyFilteredViewForm);
  const [savingFilteredView, setSavingFilteredView] = useState(false);
  const [deletingFilteredViewId, setDeletingFilteredViewId] = useState("");
  const [updatingShareOutput, setUpdatingShareOutput] = useState(false);

  const shareLastUpdatedText = useMemo(
    () => formatRelativeDate(form.apiResponse?.timestamp),
    [form.apiResponse]
  );

  const shareProtectedHomeUrl = form.apiResponse?.protectedHomeUrl || "";
  const shareHtmlUrl = form.apiResponse?.["html URL"] || form.apiResponse?.htmlUrl || "";

  const protectedSnapshotHtmlUrlByName = useMemo(() => {
    const snapshots = Array.isArray(form.apiResponse?.snapshots)
      ? form.apiResponse.snapshots
      : [];

    return new Map(
      snapshots
        .filter((snapshot) => snapshot?.protectedHtmlUrl)
        .map((snapshot) => [
          getShareSnapshotNameKey(snapshot.name),
          snapshot.protectedHtmlUrl,
        ])
    );
  }, [form.apiResponse]);

  const filteredViewCompanyOptions = useMemo(() => {
    const eventCompanyIds = new Set([
      ...(Array.isArray(form.contactCompanyOrder) ? form.contactCompanyOrder : []),
      ...usedCompanyIds,
    ]);

    if (eventCompanyIds.size === 0) {
      return [];
    }

    return companies
      .filter((company) => eventCompanyIds.has(company.id))
      .sort((companyA, companyB) =>
        String(companyA.companyName || "").localeCompare(
          String(companyB.companyName || "")
        )
      );
  }, [companies, form.contactCompanyOrder, usedCompanyIds]);

  const filteredViewTagOptions = useMemo(() => {
    return [...tags].sort((tagA, tagB) =>
      String(tagA.name || "").localeCompare(String(tagB.name || ""))
    );
  }, [tags]);

  const resetFilteredViewForm = () => {
    setFilteredViewFormMode("");
    setEditingFilteredViewId("");
    setFilteredViewForm(emptyFilteredViewForm);
  };

  const updateFilteredViewFormField = (field, value) => {
    setFilteredViewForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleFilteredViewMultiSelectField = (field, value) => {
    if (!value) return;

    if (field === "filterLocationIds") {
      setFilteredViewForm((current) => {
        const currentValues = current.filterLocationIds || [];
        const selectedValues = currentValues.includes(value)
          ? currentValues.filter((currentValue) => currentValue !== value)
          : [...currentValues, value];

        return {
          ...current,
          filterLocationIds: selectedValues,
        };
      });
      return;
    }

    setFilteredViewForm((current) => {
      const currentValues = current[field] || [];
      const selectedValues = currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value];

      return {
        ...current,
        [field]: selectedValues,
      };
    });
  };

  const clearFilteredViewFilters = () => {
    setFilteredViewForm((current) => ({
      ...current,
      filterTagIds: [],
      filterLocationIds: [],
      filterSubLocationIds: [],
      filterSupplierIds: [],
    }));
  };

  const buildFilteredViewApiPayload = (sourceView) => {
    const nextName = String(sourceView?.name || "").trim();
    return {
      eventId,
      name: nextName,
      filterBox: readBooleanValue(sourceView?.filterBox, true),
      showKeyInfo: readBooleanValue(sourceView?.showKeyInfo, true),
      showLocations: readBooleanValue(sourceView?.showLocations, false),
      showContacts: readBooleanValue(sourceView?.showContacts ?? sourceView?.includeContacts, false),
      groupPresetId: normaliseString(sourceView?.groupPresetId),
      filterTagIds: getArrayValue(sourceView?.filterTagIds),
      filterLocationIds: getArrayValue(sourceView?.filterLocationIds),
      filterSubLocationIds: getArrayValue(sourceView?.filterSubLocationIds),
      filterSupplierIds: getArrayValue(sourceView?.filterSupplierIds),
      filterGroup: normaliseString(sourceView?.filterGroup),
      group: normaliseString(sourceView?.group || nextName),
      sortOrder: normaliseSortOrderValue(sourceView?.sortOrder, FALLBACK_FILTERED_VIEW_SORT_ORDER),
    };
  };

  const updateShareOutput = async () => {
    if (isWriteDisabled) {
      setError("Updating is disabled while offline.");
      return;
    }
    if (!canUpdateShareOutput) {
      setError("Your role cannot update the share output.");
      return;
    }

    setUpdatingShareOutput(true);
    setError("");

    try {
      await generateHomeForEvent(eventId, { debugPayload: canUseDebugJson });
      const refreshedEvent = await getEvent(eventId, userProfile);
      if (refreshedEvent) {
        setForm((currentForm) => ({
          ...currentForm,
          updatedAt: refreshedEvent.updatedAt || currentForm.updatedAt,
          apiResponse: normaliseApiResponse(refreshedEvent["API Response"]),
        }));
      }
      setShareArchive(await getShareArchive(eventId));
    } catch (updateError) {
      console.error(updateError);
      const debugPayloadPath = updateError?.customData?.debugPayloadPath;
      const debugStatus = updateError?.customData?.debug?.reason;
      if (debugPayloadPath || debugStatus) {
        setError(
          `${updateError?.customData?.message || updateError?.message || "Could not update share output."}`
          + `${debugPayloadPath ? ` | payload: ${debugPayloadPath}` : ""}`
          + `${debugStatus ? ` | debug: ${debugStatus}` : ""}`
        );
        return;
      }
      const messageText =
        updateError?.customData?.message ||
        updateError?.message ||
        "Could not update share output.";
      setError(messageText);
    } finally {
      setUpdatingShareOutput(false);
    }
  };

  const updateShowMomContacts = async (checked) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canUpdateShareOutput) {
      setError("Your role cannot update the share output.");
      return;
    }

    const nextEventForm = {
      ...form,
      showMomContacts: checked,
    };
    setForm(nextEventForm);
    setError("");

    try {
      await updateEvent(eventId, nextEventForm, userProfile);
      setSavedEventForm((current) => ({
        ...current,
        showMomContacts: checked,
      }));
    } catch (updateError) {
      console.error(updateError);
      setForm(form);
      setError("Could not save home page contact setting.");
    }
  };

  const updateShowMomKeyInfo = async (checked) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canUpdateShareOutput) {
      setError("Your role cannot update the share output.");
      return;
    }

    const nextEventForm = {
      ...form,
      showMomKeyInfo: checked,
    };
    setForm(nextEventForm);
    setError("");

    try {
      await updateEvent(eventId, nextEventForm, userProfile);
      setSavedEventForm((current) => ({
        ...current,
        showMomKeyInfo: checked,
      }));
    } catch (updateError) {
      console.error(updateError);
      setForm(form);
      setError("Could not save home page key info setting.");
    }
  };

  const startAddingFilteredView = () => {
    if (!canManageFilteredViews) return;
    setFilteredViewFormMode("add");
    setEditingFilteredViewId("");
    setFilteredViewForm({
      ...emptyFilteredViewForm,
      sortOrder: getNextFilteredViewSortOrder(filteredViews),
    });
    setError("");
  };

  const startEditingFilteredView = (view) => {
    if (!canManageFilteredViews) return;
    setFilteredViewFormMode("edit");
    setEditingFilteredViewId(view.id);

    const nextTagIds = getArrayValue(view.filterTagIds);
    const nextLocationIds = getArrayValue(view.filterLocationIds);
    const nextSubLocationIds = getArrayValue(view.filterSubLocationIds);
    const nextSupplierIds = getArrayValue(view.filterSupplierIds);
    const inferredLocationIds = nextSubLocationIds
      .map((subLocationId) => locationById.get(subLocationId)?.parentLocationId)
      .filter(Boolean);

    const mergedLocationIds = [...new Set([...nextLocationIds, ...inferredLocationIds])];

    setFilteredViewForm({
      name: view.name || "",
      filterBox: readBooleanValue(view.filterBox, true),
      showKeyInfo: readBooleanValue(view.showKeyInfo, true),
      showLocations: readBooleanValue(view.showLocations, false),
      showContacts: readBooleanValue(view.showContacts ?? view.includeContacts, false),
      groupPresetId: view.groupPresetId || "",
      filterTagIds: nextTagIds,
      filterLocationIds: mergedLocationIds,
      filterSubLocationIds: nextSubLocationIds.filter((subLocationId) => {
        const subLocation = locationById.get(subLocationId);
        return (
          subLocation?.parentLocationId
          && (mergedLocationIds.length > 0 ? mergedLocationIds.includes(subLocation.parentLocationId) : false)
        );
      }),
      filterSupplierIds: nextSupplierIds,
      filterGroup: view.filterGroup || "",
      group: view.group || "",
      sortOrder: normaliseSortOrderValue(view.sortOrder, FALLBACK_FILTERED_VIEW_SORT_ORDER),
    });
    setError("");
  };

  const saveFilteredView = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canManageFilteredViews) {
      setError("Your role cannot manage filtered views.");
      return;
    }

    const name = filteredViewForm.name.trim();
    if (!name) {
      setError("Filtered view name is required.");
      return;
    }

    setSavingFilteredView(true);
    setError("");

    try {
      const nextFilteredView = buildFilteredViewApiPayload({
        ...filteredViewForm,
        name,
      });

      if (editingFilteredViewId) {
        await updateFilteredView(editingFilteredViewId, nextFilteredView);
      } else {
        await createFilteredView(nextFilteredView);
      }

      resetFilteredViewForm();
      await loadFilteredViews();
    } catch (filteredViewError) {
      console.error(filteredViewError);
      setError("Could not save filtered view.");
    } finally {
      setSavingFilteredView(false);
    }
  };

  const removeFilteredView = async (filteredViewId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canManageFilteredViews) {
      setError("Your role cannot manage filtered views.");
      return;
    }

    const targetView = filteredViews.find((view) => view.id === filteredViewId);
    const confirmed = window.confirm(
      `Delete ${targetView?.name ? `"${targetView.name}"` : "this filtered view"}?`
    );
    if (!confirmed) return;

    setDeletingFilteredViewId(filteredViewId);
    setError("");

    try {
      await deleteFilteredView(filteredViewId);
      if (editingFilteredViewId === filteredViewId) resetFilteredViewForm();
      await loadFilteredViews();
    } catch (filteredViewError) {
      console.error(filteredViewError);
      setError("Could not delete filtered view.");
    } finally {
      setDeletingFilteredViewId("");
    }
  };

  return {
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
  };
}
