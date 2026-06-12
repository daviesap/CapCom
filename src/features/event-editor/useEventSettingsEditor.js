import { useState } from "react";
import {
  emptyLocationForm,
  emptyTagForm,
  emptyTruckForm,
  emptyTruckSizeForm,
} from "./eventEditorConstants.js";
import { normaliseHexColour } from "./eventEditorUtils.js";
import {
  createTag,
  deleteTag,
  updateTag,
} from "../../services/tagService.js";
import {
  createLocation,
  deleteLocation,
  updateLocation,
} from "../../services/locationService.js";
import {
  createTruckSize,
  deleteTruckSize,
  updateTruckSize,
} from "../../services/truckSizeService.js";
import {
  createTruck,
  deleteTruck,
  updateTruck,
} from "../../services/truckService.js";

export default function useEventSettingsEditor({
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
}) {
  const [tagForm, setTagForm] = useState(emptyTagForm);
  const [locationForm, setLocationForm] = useState(emptyLocationForm);
  const [truckSizeForm, setTruckSizeForm] = useState(emptyTruckSizeForm);
  const [truckForm, setTruckForm] = useState(emptyTruckForm);
  const [tagFormMode, setTagFormMode] = useState("");
  const [locationFormMode, setLocationFormMode] = useState("");
  const [truckSizeFormMode, setTruckSizeFormMode] = useState("");
  const [truckFormMode, setTruckFormMode] = useState("");
  const [editingTagId, setEditingTagId] = useState("");
  const [editingTruckSizeId, setEditingTruckSizeId] = useState("");
  const [editingTruckId, setEditingTruckId] = useState("");
  const [editingLocationId, setEditingLocationId] = useState("");
  const [savingTruckSize, setSavingTruckSize] = useState(false);
  const [deletingTruckSizeId, setDeletingTruckSizeId] = useState("");
  const [savingTruck, setSavingTruck] = useState(false);
  const [deletingTruckId, setDeletingTruckId] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState("");
  const [movingLocationId, setMovingLocationId] = useState("");
  const [locationDropTargetId, setLocationDropTargetId] = useState("");

  const updateTagFormField = (field, value) => {
    setTagForm((current) => ({ ...current, [field]: value }));
  };

  const resetTagForm = () => {
    setTagFormMode("");
    setEditingTagId("");
    setTagForm(emptyTagForm);
  };

  const startAddingTag = () => {
    setTagFormMode("add");
    setEditingTagId("");
    setTagForm(emptyTagForm);
    setError("");
  };

  const startEditingTag = (tag) => {
    setTagFormMode("edit");
    setEditingTagId(tag.id);
    setTagForm({
      name: tag.name || "",
      colour: normaliseHexColour(tag.colour) || emptyTagForm.colour,
    });
    setError("");
  };

  const saveTag = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingTag(true);
    setError("");

    try {
      const name = tagForm.name.trim();
      const colour = normaliseHexColour(tagForm.colour);
      if (!name || !colour) {
        setError("Tag name and valid hex colour are required.");
        return;
      }

      if (editingTagId) {
        await updateTag(editingTagId, { name, colour });
      } else {
        await createTag({ eventId, name, colour });
      }
      resetTagForm();
      await loadTags();
    } catch (tagError) {
      console.error(tagError);
      setError("Could not save tag.");
    } finally {
      setSavingTag(false);
    }
  };

  const removeTag = async (tagId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setDeletingTagId(tagId);
    setError("");

    try {
      const targetTag = tags.find((tag) => tag.id === tagId);
      const isTruckTag = isReservedTruckTag(targetTag);
      if (isTruckTag && truckScheduleDetails.length > 0) {
        setError("Truck can not be deleted whilst truck entries exist.");
        return;
      }

      await deleteTag(tagId);
      if (editingTagId === tagId) resetTagForm();
      await loadTags();
    } catch (tagError) {
      console.error(tagError);
      setError("Could not delete tag.");
    } finally {
      setDeletingTagId("");
    }
  };

  const updateTruckSizeFormField = (field, value) => {
    setTruckSizeForm((current) => ({ ...current, [field]: value }));
  };

  const resetTruckSizeForm = () => {
    setTruckSizeFormMode("");
    setEditingTruckSizeId("");
    setTruckSizeForm(emptyTruckSizeForm);
  };

  const startAddingTruckSize = () => {
    setTruckSizeFormMode("add");
    setEditingTruckSizeId("");
    setTruckSizeForm(emptyTruckSizeForm);
    setError("");
  };

  const startEditingTruckSize = (truckSize) => {
    setTruckSizeFormMode("edit");
    setEditingTruckSizeId(truckSize.id);
    setTruckSizeForm({
      size: truckSize.size || "",
    });
    setError("");
  };

  const saveTruckSize = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    setSavingTruckSize(true);
    setError("");

    try {
      const size = truckSizeForm.size.trim();
      if (!size) {
        setError("Truck size is required.");
        return;
      }

      if (editingTruckSizeId) {
        await updateTruckSize(editingTruckSizeId, { size });
      } else {
        await createTruckSize({ eventId, size });
      }

      resetTruckSizeForm();
      await loadTruckSizes();
    } catch (truckSizeError) {
      console.error(truckSizeError);
      setError("Could not save truck size.");
    } finally {
      setSavingTruckSize(false);
    }
  };

  const removeTruckSize = async (truckSizeId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setDeletingTruckSizeId(truckSizeId);
    setError("");

    try {
      await deleteTruckSize(truckSizeId);
      if (editingTruckSizeId === truckSizeId) resetTruckSizeForm();
      await loadTruckSizes();
    } catch (truckSizeError) {
      console.error(truckSizeError);
      setError("Could not delete truck size.");
    } finally {
      setDeletingTruckSizeId("");
    }
  };

  const updateTruckFormField = (field, value) => {
    setTruckForm((current) => ({ ...current, [field]: value }));
  };

  const resetTruckForm = () => {
    setEditingTruckId("");
    setTruckForm(emptyTruckForm);
    setTruckFormMode("");
  };

  const startAddingTruck = () => {
    setEditingTruckId("");
    setTruckForm(emptyTruckForm);
    setTruckFormMode("create");
    setError("");
  };

  const startEditingTruck = (truck) => {
    setEditingTruckId(truck.id);
    setTruckFormMode("edit");
    setTruckForm({
      truckSizeId: truck.truckSizeId || "",
      companyId: truck.companyId || "",
      truckNumber: truck.truckNumber || "",
      driverName: truck.driverName || "",
      driverContactNumber: truck.driverContactNumber || "",
      contents: truck.contents || "",
    });
    setError("");
  };

  const buildTruckPayload = () => {
    const selectedTruckSize = truckSizes.find(
      (truckSize) => truckSize.id === truckForm.truckSizeId
    );
    if (!selectedTruckSize) return null;
    const selectedCompany = companies.find((company) => company.id === truckForm.companyId);
    if (!selectedCompany) return null;

    return {
      eventId,
      truckSizeId: selectedTruckSize.id,
      size: selectedTruckSize.size || "",
      companyId: selectedCompany.id,
      companyName: selectedCompany.companyName || "",
      truckNumber: truckForm.truckNumber.trim(),
      driverName: truckForm.driverName.trim(),
      driverContactNumber: truckForm.driverContactNumber.trim(),
      contents: truckForm.contents.trim(),
    };
  };

  const saveTruck = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    setSavingTruck(true);
    setError("");

    try {
      const truckPayload = buildTruckPayload();
      if (!truckPayload) {
        setError("Truck size and company are required.");
        return;
      }
      if (!truckPayload.truckNumber) {
        setError("Truck number is required.");
        return;
      }

      if (editingTruckId) {
        await updateTruck(editingTruckId, truckPayload);
      } else {
        await createTruck(truckPayload);
      }

      resetTruckForm();
      await loadTrucks();
    } catch (truckError) {
      console.error(truckError);
      setError("Could not save truck.");
    } finally {
      setSavingTruck(false);
    }
  };

  const removeTruck = async (truckId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setDeletingTruckId(truckId);
    setError("");

    try {
      await deleteTruck(truckId);
      if (editingTruckId === truckId) resetTruckForm();
      await loadTrucks();
    } catch (truckError) {
      console.error(truckError);
      setError("Could not delete truck.");
    } finally {
      setDeletingTruckId("");
    }
  };

  const updateLocationFormField = (field, value) => {
    setLocationForm((current) => ({ ...current, [field]: value }));
  };

  const resetLocationForm = () => {
    setLocationFormMode("");
    setEditingLocationId("");
    setLocationForm(emptyLocationForm);
  };

  const startAddingLocation = () => {
    setLocationFormMode("add");
    setEditingLocationId("");
    setLocationForm(emptyLocationForm);
    setError("");
  };

  const startEditingLocation = (location) => {
    setLocationFormMode("edit");
    setEditingLocationId(location.id);
    setLocationForm({
      name: location.name || "",
      parentLocationId: location.parentLocationId || "",
    });
    setError("");
  };

  const startAddingSubLocation = (location) => {
    if (isWriteDisabled || location.parentLocationId) return;
    setLocationFormMode("add");
    setEditingLocationId("");
    setLocationForm({
      name: "",
      parentLocationId: location.id,
    });
    setError("");
  };

  const saveLocation = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingLocation(true);
    setError("");

    try {
      const name = locationForm.name.trim();
      const parentLocationId = locationForm.parentLocationId || "";
      if (!name) {
        setError("Location name is required.");
        return;
      }
      if (editingLocationId && parentLocationId === editingLocationId) {
        setError("A location cannot be its own parent.");
        return;
      }
      if (
        parentLocationId &&
        locations.find((location) => location.id === parentLocationId)?.parentLocationId
      ) {
        setError("Sub-locations cannot contain other sub-locations.");
        return;
      }

      if (editingLocationId) {
        await updateLocation(editingLocationId, { name, parentLocationId });
      } else {
        await createLocation({ eventId, name, parentLocationId });
      }
      resetLocationForm();
      await loadLocations();
    } catch (locationError) {
      console.error(locationError);
      setError("Could not save location.");
    } finally {
      setSavingLocation(false);
    }
  };

  const moveLocation = async (locationId, parentLocationId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    const location = locations.find((currentLocation) => currentLocation.id === locationId);
    const parentLocation = parentLocationId
      ? locations.find((currentLocation) => currentLocation.id === parentLocationId)
      : null;
    if (!location || location.parentLocationId === parentLocationId) return;
    if (locationId === parentLocationId) {
      setError("A location cannot be moved under itself.");
      return;
    }
    if (parentLocation?.parentLocationId) {
      setError("Sub-locations cannot contain other sub-locations.");
      return;
    }
    const childLocations = locations.filter(
      (currentLocation) => currentLocation.parentLocationId === locationId
    );

    setMovingLocationId(locationId);
    setLocationDropTargetId("");
    setError("");
    setLocations((current) =>
      current.map((currentLocation) => {
        if (currentLocation.id === locationId) return { ...currentLocation, parentLocationId };
        if (parentLocationId && currentLocation.parentLocationId === locationId) {
          return { ...currentLocation, parentLocationId: "" };
        }
        return currentLocation;
      })
    );

    try {
      await Promise.all([
        updateLocation(locationId, {
          name: location.name || "",
          parentLocationId,
        }),
        ...(parentLocationId
          ? childLocations.map((childLocation) =>
              updateLocation(childLocation.id, {
                name: childLocation.name || "",
                parentLocationId: "",
              })
            )
          : []),
      ]);
      if (editingLocationId === locationId) {
        setLocationForm((current) => ({ ...current, parentLocationId }));
      }
    } catch (locationError) {
      console.error(locationError);
      setError("Could not move location.");
      await loadLocations();
    } finally {
      setMovingLocationId("");
    }
  };

  const removeLocation = async (locationId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    const childLocationIds = locations
      .filter((location) => location.parentLocationId === locationId)
      .map((location) => location.id);
    const locationIdsToDelete = [locationId, ...childLocationIds];

    setDeletingLocationId(locationId);
    setError("");

    try {
      await Promise.all(
        locationIdsToDelete.map((nextLocationId) => deleteLocation(nextLocationId))
      );
      if (locationIdsToDelete.includes(editingLocationId)) resetLocationForm();
      await loadLocations();
    } catch (locationError) {
      console.error(locationError);
      setError("Could not delete location.");
    } finally {
      setDeletingLocationId("");
    }
  };

  return {
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
  };
}
