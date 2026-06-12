import { useEffect, useState } from "react";
import { emptyEventForm } from "./eventEditorConstants.js";
import {
  normaliseApiResponse,
  normaliseHexColour,
  readBooleanValue,
  sortDetailsForDisplay,
} from "./eventEditorUtils.js";
import {
  getCachedEventForUser,
  getEvent,
} from "../../services/eventService.js";
import { getScheduleDays } from "../../services/scheduleDayService.js";
import { getScheduleDetailsForEvent } from "../../services/scheduleDetailService.js";
import { getTags } from "../../services/tagService.js";
import { getLocations } from "../../services/locationService.js";
import { getTruckSizes } from "../../services/truckSizeService.js";
import { getTrucks } from "../../services/truckService.js";
import { getFilteredViews } from "../../services/filteredViewService.js";
import { getKeyInfo } from "../../services/keyInfoService.js";
import { getShareArchive } from "../../services/shareArchiveService.js";
import { getCompanies } from "../../services/companyService.js";
import {
  cacheScheduleDetails,
  getCachedCompanies,
  getCachedFilteredViews,
  getCachedKeyInfo,
  getCachedLocations,
  getCachedScheduleDays,
  getCachedScheduleDetails,
  getCachedTags,
  getCachedTrucks,
  getCachedTruckSizes,
} from "../../services/localScheduleCache.js";

function buildEventForm(event) {
  return {
    name: event.name || "",
    venue: event.venue || "",
    clientId: event.clientId || "",
    clientName: event.clientName || "",
    profileId: event.profileId || "",
    firstLiveDay: event.firstLiveDay || "",
    lastLiveDay: event.lastLiveDay || "",
    scheduleStartDate: event.scheduleStartDate || event.firstLiveDay || "",
    scheduleEndDate: event.scheduleEndDate || event.lastLiveDay || "",
    imageUrl: event.imageUrl || "",
    contactCompanyOrder: Array.isArray(event.contactCompanyOrder)
      ? event.contactCompanyOrder
      : [],
    showMomContacts: readBooleanValue(event.showMomContacts, false),
    showMomKeyInfo: readBooleanValue(event.showMomKeyInfo, false),
    updatedAt: event.updatedAt || null,
    apiResponse: normaliseApiResponse(event["API Response"]),
  };
}

