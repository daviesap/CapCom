export default function EventEditorStatusMessages({
  error,
  warning,
  isOffline,
  detailsLoading,
  tagsLoading,
  locationsLoading,
  trucksLoading,
  companiesLoading,
  contactCompaniesLoading,
  truckSizesLoading,
  filteredViewsLoading,
  shareArchiveLoading,
}) {
  const isLoadingSupportingData =
    detailsLoading ||
    tagsLoading ||
    locationsLoading ||
    trucksLoading ||
    companiesLoading ||
    contactCompaniesLoading ||
    truckSizesLoading ||
    filteredViewsLoading ||
    shareArchiveLoading;

  if (!error && !warning && !isOffline && !isLoadingSupportingData) {
    return null;
  }

  return (
    <div className="event-editor-status-messages" aria-live="polite">
      {error ? <p className="message error-message">{error}</p> : null}
      {warning ? <p className="message warning-message">{warning}</p> : null}
      {isOffline ? (
        <p className="message offline-message">Offline mode: event editing is disabled.</p>
      ) : null}
      {isLoadingSupportingData ? (
        <p className="message">Loading event data...</p>
      ) : null}
    </div>
  );
}
