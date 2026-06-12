import { useEffect, useRef, useState } from "react";
import {
  createCompanyContact,
  getCompanyContacts,
  updateCompanyContact,
} from "../../services/companyContactService.js";
import {
  addEventContactsFromCompanyContacts,
  getEventContacts,
  updateEventContact,
  updateEventContactOrder,
} from "../../services/eventContactService.js";
import { updateEventContactCompanyOrder } from "../../services/eventService.js";
import {
  createKeyInfo,
  deleteKeyInfo,
  getKeyInfo,
  updateKeyInfo,
  updateKeyInfoOrder,
} from "../../services/keyInfoService.js";
import {
  emptyCompanyContactForm,
  emptyKeyInfoForm,
} from "./eventEditorConstants.js";
import { getSortOrder } from "./eventEditorUtils.js";

export default function useEventInfoEditor({
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
}) {
  const [companyContactsByCompanyId, setCompanyContactsByCompanyId] = useState({});
  const [eventContactsByCompanyId, setEventContactsByCompanyId] = useState({});
  const [companyContactForm, setCompanyContactForm] = useState(emptyCompanyContactForm);
  const [editingCompanyContactId, setEditingCompanyContactId] = useState("");
  const [editingCompanyContactCompanyId, setEditingCompanyContactCompanyId] = useState("");
  const [editingEventContactId, setEditingEventContactId] = useState("");
  const [openContactCompanyIds, setOpenContactCompanyIds] = useState([]);
  const [activeInfoTab, setActiveInfoTab] = useState("contacts");
  const [, setCompanyContactsLoading] = useState(false);
  const [eventContactsLoading, setEventContactsLoading] = useState(false);
  const [savingCompanyContact, setSavingCompanyContact] = useState(false);
  const [savingEventContact] = useState(false);
  const [reorderingCompanyContactId, setReorderingCompanyContactId] = useState("");
  const [savingContactCompanyOrder, setSavingContactCompanyOrder] = useState(false);
  const [keyInfoForm, setKeyInfoForm] = useState(emptyKeyInfoForm);
  const [keyInfoFormMode, setKeyInfoFormMode] = useState("");
  const [editingKeyInfoId, setEditingKeyInfoId] = useState("");
  const [savingKeyInfo, setSavingKeyInfo] = useState(false);
  const [deletingKeyInfoId, setDeletingKeyInfoId] = useState("");
  const [reorderingKeyInfoId, setReorderingKeyInfoId] = useState("");
  const [contactCompanyDropTargetId, setContactCompanyDropTargetId] = useState("");
  const [companyContactDropTargetId, setCompanyContactDropTargetId] = useState("");
  const seededEventContactCompanyIdsRef = useRef(new Set());
  const eventContactSeedErrorCompanyIdsRef = useRef(new Set());
  const draggedContactCompanyIdRef = useRef("");
  const draggedCompanyContactIdRef = useRef("");
  const draggedKeyInfoIdRef = useRef("");

  const resetEventContacts = () => {
    setEventContactsByCompanyId({});
    setCompanyContactsByCompanyId({});
    setEventContactsLoading(false);
    setCompanyContactsLoading(false);
    seededEventContactCompanyIdsRef.current.clear();
    eventContactSeedErrorCompanyIdsRef.current.clear();
  };

  const reloadEventContacts = async (companyIds = contactCompanyIds) => {
    if (companyIds.length === 0) {
      setEventContactsByCompanyId({});
      return;
    }

    setEventContactsLoading(true);
    try {
      const contacts = await getEventContacts(eventId, companyIds);
      setEventContactsByCompanyId(
        Object.fromEntries(
          companyIds.map((companyId) => [
            companyId,
            contacts.filter((contact) => contact.companyId === companyId),
          ])
        )
      );
    } catch (loadError) {
      console.error("Could not load event contacts.", loadError);
      setWarning("Could not load company contacts.");
    } finally {
      setEventContactsLoading(false);
    }
  };

  const reloadCompanyContacts = async (companyIds = contactCompanyIds) => {
    if (companyIds.length === 0) {
      setCompanyContactsByCompanyId({});
      setCompanyContactsLoading(false);
      return;
    }

    setCompanyContactsLoading(true);
    try {
      const contacts = await getCompanyContacts(companyIds);
      setCompanyContactsByCompanyId(
        Object.fromEntries(
          companyIds.map((companyId) => [
            companyId,
            contacts.filter((contact) => contact.companyId === companyId),
          ])
        )
      );
    } catch (loadError) {
      console.error("Could not load company contacts.", loadError);
      setWarning("Could not load company contacts.");
    } finally {
      setCompanyContactsLoading(false);
    }
  };

  useEffect(() => {
    setOpenContactCompanyIds((current) => {
      const currentOpenCompanyIds = current.filter((companyId) =>
        contactCompanyIds.includes(companyId)
      );
      const nextCompanyIds = contactCompanyIds.filter(
        (companyId) => !current.includes(companyId)
      );
      return [...currentOpenCompanyIds, ...nextCompanyIds];
    });
  }, [contactCompanyIds, eventId]);

  useEffect(() => {
    let cancelled = false;

    const loadContacts = async () => {
      if (contactCompanyIds.length === 0) {
        setEventContactsByCompanyId({});
        setCompanyContactsByCompanyId({});
        setEventContactsLoading(false);
        setCompanyContactsLoading(false);
        return;
      }

      setEventContactsLoading(true);
      setCompanyContactsLoading(true);
      const [eventContactsResult, companyContactsResult] = await Promise.allSettled([
        getEventContacts(eventId, contactCompanyIds),
        getCompanyContacts(contactCompanyIds),
      ]);

      if (cancelled) return;

      if (eventContactsResult.status === "fulfilled") {
        const eventContactRows = eventContactsResult.value;
        setEventContactsByCompanyId(
          Object.fromEntries(
            contactCompanyIds.map((companyId) => [
              companyId,
              eventContactRows.filter((contact) => contact.companyId === companyId),
            ])
          )
        );
      } else {
        console.error("Could not load event contacts.", eventContactsResult.reason);
        setEventContactsByCompanyId({});
        setWarning("Could not load event contacts.");
      }

      if (companyContactsResult.status === "fulfilled") {
        const companyContactRows = companyContactsResult.value;
        setCompanyContactsByCompanyId(
          Object.fromEntries(
            contactCompanyIds.map((companyId) => [
              companyId,
              companyContactRows.filter((contact) => contact.companyId === companyId),
            ])
          )
        );
      } else {
        console.error("Could not load master company contacts.", companyContactsResult.reason);
        setCompanyContactsByCompanyId({});
        setWarning("Could not load master company contacts.");
      }

      setEventContactsLoading(false);
      setCompanyContactsLoading(false);
    };

    loadContacts();
    return () => {
      cancelled = true;
    };
  }, [contactCompanyIds]);

  useEffect(() => {
    if (isWriteDisabled || contactCompanyIds.length === 0 || eventContactsLoading) return;

    const companyIdsToSeed = contactCompanyIds.filter((companyId) => {
      const seeded = seededEventContactCompanyIdsRef.current.has(companyId);
      const hadSeedError = eventContactSeedErrorCompanyIdsRef.current.has(companyId);
      const hasExistingContacts = (eventContactsByCompanyId[companyId] || []).length > 0;
      const hasCompanyContacts = (companyContactsByCompanyId[companyId] || []).length > 0;
      return !seeded && !hadSeedError && !hasExistingContacts && hasCompanyContacts;
    });

    if (companyIdsToSeed.length === 0) return;

    let cancelled = false;

    const seedCompanyContactsForEvent = async () => {
      let didSeedContacts = false;

      for (const companyId of companyIdsToSeed) {
        if (cancelled) return;
        seededEventContactCompanyIdsRef.current.add(companyId);

        const companyContacts = companyContactsByCompanyId[companyId];
        if (!companyContacts || companyContacts.length === 0) {
          seededEventContactCompanyIdsRef.current.delete(companyId);
          continue;
        }

        try {
          const existingEventContacts = eventContactsByCompanyId[companyId] || [];
          const existingCompanyContactIds = new Set(
            existingEventContacts
              .map((contact) => contact.companyContactId || contact.id)
              .filter(Boolean)
          );
          const contactsToSeed = companyContacts.filter(
            (contact) => !existingCompanyContactIds.has(contact.id)
          );

          if (contactsToSeed.length === 0) {
            continue;
          }

          const nextSortOrder = existingEventContacts.reduce(
            (currentMax, contact, contactIndex) => Math.max(currentMax, getSortOrder(contact, contactIndex)),
            -1
          ) + 1;

          await addEventContactsFromCompanyContacts({
            eventId,
            companyId,
            companyContacts: contactsToSeed,
            startSortOrder: nextSortOrder,
          });
          didSeedContacts = true;
        } catch (seedError) {
          console.error("Could not seed event contacts.", seedError);
          if (!cancelled) {
            eventContactSeedErrorCompanyIdsRef.current.add(companyId);
            setError("Could not seed event contacts for this event.");
          }
        } finally {
          seededEventContactCompanyIdsRef.current.delete(companyId);
        }
      }

      if (!cancelled && didSeedContacts) {
        await reloadEventContacts();
      }
    };

    seedCompanyContactsForEvent();
    return () => {
      cancelled = true;
    };
  }, [
    contactCompanyIds,
    isWriteDisabled,
    companyContactsByCompanyId,
    eventContactsByCompanyId,
    eventContactsLoading,
    eventId,
  ]);

  const toggleContactCompanyOpen = (companyId) => {
    setOpenContactCompanyIds((current) =>
      current.includes(companyId)
        ? current.filter((currentCompanyId) => currentCompanyId !== companyId)
        : [...current, companyId]
    );
  };

  const updateCompanyContactFormField = (field, value) => {
    setCompanyContactForm((current) => ({ ...current, [field]: value }));
  };

  const resetCompanyContactForm = () => {
    setEditingCompanyContactId("");
    setEditingCompanyContactCompanyId("");
    setEditingEventContactId("");
    setCompanyContactForm(emptyCompanyContactForm);
  };

  const setEventContactHiddenState = (contactId, isHidden) => {
    let updated = false;

    setEventContactsByCompanyId((current) => {
      const nextByCompany = Object.fromEntries(
        Object.entries(current).map(([companyId, contacts]) => {
          const nextContacts = contacts.map((contact) => {
            if (contact.id !== contactId) return contact;
            return { ...contact, isHidden };
          });
          if (!updated && nextContacts !== contacts) {
            updated = true;
          }
          return [companyId, nextContacts];
        })
      );

      return updated ? nextByCompany : current;
    });

    return updated;
  };

  const startAddingCompanyContact = (companyId) => {
    if (!canManageCompanyContacts || isWriteDisabled) return;
    setEditingCompanyContactId("");
    setEditingCompanyContactCompanyId(companyId);
    setCompanyContactForm(emptyCompanyContactForm);
    setError("");
  };

  const startEditingCompanyContact = (companyId, contact) => {
    if (!canManageCompanyContacts || isWriteDisabled) return;
    setEditingCompanyContactId(contact.companyContactId || "");
    setEditingCompanyContactCompanyId(companyId);
    setEditingEventContactId(contact.id || "");
    setCompanyContactForm({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      role: contact.role || "",
    });
    setError("");
  };

  const saveCompanyContact = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canManageCompanyContacts) {
      setError("Your role cannot manage company contacts.");
      return;
    }
    if (!editingCompanyContactCompanyId) return;

    const name = companyContactForm.name.trim();
    const email = companyContactForm.email.trim();
    const phone = companyContactForm.phone.trim();
    const role = companyContactForm.role.trim();
    if (!name) {
      setError("Contact name is required.");
      return;
    }

    setSavingCompanyContact(true);
    setError("");

    try {
      if (editingCompanyContactId) {
        await updateCompanyContact(editingCompanyContactId, {
          companyId: editingCompanyContactCompanyId,
          name,
          email,
          phone,
          role,
        });
        if (editingEventContactId) {
          await updateEventContact(editingEventContactId, {
            name,
            email,
            phone,
            role,
          });
        }
      } else {
        eventContactSeedErrorCompanyIdsRef.current.delete(
          editingCompanyContactCompanyId
        );
        const createdContact = await createCompanyContact({
          companyId: editingCompanyContactCompanyId,
          name,
          email,
          phone,
          role,
        });
        const companyContactId = createdContact?.id;
        if (companyContactId) {
          const nextSortOrder = (
            eventContactsByCompanyId[editingCompanyContactCompanyId] || []
          ).reduce(
            (currentMax, eventContact, eventContactIndex) => Math.max(
              currentMax,
              getSortOrder(eventContact, eventContactIndex)
            ),
            -1
          ) + 1;

          await addEventContactsFromCompanyContacts({
            eventId,
            companyId: editingCompanyContactCompanyId,
            companyContacts: [
              {
                id: companyContactId,
                name,
                email,
                phone,
                role,
              },
            ],
            startSortOrder: nextSortOrder,
          });
        }
      }

      resetCompanyContactForm();
      await reloadCompanyContacts();
      await reloadEventContacts();
    } catch (contactError) {
      console.error(contactError);
      setError(
        contactError?.code === "permission-denied"
          ? "You do not have permission to save contacts for this company."
          : "Could not save company contact."
      );
    } finally {
      setSavingCompanyContact(false);
    }
  };

  const toggleEventContactHidden = async (contactId) => {
    const targetContact = Object.values(eventContactsByCompanyId)
      .flat()
      .find((contact) => contact.id === contactId);

    if (!targetContact || isWriteDisabled || !canManageCompanyContacts) return;
    setError("");

    const nextIsHidden = !targetContact.isHidden;
    const didUpdate = setEventContactHiddenState(contactId, nextIsHidden);
    if (!didUpdate) return;

    try {
      await updateEventContact(contactId, {
        isHidden: nextIsHidden,
      });
    } catch (contactError) {
      console.error(contactError);
      setEventContactHiddenState(contactId, targetContact.isHidden);
      const errorCode = contactError?.code || "";
      const isPermissionError = errorCode === "permission-denied";
      setError(
        isPermissionError
          ? "You do not have permission to update this event contact."
          : "Could not update event contact visibility."
      );
    }
  };

  const resetKeyInfoForm = () => {
    setKeyInfoFormMode("");
    setEditingKeyInfoId("");
    setKeyInfoForm(emptyKeyInfoForm);
  };

  const updateKeyInfoFormField = (field, value) => {
    setKeyInfoForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const startAddingKeyInfo = () => {
    if (isWriteDisabled) return;
    resetKeyInfoForm();
    setKeyInfoFormMode("create");
    setError("");
  };

  const startEditingKeyInfo = (item) => {
    if (isWriteDisabled) return;
    setKeyInfoFormMode("edit");
    setEditingKeyInfoId(item.id);
    setKeyInfoForm({
      title: item.title || "",
      description: item.description || "",
    });
    setError("");
  };

  const saveKeyInfo = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    const title = keyInfoForm.title.trim();
    const description = keyInfoForm.description.trim();
    if (!title) {
      setError("Key info title is required.");
      return;
    }

    setSavingKeyInfo(true);
    setError("");

    try {
      if (editingKeyInfoId) {
        await updateKeyInfo(editingKeyInfoId, { title, description });
      } else {
        await createKeyInfo({ eventId, title, description });
      }

      resetKeyInfoForm();
      setKeyInfoItems(await getKeyInfo(eventId));
    } catch (keyInfoError) {
      console.error(keyInfoError);
      setError("Could not save key info.");
    } finally {
      setSavingKeyInfo(false);
    }
  };

  const removeKeyInfo = async (keyInfoId) => {
    if (isWriteDisabled) return;

    setDeletingKeyInfoId(keyInfoId);
    setError("");

    try {
      await deleteKeyInfo(keyInfoId);
      if (editingKeyInfoId === keyInfoId) resetKeyInfoForm();
      setKeyInfoItems(await getKeyInfo(eventId));
    } catch (keyInfoError) {
      console.error(keyInfoError);
      setError("Could not delete key info.");
    } finally {
      setDeletingKeyInfoId("");
    }
  };

  const reorderKeyInfo = async (draggedKeyInfoId, targetKeyInfoId) => {
    if (!draggedKeyInfoId || !targetKeyInfoId || draggedKeyInfoId === targetKeyInfoId || isWriteDisabled) {
      return;
    }

    const currentItems = keyInfoItems;
    const draggedIndex = currentItems.findIndex((item) => item.id === draggedKeyInfoId);
    const targetIndex = currentItems.findIndex((item) => item.id === targetKeyInfoId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const nextItems = [...currentItems];
    const [draggedItem] = nextItems.splice(draggedIndex, 1);
    nextItems.splice(targetIndex, 0, draggedItem);

    setKeyInfoItems(nextItems.map((item, index) => ({ ...item, sortOrder: index })));
    setReorderingKeyInfoId(draggedKeyInfoId);
    setError("");

    try {
      await updateKeyInfoOrder(nextItems);
      setKeyInfoItems(await getKeyInfo(eventId));
    } catch (keyInfoError) {
      console.error(keyInfoError);
      setKeyInfoItems(currentItems);
      setError("Could not reorder key info.");
    } finally {
      setReorderingKeyInfoId("");
    }
  };

  const reorderCompanyContact = async (companyId, sourceContactId, targetContactId) => {
    if (!canManageCompanyContacts || isWriteDisabled || reorderingCompanyContactId) return;
    if (!companyId || !sourceContactId || !targetContactId || sourceContactId === targetContactId) {
      return;
    }

    const currentContacts = eventContactsByCompanyId[companyId] || [];
    const sourceIndex = currentContacts.findIndex((contact) => contact.id === sourceContactId);
    const targetIndex = currentContacts.findIndex((contact) => contact.id === targetContactId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextContacts = [...currentContacts];
    const [movedContact] = nextContacts.splice(sourceIndex, 1);
    nextContacts.splice(targetIndex, 0, movedContact);
    const orderedContacts = nextContacts.map((contact, contactIndex) => ({
      ...contact,
      sortOrder: contactIndex,
    }));

    setEventContactsByCompanyId((current) => ({
      ...current,
      [companyId]: orderedContacts,
    }));
    setCompanyContactDropTargetId("");
    setReorderingCompanyContactId(companyId);
    setError("");

    try {
      await updateEventContactOrder(orderedContacts);
    } catch (reorderError) {
      console.error(reorderError);
      setError("Could not reorder company contacts.");
      await reloadEventContacts();
    } finally {
      setReorderingCompanyContactId("");
    }
  };

  const reorderContactCompany = async (sourceCompanyId, targetCompanyId) => {
    if (!canManageContactCompanyOrder || isWriteDisabled || savingContactCompanyOrder) return;
    if (!sourceCompanyId || !targetCompanyId || sourceCompanyId === targetCompanyId) return;

    const companyIds = contactCompanies.map((company) => company.id);
    const sourceIndex = companyIds.indexOf(sourceCompanyId);
    const targetIndex = companyIds.indexOf(targetCompanyId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextCompanyIds = [...companyIds];
    const [movedCompanyId] = nextCompanyIds.splice(sourceIndex, 1);
    nextCompanyIds.splice(targetIndex, 0, movedCompanyId);

    setForm((current) => ({
      ...current,
      contactCompanyOrder: nextCompanyIds,
    }));
    setContactCompanyDropTargetId("");
    setSavingContactCompanyOrder(true);
    setError("");

    try {
      await updateEventContactCompanyOrder(eventId, nextCompanyIds, userProfile);
      setSavedEventForm((current) => ({
        ...current,
        contactCompanyOrder: nextCompanyIds,
      }));
    } catch (orderError) {
      console.error(orderError);
      setError("Could not save contact company order.");
      setForm((current) => ({
        ...current,
        contactCompanyOrder: savedEventForm.contactCompanyOrder || [],
      }));
    } finally {
      setSavingContactCompanyOrder(false);
    }
  };

  return {
    activeInfoTab,
    setActiveInfoTab,
    companyContactsByCompanyId,
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
  };
}