export default function useEventEditorData({
  eventId,
  profileLoading,
  userProfile,
  resetEventContacts,
}) {
  const [form, setForm] = useState(emptyEventForm);
  const [savedEventForm, setSavedEventForm] = useState(emptyEventForm);
  const [scheduleDays, setScheduleDays] = useState([]);
  const [detailsByDayId, setDetailsByDayId] = useState({});
  const [savedDetailsById, setSavedDetailsById] = useState({});
  const [tags, setTags] = useState([]);
  const [locations, setLocations] = useState([]);
  const [truckSizes, setTruckSizes] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [filteredViews, setFilteredViews] = useState([]);
  const [keyInfoItems, setKeyInfoItems] = useState([]);
  const [shareArchive, setShareArchive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [truckSizesLoading, setTruckSizesLoading] = useState(false);
  const [trucksLoading, setTrucksLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [filteredViewsLoading, setFilteredViewsLoading] = useState(false);
  const [keyInfoLoading, setKeyInfoLoading] = useState(false);
  const [shareArchiveLoading, setShareArchiveLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  const getSavedDetailSnapshot = (detail, fallbackIndex = 0) => ({
    time: detail.time || "",
    description: detail.description || "",
    sortOrder: typeof detail.sortOrder === "number" ? detail.sortOrder : fallbackIndex,
    colour: normaliseHexColour(detail.colour),
    tagId: detail.tagId || "",
    locationId: detail.locationId || "",
    companyIds: detail.companyIds || [],
    notes: detail.notes || "",
  });

  const setDetailsState = (nextDetailsByDayId) => {
    const detailsEntries = Object.entries(nextDetailsByDayId);
    setDetailsByDayId(nextDetailsByDayId);
    setSavedDetailsById(
      Object.fromEntries(
        detailsEntries.flatMap(([, details]) =>
          details.map((detail, detailIndex) => [
            detail.id,
            getSavedDetailSnapshot(detail, detailIndex),
          ])
        )
      )
    );
  };

  const setDayDetails = (dayId, nextDetails) => {
    const sortedDetails = sortDetailsForDisplay(nextDetails);
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: sortedDetails,
    }));
    setSavedDetailsById((current) => ({
      ...current,
      ...Object.fromEntries(
        sortedDetails.map((detail, detailIndex) => [
          detail.id,
          getSavedDetailSnapshot(detail, detailIndex),
        ])
      ),
    }));
    cacheScheduleDetails(dayId, sortedDetails);
  };

  const loadScheduleDetails = async (days) => {
    setDetailsLoading(true);
    try {
      setDetailsState(
        await getScheduleDetailsForEvent(eventId, days.map((day) => day.id))
      );
    } catch (loadError) {
      console.error("Could not load schedule details.", loadError);
      setWarning("Could not load schedule details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const applyScheduleDays = (days) => {
    setScheduleDays(days);
    loadScheduleDetails(days);
  };

  const loadScheduleDays = async () => {
    const days = await getScheduleDays(eventId);
    applyScheduleDays(days);
  };

  const loadTags = async () => {
    setTagsLoading(true);
    try {
      setTags(await getTags(eventId));
    } catch (loadError) {
      console.error("Could not load tags.", loadError);
      setWarning("Could not load tags.");
    } finally {
      setTagsLoading(false);
    }
  };

  const loadLocations = async () => {
    setLocationsLoading(true);
    try {
      setLocations(await getLocations(eventId));
    } catch (loadError) {
      console.error("Could not load locations.", loadError);
      setWarning("Could not load locations.");
    } finally {
      setLocationsLoading(false);
    }
  };

  const loadTruckSizes = async () => {
    setTruckSizesLoading(true);
    try {
      setTruckSizes(await getTruckSizes(eventId));
    } catch (loadError) {
      console.error("Could not load truck sizes.", loadError);
      setWarning("Could not load truck sizes.");
    } finally {
      setTruckSizesLoading(false);
    }
  };

  const loadTrucks = async () => {
    setTrucksLoading(true);
    try {
      setTrucks(await getTrucks(eventId));
    } catch (loadError) {
      console.error("Could not load trucks.", loadError);
      setWarning("Could not load trucks.");
    } finally {
      setTrucksLoading(false);
    }
  };

  const loadFilteredViews = async () => {
    setFilteredViewsLoading(true);
    try {
      setFilteredViews(await getFilteredViews(eventId));
    } catch (loadError) {
      console.error("Could not load filtered views.", loadError);
      setWarning("Could not load filtered views.");
    } finally {
      setFilteredViewsLoading(false);
    }
  };

  const loadCompanies = async (clientId = form.clientId) => {
    setCompaniesLoading(true);
    try {
      setCompanies(await getCompanies(clientId));
    } catch (loadError) {
      console.error("Could not load companies.", loadError);
      setWarning("Could not load companies.");
    } finally {
      setCompaniesLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoading) return undefined;

    let cancelled = false;

    const seedCachedPage = () => {
      const cachedEvent = getCachedEventForUser(eventId, userProfile);
      const cachedDays = getCachedScheduleDays(eventId);
      if (!cachedEvent) return false;

      const cachedEventForm = buildEventForm(cachedEvent);
      setForm(cachedEventForm);
      setSavedEventForm(cachedEventForm);
      setCompanies(getCachedCompanies(cachedEventForm.clientId));

      if (cachedDays.length > 0) {
        setScheduleDays(cachedDays);
        setDetailsState(
          Object.fromEntries(
            cachedDays.map((day) => [day.id, getCachedScheduleDetails(day.id)])
          )
        );
      }

      setTags(getCachedTags(eventId));
      setLocations(getCachedLocations(eventId));
      setTruckSizes(getCachedTruckSizes(eventId));
      setTrucks(getCachedTrucks(eventId));
      setFilteredViews(getCachedFilteredViews(eventId));
      setKeyInfoItems(getCachedKeyInfo(eventId));
      setLoading(false);
      return true;
    };

    const hasCachedSeed = seedCachedPage();

    const loadPage = async () => {
      setLoading(!hasCachedSeed);
      setDetailsLoading(false);
      setTagsLoading(false);
      setLocationsLoading(false);
      setTruckSizesLoading(false);
      setTrucksLoading(false);
      setCompaniesLoading(false);
      setKeyInfoLoading(false);
      setShareArchiveLoading(false);
      setError("");
      setWarning("");

      try {
        const event = await getEvent(eventId, userProfile);
        if (cancelled) return;
        if (!event) {
          setError("Event not found.");
          return;
        }

        const days = await getScheduleDays(eventId);
        if (cancelled) return;

        const loadedEventForm = buildEventForm(event);
        setForm(loadedEventForm);
        setSavedEventForm(loadedEventForm);
        setScheduleDays(days);
        if (!hasCachedSeed) {
          setFilteredViews([]);
          setKeyInfoItems([]);
          setShareArchive([]);
          resetEventContacts?.();
        }
        setLoading(false);

        const loadOptionalEditorData = async ({
          label,
          setLoadingState,
          loadData,
          applyData,
          errorMessage,
        }) => {
          setLoadingState(true);
          try {
            const data = await loadData();
            if (cancelled) return;
            applyData(data);
          } catch (optionalLoadError) {
            console.error(`Could not load ${label}.`, optionalLoadError);
            if (!cancelled) {
              setWarning((currentWarning) => currentWarning || errorMessage);
            }
          } finally {
            if (!cancelled) setLoadingState(false);
          }
        };

        await Promise.all([
          loadOptionalEditorData({
            label: "schedule details",
            setLoadingState: setDetailsLoading,
            loadData: () => getScheduleDetailsForEvent(eventId, days.map((day) => day.id)),
            applyData: setDetailsState,
            errorMessage: "Could not load schedule details. Event settings are still available.",
          }),
          loadOptionalEditorData({
            label: "tags",
            setLoadingState: setTagsLoading,
            loadData: () => getTags(eventId),
            applyData: setTags,
            errorMessage: "Could not load tags. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "locations",
            setLoadingState: setLocationsLoading,
            loadData: () => getLocations(eventId),
            applyData: setLocations,
            errorMessage: "Could not load locations. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "truck sizes",
            setLoadingState: setTruckSizesLoading,
            loadData: () => getTruckSizes(eventId),
            applyData: setTruckSizes,
            errorMessage: "Could not load truck sizes. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "trucks",
            setLoadingState: setTrucksLoading,
            loadData: () => getTrucks(eventId),
            applyData: setTrucks,
            errorMessage: "Could not load trucks. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "filtered views",
            setLoadingState: setFilteredViewsLoading,
            loadData: () => getFilteredViews(eventId),
            applyData: setFilteredViews,
            errorMessage: "Could not load filtered views. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "key info",
            setLoadingState: setKeyInfoLoading,
            loadData: () => getKeyInfo(eventId),
            applyData: setKeyInfoItems,
            errorMessage: "Could not load key info. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "share archive",
            setLoadingState: setShareArchiveLoading,
            loadData: () => getShareArchive(eventId),
            applyData: setShareArchive,
            errorMessage: "Could not load share archive. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "companies",
            setLoadingState: setCompaniesLoading,
            loadData: () => getCompanies(loadedEventForm.clientId),
            applyData: setCompanies,
            errorMessage: "Could not load companies. Other event data is still available.",
          }),
        ]);
      } catch (loadError) {
        console.error("Could not load event editor.", loadError);
        if (cancelled) return;
        setError("Could not load event editor.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setDetailsLoading(false);
          setTagsLoading(false);
          setLocationsLoading(false);
          setTruckSizesLoading(false);
          setTrucksLoading(false);
          setCompaniesLoading(false);
          setKeyInfoLoading(false);
          setShareArchiveLoading(false);
        }
      }
    };

    loadPage();
    return () => {
      cancelled = true;
    };
  }, [eventId, profileLoading, userProfile]);

  return {
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
    setCompanies,
    filteredViews,
    setFilteredViews,
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
    setDetailsState,
    getSavedDetailSnapshot,
    setDayDetails,
  };
}
