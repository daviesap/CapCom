import { useEffect, useRef } from "react";
import { CapcomIcon } from "../../icons/capcomIcons.jsx";

export default function DraftDetailRow({
  dayId,
  draft,
  draftIndex,
  shouldFocusTime,
  isOffline,
  isLocked = false,
  detailDisplay,
  rowAssignments,
  draftActions,
}) {
  const timeInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const {
    getDetailRowStyle,
    showTagColumn,
    getTagStyle,
    getTagById,
    normaliseHexColour,
    tags,
    showLocationColumn,
    getLocationById,
    locationOptions,
    showCompanyColumn,
    getCompanyLabel,
    companies,
  } = detailDisplay;
  const { toggleCompanyIds } = rowAssignments;
  const {
    updateDraftDetail,
    removeDraftDetail,
    savingDraftDayId,
    saveDraftDetail,
  } = draftActions;

  useEffect(() => {
    if (!shouldFocusTime || isOffline || isLocked) return;
    timeInputRef.current?.focus({ preventScroll: true });
  }, [isOffline, isLocked, shouldFocusTime]);

  const handleDraftKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      removeDraftDetail(dayId, draftIndex);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!canSaveDraft) return;
      saveDraftDetail(dayId, draftIndex, draft);
    }
  };
  const canSaveDraft =
    Boolean(draft.description.trim()) &&
    savingDraftDayId !== dayId &&
    !isOffline &&
    !isLocked;
  const selectableTag = tags.some((tag) => tag.id === draft.tagId)
    ? getTagById(draft.tagId)
    : null;
  const rowStyle = getDetailRowStyle();
  const effectiveRowStyle = isLocked
    ? {
        ...rowStyle,
        "--detail-row-columns": `32px ${rowStyle["--detail-row-columns"]}`,
        "--detail-actions-column": Number(rowStyle["--detail-actions-column"] || 6) + 1,
      }
    : rowStyle;

  return (
    <div
      className={["detail-row", "draft-row", isLocked ? "detail-row-sort-mode" : ""]
        .filter(Boolean)
        .join(" ")}
      key={`draft-${draftIndex}`}
      style={effectiveRowStyle}
    >
      {isLocked ? <span className="detail-sort-handle-spacer" aria-hidden="true" /> : null}
      <input
        ref={timeInputRef}
        className="plain-input"
        aria-label="New detail time"
        type="time"
        value={draft.time}
        disabled={isOffline || isLocked}
        onChange={(event) => updateDraftDetail(dayId, draftIndex, "time", event.target.value)}
        onKeyDown={handleDraftKeyDown}
      />
      <input
        className="plain-input"
        ref={descriptionInputRef}
        aria-label="New detail description"
        value={draft.description}
        disabled={isOffline || isLocked}
        onChange={(event) =>
          updateDraftDetail(dayId, draftIndex, "description", event.target.value)
        }
        onKeyDown={handleDraftKeyDown}
        placeholder="Description"
        required
      />
      {showTagColumn ? (
        <div
          className="tag-select-wrap detail-select-field"
          style={getTagStyle(selectableTag)}
        >
          <span
            className="tag-dot"
            style={{
              backgroundColor:
                normaliseHexColour(selectableTag?.colour) || "transparent",
            }}
          />
          <select
            aria-label="New detail tag"
            value={selectableTag ? draft.tagId : ""}
            disabled={isOffline || isLocked}
            onChange={(event) => updateDraftDetail(dayId, draftIndex, "tagId", event.target.value)}
          >
            <option value="">No tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {showLocationColumn ? (
        <div className="location-select-wrap detail-select-field">
          <select
            aria-label="New detail location"
            value={getLocationById(draft.locationId) ? draft.locationId : ""}
            disabled={isOffline || isLocked}
            onChange={(event) =>
              updateDraftDetail(dayId, draftIndex, "locationId", event.target.value)
            }
          >
            <option value="">No location</option>
            {locationOptions.map((location) => (
              <option key={location.id} value={location.id}>
                {location.displayName}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {showCompanyColumn ? (
        <details className="company-dropdown detail-select-field">
          <summary
            aria-label="New detail company"
            className="company-dropdown-trigger"
          >
            {getCompanyLabel(draft.companyIds || [])}
          </summary>
          <div className="company-dropdown-menu">
            {companies.map((company) => (
              <label className="company-dropdown-option" key={company.id}>
                <input
                  type="checkbox"
                  checked={(draft.companyIds || []).includes(company.id)}
                  disabled={isOffline || isLocked}
                  onChange={() =>
                    updateDraftDetail(
                      dayId,
                      draftIndex,
                      "companyIds",
                      toggleCompanyIds(draft.companyIds || [], company.id)
                    )
                  }
                />
                <span>{company.companyName}</span>
              </label>
            ))}
          </div>
        </details>
      ) : null}
      <div className="draft-actions">
        <button
          className="button secondary"
          type="button"
          disabled={isOffline || isLocked}
          onClick={() => removeDraftDetail(dayId, draftIndex)}
        >
          <CapcomIcon name="close" size={16} />
          <span className="button-label">Cancel</span>
        </button>
        <button
          className="button"
          type="button"
          disabled={!canSaveDraft}
          onClick={() => saveDraftDetail(dayId, draftIndex, draft)}
        >
          <CapcomIcon name="check" size={16} />
          <span className="button-label">
            {savingDraftDayId === dayId ? "Saving..." : "Save"}
          </span>
        </button>
      </div>
    </div>
  );
}
