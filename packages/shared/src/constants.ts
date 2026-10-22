export const UPDATE_CATEGORIES = [
  'Meal Planning',
  'Menu Changes',
  'Order and Quantity Updates',
  'Preparation Instructions',
  'Packaging and Food Quality',
  'Kitchen Operations',
  'Equipment and Maintenance',
  'Hygiene and Compliance',
  'Pricing and Payments',
  'Delivery and Logistics',
  'Training and Announcements',
  'General Updates',
] as const;

export type UpdateCategory = typeof UPDATE_CATEGORIES[number];

export const PRIORITY_LEVELS = ['normal', 'important', 'high', 'urgent'] as const;
export type PriorityLevel = typeof PRIORITY_LEVELS[number];

export const UPDATE_STATUSES = ['draft', 'scheduled', 'published', 'archived', 'cancelled'] as const;
export type UpdateStatus = typeof UPDATE_STATUSES[number];

export const RECIPIENT_STATUSES = [
  'pending_delivery',
  'delivered',
  'read',
  'acknowledged',
  'response_submitted',
  'response_reviewed',
  'overdue',
] as const;
export type RecipientStatus = typeof RECIPIENT_STATUSES[number];

export const RESPONSE_TYPES = [
  'acknowledgement_only',
  'availability_confirmation',
  'multiple_choice',
  'info_request',
  'announcement_only',
] as const;
export type ResponseType = typeof RESPONSE_TYPES[number];

export const RESTAURANT_STATUSES = ['active', 'pending_invitation', 'suspended'] as const;
export type RestaurantStatus = typeof RESTAURANT_STATUSES[number];

export const USER_ROLES = ['admin', 'restaurant_partner'] as const;
export type UserRole = typeof USER_ROLES[number];

export const BRAND_COLORS = {
  forest: '#264329',
  forestDark: '#182E1B',
  forestLight: '#365D3B',
  orange: '#ED8533',
  orangeHover: '#DA7424',
  orangeLight: '#FDF3EB',
  mint: '#EBF5EE',
  mintSubtle: '#F4FAF6',
  mintBorder: '#D8E5DC',
  cream: '#FAFCF9',
  dark: '#152217',
  muted: '#5A6E5E',
  urgentRed: '#DC2626',
  urgentBg: '#FEF2F2',
  urgentBorder: '#FCA5A5',
  amber: '#D97706',
  amberBg: '#FEF3C7',
  amberBorder: '#FCD34D',
  blue: '#2563EB',
  blueBg: '#EFF6FF',
} as const;
