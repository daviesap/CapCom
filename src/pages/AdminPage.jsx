import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { USER_ROLES, canManageAssignments } from "../auth/roles.js";
import Modal from "../components/Modal.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";
import {
  CLIENT_DEFAULTS,
  createClient,
  getClient,
  getClients,
  updateClient,
} from "../services/clientService.js";
import { sendUserPasswordResetEmail } from "../services/authEmailService.js";
import {
  canManageUserProfile,
  getUserProfiles,
  updateUserProfile,
} from "../services/userService.js";
import { createAuthUserProfile } from "../services/functionService.js";
import { getEvents } from "../services/eventService.js";
import {
  getAssignmentsForUser,
  removeEventAssignment,
  setEventAssignment,
} from "../services/eventAssignmentService.js";
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

const emptyClientForm = {
  clientName: "",
  clientSlug: "",
  logoUrl: "",
  primaryColour: "",
  secondaryColour: "",
  isActive: true,
};

const emptyUserForm = {
  uid: "",
  email: "",
  displayName: "",
  role: USER_ROLES.USER,
  clientId: "",
  isActive: true,
};

const emptyIssueForm = {
  ...ISSUE_DEFAULTS,
};

const ISSUE_STATUS_FILTERS = ["All", ...ISSUE_STATUSES];
const ISSUE_TYPE_FILTERS = ["All", ...ISSUE_TYPES];

function slugifyClientName(clientName) {
  return clientName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getClientName(clients, clientId) {
  if (!clientId) return "None";
  return clients.find((client) => client.id === clientId)?.clientName || clientId;
}

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
  if (type === "Feature") return "issueFeature";
  if (type === "Nice Idea") return "issueNiceIdea";
  if (type === "Tweak") return "issueTweak";
  return "issueMinorBug";
}

