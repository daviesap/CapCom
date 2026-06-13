import {
  AddressBook,
  AddressBookTabs,
  ArrowClockwise,
  ArrowBendDownRight,
  ArrowBendUpRight,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretDoubleDown,
  CaretRight,
  ArrowDown,
  ArrowSquareOut,
  ArrowUp,
  BookOpen,
  BugDroid,
  Buildings,
  Calendar,
  CalendarBlank,
  CalendarDots,
  CloudLightning,
  Copy,
  DotsSix,
  DotsThree,
  FunnelSimple,
  Factory,
  FileText,
  FileArrowUp,
  ForkKnife,
  Gear,
  House,
  Info,
  ListChecks,
  LockSimple,
  Lightbulb,
  MapPin,
  NotePencil,
  PencilSimple,
  Plus,
  QuestionMark,
  ShieldCheck,
  SignOut,
  Share,
  Tag,
  Trash,
  Truck,
  User,
  Users,
  Warning,
  X,
} from "@phosphor-icons/react";

export const capcomIcons = {
  add: Plus,
  arrowBendDownRight: ArrowBendDownRight,
  arrowBendUpRight: ArrowBendUpRight,
  caretDoubleLeft: CaretDoubleLeft,
  caretDoubleRight: CaretDoubleRight,
  caretDoubleDown: CaretDoubleDown,
  caretRight: CaretRight,
  close: X,
  admin: ShieldCheck,
  catering: ForkKnife,
  contact: AddressBook,
  contacts: AddressBookTabs,
  dashboard: House,
  detail: CalendarDots,
  edit: PencilSimple,
  event: Calendar,
  externalLink: ArrowSquareOut,
  filter: FunnelSimple,
  refresh: ArrowClockwise,
  bookOpen: BookOpen,
  info: Info,
  import: FileArrowUp,
  issueMajorBug: Warning,
  issueMinorBug: BugDroid,
  issueFriction: CloudLightning,
  issueFuture: Lightbulb,
  keyInfo: FileText,
  location: Buildings,
  lock: LockSimple,
  mapPin: MapPin,
  moveToNextDay: ArrowDown,
  moveToPreviousDay: ArrowUp,
  notes: NotePencil,
  share: Share,
  profile: User,
  overflow: DotsThree,
  question: QuestionMark,
  settings: Gear,
  signOut: SignOut,
  summary: CalendarBlank,
  tag: Tag,
  duplicate: Copy,
  delete: Trash,
  drag: DotsSix,
  company: Factory,
  taskList: ListChecks,
  truck: Truck,
  truckSize: Truck,
  trucking: Truck,
  users: Users,
  warning: Warning,
};

const defaultNavIconWeight = "duotone";

const navIconWeightOverrides = {
  question: "regular",
};

export function getNavIconWeight(name) {
  return navIconWeightOverrides[name] || defaultNavIconWeight;
}

export function CapcomIcon({
  name,
  size = 20,
  weight = "regular",
  decorative = true,
  label,
  ...iconProps
}) {
  const Icon = capcomIcons[name];

  if (!Icon) {
    return null;
  }

  return (
    <Icon
      aria-hidden={decorative ? "true" : undefined}
      aria-label={!decorative ? label : undefined}
      focusable="false"
      size={size}
      weight={weight}
      {...iconProps}
    />
  );
}
