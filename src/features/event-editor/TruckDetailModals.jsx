import Modal from "../../components/Modal.jsx";
import { truckDetailActions } from "./eventEditorConstants.js";

export default function TruckDetailModals({
  addingTruckDetailTruck,
  cancelEditingDetail,
  saveMobileAddTruckDetailForm,
  detailEditForm,
  isWriteDisabled,
  savingDraftDayId,
  updateDetailEditFormField,
  scheduleDays,
  formatDetailDate,
  showTruckDestinationColumn,
  companies,
  locationOptions,
}) {
  return (
    <>
      {addingTruckDetailTruck ? (
        <Modal
          title="Add truck row"
          subtitle={addingTruckDetailTruck.truckNumber || "Truck"}
          labelledBy="addTruckRowTitle"
          onClose={cancelEditingDetail}
        >
          <form className="admin-inline-form" onSubmit={saveMobileAddTruckDetailForm}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="truckDetailAddDate">Date</label>
                <select
                  id="truckDetailAddDate"
                  value={detailEditForm.scheduleDayId || ""}
                  disabled={isWriteDisabled || savingDraftDayId === addingTruckDetailTruck.id}
                  onChange={(event) =>
                    updateDetailEditFormField("scheduleDayId", event.target.value)
                  }
                  required
                >
                  <option value="">Choose date</option>
                  {scheduleDays.map((day) => (
                    <option key={day.id} value={day.id}>
                      {[formatDetailDate(day.date), day.summary].filter(Boolean).join(" - ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="truckDetailAddTime">Time</label>
                <input
                  id="truckDetailAddTime"
                  type="time"
                  autoFocus
                  value={detailEditForm.time}
                  disabled={isWriteDisabled || savingDraftDayId === addingTruckDetailTruck.id}
                  onChange={(event) => updateDetailEditFormField("time", event.target.value)}
                />
              </div>
              <div className="form-row">
                <label htmlFor="truckDetailAddAction">Action</label>
                <select
                  id="truckDetailAddAction"
                  value={detailEditForm.action}
                  disabled={isWriteDisabled || savingDraftDayId === addingTruckDetailTruck.id}
                  onChange={(event) => updateDetailEditFormField("action", event.target.value)}
                >
                  {truckDetailActions.map((action) => (
                    <option key={action || "none"} value={action}>
                      {action || "Action"}
                    </option>
                  ))}
                </select>
              </div>
              {showTruckDestinationColumn ? (
                <div className="form-row">
                  <label htmlFor="truckDetailAddDestination">Destination</label>
                  <select
                    id="truckDetailAddDestination"
                    value={detailEditForm.destinationValue}
                    disabled={isWriteDisabled || savingDraftDayId === addingTruckDetailTruck.id}
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
              ) : null}
              <div className="form-row full">
                <label htmlFor="truckDetailAddNotes">Notes</label>
                <textarea
                  id="truckDetailAddNotes"
                  value={detailEditForm.notes}
                  disabled={isWriteDisabled || savingDraftDayId === addingTruckDetailTruck.id}
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
                  savingDraftDayId === addingTruckDetailTruck.id ||
                  !detailEditForm.scheduleDayId
                }
              >
                {savingDraftDayId === addingTruckDetailTruck.id ? "Adding..." : "Add row"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingDraftDayId === addingTruckDetailTruck.id}
                onClick={cancelEditingDetail}
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