export default function AdminPage() {
  const {
    user,
    userProfile,
    isSuperAdmin,
    isAdmin,
    profileLoading,
  } = useAuth();
  const canManageUsers = isSuperAdmin || isAdmin;

  const [activeAdminSection, setActiveAdminSection] = useState("users");
  const [clients, setClients] = useState([]);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [editingClientId, setEditingClientId] = useState("");
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [clientError, setClientError] = useState("");

  const [userProfiles, setUserProfiles] = useState([]);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [editingUserId, setEditingUserId] = useState("");
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState("");
  const [events, setEvents] = useState([]);
  const [assignmentUser, setAssignmentUser] = useState(null);
  const [assignmentEventIds, setAssignmentEventIds] = useState(new Set());
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsSaving, setAssignmentsSaving] = useState(false);
  const [issues, setIssues] = useState([]);
  const [issueForm, setIssueForm] = useState(emptyIssueForm);
  const [issueImageFile, setIssueImageFile] = useState(null);
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

  const selectableClients = useMemo(() => {
    if (isSuperAdmin) return clients;
    if (!userProfile?.clientId) return [];
    return clients.filter((client) => client.id === userProfile.clientId);
  }, [clients, isSuperAdmin, userProfile?.clientId]);

  const issueStatusCounts = useMemo(() => {
    return issues.reduce((counts, issue) => ({
      ...counts,
      [issue.status]: (counts[issue.status] || 0) + 1,
    }), { All: issues.length });
  }, [issues]);

  const issueTypeCounts = useMemo(() => {
    return issues.reduce((counts, issue) => ({
      ...counts,
      [issue.type]: (counts[issue.type] || 0) + 1,
    }), { All: issues.length });
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => (
      (issueStatusFilter === "All" || issue.status === issueStatusFilter)
      && (issueTypeFilter === "All" || issue.type === issueTypeFilter)
    ));
  }, [issues, issueStatusFilter, issueTypeFilter]);

  const loadClients = async () => {
    setClientsLoading(true);
    setClientError("");
    try {
      if (isSuperAdmin) {
        setClients(await getClients());
        return;
      }

      if (userProfile?.clientId) {
        const client = await getClient(userProfile.clientId);
        setClients(client ? [client] : []);
        return;
      }

      setClients([]);
    } catch (loadError) {
      console.error(loadError);
      setClientError("Could not load clients.");
    } finally {
      setClientsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUserError("");
    try {
      setUserProfiles(await getUserProfiles(userProfile));
    } catch (loadError) {
      console.error(loadError);
      setUserError("Could not load users.");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadEventsForAssignments = async () => {
    if (!canManageAssignments(userProfile)) {
      setEvents([]);
      return;
    }
    try {
      setEvents(await getEvents(userProfile));
    } catch (loadError) {
      console.error(loadError);
      setUserError("Could not load events for assignments.");
    }
  };

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
    if (profileLoading || !canManageUsers) return;
    loadClients();
    loadUsers();
    loadEventsForAssignments();
  }, [profileLoading, canManageUsers, userProfile]);

  useEffect(() => {
    if (profileLoading || !isSuperAdmin || activeAdminSection !== "issues") return;
    loadIssues();
  }, [profileLoading, isSuperAdmin, activeAdminSection]);

  const updateClientField = (field, value) => {
    setClientForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "clientName" && !editingClientId
        ? { clientSlug: slugifyClientName(value) }
        : {}),
    }));
  };

  const resetClientForm = () => {
    setClientForm(emptyClientForm);
    setEditingClientId("");
  };

  const closeClientForm = () => {
    resetClientForm();
    setIsClientFormOpen(false);
  };

  const openNewClientForm = () => {
    resetClientForm();
    setClientError("");
    setIsClientFormOpen(true);
  };

  const startEditingClient = (client) => {
    setEditingClientId(client.id);
    setClientForm({
      ...CLIENT_DEFAULTS,
      ...client,
      isActive: client.isActive !== false,
    });
    setClientError("");
    setIsClientFormOpen(true);
  };

  const handleClientSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    setClientSaving(true);
    setClientError("");

    try {
      const clientData = {
        clientName: clientForm.clientName.trim(),
        clientSlug: clientForm.clientSlug.trim(),
        logoUrl: clientForm.logoUrl.trim(),
        primaryColour: clientForm.primaryColour.trim(),
        secondaryColour: clientForm.secondaryColour.trim(),
        isActive: Boolean(clientForm.isActive),
      };

      if (editingClientId) {
        await updateClient(editingClientId, clientData);
      } else {
        await createClient(clientData, user?.uid);
      }

      resetClientForm();
      setIsClientFormOpen(false);
      await loadClients();
    } catch (saveError) {
      console.error(saveError);
      setClientError("Could not save client.");
    } finally {
      setClientSaving(false);
    }
  };

  const toggleClientActive = async (client) => {
    const isCurrentlyActive = client.isActive !== false;
    setClientSaving(true);
    setClientError("");

    try {
      await updateClient(client.id, {
        isActive: !isCurrentlyActive,
      });
      await loadClients();
    } catch (saveError) {
      console.error(saveError);
      setClientError("Could not update client status.");
    } finally {
      setClientSaving(false);
    }
  };

  const updateUserField = (field, value) => {
    setUserForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "role" && isAdmin
        ? { clientId: userProfile.clientId }
        : {}),
    }));
  };

  const resetUserForm = () => {
    setUserForm({
      ...emptyUserForm,
      role: USER_ROLES.USER,
      clientId: isAdmin ? userProfile?.clientId || "" : "",
    });
    setEditingUserId("");
  };

  const closeUserForm = () => {
    resetUserForm();
    setIsUserFormOpen(false);
  };

  const openNewUserForm = () => {
    resetUserForm();
    setUserError("");
    setIsUserFormOpen(true);
  };

  const startEditingUser = (profile) => {
    setEditingUserId(profile.id);
    setUserForm({
      uid: profile.id,
      email: profile.email || "",
      displayName: profile.displayName || "",
      role: profile.role || USER_ROLES.USER,
      clientId: profile.clientId || "",
      isActive: profile.isActive !== false,
    });
    setUserError("");
    setIsUserFormOpen(true);
  };

  const getUserFormData = () => {
    const role = isAdmin && userForm.role === USER_ROLES.ADMIN ? USER_ROLES.USER : userForm.role;
    const clientId = isAdmin ? userProfile.clientId : userForm.clientId;

    return {
      email: userForm.email.trim(),
      displayName: userForm.displayName.trim(),
      role,
      clientId,
      isActive: Boolean(userForm.isActive),
    };
  };

  const handleUserSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    setUserSaving(true);
    setUserError("");

    try {
      const uid = editingUserId || userForm.uid.trim();
      const userData = getUserFormData();

      if (editingUserId && !uid) {
        setUserError("Firebase Auth UID is required.");
        return;
      }

      if (!userData.clientId) {
        setUserError("Choose a client for this user.");
        return;
      }

      if (editingUserId) {
        await updateUserProfile(editingUserId, userData, userProfile);
      } else {
        const createdUser = await createAuthUserProfile(userData);
        try {
          await sendUserPasswordResetEmail(createdUser.email);
        } catch (emailError) {
          console.error(emailError);
          setUserError(getSaveErrorMessage(emailError, "Could not send password reset email."));
        }
      }

      resetUserForm();
      setIsUserFormOpen(false);
      await loadUsers();
    } catch (saveError) {
      console.error(saveError);
      setUserError(getSaveErrorMessage(saveError, "Could not save user profile."));
    } finally {
      setUserSaving(false);
    }
  };

  const toggleUserActive = async (profile) => {
    const isCurrentlyActive = profile.isActive !== false;
    setUserSaving(true);
    setUserError("");

    try {
      await updateUserProfile(
        profile.id,
        {
          email: profile.email || "",
          displayName: profile.displayName || "",
          role: profile.role,
          clientId: profile.clientId,
          isActive: !isCurrentlyActive,
        },
        userProfile
      );
      await loadUsers();
    } catch (saveError) {
      console.error(saveError);
      setUserError("Could not update user profile status.");
    } finally {
      setUserSaving(false);
    }
  };

  const sendPasswordReset = async (profile) => {
    setUserSaving(true);
    setUserError("");

    try {
      await sendUserPasswordResetEmail(profile.email);
    } catch (emailError) {
      console.error(emailError);
      setUserError(getSaveErrorMessage(emailError, "Could not send password reset email."));
    } finally {
      setUserSaving(false);
    }
  };

  const openAssignmentForm = async (profile) => {
    setAssignmentUser(profile);
    setAssignmentsLoading(true);
    setUserError("");
    try {
      const assignments = await getAssignmentsForUser(profile.id, userProfile);
      setAssignmentEventIds(new Set(assignments.map((assignment) => assignment.eventId)));
    } catch (assignmentError) {
      console.error(assignmentError);
      setUserError("Could not load event assignments.");
      setAssignmentUser(null);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const closeAssignmentForm = () => {
    if (assignmentsSaving) return;
    setAssignmentUser(null);
    setAssignmentEventIds(new Set());
  };

  const toggleAssignmentEvent = (eventId) => {
    setAssignmentEventIds((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const saveAssignments = async () => {
    if (!assignmentUser) return;
    setAssignmentsSaving(true);
    setUserError("");
    try {
      const existingAssignments = await getAssignmentsForUser(assignmentUser.id, userProfile);
      const nextEventIds = assignmentEventIds;
      const targetEvents = events.filter((event) => nextEventIds.has(event.id));

      await Promise.all([
        ...targetEvents
          .map((event) => setEventAssignment({
            eventId: event.id,
            clientId: event.clientId,
            userId: assignmentUser.id,
            accessRole: assignmentUser.role,
            currentUserId: user?.uid,
          })),
        ...existingAssignments
          .filter((assignment) => !nextEventIds.has(assignment.eventId))
          .map((assignment) => removeEventAssignment(assignment.eventId, assignmentUser.id)),
      ]);

      closeAssignmentForm();
    } catch (assignmentError) {
      console.error(assignmentError);
      setUserError("Could not save event assignments.");
    } finally {
      setAssignmentsSaving(false);
    }
  };

  const updateIssueField = (field, value) => {
    setIssueForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetIssueForm = () => {
    setIssueForm(emptyIssueForm);
    setIssueImageFile(null);
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
        ? await updateIssue(editingIssueId, issueForm, issueImageFile)
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

  useEffect(() => {
    if (profileLoading || !canManageUsers) return;
    resetUserForm();
  }, [profileLoading, canManageUsers, isAdmin, userProfile?.clientId]);

  useEffect(() => {
    if (!isSuperAdmin && ["clients", "issues"].includes(activeAdminSection)) {
      setActiveAdminSection("users");
    }
  }, [activeAdminSection, isSuperAdmin]);

  const editingUserProfile = editingUserId
    ? userProfiles.find((profile) => profile.id === editingUserId)
    : null;
  const editingClient = editingClientId
    ? clients.find((client) => client.id === editingClientId)
    : null;

  return (
    <section className="page">
      {!profileLoading && !canManageUsers ? (
        <div className="panel placeholder-panel">
          <CapcomIcon name="admin" size={32} weight="duotone" />
          <div>
            <h2>Admin workflows</h2>
            <p className="page-subtitle">
              This area is reserved for users with an admin role.
            </p>
          </div>
        </div>
      ) : null}

      {!profileLoading && canManageUsers ? (
        <div className="admin-subnav tabs" aria-label="Admin sections">
          <button
            className={activeAdminSection === "users" ? "tab active" : "tab"}
            type="button"
            onClick={() => setActiveAdminSection("users")}
          >
            <CapcomIcon name="users" size={18} weight="duotone" />
            <span>Users</span>
          </button>
          {isSuperAdmin ? (
            <button
              className={activeAdminSection === "clients" ? "tab active" : "tab"}
              type="button"
              onClick={() => setActiveAdminSection("clients")}
            >
              <CapcomIcon name="company" size={18} weight="duotone" />
              <span>Clients</span>
            </button>
          ) : null}
          {isSuperAdmin ? (
            <button
              className={activeAdminSection === "issues" ? "tab active" : "tab"}
              type="button"
              onClick={() => setActiveAdminSection("issues")}
            >
              <CapcomIcon name="warning" size={18} weight="duotone" />
              <span>Issues</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {!profileLoading && isSuperAdmin && activeAdminSection === "clients" ? (
        <div className="admin-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Clients</h2>
              </div>
              {!isClientFormOpen ? (
                <button
                  className="button admin-add-client-button"
                  type="button"
                  aria-label="Create new client"
                  disabled={clientSaving}
                  onClick={openNewClientForm}
                >
                  <CapcomIcon name="add" size={18} weight="bold" />
                  <span className="button-label">Create New Client</span>
                </button>
              ) : null}
            </div>

            {clientError ? <p className="error">{clientError}</p> : null}

            {isClientFormOpen ? (
              <Modal
                title={editingClientId ? "" : "Create New Client"}
                subtitle=""
                labelledBy="clientFormTitle"
                closeLabel="Close client form"
                onClose={closeClientForm}
              >
              <form className="admin-inline-form" onSubmit={handleClientSubmit}>
                <div className="form-grid">
                  <div className="form-row">
                    <label htmlFor="clientName">Client name</label>
                    <input
                      id="clientName"
                      value={clientForm.clientName}
                      disabled={clientSaving}
                      onChange={(event) => updateClientField("clientName", event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="clientSlug">Client slug</label>
                    <input
                      id="clientSlug"
                      value={clientForm.clientSlug}
                      disabled={clientSaving}
                      onChange={(event) => updateClientField("clientSlug", event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row full">
                    <label htmlFor="logoUrl">Logo URL</label>
                    <input
                      id="logoUrl"
                      value={clientForm.logoUrl}
                      disabled={clientSaving}
                      onChange={(event) => updateClientField("logoUrl", event.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="primaryColour">Primary colour</label>
                    <input
                      id="primaryColour"
                      value={clientForm.primaryColour}
                      disabled={clientSaving}
                      placeholder="#BE1717"
                      onChange={(event) => updateClientField("primaryColour", event.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="secondaryColour">Secondary colour</label>
                    <input
                      id="secondaryColour"
                      value={clientForm.secondaryColour}
                      disabled={clientSaving}
                      placeholder="#FFF4DF"
                      onChange={(event) => updateClientField("secondaryColour", event.target.value)}
                    />
                  </div>
                </div>

                {editingClient ? (
                  <div className="actions admin-modal-secondary-actions">
                    <button
                      className={editingClient.isActive !== false ? "button secondary" : "button"}
                      type="button"
                      disabled={clientSaving}
                      onClick={async () => {
                        await toggleClientActive(editingClient);
                        updateClientField("isActive", editingClient.isActive === false);
                      }}
                    >
                      {editingClient.isActive !== false ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                ) : null}

                <div className="actions">
                  <button className="button" type="submit" disabled={clientSaving}>
                    {clientSaving ? "Saving..." : editingClientId ? "Save Client" : "Create Client"}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={clientSaving}
                    onClick={closeClientForm}
                  >
                    Cancel
                  </button>
                </div>
              </form>
              </Modal>
            ) : null}

            {!clientsLoading && clients.length === 0 ? (
              <p className="message">No clients yet.</p>
            ) : null}

            <div className="client-list">
              {clients.map((client) => (
                <article className="client-list-row" key={client.id}>
                  <div className="client-card-main">
                    <div>
                      <div className="client-title-line">
                        <h3>{client.clientName}</h3>
                        <span className={client.isActive !== false ? "status-pill active" : "status-pill inactive"}>
                          {client.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="item-meta">
                        {client.clientSlug || "No slug"}
                      </p>
                    </div>
                    <button
                      className="button secondary client-edit-button"
                      type="button"
                      aria-label={`Edit ${client.clientName}`}
                      disabled={clientSaving}
                      onClick={() => startEditingClient(client)}
                    >
                      <CapcomIcon name="edit" size={18} weight="bold" />
                      <span className="button-label">Edit</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {!profileLoading && isSuperAdmin && activeAdminSection === "issues" ? (
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
      ) : null}

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
                <p className="item-meta">
                  {issueImageFile
                    ? issueImageFile.name
                    : editingIssueId
                      ? "Optional. Choose or paste a new screenshot to replace the current image."
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

      {!profileLoading && canManageUsers && activeAdminSection === "users" ? (
        <div className="admin-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Users</h2>
              </div>
              {!isUserFormOpen ? (
                <button
                  className="button admin-add-user-button"
                  type="button"
                  aria-label="Add new user"
                  disabled={userSaving}
                  onClick={openNewUserForm}
                >
                  <CapcomIcon name="add" size={18} weight="bold" />
                  <span className="button-label">Add New User</span>
                </button>
              ) : null}
            </div>

            {userError ? <p className="error">{userError}</p> : null}

            {isUserFormOpen ? (
              <Modal
                title={editingUserId ? "" : "Add New User"}
                subtitle=""
                labelledBy="userFormTitle"
                closeLabel="Close user form"
                onClose={closeUserForm}
              >
              <form className="admin-inline-form" onSubmit={handleUserSubmit}>
                <div className="form-grid">
                  <div className="form-row">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={userForm.email}
                      disabled={userSaving}
                      onChange={(event) => updateUserField("email", event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="displayName">Display name</label>
                    <input
                      id="displayName"
                      value={userForm.displayName}
                      disabled={userSaving}
                      onChange={(event) => updateUserField("displayName", event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="role">Role</label>
                    {isSuperAdmin ? (
                      <select
                        id="role"
                        value={userForm.role}
                        disabled={userSaving}
                        onChange={(event) => updateUserField("role", event.target.value)}
                        required
                      >
                        <option value={USER_ROLES.ADMIN}>Admin</option>
                        <option value={USER_ROLES.USER}>User</option>
                        <option value={USER_ROLES.VIEWER}>Viewer</option>
                      </select>
                    ) : (
                      <select
                        id="role"
                        value={userForm.role}
                        disabled={userSaving}
                        onChange={(event) => updateUserField("role", event.target.value)}
                        required
                      >
                        <option value={USER_ROLES.USER}>User</option>
                        <option value={USER_ROLES.VIEWER}>Viewer</option>
                      </select>
                    )}
                  </div>
                  <div className="form-row">
                    <label htmlFor="clientId">Client</label>
                    {isSuperAdmin ? (
                      <select
                        id="clientId"
                        value={userForm.clientId}
                        disabled={userSaving}
                        onChange={(event) => updateUserField("clientId", event.target.value)}
                        required
                      >
                        <option value="">Choose a client</option>
                        {selectableClients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.clientName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="clientId"
                        value={getClientName(clients, userProfile?.clientId)}
                        disabled
                      />
                    )}
                  </div>
                </div>

                {editingUserProfile ? (
                  <div className="actions admin-modal-secondary-actions">
                    <button
                      className="button secondary"
                      type="button"
                      disabled={userSaving || !editingUserProfile.email}
                      onClick={() => sendPasswordReset(editingUserProfile)}
                    >
                      Send Password Reset
                    </button>
                    <button
                      className={editingUserProfile.isActive !== false ? "button secondary" : "button"}
                      type="button"
                      disabled={userSaving}
                      onClick={async () => {
                        await toggleUserActive(editingUserProfile);
                        updateUserField("isActive", editingUserProfile.isActive === false);
                      }}
                    >
                      {editingUserProfile.isActive !== false ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                ) : null}

                <div className="actions">
                  <button className="button" type="submit" disabled={userSaving}>
                    {!userSaving ? (
                      <CapcomIcon name="add" size={18} weight="bold" />
                    ) : null}
                    {userSaving ? "Saving..." : editingUserId ? "Save User" : "Create"}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={userSaving}
                    onClick={closeUserForm}
                  >
                    Cancel
                  </button>
                </div>
              </form>
              </Modal>
            ) : null}

            {!usersLoading && userProfiles.length === 0 ? (
              <p className="message">No user profiles yet.</p>
            ) : null}

            <div className="client-list">
              {userProfiles.map((profile) => {
                const canEditProfile = canManageUserProfile(userProfile, profile);
                return (
                  <article className="client-list-row" key={profile.id}>
                    <div className="client-card-main">
                      <div>
                        <div className="client-title-line">
                          <h3>{profile.displayName || profile.email}</h3>
                          <span className={profile.isActive !== false ? "status-pill active" : "status-pill inactive"}>
                            {profile.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="item-meta">
                          {profile.email} | {profile.role}
                        </p>
                      </div>
                      <button
                        className="button secondary client-edit-button"
                        type="button"
                        aria-label={`Edit ${profile.displayName || profile.email}`}
                        disabled={userSaving || !canEditProfile}
                        onClick={() => startEditingUser(profile)}
                      >
                        <CapcomIcon name="edit" size={18} weight="bold" />
                        <span className="button-label">Edit</span>
                      </button>
                      {[USER_ROLES.USER, USER_ROLES.VIEWER].includes(profile.role) ? (
                        <button
                          className="button secondary client-edit-button"
                          type="button"
                          aria-label={`Assign events for ${profile.displayName || profile.email}`}
                          disabled={userSaving || !canEditProfile}
                          onClick={() => openAssignmentForm(profile)}
                        >
                          <CapcomIcon name="event" size={18} weight="bold" />
                          <span className="button-label">Events</span>
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {assignmentUser ? (
        <Modal
          title="Event Access"
          subtitle={assignmentUser.displayName || assignmentUser.email || ""}
          labelledBy="eventAssignmentTitle"
          closeLabel="Close event access"
          onClose={closeAssignmentForm}
        >
          {assignmentsLoading ? <p className="message">Loading event access...</p> : null}
          {!assignmentsLoading && events.length === 0 ? (
            <p className="message">No events available for this client.</p>
          ) : null}
          {!assignmentsLoading && events.length > 0 ? (
            <div className="client-list">
              {events
                .filter((event) => isSuperAdmin || event.clientId === assignmentUser.clientId)
                .map((event) => (
                  <label className="client-list-row" key={event.id}>
                    <div className="client-card-main">
                      <div>
                        <div className="client-title-line">
                          <h3>{event.name}</h3>
                        </div>
                        <p className="item-meta">
                          {event.clientName || getClientName(clients, event.clientId)}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={assignmentEventIds.has(event.id)}
                        disabled={assignmentsSaving}
                        onChange={() => toggleAssignmentEvent(event.id)}
                      />
                    </div>
                  </label>
                ))}
            </div>
          ) : null}
          <div className="actions">
            <button className="button" type="button" disabled={assignmentsSaving} onClick={saveAssignments}>
              {assignmentsSaving ? "Saving..." : "Save Access"}
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={assignmentsSaving}
              onClick={closeAssignmentForm}
            >
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
