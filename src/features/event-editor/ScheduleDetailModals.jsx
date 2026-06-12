import Modal from "../../components/Modal.jsx";
import {
  timePickerHours,
  timePickerMinutes,
  truckDetailActions,
} from "./eventEditorConstants.js";

export default function ScheduleDetailModals({
  isEditingScheduleDateRange,
  cancelEditingScheduleDateRange,
  saveScheduleDateRange,
  scheduleDateRangeDraft,
  isWriteDisabled,
  savingScheduleDateRange,
  updateScheduleDateRangeField,
  addingDetailDayId,
  addingDetailDay,
  formatDetailDate,
  cancelEditingDetail,
  saveMobileAddDetailForm,
  detailEditForm,
  savingDraftDayId,
  updateDetailEditFormField,
  showTagColumn,
  normalDetailTags,
  showLocationColumn,
  locationOptions,
  showCompanyColumn,
  companies,
  toggleDetailEditCompany,
  editingDetail,
  editingDetailDay,
  saveDetailEditForm,
  savingDetailId,
  editingDetailTime,
  editingDetailTimeDay,
  saveDetailTimeForm,
  updateDetailEditTimePart,
  handleDetailTimeWheelKeyDown,
  editingDayMode,
  editingDayId,
  scheduleDays,
  editingDayDraft,
  isOffline,
  updateEditingDayField,
  savingDayId,
  saveDay,
  cancelEditingDay,
}) {
  return (
    <>
      {isEditingScheduleDateRange ? (
        <Modal
          title="Update date range"
          labelledBy="scheduleDateRangeFormTitle"
          closeLabel="Close update date range form"
          onClose={cancelEditingScheduleDateRange}
        >
          <form className="admin-inline-form" onSubmit={saveScheduleDateRange}>
            <div className="form-grid">
              <div className="form-row full">
                <label htmlFor="scheduleStartDate">Schedule start date</label>
                <input
                  id="scheduleStartDate"
                  type="date"
                  value={scheduleDateRangeDraft.scheduleStartDate}
                  disabled={isWriteDisabled || savingScheduleDateRange}
                  onChange={(event) =>
                    updateScheduleDateRangeField("scheduleStartDate", event.target.value)
                  }
                />
              </div>
              <div className="form-row full">
                <label htmlFor="scheduleEndDate">Schedule end date</label>
                <input
                  id="scheduleEndDate"
                  type="date"
                  value={scheduleDateRangeDraft.scheduleEndDate}
                  disabled={isWriteDisabled || savingScheduleDateRange}
                  onChange={(event) =>
                    updateScheduleDateRangeField("scheduleEndDate", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={isWriteDisabled || savingScheduleDateRange}
              >
                {savingScheduleDateRange ? "Saving..." : "Save date range"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingScheduleDateRange}
                onClick={cancelEditingScheduleDateRange}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {addingDetailDayId ? (
        <Modal
          title="Add row"
          subtitle={addingDetailDay ? formatDetailDate(addingDetailDay.date) : ""}
          labelledBy="addScheduleRowTitle"
          onClose={cancelEditingDetail}
        >
          <form className="admin-inline-form" onSubmit={saveMobileAddDetailForm}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="detailAddTime">Time</label>
                <input
                  id="detailAddTime"
                  type="time"
                  autoFocus
                  value={detailEditForm.time}
                  disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                  onChange={(event) => updateDetailEditFormField("time", event.target.value)}
                />
              </div>
              <div className="form-row full">
                <label htmlFor="detailAddDescription">Description</label>
                <input
                  id="detailAddDescription"
                  value={detailEditForm.description}
                  disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                  onChange={(event) =>
                    updateDetailEditFormField("description", event.target.value)
                  }
                  required
                />
              </div>
              {showTagColumn ? (
                <div className="form-row">
                  <label htmlFor="detailAddTag">Tag</label>
                  <select
                    id="detailAddTag"
                    value={detailEditForm.tagId}
                    disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                    onChange={(event) => updateDetailEditFormField("tagId", event.target.value)}
                  >
                    <option value="">No tag</option>
                    {normalDetailTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {showLocationColumn ? (
                <div className="form-row">
                  <label htmlFor="detailAddLocation">Location</label>
                  <select
                    id="detailAddLocation"
                    value={detailEditForm.locationId}
                    disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                    onChange={(event) =>
                      updateDetailEditFormField("locationId", event.target.value)
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
                <div className="form-row full">
                  <span className="form-label">Companies</span>
                  <div className="checkbox-stack">
                    {companies.length === 0 ? (
                      <span className="item-meta">No companies available.</span>
                    ) : (
                      companies.map((company) => (
                        <label className="checkbox-row" key={company.id}>
                          <input
                            type="checkbox"
                            checked={(detailEditForm.companyIds || []).includes(company.id)}
                            disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                            onChange={() => toggleDetailEditCompany(company.id)}
                          />
                          <span>{company.companyName}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
              <div className="form-row full">
                <label htmlFor="detailAddNotes">Notes</label>
                <textarea
                  id="detailAddNotes"
                  value={detailEditForm.notes}
                  disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                  rows={4}
                  onChange={(event) => updateDetailEditFormField("notes", event.target.value)}
                />
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={
                  isWriteDisabled ||
                  savingDraftDayId === addingDetailDayId ||
                  !detailEditForm.description.trim()
                }
              >
                {savingDraftDayId === addingDetailDayId ? "Adding..." : "Add row"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingDraftDayId === addingDetailDayId}
                onClick={cancelEditingDetail}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingDetail ? (
        <Modal
          title="Edit row"
          subtitle={editingDetailDay ? formatDetailDate(editingDetailDay.date) : ""}
          labelledBy="editScheduleRowTitle"
          closeLabel="Close edit row form"
          onClose={cancelEditingDetail}
        >
          <form className="admin-inline-form" onSubmit={saveDetailEditForm}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="detailEditTime">Time</label>
                <input
                  id="detailEditTime"
                  type="time"
                  autoFocus
                  value={detailEditForm.time}
                  disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                  onChange={(event) => updateDetailEditFormField("time", event.target.value)}
                />
              </div>
              {!editingDetail.truckId ? (
                <div className="form-row full">
                  <label htmlFor="detailEditDescription">Description</label>
                  <input
                    id="detailEditDescription"
                    value={detailEditForm.description}
                    disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                    onChange={(event) =>
                      updateDetailEditFormField("description", event.target.value)
                    }
                  />
                </div>
              ) : null}
              {editingDetail.truckId ? (
                <>
                  <div className="form-row">
                    <label htmlFor="detailEditAction">Action</label>
                    <select
                      id="detailEditAction"
                      value={detailEditForm.action}
                      disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                      onChange={(event) =>
                        updateDetailEditFormField("action", event.target.value)
                      }
                    >
                      {truckDetailActions.map((action) => (
                        <option key={action || "none"} value={action}>
                          {action || "Action"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <label htmlFor="detailEditDestination">Destination</label>
                    <select
                      id="detailEditDestination"
                      value={detailEditForm.destinationValue}
                      disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                      onChange={(event) =>
                        updateDetailEditFormField("destinationValue", event.target.value)
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
              {!editingDetail.truckId && showTagColumn ? (
                <div className="form-row">
                  <label htmlFor="detailEditTag">Tag</label>
                  <select
                    id="detailEditTag"
                    value={detailEditForm.tagId}
                    disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                    onChange={(event) => updateDetailEditFormField("tagId", event.target.value)}
                  >
                    <option value="">No tag</option>
                    {normalDetailTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {!editingDetail.truckId && showLocationColumn ? (
                <div className="form-row">
                  <label htmlFor="detailEditLocation">Location</label>
                  <select
                    id="detailEditLocation"
                    value={detailEditForm.locationId}
                    disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                    onChange={(event) =>
                      updateDetailEditFormField("locationId", event.target.value)
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
              {!editingDetail.truckId && showCompanyColumn ? (
                <div className="form-row full">
                  <span className="form-label">Companies</span>
                  <div className="checkbox-stack">
                    {companies.length === 0 ? (
                      <span className="item-meta">No companies available.</span>
                    ) : (
                      companies.map((company) => (
                        <label className="checkbox-row" key={company.id}>
                          <input
                            type="checkbox"
                            checked={(detailEditForm.companyIds || []).includes(company.id)}
                            disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                            onChange={() => toggleDetailEditCompany(company.id)}
                          />
                          <span>{company.companyName}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
              <div className="form-row full">
                <label htmlFor="detailEditNotes">Notes</label>
                <textarea
                  id="detailEditNotes"
                  value={detailEditForm.notes}
                  disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                  rows={4}
                  onChange={(event) => updateDetailEditFormField("notes", event.target.value)}
                />
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={isWriteDisabled || savingDetailId === editingDetail.id}
              >
                {savingDetailId === editingDetail.id ? "Saving..." : "Save"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingDetailId === editingDetail.id}
                onClick={cancelEditingDetail}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingDetailTime ? (
        <Modal
          title="Edit time"
          subtitle={editingDetailTimeDay ? formatDetailDate(editingDetailTimeDay.date) : ""}
          labelledBy="editScheduleTimeTitle"
          closeLabel="Close edit time form"
          onClose={cancelEditingDetail}
        >
          <form className="admin-inline-form" onSubmit={saveDetailTimeForm}>
            <div className="mobile-time-picker">
              <p className="mobile-time-picker-label">Start time</p>
              <label className="desktop-time-input-row" htmlFor="detailTimeKeyboardInput">
                <span>Type time</span>
                <input
                  id="detailTimeKeyboardInput"
                  type="time"
                  value={detailEditForm.time}
                  disabled={isWriteDisabled || savingDetailId === editingDetailTime.id}
                  onChange={(event) => updateDetailEditFormField("time", event.target.value)}
                />
              </label>
              <div className="mobile-time-picker-controls">
                <div className="mobile-time-picker-column" aria-label="Hour">
                  <span>Hour</span>
                  <div className="mobile-time-wheel" role="listbox" aria-label="Hour">
                    {timePickerHours.map((hour) => (
                      <button
                        className={
                          ((detailEditForm.time || "00:00").split(":")[0] || "00") === hour
                            ? "mobile-time-wheel-option active"
                            : "mobile-time-wheel-option"
                        }
                        key={hour}
                        type="button"
                        disabled={isWriteDisabled || savingDetailId === editingDetailTime.id}
                        onClick={() => updateDetailEditTimePart("hour", hour)}
                        onKeyDown={(event) => handleDetailTimeWheelKeyDown("hour", event)}
                      >
                        {hour}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="mobile-time-picker-separator">:</span>
                <div className="mobile-time-picker-column" aria-label="Minute">
                  <span>Minute</span>
                  <div className="mobile-time-wheel" role="listbox" aria-label="Minute">
                    {timePickerMinutes.map((minute) => (
                      <button
                        className={
                          ((detailEditForm.time || "00:00").split(":")[1] || "00") === minute
                            ? "mobile-time-wheel-option active"
                            : "mobile-time-wheel-option"
                        }
                        key={minute}
                        type="button"
                        disabled={isWriteDisabled || savingDetailId === editingDetailTime.id}
                        onClick={() => updateDetailEditTimePart("minute", minute)}
                        onKeyDown={(event) => handleDetailTimeWheelKeyDown("minute", event)}
                      >
                        {minute}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={isWriteDisabled || savingDetailId === editingDetailTime.id}
              >
                {savingDetailId === editingDetailTime.id ? "Saving..." : "Save"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingDetailId === editingDetailTime.id}
                onClick={cancelEditingDetail}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingDayMode === "overlay" ? (
        <Modal
          title="Edit day"
          subtitle={formatDetailDate(scheduleDays.find((day) => day.id === editingDayId)?.date)}
          labelledBy="editDayTitle"
          closeLabel="Close edit day form"
          onClose={cancelEditingDay}
        >
          <div className="form-grid">
            <div className="form-row full">
              <label htmlFor="overlayDaySummary">Summary</label>
              <input
                id="overlayDaySummary"
                value={editingDayDraft.summary}
                disabled={isOffline}
                onChange={(event) => updateEditingDayField("summary", event.target.value)}
              />
            </div>
            <div className="form-row full">
              <label htmlFor="overlayDayTarget">End of day target</label>
              <input
                id="overlayDayTarget"
                value={editingDayDraft.endOfDayTarget}
                disabled={isOffline}
                onChange={(event) => updateEditingDayField("endOfDayTarget", event.target.value)}
              />
            </div>
          </div>

          <div className="actions">
            <button
              className="button"
              type="button"
              disabled={savingDayId === editingDayId || isWriteDisabled}
              onClick={() => {
                const day = scheduleDays.find((nextDay) => nextDay.id === editingDayId);
                if (day) saveDay(day, editingDayDraft);
              }}
            >
              {savingDayId === editingDayId ? "Saving..." : "Save day"}
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={savingDayId === editingDayId || isWriteDisabled}
              onClick={cancelEditingDay}
            >
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
