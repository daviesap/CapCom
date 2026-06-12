import { useEffect, useRef, useState } from "react";
import Modal from "../Modal.jsx";
import DetailRowActions from "./DetailRowActions.jsx";
import { CapcomIcon } from "../../icons/capcomIcons.jsx";

export default function DetailRow({
  day,
  detail,
  detailIndex,
  dayDetails,
  sortScopeDetails = dayDetails,
  isOffline,
  detailDisplay,
  rowEditing,
  rowOrdering,
  rowAssignments,
  rowNotes,
  rowActions,
}) {
  const {
    getDetailRowStyle,
    getTruckDetailRowStyle,
    getRowTagStyle,
    getTagById,
    showTagColumn,
    getTagStyle,
    normaliseHexColour,
    tags,
    companyById,
    showLocationColumn,
    getLocationById,
    locationOptions,
    showCompanyColumn,
    getCompanyLabel,
    companies,
    showTruckDestinationColumn,
    getTruckDestinationValue,
    truckById,
  } = detailDisplay;
  const {
    isEditingDetailCell,
    detailCellInputRef,
    suppressDetailBlurRef,
    saveDetailCell,
    updateDetailField,
    handleDetailCellKeyDown,
    startEditingDetailCell,
  } = rowEditing;
  const {
    getAdjacentDay,
    moveDetailToDay,
    isScheduleSortMode,
    draggedDetailIdRef,
    reorderingDayId,
    persistScheduleDetailOrder,
  } = rowOrdering;
  const {
    savingDetailId,
    assignDetailTag,
    assignDetailLocation,
    assignDetailCompanies,
    toggleCompanyIds,
    assignTruckDetailDestination,
  } = rowAssignments;
  const {
    openNotesDetailId,
    closeNotesEditor,
    openNotesEditor,
    notesDraft,
    setNotesDraft,
    saveDetailNotes,
  } = rowNotes;
  const {
    openActionMenuId,
    setOpenActionMenuId,
    beginRowAction,
    endRowAction,
    duplicateDetail,
    startEditingDetail,
    startEditingDetailTime,
    closeActionMenu,
    deleteDetail,
  } = rowActions;
  const isEditingTime = isEditingDetailCell(detail.id, "time");
  const isEditingDescription = isEditingDetailCell(detail.id, "description");
  const isTruckRow = Boolean(detail.truckId);
  const rowStyle = isTruckRow
    ? getTruckDetailRowStyle(getRowTagStyle(getTagById(detail.tagId)))
    : getDetailRowStyle(getRowTagStyle(getTagById(detail.tagId)));
  const effectiveRowStyle = isScheduleSortMode
    ? {
        ...rowStyle,
        "--detail-row-columns": `32px ${rowStyle["--detail-row-columns"]}`,
        "--detail-actions-column": Number(rowStyle["--detail-actions-column"] || 6) + 1,
      }
    : rowStyle;
  const previousDay = getAdjacentDay(day.id, -1);
  const nextDay = getAdjacentDay(day.id, 1);
  const truck = truckById.get(detail.truckId);
  const truckCompanyName = String(companyById.get(truck?.companyId)?.companyName || "").trim();
  const truckSummary = [
    String(detail.truckNumber || truck?.truckNumber || "").trim(),
    truckCompanyName ? `(${truckCompanyName})` : "",
    String(detail.action || "").trim(),
  ]
    .filter(Boolean)
    .join(" ");
  const hasTruckDestination = Boolean(getTruckDestinationValue(detail));
  const selectableTag = tags.some((tag) => tag.id === detail.tagId)
    ? getTagById(detail.tagId)
    : null;
  const companyLabel = getCompanyLabel(detail.companyIds || []);
  const truckDestinationValue = String(getTruckDestinationValue(detail) || "");
  const truckDestinationLabel = truckDestinationValue.startsWith("company:")
    ? companyById.get(truckDestinationValue.replace("company:", ""))?.companyName || "No destination"
    : truckDestinationValue.startsWith("location:")
      ? getLocationById(truckDestinationValue.replace("location:", ""))?.displayName || "No destination"
      : "No destination";
  const mobileTagLabel = selectableTag?.name || "";
  const mobileLocationLabel = getLocationById(detail.locationId)?.displayName || "";
  const mobileCompanyLabel = companyLabel === "No company" ? "" : companyLabel;
  const mobileTruckDestinationLabel = truckDestinationLabel === "No destination" ? "" : truckDestinationLabel;
  const mobileMetaLabels = isTruckRow
    ? [mobileTruckDestinationLabel].filter(Boolean)
    : [mobileTagLabel, mobileLocationLabel, mobileCompanyLabel].filter(Boolean);
  const previewCompanyNames = (detail.companyIds || [])
    .map((companyId) => companyById.get(companyId)?.companyName || "")
    .filter(Boolean)
    .join(", ");
  const previewMetaItems = [
    mobileTagLabel ? ["Tag", mobileTagLabel] : null,
    mobileLocationLabel ? ["Location", mobileLocationLabel] : null,
    previewCompanyNames ? ["Company", previewCompanyNames] : null,
  ].filter(Boolean);
  const rowRef = useRef(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [previewDescription, setPreviewDescription] = useState("");
  const [isDraggingRow, setIsDraggingRow] = useState(false);
  const [isDropTargetRow, setIsDropTargetRow] = useState(false);
  const isRowLocked = isOffline || isScheduleSortMode;
  const matchingTimeDetails = sortScopeDetails.filter(
    (nextDetail) => String(nextDetail.time || "") === String(detail.time || "")
  );
  const canSortWithinTimeGroup = isScheduleSortMode && matchingTimeDetails.length > 1;
  const isReorderingThisDay = reorderingDayId === day.id;
  const getDraggedMatchingDetail = () =>
    matchingTimeDetails.find(
      (nextDetail) => nextDetail.id === draggedDetailIdRef.current
    );
  const canDropDraggedDetail = () => {
    const draggedDetail = getDraggedMatchingDetail();
    return Boolean(draggedDetail && draggedDetail.id !== detail.id);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 700px)");
    const updateIsMobileView = () => setIsMobileView(mediaQuery.matches);

    updateIsMobileView();
    mediaQuery.addEventListener("change", updateIsMobileView);

    return () => {
      mediaQuery.removeEventListener("change", updateIsMobileView);
    };
  }, []);

  return (
    <>
      <div
        ref={rowRef}
        className={[
          "detail-row",
          isScheduleSortMode ? "detail-row-sort-mode" : "",
          canSortWithinTimeGroup ? "detail-row-sortable" : "",
          isDraggingRow ? "detail-row-dragging" : "",
          isDropTargetRow ? "detail-row-drop-target" : "",
        ].filter(Boolean).join(" ")}
        style={effectiveRowStyle}
        onDragEnter={(event) => {
          if (!canSortWithinTimeGroup || !canDropDraggedDetail()) return;
          event.preventDefault();
          setIsDropTargetRow(true);
        }}
        onDragOver={(event) => {
          if (!canSortWithinTimeGroup || !canDropDraggedDetail()) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setIsDropTargetRow(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return;
          setIsDropTargetRow(false);
        }}
        onDrop={(event) => {
          if (!canSortWithinTimeGroup) return;
          event.preventDefault();
          setIsDropTargetRow(false);
          const draggedDetailId = draggedDetailIdRef.current;
          draggedDetailIdRef.current = "";
          if (!draggedDetailId || draggedDetailId === detail.id) return;
          const fromIndex = matchingTimeDetails.findIndex(
            (nextDetail) => nextDetail.id === draggedDetailId
          );
          const toIndex = matchingTimeDetails.findIndex(
            (nextDetail) => nextDetail.id === detail.id
          );
          if (fromIndex < 0 || toIndex < 0) return;
          const nextDetails = [...matchingTimeDetails];
          const [movedDetail] = nextDetails.splice(fromIndex, 1);
          nextDetails.splice(toIndex, 0, movedDetail);
          persistScheduleDetailOrder(day.id, nextDetails);
        }}
      >
      {isScheduleSortMode ? (
        canSortWithinTimeGroup ? (
          <button
            className="detail-sort-handle"
            type="button"
            aria-label={`Reorder ${detail.time || "blank time"} row`}
            title="Drag to reorder matching time rows"
            disabled={isReorderingThisDay}
            draggable={!isReorderingThisDay}
            onDragStart={(event) => {
              draggedDetailIdRef.current = detail.id;
              event.dataTransfer.effectAllowed = "move";
              if (rowRef.current) {
                event.dataTransfer.setDragImage(rowRef.current, 18, 18);
              }
              setIsDraggingRow(true);
            }}
            onDragEnd={() => {
              draggedDetailIdRef.current = "";
              setIsDraggingRow(false);
              setIsDropTargetRow(false);
            }}
          >
            <CapcomIcon name="drag" size={17} weight="bold" />
          </button>
        ) : (
          <span className="detail-sort-handle-spacer" aria-hidden="true" />
        )
      ) : null}
      {isEditingTime ? (
        <input
          ref={detailCellInputRef}
          className="plain-input detail-time-input"
          aria-label={`Time for ${detail.description || "schedule detail"}`}
          type="time"
          value={detail.time || ""}
          disabled={isRowLocked}
          onBlur={() => {
            if (suppressDetailBlurRef.current) return;
            saveDetailCell(day.id, detail);
          }}
          onChange={(event) =>
            updateDetailField(day.id, detail.id, "time", event.target.value)
          }
          onKeyDown={(event) =>
            handleDetailCellKeyDown(
              event,
              day.id,
              dayDetails,
              detail,
              detailIndex,
              "time"
            )
          }
        />
      ) : isRowLocked ? (
        <span className="detail-cell detail-time-display">
          {detail.time || "tbc"}
        </span>
      ) : (
        <button
          className="detail-cell detail-time-display"
          type="button"
          disabled={isRowLocked}
          onClick={() =>
            isMobileView
              ? startEditingDetailTime(day.id, detail)
              : startEditingDetailCell(day.id, detail.id, "time")
          }
        >
          {detail.time || "tbc"}
        </button>
      )}
      {isTruckRow ? (
        isRowLocked ? (
          <span className="detail-cell detail-description-cell">
            <span className="detail-description-text">{truckSummary}</span>
          </span>
        ) : (
        <button
          className="detail-cell detail-description-cell"
          type="button"
          disabled={isRowLocked}
        >
          <span className="detail-description-text">{truckSummary}</span>
        </button>
        )
      ) : isEditingDescription ? (
        <input
          ref={detailCellInputRef}
          className="plain-input"
          aria-label={`Description for ${detail.time || "tbc"}`}
          value={detail.description || ""}
          disabled={isRowLocked}
          onBlur={() => {
            if (suppressDetailBlurRef.current) return;
            saveDetailCell(day.id, detail);
          }}
          onChange={(event) =>
            updateDetailField(day.id, detail.id, "description", event.target.value)
          }
          onKeyDown={(event) =>
            handleDetailCellKeyDown(
              event,
              day.id,
              dayDetails,
              detail,
              detailIndex,
              "description"
            )
          }
        />
      ) : isRowLocked ? (
        <span
          className="detail-cell detail-description-cell"
          data-tooltip={detail.description || ""}
        >
          <span className="detail-description-text">{detail.description || ""}</span>
        </span>
      ) : (
        <button
          className="detail-cell detail-description-cell"
          type="button"
          data-tooltip={detail.description || ""}
          disabled={isRowLocked}
          onClick={() => {
            if (isMobileView) {
              setPreviewDescription(detail.description || "");
              return;
            }

            startEditingDetailCell(day.id, detail.id, "description");
          }}
        >
          <span className="detail-description-text">{detail.description || ""}</span>
        </button>
      )}
      {mobileMetaLabels.length > 0 ? (
        <span className="mobile-detail-meta-line">
          {mobileMetaLabels.join(" · ")}
        </span>
      ) : null}
      {!isTruckRow && showTagColumn ? (
        <>
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
              aria-label={`Tag for ${detail.description || "schedule detail"}`}
              value={selectableTag ? detail.tagId : ""}
              disabled={savingDetailId === detail.id || isRowLocked || Boolean(detail.truckId)}
              onChange={(event) => assignDetailTag(day.id, detail, event.target.value)}
            >
              <option value="">No tag</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}
      {!isTruckRow && showLocationColumn ? (
        <>
          <div className="location-select-wrap detail-select-field">
            <select
              aria-label={`Location for ${detail.description || "schedule detail"}`}
              value={getLocationById(detail.locationId) ? detail.locationId : ""}
              disabled={savingDetailId === detail.id || isRowLocked}
              onChange={(event) => assignDetailLocation(day.id, detail, event.target.value)}
            >
              <option value="">No location</option>
              {locationOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.displayName}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : null}
      {!isTruckRow && showCompanyColumn ? (
        <>
          <details className="company-dropdown detail-select-field">
            <summary
              aria-label={`Company for ${detail.description || "schedule detail"}`}
              className="company-dropdown-trigger"
            >
              {companyLabel}
            </summary>
            <div className="company-dropdown-menu">
              {companies.map((company) => (
                <label className="company-dropdown-option" key={company.id}>
                  <input
                    type="checkbox"
                    checked={(detail.companyIds || []).includes(company.id)}
                    disabled={savingDetailId === detail.id || isRowLocked}
                    onChange={() =>
                      assignDetailCompanies(
                        day.id,
                        detail,
                        toggleCompanyIds(detail.companyIds || [], company.id)
                      )
                    }
                  />
                  <span>{company.companyName}</span>
                </label>
              ))}
            </div>
          </details>
        </>
      ) : null}
      {isTruckRow && showTruckDestinationColumn ? (
        <>
          <div
            className={[
              "location-select-wrap",
              "detail-select-field",
              hasTruckDestination ? "" : "detail-select-field-missing",
            ].filter(Boolean).join(" ")}
          >
            <select
              aria-label="Destination for truck detail"
              value={getTruckDestinationValue(detail)}
              disabled={savingDetailId === detail.id || isRowLocked}
              onChange={(event) =>
                assignTruckDetailDestination(day.id, detail, event.target.value)
              }
            >
              <option value="">No destination</option>
              {companies.length > 0 ? (
                <optgroup label="Companies">
                  {companies.map((company) => (
                    <option key={company.id} value={`company:${company.id}`}>
                      {company.companyName}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {locationOptions.length > 0 ? (
                <optgroup label="Locations">
                  {locationOptions.map((location) => (
                    <option key={location.id} value={`location:${location.id}`}>
                      {location.displayName}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>
        </>
      ) : null}
      {!isScheduleSortMode ? (
      <DetailRowActions
        day={day}
        detail={detail}
        isOffline={isOffline}
        savingDetailId={savingDetailId}
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
        previousDay={previousDay}
        nextDay={nextDay}
        moveDetailToDay={moveDetailToDay}
        duplicateDetail={duplicateDetail}
        startEditingDetail={startEditingDetail}
        closeActionMenu={closeActionMenu}
        deleteDetail={deleteDetail}
      />
      ) : (
        <span className="detail-row-actions-placeholder" aria-hidden="true" />
      )}
      </div>
      {previewDescription ? (
        <Modal
          title={detail.time || "Detail"}
          labelledBy={`detail-preview-${detail.id}`}
          onClose={() => setPreviewDescription("")}
        >
          <p className="detail-description-preview-text">{previewDescription}</p>
          {previewMetaItems.length > 0 ? (
            <dl className="detail-description-preview-meta">
              {previewMetaItems.map(([label, value]) => (
                <div className="detail-description-preview-meta-row" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="actions detail-description-preview-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => setPreviewDescription("")}
            >
              Close
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
