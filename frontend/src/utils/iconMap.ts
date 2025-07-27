// utils/iconMap.ts
import { markRaw} from 'vue'
import {
  AddOutline,
  RemoveOutline,
  HomeOutline,
  PeopleOutline,
  PersonAddOutline,
  SettingsOutline,
  DocumentOutline,
  PersonCircleOutline,
  MenuOutline,
  MenuSharp,
  KeyOutline,
  PencilOutline,
  TrashOutline,
  ChevronForwardOutline,
  ChevronDownOutline,
  LayersOutline,
  SwapHorizontalOutline,
  Ticket,
  SettingsSharp
} from '@vicons/ionicons5'

export const iconMap = {
  // Main keys
  dashboard: markRaw(HomeOutline),
  user: markRaw(PeopleOutline), // Primary key
  settings: markRaw(SettingsOutline),
  pages: markRaw(DocumentOutline),
  entity: markRaw(LayersOutline),
  transaction: markRaw(SwapHorizontalOutline),
  ticket: markRaw(Ticket),
  services: markRaw(SettingsSharp), // Using SettingsSharp for ServiceManager
  
  // Aliases for different naming conventions
  usermanagement: markRaw(PeopleOutline), // Alias for Settings.vue
  users: markRaw(PeopleOutline), // Another common alias
  expand: markRaw(ChevronForwardOutline),
  collapse: markRaw(ChevronDownOutline),
  // Other icons
  profile: markRaw(PersonCircleOutline),
  menu: {
    outline: markRaw(MenuOutline),
    sharp: markRaw(MenuSharp)
  },
  key: markRaw(KeyOutline),
  edit: markRaw(PencilOutline),
  delete: markRaw(TrashOutline),
  default: markRaw(DocumentOutline),
  collection: markRaw(DocumentOutline),
  item: markRaw(DocumentOutline),
  add: markRaw(AddOutline),
  groupAdd: markRaw(PersonAddOutline),
  plus: markRaw(AddOutline),
  minus: markRaw(RemoveOutline)
} as const

export type IconName = keyof typeof iconMap