import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";
import {
  ISSUE_DEFAULTS,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  createIssue,
  getIssues,
  updateIssue,
  updateIssueStatus,
  validateIssueImageFile,
} from "../services/issueService.js";
import { notify } from "../utils/notify.js";
import Modal from "./Modal.jsx";

const emptyIssueForm = {
  ...ISSUE_DEFAULTS,
};

const ISSUE_STATUS_FILTERS = ["All", ...ISSUE_STATUSES];
const ISSUE_TYPE_FILTERS = ["All", ...ISSUE_TYPES];

function getSaveErrorMessage(error, fallbackMessage) {
  return error?.message || fallbackMessage;
}

function formatIssueDate(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : null;
  if (!date) return "Just now";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getIssueStatusToneClassName(status) {
  if (status === "Closed") return "issue-status-closed";
  return "issue-status-open";
}

function getIssueFilterStatusToneClassName(status) {
  if (status === "All") return "issue-status-all";
  return getIssueStatusToneClassName(status);
}

function getIssueStatusClassName(status) {
  return `status-pill ${getIssueStatusToneClassName(status)}`;
}

function getIssueTypeIconName(type) {
  if (type === "Major Bug") return "issueMajorBug";
  if (type === "Minor Bug") return "issueMinorBug";
  if (type === "Friction") return "issueFriction";
  if (type === "Future") return "issueFuture";
  return "issueMinorBug";
}

export default function IssuesPanel() {
  const { userProfile, isSuperAdmin, profileLoading } = useAuth();
  const [issues, setIssues] = useState([]);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [issueImageFile, setIssueImageFile] = useState(null);
  const [currentIssueImage, setCurrentIssueImage] = useState({ path: "", url: "" });
  const [isIssueImageRemoved, setIsIssueImageRemoved] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState("");
  const [isIssueFormOpen, setIsIssueFormOpen] = useState(false);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issueSaving, setIssueSaving] = useState(false);
  const [issueUpdatingId, setIssueUpdatingId] = useState("");
  const [activeIssueStatusMenuId, setActiveIssueStatusMenuId] = useState("");
  const [isIssueFilterMenuOpen, setIsIssueFilterMenuOpen] = useState(false);
  const [isIssueTypeFilterMenuOpen, setIsIssueTypeFilterMenuOpen] = useState(false);
  const [issueStatusFilter, setIssueStatusFilter] = useState("All");
  const [issueTypeFilter, setIssueTypeFilter] = useState("All");
  const [issueError, setIssueError] = useState("");
  const issueFileInputRef = useRef(null);

  const issueStatusCounts = useMemo(() => {
    const issuesMatchingTypeFilter = issues.filter((issue) =>
      issueTypeFilter === "All" || issue.type === issueTypeFilter
    );

    return issuesMatchingTypeFilter.reduce((counts, issue) => ({
      ...counts,
      [issue.status]: (counts[issue.status] || 0) + 1,
    }), { All: issuesMatchingTypeFilter.length });
  }, [issues, issueTypeFilter]);

  const issueTypeCounts = useMemo(() => {
    const issuesMatchingStatusFilter = issues.filter((issue) =>
      issueStatusFilter === "All" || issue.status === issueStatusFilter
    );

    return issuesMatchingStatusFilter.reduce((counts, issue) => ({
      ...counts,
      [issue.type]: (counts[issue.type] || 0) + 1,
    }), { All: issuesMatchingStatusFilter.length });
  }, [issues, issueStatusFilter]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => (
      (issueStatusFilter === "All" || issue.status === issueStatusFilter)
      && (issueTypeFilter === "All" || issue.type === issueTypeFilter)
    ));
  }, [issues, issueStatusFilter, issueTypeFilter]);

  const loadIssues = async () => {
    if (!isSuperAdmin) {
      setIssues([]);
      return;
    }

    setIssuesLoading(true);
    setIssueError("");
    try {
      setIssues(await getIssues({ limitCount: 50 }));
    } catch (loadError) {
      console.error(loadError);
      setIssueError("Could not load issues.");
    } finally {
      setIssuesLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoading || !isSuperAdmin) return;
    loadIssues();
  }, [profileLoading, isSuperAdmin]);

  const updateIssueField = (field, value) => {
    setIssueForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetIssueForm = () => {
    setIssueForm(emptyIssueForm);
    setIssueImageFile(null);
    setCurrentIssueImage({ path: "", url: "" });
    setIsIssueImageRemoved(false);
    setEditingIssueId("");
    if (issueFileInputRef.current) {
      issueFileInputRef.current.value = "";
    }
  };

  const openIssueForm = () => {
    resetIssueForm();
    setIssueError("");
    setIsIssueFormOpen(true);
  };

  const openIssueEditForm = (issue) => {
    setIssueForm({
      title: issue.title || "",
      detail: issue.detail || "",
      status: issue.status || ISSUE_DEFAULTS.status,
      type: issue.type || ISSUE_DEFAULTS.type,
    });
    setEditingIssueId(issue.id);
    setIssueImageFile(null);
    setCurrentIssueImage({
      path: issue.imagePath || "",
      url: issue.imageUrl || "",
    });
    setIsIssueImageRemoved(false);
    if (issueFileInputRef.current) {
      issueFileInputRef.current.value = "";
    }
    setIssueError("");
    setActiveIssueStatusMenuId("");
    setIsIssueFormOpen(true);
  };

  const closeIssueForm = () => {
    if (issueSaving) return;
    resetIssueForm();
    setIsIssueFormOpen(false);
  };

  const setIssueImage = (file) => {
    const validationError = validateIssueImageFile(file);
    if (validationError) {
      setIssueError(validationError);
      setIssueImageFile(null);
      if (issueFileInputRef.current) {
        issueFileInputRef.current.value = "";
      }
      return;
    }

    setIssueError("");
    setIssueImageFile(file);
    setIsIssueImageRemoved(false);
  };

  const removeIssueImage = () => {
    setIssueImageFile(null);
    setIsIssueImageRemoved(true);
    if (issueFileInputRef.current) {
      issueFileInputRef.current.value = "";
    }
  };

  const handleIssuePaste = (pasteEvent) => {
    const imageFile = Array.from(pasteEvent.clipboardData?.files || [])
      .find((file) => file.type.startsWith("image/"));
    if (!imageFile) return;

    setIssueImage(imageFile);
  };

  const handleIssueSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    setIssueSaving(true);
    setIssueError("");

    try {
      const isEditingIssue = Boolean(editingIssueId);
      const savedIssue = isEditingIssue
        ? await updateIssue(editingIssueId, issueForm, issueImageFile, {
            existingImagePath: currentIssueImage.path,
            removeImage: isIssueImageRemoved && !issueImageFile,
          })
        : await createIssue(issueForm, issueImageFile, userProfile);
      resetIssueForm();
      setIsIssueFormOpen(false);
      await loadIssues();
      if (savedIssue.imageUploadWarning) {
        setIssueError(savedIssue.imageUploadWarning);
      } else {
        notify.success("Issue saved.");
      }
    } catch (saveError) {
      console.error(saveError);
      setIssueError(getSaveErrorMessage(saveError, "Could not save issue."));
    } finally {
      setIssueSaving(false);
    }
  };

  const handleIssueStatusChange = async (issue, status) => {
    setIssueUpdatingId(issue.id);
    setIssueError("");

    try {
      await updateIssueStatus(issue.id, status);
      setActiveIssueStatusMenuId("");
      setIssues((currentIssues) =>
        currentIssues.map((currentIssue) =>
          currentIssue.id === issue.id
            ? { ...currentIssue, status }
            : currentIssue
        )
      );
    } catch (saveError) {
      console.error(saveError);
      setIssueError("Could not update issue status.");
    } finally {
      setIssueUpdatingId("");
    }
  };

  if (profileLoading) return null;
  if (!isSuperAdmin) return null;

  return (
    <>
      <div className="admin-grid">
        <section className="panel">
          <div className="panel-heading issue-panel-heading">
            <div>
              <h2>Issues</h2>
            </div>
            {!isIssueFormOpen ? (
              <button
                className="button admin-add-issue-button"
                type="button"
                aria-label="Add new issue"
                disabled={issueSaving}
                onClick={openIssueForm}
              >
                <CapcomIcon name="add" size={18} weight="bold" />
                <span className="button-label">Add Issue</span>
              </button>
            ) : null}
          </div>
          <div className="issue-panel-actions">
            <div className="issue-status-filter" aria-label="Filter issues by status">
              {ISSUE_STATUS_FILTERS.map((status) => (
                <button
                  className={issueStatusFilter === status
                    ? "issue-filter-button active"
                    : "issue-filter-button"}
                  type="button"
                  key={status}
                  aria-pressed={issueStatusFilter === status}
                  onClick={() => {
                    setIssueStatusFilter(status);
                    setActiveIssueStatusMenuId("");
                    setIsIssueFilterMenuOpen(false);
                    setIsIssueTypeFilterMenuOpen(false);
                  }}
                >
                  {status !== "All" ? (
                    <span
                      className={`issue-status-dot ${getIssueStatusToneClassName(status)}`}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span>{status}</span>
                  <span className="issue-filter-count">{issueStatusCounts[status] || 0}</span>
                </button>
              ))}
            </div>
            <div
              className="issue-status-filter-menu"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsIssueFilterMenuOpen(false);
                }
              }}
            >
              <button
                className="issue-status-trigger issue-filter-trigger"
                type="button"
                aria-expanded={isIssueFilterMenuOpen}
                aria-haspopup="menu"
                aria-label="Filter issues by status"
                onClick={() => {
                  setIsIssueFilterMenuOpen((isOpen) => !isOpen);
                  setIsIssueTypeFilterMenuOpen(false);
                  setActiveIssueStatusMenuId("");
                }}
              >
                <span className="issue-filter-trigger-label">
                  <span
                    className={`issue-status-dot ${getIssueFilterStatusToneClassName(issueStatusFilter)}`}
                    aria-hidden="true"
                  />
                  <span>{issueStatusFilter}</span>
                  <span className="issue-filter-count">{issueStatusCounts[issueStatusFilter] || 0}</span>
                </span>
                <CapcomIcon name="caretRight" size={16} weight="bold" />
              </button>

              {isIssueFilterMenuOpen ? (
                <div className="issue-status-options issue-filter-options" role="menu">
                  {ISSUE_STATUS_FILTERS.map((status) => (
                    <button
                      className={issueStatusFilter === status
                        ? "issue-status-option issue-filter-option active"
                        : "issue-status-option issue-filter-option"}
                      type="button"
                      role="menuitem"
                      key={status}
                      onClick={() => {
                        setIssueStatusFilter(status);
                        setIsIssueFilterMenuOpen(false);
                        setIsIssueTypeFilterMenuOpen(false);
                        setActiveIssueStatusMenuId("");
                      }}
                    >
                      <span
                        className={`issue-status-dot ${getIssueFilterStatusToneClassName(status)}`}
                        aria-hidden="true"
                      />
                      <span>{status}</span>
                      <span className="issue-filter-count">{issueStatusCounts[status] || 0}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="issue-type-filter" aria-label="Filter issues by type">
              {ISSUE_TYPE_FILTERS.map((type) => (
                <button
                  className={issueTypeFilter === type
                    ? "issue-filter-button active"
                    : "issue-filter-button"}
                  type="button"
                  key={type}
                  aria-pressed={issueTypeFilter === type}
                  onClick={() => {
                    setIssueTypeFilter(type);
                    setActiveIssueStatusMenuId("");
                    setIsIssueFilterMenuOpen(false);
                    setIsIssueTypeFilterMenuOpen(false);
                  }}
                >
                  {type !== "All" ? (
                    <CapcomIcon name={getIssueTypeIconName(type)} size={16} weight="duotone" />
                  ) : null}
                  <span>{type}</span>
                  <span className="issue-filter-count">{issueTypeCounts[type] || 0}</span>
                </button>
              ))}
            </div>
            <div
              className="issue-type-filter-menu"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsIssueTypeFilterMenuOpen(false);
                }
              }}
            >
              <button
                className="issue-status-trigger issue-filter-trigger"
                type="button"
                aria-expanded={isIssueTypeFilterMenuOpen}
                aria-haspopup="menu"
                aria-label="Filter issues by type"
                onClick={() => {
                  setIsIssueTypeFilterMenuOpen((isOpen) => !isOpen);
                  setIsIssueFilterMenuOpen(false);
                  setActiveIssueStatusMenuId("");
                }}
              >
                <span className="issue-filter-trigger-label">
                  {issueTypeFilter !== "All" ? (
                    <CapcomIcon name={getIssueTypeIconName(issueTypeFilter)} size={16} weight="duotone" />
                  ) : null}
                  <span>{issueTypeFilter}</span>
                  <span className="issue-filter-count">{issueTypeCounts[issueTypeFilter] || 0}</span>
                </span>
                <CapcomIcon name="caretRight" size={16} weight="bold" />
              </button>

              {isIssueTypeFilterMenuOpen ? (
                <div className="issue-status-options issue-filter-options" role="menu">
                  {ISSUE_TYPE_FILTERS.map((type) => (
                    <button
                      className={issueTypeFilter === type
                        ? "issue-status-option issue-filter-option active"
                        : "issue-status-option issue-filter-option"}
                      type="button"
                      role="menuitem"
                      key={type}
                      onClick={() => {
                        setIssueTypeFilter(type);
                        setIsIssueTypeFilterMenuOpen(false);
                        setIsIssueFilterMenuOpen(false);
                        setActiveIssueStatusMenuId("");
                      }}
                    >
                      {type !== "All" ? (
                        <CapcomIcon name={getIssueTypeIconName(type)} size={16} weight="duotone" />
                      ) : (
                        <span />
                      )}
                      <span>{type}</span>
                      <span className="issue-filter-count">{issueTypeCounts[type] || 0}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {issueError ? <p className="error">{issueError}</p> : null}

          {issuesLoading ? <p className="message">Loading issues...</p> : null}
          {!issuesLoading && !issueError && issues.length === 0 ? (
            <p className="message">No issues yet.</p>
          ) : null}
          {!issuesLoading && !issueError && issues.length > 0 && filteredIssues.length === 0 ? (
            <p className="message">No issues match the selected filters.</p>
          ) : null}

          {!issuesLoading && filteredIssues.length > 0 ? (
            <div className="issue-list">
              {filteredIssues.map((issue) => (
                <article className="issue-list-row" key={issue.id}>
                  <div className="issue-card-main">
                    {issue.imageUrl ? (
                      <a
                        className="issue-image-link"
                        href={issue.imageUrl}
                        rel="noreferrer"
                        target="_blank"
                        aria-label={`Open image for ${issue.title}`}
                      >
                        <img className="issue-image" src={issue.imageUrl} alt="" />
                      </a>
                    ) : null}
                    <span className="issue-type-icon" aria-hidden="true">
                      <CapcomIcon name={getIssueTypeIconName(issue.type)} size={20} weight="duotone" />
                    </span>
                    <div className="issue-card-copy">
                      <div className="client-title-line">
                        <h3>{issue.title}</h3>
                        <span className={getIssueStatusClassName(issue.status)}>{issue.status}</span>
                      </div>
                      <p className="item-meta">
                        {formatIssueDate(issue.createdAt)} | {issue.type}
                      </p>
                      {issue.detail ? (
                        <p className="issue-detail">{issue.detail}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="issue-actions">
                    <button
                      className="button secondary issue-edit-button"
                      type="button"
                      aria-label={`Edit ${issue.title}`}
                      disabled={issueSaving}
                      onClick={() => openIssueEditForm(issue)}
                    >
                      <CapcomIcon name="edit" size={18} weight="bold" />
                      <span className="button-label">Edit</span>
                    </button>
                    <div
                      className="issue-status-menu"
                      onBlur={(event) => {
                        if (!event.currentTarget.contains(event.relatedTarget)) {
                          setActiveIssueStatusMenuId("");
                        }
                      }}
                    >
                      <button
                        className="issue-status-trigger"
                        type="button"
                        aria-expanded={activeIssueStatusMenuId === issue.id}
                        aria-haspopup="menu"
                        aria-label={`Status for ${issue.title}`}
                        disabled={issueUpdatingId === issue.id}
                        onClick={() => {
                          setIsIssueFilterMenuOpen(false);
                          setActiveIssueStatusMenuId((currentIssueId) =>
                            currentIssueId === issue.id ? "" : issue.id
                          );
                        }}
                      >
                        <span
                          className={`issue-status-dot ${getIssueStatusToneClassName(issue.status)}`}
                          aria-hidden="true"
                        />
                        <span>{issue.status}</span>
                        <CapcomIcon name="caretRight" size={16} weight="bold" />
                      </button>

                      {activeIssueStatusMenuId === issue.id ? (
                        <div className="issue-status-options" role="menu">
                          {ISSUE_STATUSES.map((status) => (
                            <button
                              className="issue-status-option"
                              type="button"
                              role="menuitem"
                              key={status}
                              disabled={issueUpdatingId === issue.id}
                              onClick={() => handleIssueStatusChange(issue, status)}
                            >
                              <span
                                className={`issue-status-dot ${getIssueStatusToneClassName(status)}`}
                                aria-hidden="true"
                              />
                              <span>{status}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {isIssueFormOpen ? (
        <Modal
          title={editingIssueId ? "Edit Issue" : "Add Issue"}
          subtitle=""
          labelledBy="issueFormTitle"
          closeLabel="Close issue form"
          onClose={closeIssueForm}
        >
          <form className="admin-inline-form issue-form" onSubmit={handleIssueSubmit}>
            <div className="form-row">
              <label htmlFor="issueTitle">Title</label>
              <input
                id="issueTitle"
                value={issueForm.title}
                disabled={issueSaving}
                onChange={(event) => updateIssueField("title", event.target.value)}
                onPaste={handleIssuePaste}
                placeholder="Brief issue title"
                required
              />
            </div>

            <div className="form-grid issue-form-grid">
              <div className="form-row full">
                <label htmlFor="issueDetail">Detail</label>
                <textarea
                  id="issueDetail"
                  value={issueForm.detail}
                  disabled={issueSaving}
                  onChange={(event) => updateIssueField("detail", event.target.value)}
                  onPaste={handleIssuePaste}
                  placeholder="Optional context, steps or notes"
                  rows={3}
                />
              </div>
              <div className="form-row full">
                <span className="field-label" id="issueTypeLabel">Type</span>
                <div
                  className="issue-type-chips"
                  role="radiogroup"
                  aria-labelledby="issueTypeLabel"
                >
                  {ISSUE_TYPES.map((type) => (
                    <button
                      className={issueForm.type === type
                        ? "issue-choice-chip issue-type-chip active"
                        : "issue-choice-chip issue-type-chip"}
                      type="button"
                      role="radio"
                      aria-checked={issueForm.type === type}
                      key={type}
                      disabled={issueSaving}
                      onClick={() => updateIssueField("type", type)}
                    >
                      <CapcomIcon name={getIssueTypeIconName(type)} size={18} weight="duotone" />
                      <span>{type}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <label htmlFor="issueImage">Image</label>
                <input
                  id="issueImage"
                  ref={issueFileInputRef}
                  type="file"
                  accept="image/*"
                  disabled={issueSaving}
                  onChange={(event) => setIssueImage(event.target.files?.[0] || null)}
                />
                {editingIssueId && currentIssueImage.url && !isIssueImageRemoved && !issueImageFile ? (
                  <div className="issue-image-upload-preview">
                    <a
                      className="issue-image-preview-link"
                      href={currentIssueImage.url}
                      rel="noreferrer"
                      target="_blank"
                      aria-label="Open current issue image"
                    >
                      <img src={currentIssueImage.url} alt="" />
                    </a>
                    <button
                      className="button secondary issue-image-remove-button"
                      type="button"
                      disabled={issueSaving}
                      onClick={removeIssueImage}
                    >
                      <CapcomIcon name="delete" size={18} weight="bold" />
                      Remove Image
                    </button>
                  </div>
                ) : null}
                <p className="item-meta">
                  {issueImageFile
                    ? issueImageFile.name
                    : isIssueImageRemoved
                      ? "Current image will be removed when you save."
                    : editingIssueId
                      ? currentIssueImage.url
                        ? "Optional. Choose or paste a new screenshot to replace the current image."
                        : "Optional. Choose or paste a screenshot."
                      : "Optional. You can also paste a screenshot."}
                </p>
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={issueSaving || !issueForm.title.trim()}
              >
                <CapcomIcon name={editingIssueId ? "edit" : "add"} size={18} weight="bold" />
                {issueSaving ? "Saving..." : editingIssueId ? "Save Issue" : "Add Issue"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={issueSaving}
                onClick={closeIssueForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
