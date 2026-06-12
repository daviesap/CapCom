import Modal from "../Modal.jsx";
import { CapcomIcon } from "../../icons/capcomIcons.jsx";
import ArchiveChangeText from "../../features/event-editor/ArchiveChangeText.jsx";
import {
  formatArchiveDate,
  getShareSnapshotNameKey,
} from "../../features/event-editor/eventEditorUtils.js";

export default function SharePanel({
  shareLastUpdatedText,
  canUpdateShareOutput,
  isWriteDisabled,
  updatingShareOutput,
  filteredViewsLoading,
  detailsLoading,
  tagsLoading,
  locationsLoading,
  trucksLoading,
  companiesLoading,
  updateShareOutput,
  shareProtectedHomeUrl,
  shareHtmlUrl,
  showMomContacts,
  showMomKeyInfo,
  updateShowMomContacts,
  updateShowMomKeyInfo,
  filteredViewFormMode,
  editingFilteredViewId,
  resetFilteredViewForm,
  saveFilteredView,
  filteredViewForm,
  isOffline,
  updateFilteredViewFormField,
  clearFilteredViewFilters,
  filteredViewTagOptions,
  filteredViewCompanyOptions,
  locationTree,
  toggleFilteredViewMultiSelectField,
  savingFilteredView,
  canManageFilteredViews,
  startAddingFilteredView,
  filteredViews,
  protectedSnapshotHtmlUrlByName,
  startEditingFilteredView,
  deletingFilteredViewId,
  removeFilteredView,
  shareArchiveLoading,
  shareArchive,
  isShareArchiveOpen,
  setIsShareArchiveOpen,
}) {
  return (
    <>
      <section className="panel share-panel">
        <div className="panel-heading">
          <div>
            <p className="item-meta">
              Last updated {shareLastUpdatedText || "not yet"}
            </p>
          </div>
          <div className="share-actions">
            {canUpdateShareOutput ? (
              <button
                className="button secondary icon-text-button"
                type="button"
                disabled={
                  isWriteDisabled ||
                  updatingShareOutput ||
                  filteredViewsLoading ||
                  detailsLoading ||
                  tagsLoading ||
                  locationsLoading ||
                  trucksLoading ||
                  companiesLoading
                }
                onClick={updateShareOutput}
              >
                <CapcomIcon name="refresh" size={18} weight="bold" />
                {updatingShareOutput ? "Updating..." : "Update"}
              </button>
            ) : null}
            {shareProtectedHomeUrl ? (
              <a
                className="button secondary icon-text-button"
                href={shareProtectedHomeUrl}
                target="_blank"
                rel="noreferrer"
              >
                <CapcomIcon name="lock" size={16} weight="bold" />
                Open Homepage
                <CapcomIcon name="externalLink" size={16} weight="bold" />
              </a>
            ) : null}
            {shareHtmlUrl ? (
              <a
                className="button secondary icon-text-button"
                href={shareHtmlUrl}
                target="_blank"
                rel="noreferrer"
              >
                <CapcomIcon name="bookOpen" size={18} weight="bold" />
                Open Homepage
                <CapcomIcon name="externalLink" size={16} weight="bold" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="share-section share-home-section">
          <h3>Show on home page</h3>
          <div className="share-home-options">
            <label className="switch-row">
              <input
                checked={showMomContacts}
                disabled={isWriteDisabled || updatingShareOutput}
                role="switch"
                type="checkbox"
                onChange={(event) => updateShowMomContacts(event.target.checked)}
              />
              <span className="switch-control" aria-hidden="true" />
              <span>Contacts</span>
            </label>
            <label className="switch-row">
              <input
                checked={showMomKeyInfo}
                disabled={isWriteDisabled || updatingShareOutput}
                role="switch"
                type="checkbox"
                onChange={(event) => updateShowMomKeyInfo(event.target.checked)}
              />
              <span className="switch-control" aria-hidden="true" />
              <span>Key info</span>
            </label>
          </div>
        </div>

        {filteredViewFormMode ? (
          <Modal
            title={editingFilteredViewId ? "Edit filtered view" : "New filtered view"}
            subtitle="Share view"
            labelledBy="filteredViewFormTitle"
            onClose={resetFilteredViewForm}
          >
            <form className="tag-form" onSubmit={saveFilteredView}>
              <div className="form-grid">
                <div className="form-row full">
                  <label htmlFor="filteredViewName">Filtered view name</label>
                  <input
                    id="filteredViewName"
                    value={filteredViewForm.name}
                    disabled={isOffline}
                    onChange={(event) =>
                      updateFilteredViewFormField("name", event.target.value)
                    }
                    placeholder="Example: Main floor / confirmed only"
                    required
                  />
                </div>
                <div className="form-row full">
                  <div className="filtered-view-filter-card">
                    <div className="filtered-view-card-heading">
                      <h3>Filters</h3>
                      <button
                        className="compact-button"
                        type="button"
                        disabled={isOffline}
                        onClick={clearFilteredViewFilters}
                      >
                        Clear Filters
                      </button>
                    </div>
                    <div className="filtered-view-filter-grid">
                      <div className="form-row">
                        <span className="form-chip-label">Tags</span>
                        <div className="multi-chip-list" role="group" aria-label="Tags">
                          {filteredViewTagOptions.map((tag) => {
                            const isSelected = filteredViewForm.filterTagIds.includes(tag.id);
                            return (
                              <button
                                className={isSelected ? "multi-chip selected" : "multi-chip"}
                                type="button"
                                key={tag.id}
                                disabled={isOffline}
                                aria-pressed={isSelected}
                                onClick={() =>
                                  toggleFilteredViewMultiSelectField("filterTagIds", tag.id)
                                }
                              >
                                {tag.name}
                              </button>
                            );
                          })}
                        </div>
                        {filteredViewTagOptions.length === 0 ? (
                          <span className="item-meta">No tags available.</span>
                        ) : null}
                      </div>
                      <div className="form-row">
                        <span className="form-chip-label">Companies</span>
                        <div
                          className="multi-chip-list"
                          role="group"
                          aria-label="Companies"
                        >
                          {filteredViewCompanyOptions.map((company) => {
                            const isSelected = filteredViewForm.filterSupplierIds.includes(
                              company.id
                            );
                            return (
                              <button
                                className={isSelected ? "multi-chip selected" : "multi-chip"}
                                type="button"
                                key={company.id}
                                disabled={isOffline}
                                aria-pressed={isSelected}
                                onClick={() =>
                                  toggleFilteredViewMultiSelectField(
                                    "filterSupplierIds",
                                    company.id
                                  )
                                }
                              >
                                {company.companyName}
                              </button>
                            );
                          })}
                        </div>
                        {filteredViewCompanyOptions.length === 0 ? (
                          <span className="item-meta">
                            No companies available for this event.
                          </span>
                        ) : null}
                      </div>
                      <div className="form-row full">
                        <span className="form-chip-label">Locations</span>
                        <div
                          className="location-chip-tree"
                          role="group"
                          aria-label="Locations"
                        >
                          {locationTree.map((location) => {
                            const isSelected = filteredViewForm.filterLocationIds.includes(
                              location.id
                            );
                            return (
                              <div className="location-chip-group" key={location.id}>
                                <button
                                  className={isSelected ? "multi-chip selected" : "multi-chip"}
                                  type="button"
                                  disabled={isOffline}
                                  aria-pressed={isSelected}
                                  onClick={() =>
                                    toggleFilteredViewMultiSelectField(
                                      "filterLocationIds",
                                      location.id
                                    )
                                  }
                                >
                                  {location.name}
                                </button>
                                {location.children.length > 0 ? (
                                  <div className="location-sub-chip-list">
                                    {location.children.map((subLocation) => {
                                      const isSubLocationSelected =
                                        filteredViewForm.filterSubLocationIds.includes(
                                          subLocation.id
                                        );
                                      return (
                                        <button
                                          className={
                                            isSubLocationSelected
                                              ? "multi-chip sub-location selected"
                                              : "multi-chip sub-location"
                                          }
                                          type="button"
                                          key={subLocation.id}
                                          disabled={isOffline}
                                          aria-pressed={isSubLocationSelected}
                                          onClick={() =>
                                            toggleFilteredViewMultiSelectField(
                                              "filterSubLocationIds",
                                              subLocation.id
                                            )
                                          }
                                        >
                                          {subLocation.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                        {locationTree.length === 0 ? (
                          <span className="item-meta">No locations available.</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="filteredViewGroupPresetId">Group preset</label>
                  <input
                    id="filteredViewGroupPresetId"
                    value={filteredViewForm.groupPresetId}
                    disabled={isOffline}
                    onChange={(event) =>
                      updateFilteredViewFormField("groupPresetId", event.target.value)
                    }
                    placeholder="DY-1"
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="filteredViewFilterGroup">Filter group</label>
                  <input
                    id="filteredViewFilterGroup"
                    value={filteredViewForm.filterGroup}
                    disabled={isOffline}
                    onChange={(event) =>
                      updateFilteredViewFormField("filterGroup", event.target.value)
                    }
                    placeholder="a-euY4.fxRfmBhTGPs7gO-A"
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="filteredViewGroup">Group</label>
                  <input
                    id="filteredViewGroup"
                    value={filteredViewForm.group}
                    disabled={isOffline}
                    onChange={(event) =>
                      updateFilteredViewFormField("group", event.target.value)
                    }
                    placeholder="Full schedule"
                  />
                </div>
                <div className="form-row full">
                  <div className="filtered-view-display-card">
                    <h3>Display options</h3>
                    <div className="filtered-view-display-options">
                      <label className="switch-row">
                        <input
                          checked={filteredViewForm.filterBox}
                          disabled={isOffline}
                          role="switch"
                          type="checkbox"
                          onChange={(event) =>
                            updateFilteredViewFormField("filterBox", event.target.checked)
                          }
                        />
                        <span className="switch-control" aria-hidden="true" />
                        <span>Filter box</span>
                      </label>
                      <label className="switch-row">
                        <input
                          checked={filteredViewForm.showKeyInfo}
                          disabled={isOffline}
                          role="switch"
                          type="checkbox"
                          onChange={(event) =>
                            updateFilteredViewFormField("showKeyInfo", event.target.checked)
                          }
                        />
                        <span className="switch-control" aria-hidden="true" />
                        <span>Key info</span>
                      </label>
                      <label className="switch-row">
                        <input
                          checked={filteredViewForm.showLocations}
                          disabled={isOffline}
                          role="switch"
                          type="checkbox"
                          onChange={(event) =>
                            updateFilteredViewFormField(
                              "showLocations",
                              event.target.checked
                            )
                          }
                        />
                        <span className="switch-control" aria-hidden="true" />
                        <span>Locations</span>
                      </label>
                      <label className="switch-row">
                        <input
                          checked={filteredViewForm.showContacts}
                          disabled={isOffline}
                          role="switch"
                          type="checkbox"
                          onChange={(event) =>
                            updateFilteredViewFormField(
                              "showContacts",
                              event.target.checked
                            )
                          }
                        />
                        <span className="switch-control" aria-hidden="true" />
                        <span>Contacts</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="actions">
                <button
                  className="button"
                  type="submit"
                  disabled={savingFilteredView || isWriteDisabled}
                >
                  {savingFilteredView
                    ? "Saving..."
                    : editingFilteredViewId
                      ? "Save filtered view"
                      : "Create filtered view"}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={savingFilteredView || isWriteDisabled}
                  onClick={resetFilteredViewForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        ) : null}

        <div className="share-section">
          <div className="share-section-heading">
            <h3>Filtered views</h3>
            {canManageFilteredViews && !filteredViewFormMode ? (
              <button
                className="button secondary icon-text-button"
                type="button"
                disabled={isOffline}
                onClick={startAddingFilteredView}
              >
                <CapcomIcon name="add" size={18} weight="bold" />
                New filtered view
              </button>
            ) : null}
          </div>

          {filteredViews.length === 0 ? (
            <p className="item-meta">No filtered views yet.</p>
          ) : (
            <div className="share-filtered-view-list">
              {filteredViews.map((view) => {
                const protectedSnapshotHtmlUrl = protectedSnapshotHtmlUrlByName.get(
                  getShareSnapshotNameKey(view.name)
                );

                return (
                  <article className="share-filtered-view-row" key={view.id}>
                    <h3>{view.name || "Unnamed filtered view"}</h3>
                    <div className="share-filtered-view-actions">
                      {protectedSnapshotHtmlUrl ? (
                        <a
                          className="compact-button"
                          href={protectedSnapshotHtmlUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <CapcomIcon name="externalLink" size={16} />
                          Open
                        </a>
                      ) : (
                        <button
                          className="compact-button"
                          type="button"
                          disabled
                          title="No protected HTML URL found for this view"
                        >
                          <CapcomIcon name="externalLink" size={16} />
                          Open
                        </button>
                      )}
                      {canManageFilteredViews ? (
                        <>
                          <button
                            className="compact-button"
                            type="button"
                            disabled={isOffline}
                            onClick={() => startEditingFilteredView(view)}
                          >
                            <CapcomIcon name="edit" size={16} />
                            Edit
                          </button>
                          <button
                            className="compact-button"
                            type="button"
                            disabled={deletingFilteredViewId === view.id || isWriteDisabled}
                            onClick={() => removeFilteredView(view.id)}
                          >
                            <CapcomIcon name="delete" size={16} />
                            {deletingFilteredViewId === view.id ? "Deleting..." : "Delete"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="panel archive-panel">
        <div className="company-accordion-heading">
          <button
            className="company-accordion-trigger"
            type="button"
            aria-controls="shareArchiveBody"
            aria-expanded={isShareArchiveOpen}
            onClick={() => setIsShareArchiveOpen((current) => !current)}
          >
            <span className="accordion-indicator" aria-hidden="true">
              <CapcomIcon
                name={isShareArchiveOpen ? "caretDoubleDown" : "caretDoubleRight"}
                size={14}
                weight="bold"
              />
            </span>
            <span>
              <span className="company-accordion-title">Archive</span>
              <span className="item-meta company-accordion-meta">
                {shareArchiveLoading
                  ? "Loading..."
                  : `${shareArchive.length} entr${shareArchive.length === 1 ? "y" : "ies"}`}
              </span>
            </span>
          </button>
        </div>

        {isShareArchiveOpen ? (
          <div className="company-accordion-body" id="shareArchiveBody">
            {shareArchive.length === 0 ? (
              <p className="item-meta">No archive entries yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="schedule-days-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Changes</th>
                      <th aria-label="Change details"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {shareArchive.map((archiveRow) => (
                      <tr key={archiveRow.id}>
                        <td>{formatArchiveDate(archiveRow.timestamp || archiveRow.createdAt)}</td>
                        <td>{archiveRow.numberOfChanges ?? 0}</td>
                        <td>
                          <ArchiveChangeText text={archiveRow.text} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </section>
    </>
  );
}
