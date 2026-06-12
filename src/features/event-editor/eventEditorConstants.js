export const emptyEventForm = {
  name: "",
  venue: "",
  clientId: "",
  clientName: "",
  profileId: "",
  firstLiveDay: "",
  lastLiveDay: "",
  scheduleStartDate: "",
  scheduleEndDate: "",
  imageUrl: "",
  contactCompanyOrder: [],
  updatedAt: null,
  apiResponse: null,
};

export const eventEditTabs = [
  { id: "info", label: "Info", icon: "info" },
  { id: "detail", label: "Schedule", icon: "detail" },
  { id: "trucks", label: "Trucking", icon: "trucking" },
  { id: "share", label: "Share", icon: "share" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export const emptyTagForm = {
  name: "",
  colour: "#F39200",
};

export const emptyLocationForm = {
  name: "",
  parentLocationId: "",
};

export const emptyTruckSizeForm = {
  size: "",
};

export const emptyTruckForm = {
  truckSizeId: "",
  companyId: "",
  truckNumber: "",
  driverName: "",
  driverContactNumber: "",
  contents: "",
};

export const truckDetailActions = ["", "Load", "Deliver"];

export const emptyCompanyContactForm = {
  name: "",
  email: "",
  phone: "",
  role: "",
};

export const emptyDetailEditForm = {
  time: "",
  description: "",
  action: "",
  destinationValue: "",
  tagId: "",
  locationId: "",
  companyIds: [],
  notes: "",
};

export const timePickerHours = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);

export const timePickerMinutes = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0")
);

export const emptyKeyInfoForm = {
  title: "",
  description: "",
};

export const emptyFilteredViewForm = {
  name: "",
  filterBox: true,
  showKeyInfo: true,
  showLocations: false,
  showContacts: false,
  groupPresetId: "",
  filterTagIds: [],
  filterLocationIds: [],
  filterSubLocationIds: [],
  filterSupplierIds: [],
  filterGroup: "",
  group: "",
  sortOrder: 1,
};

export const FALLBACK_FILTERED_VIEW_SORT_ORDER = 1;
