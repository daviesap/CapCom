import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import Loading from "../components/Loading.jsx";
import Modal from "../components/Modal.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";
import {
  createHelpItem,
  deleteHelpItem,
  getCachedHelpItems,
  getHelpItems,
  HELP_DEFAULT_FORM,
  HELP_ITEM_TYPES,
  HELP_TYPE_LABELS,
  updateHelpItem,
} from "../services/helpService.js";

const helpTabs = [
  { type: HELP_ITEM_TYPES.INFORMATION, label: "Information", icon: "info" },
  { type: HELP_ITEM_TYPES.FAQ, label: "FAQ", icon: "question" },
];

function groupHelpItems(helpItems) {
  return helpItems.reduce((groups, helpItem) => {
    const category = helpItem.category || "General";
    if (!groups[category]) groups[category] = [];
    groups[category].push(helpItem);
    return groups;
  }, {});
}

function HelpItemDetail({ detail }) {
  if (!detail) return null;
  return <p className="help-item-detail">{detail}</p>;
}

export default function HelpPage() {
  const { profileLoading, isSuperAdmin } = useAuth();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [activeTab, setActiveTab] = useState(HELP_ITEM_TYPES.INFORMATION);
  const [helpItems, setHelpItems] = useState([]);
  const [helpLoading, setHelpLoading] = useState(true);
  const [helpError, setHelpError] = useState("");
  const [helpForm, setHelpForm] = useState(HELP_DEFAULT_FORM);
  const [isHelpFormOpen, setIsHelpFormOpen] = useState(false);
  const [editingHelpItemId, setEditingHelpItemId] = useState("");
  const [savingHelpItem, setSavingHelpItem] = useState(false);
  const [deletingHelpItemId, setDeletingHelpItemId] = useState("");
  const canManageHelp = isSuperAdmin;
  const isDeletingCurrentHelpItem = Boolean(
    editingHelpItemId && deletingHelpItemId === editingHelpItemId
  );

  const activeHelpItems = useMemo(
    () => helpItems.filter((helpItem) => helpItem.type === activeTab),
    [activeTab, helpItems]
  );
  const groupedHelpItems = useMemo(() => groupHelpItems(activeHelpItems), [activeHelpItems]);
  const categoryNames = useMemo(() => Object.keys(groupedHelpItems), [groupedHelpItems]);

  const loadHelpItems = async ({ showLoading = true } = {}) => {
    setHelpError("");
    if (showLoading) setHelpLoading(true);
    try {
      setHelpItems(await getHelpItems());
    } catch (loadError) {
      console.error(loadError);
      setHelpError("Could not load help content.");
    } finally {
      setHelpLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoading) return;
    const cachedHelpItems = getCachedHelpItems();
    if (cachedHelpItems.length > 0) {
      setHelpItems(cachedHelpItems);
      setHelpLoading(false);
      loadHelpItems({ showLoading: false });
      return;
    }

    loadHelpItems();
  }, [profileLoading]);

  const updateHelpFormField = (field, value) => {
    setHelpForm((current) => ({ ...current, [field]: value }));
  };

  const resetHelpForm = () => {
    setIsHelpFormOpen(false);
    setEditingHelpItemId("");
    setHelpForm({ ...HELP_DEFAULT_FORM, type: activeTab });
  };

  const startAddingHelpItem = () => {
    setHelpError("");
    setIsHelpFormOpen(true);
    setEditingHelpItemId("");
    setHelpForm({ ...HELP_DEFAULT_FORM, type: activeTab });
  };

  const startEditingHelpItem = (helpItem) => {
    setHelpError("");
    setIsHelpFormOpen(true);
    setEditingHelpItemId(helpItem.id);
    setHelpForm({
      type: helpItem.type || HELP_ITEM_TYPES.INFORMATION,
      category: helpItem.category || "",
      title: helpItem.title || "",
      detail: helpItem.detail || "",
      sort: String(helpItem.sort ?? 0),
    });
  };

  const saveHelpItem = async (submitEvent) => {
    submitEvent.preventDefault();
    setHelpError("");

    if (isOffline) {
      setHelpError("Editing is disabled while offline.");
      return;
    }
    if (!canManageHelp) {
      setHelpError("Your role cannot manage help content.");
      return;
    }
    if (!helpForm.title.trim()) {
      setHelpError("Title is required.");
      return;
    }

    setSavingHelpItem(true);
    try {
      if (editingHelpItemId) {
        await updateHelpItem(editingHelpItemId, helpForm);
      } else {
        await createHelpItem(helpForm);
      }

      const savedType = helpForm.type;
      resetHelpForm();
      setActiveTab(savedType);
      await loadHelpItems();
    } catch (saveError) {
      console.error(saveError);
      setHelpError(saveError?.message || "Could not save help item.");
    } finally {
      setSavingHelpItem(false);
    }
  };

  const removeHelpItem = async (helpItemId) => {
    setHelpError("");

    if (isOffline) {
      setHelpError("Editing is disabled while offline.");
      return;
    }
    if (!canManageHelp) {
      setHelpError("Your role cannot manage help content.");
      return;
    }

    setDeletingHelpItemId(helpItemId);
    try {
      await deleteHelpItem(helpItemId);
      if (editingHelpItemId === helpItemId) resetHelpForm();
      await loadHelpItems();
    } catch (deleteError) {
      console.error(deleteError);
      setHelpError("Could not delete help item.");
    } finally {
      setDeletingHelpItemId("");
    }
  };

  if (profileLoading) {
    return <Loading />;
  }

  return (
    <section className="page help-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Help</h1>
        </div>
        {canManageHelp ? (
          <button
            className="button"
            type="button"
            disabled={isOffline}
            onClick={startAddingHelpItem}
          >
            <CapcomIcon name="add" size={18} weight="bold" />
            <span className="button-label">Add</span>
          </button>
        ) : null}
      </div>

      {isOffline ? (
        <p className="message offline-message">Offline mode: help content is read-only.</p>
      ) : null}
      {helpError ? <p className="error">{helpError}</p> : null}

      <div className="tabs help-tabs" aria-label="Help content tabs">
        {helpTabs.map((tab) => (
          <button
            className={activeTab === tab.type ? "tab active" : "tab"}
            type="button"
            key={tab.type}
            aria-pressed={activeTab === tab.type}
            onClick={() => setActiveTab(tab.type)}
          >
            <CapcomIcon name={tab.icon} size={18} weight="duotone" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <section className="panel help-panel">
        {helpLoading ? <p className="message">Loading help content...</p> : null}

        {!helpLoading && activeHelpItems.length === 0 ? (
          <div className="help-empty-state">
            <span className="profile-avatar" aria-hidden="true">
              <CapcomIcon name="question" size={28} weight="duotone" />
            </span>
            <div>
              <h2>No {HELP_TYPE_LABELS[activeTab].toLowerCase()} yet</h2>
              <p className="page-subtitle">
                {canManageHelp
                  ? "Add a help item to make it available to users."
                  : "Help content will appear here when it has been added."}
              </p>
            </div>
          </div>
        ) : null}

        {!helpLoading && categoryNames.length > 0 ? (
          <div className="help-category-list">
            {categoryNames.map((category) => (
              <details className="help-category" key={category} open>
                <summary className="help-category-heading">
                  <span className="help-category-title">
                    <span>{category}</span>
                    <span className="help-category-count">
                      {groupedHelpItems[category].length}
                    </span>
                  </span>
                  <CapcomIcon name="caretRight" size={18} weight="bold" />
                </summary>
                <div className="help-item-list">
                  {groupedHelpItems[category].map((helpItem) => (
                    activeTab === HELP_ITEM_TYPES.FAQ ? (
                      <details className="help-faq-row" key={helpItem.id}>
                        <summary>
                          <span>{helpItem.title}</span>
                          <CapcomIcon name="caretRight" size={18} weight="bold" />
                        </summary>
                        <div className="help-faq-body">
                          <HelpItemDetail detail={helpItem.detail} />
                          {canManageHelp ? (
                            <div className="help-item-actions">
                              <button
                                className="button secondary"
                                type="button"
                                disabled={isOffline || savingHelpItem}
                                onClick={() => startEditingHelpItem(helpItem)}
                              >
                                <CapcomIcon name="edit" size={18} weight="bold" />
                                <span className="button-label">Edit</span>
                              </button>
                              <button
                                className="button danger"
                                type="button"
                                disabled={isOffline || deletingHelpItemId === helpItem.id}
                                onClick={() => removeHelpItem(helpItem.id)}
                              >
                                <CapcomIcon name="delete" size={18} weight="bold" />
                                <span className="button-label">
                                  {deletingHelpItemId === helpItem.id ? "Deleting..." : "Delete"}
                                </span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </details>
                    ) : (
                      <article className="help-info-card" key={helpItem.id}>
                        <div className="help-info-copy">
                          <h3>{helpItem.title}</h3>
                          <HelpItemDetail detail={helpItem.detail} />
                        </div>
                        {canManageHelp ? (
                          <div className="help-item-actions">
                            <button
                              className="button secondary"
                              type="button"
                              disabled={isOffline || savingHelpItem}
                              onClick={() => startEditingHelpItem(helpItem)}
                            >
                              <CapcomIcon name="edit" size={18} weight="bold" />
                              <span className="button-label">Edit</span>
                            </button>
                            <button
                              className="button danger"
                              type="button"
                              disabled={isOffline || deletingHelpItemId === helpItem.id}
                              onClick={() => removeHelpItem(helpItem.id)}
                            >
                              <CapcomIcon name="delete" size={18} weight="bold" />
                              <span className="button-label">
                                {deletingHelpItemId === helpItem.id ? "Deleting..." : "Delete"}
                              </span>
                            </button>
                          </div>
                        ) : null}
                      </article>
                    )
                  ))}
                </div>
              </details>
            ))}
          </div>
        ) : null}
      </section>

      {canManageHelp && isHelpFormOpen ? (
        <Modal
          title={editingHelpItemId ? "Edit help item" : "Add help item"}
          subtitle="Global Help content"
          labelledBy="helpFormTitle"
          onClose={resetHelpForm}
        >
          {helpError ? <p className="error">{helpError}</p> : null}
          <form className="help-form" onSubmit={saveHelpItem}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="helpType">Type</label>
                <select
                  id="helpType"
                  value={helpForm.type}
                  disabled={savingHelpItem || isDeletingCurrentHelpItem || isOffline}
                  onChange={(event) => updateHelpFormField("type", event.target.value)}
                >
                  {helpTabs.map((tab) => (
                    <option key={tab.type} value={tab.type}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="helpCategory">Category</label>
                <input
                  id="helpCategory"
                  value={helpForm.category}
                  disabled={savingHelpItem || isDeletingCurrentHelpItem || isOffline}
                  onChange={(event) => updateHelpFormField("category", event.target.value)}
                  placeholder="General"
                />
              </div>
              <div className="form-row">
                <label htmlFor="helpSort">Sort</label>
                <input
                  id="helpSort"
                  type="number"
                  value={helpForm.sort}
                  disabled={savingHelpItem || isDeletingCurrentHelpItem || isOffline}
                  onChange={(event) => updateHelpFormField("sort", event.target.value)}
                  inputMode="numeric"
                />
              </div>
              <div className="form-row full">
                <label htmlFor="helpTitle">Title</label>
                <input
                  id="helpTitle"
                  value={helpForm.title}
                  disabled={savingHelpItem || isDeletingCurrentHelpItem || isOffline}
                  onChange={(event) => updateHelpFormField("title", event.target.value)}
                  placeholder="Help item title"
                  required
                />
              </div>
              <div className="form-row full">
                <label htmlFor="helpDetail">Detail</label>
                <textarea
                  id="helpDetail"
                  value={helpForm.detail}
                  disabled={savingHelpItem || isDeletingCurrentHelpItem || isOffline}
                  onChange={(event) => updateHelpFormField("detail", event.target.value)}
                  placeholder="Plain text guidance"
                  rows="6"
                />
              </div>
            </div>
            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={savingHelpItem || isDeletingCurrentHelpItem || isOffline}
              >
                {savingHelpItem
                  ? "Saving..."
                  : editingHelpItemId
                    ? "Save"
                    : "Create help item"}
              </button>
              {editingHelpItemId ? (
                <button
                  className="button danger"
                  type="button"
                  disabled={savingHelpItem || isDeletingCurrentHelpItem || isOffline}
                  onClick={() => removeHelpItem(editingHelpItemId)}
                >
                  <CapcomIcon name="delete" size={18} weight="bold" />
                  <span className="button-label">
                    {isDeletingCurrentHelpItem ? "Deleting..." : "Delete"}
                  </span>
                </button>
              ) : null}
              <button
                className="button secondary"
                type="button"
                disabled={savingHelpItem || isDeletingCurrentHelpItem}
                onClick={resetHelpForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
