import {
  UpdateCategory,
  PriorityLevel,
  UpdateStatus,
  RecipientStatus,
  ResponseType,
  RestaurantStatus,
  UserRole,
} from './constants';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'pending_invitation' | 'suspended';
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  code: string;
  ownerName: string;
  email: string;
  phone: string;
  status: RestaurantStatus;
  address?: string;
  notes?: string;
  dateJoined: string;
  pendingUpdateCount?: number;
  lastActivity?: string;
}

export interface RestaurantMembership {
  id: string;
  restaurantId: string;
  userId: string;
  role: 'owner' | 'manager' | 'staff';
  isPrimary: boolean;
  createdAt: string;
}

export interface Invitation {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  email: string;
  token: string;
  role: UserRole;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  createdBy?: string;
  createdAt: string;
  acceptedAt?: string;
}

export interface UpdateAttachment {
  id: string;
  updateId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  createdAt: string;
}

export interface ResponseConfig {
  options?: string[]; // for multiple_choice
  requiresQuantity?: boolean;
  requiresNotes?: boolean;
  promptQuestion?: string;
}

export interface UpdateItem {
  id: string;
  title: string;
  category: UpdateCategory;
  priority: PriorityLevel;
  status: UpdateStatus;
  message: string;
  responseType: ResponseType;
  responseConfig?: ResponseConfig;
  deadlineAt?: string;
  scheduledAt?: string;
  publishedAt?: string;
  targetType: 'all' | 'selected';
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  attachments?: UpdateAttachment[];
  targetRestaurantIds?: string[];
  metrics?: {
    targetedCount: number;
    deliveredCount: number;
    readCount: number;
    acknowledgedCount: number;
    responseSubmittedCount: number;
    pendingCount: number;
    overdueCount: number;
  };
}

export interface UpdateRecipient {
  id: string;
  updateId: string;
  restaurantId: string;
  restaurantName?: string;
  status: RecipientStatus;
  deliveredAt?: string;
  readAt?: string;
  acknowledgedAt?: string;
  responseSubmittedAt?: string;
  responseReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  response?: RestaurantResponse;
}

export interface RestaurantResponse {
  id: string;
  updateId: string;
  restaurantId: string;
  restaurantName?: string;
  userId: string;
  userName?: string;
  responseType: ResponseType;
  status: 'draft' | 'submitted' | 'reviewed';
  availabilityStatus?: 'available' | 'partially_available' | 'unavailable' | 'not_applicable';
  availabilityDetails?: {
    reason?: string;
    availableFrom?: string;
    availableTo?: string;
    maxCapacity?: number;
    constrainedItems?: string[];
  };
  answerText?: string;
  selectedOptions?: string[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InAppNotification {
  id: string;
  recipientUserId: string;
  restaurantId?: string;
  type: 'new_update' | 'urgent_update' | 'deadline_approaching' | 'overdue' | 'response_reviewed' | 'general';
  title: string;
  message: string;
  data?: {
    updateId?: string;
    priority?: PriorityLevel;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  userId: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  payload?: any;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: User;
  restaurant?: Restaurant;
}

export interface AdminDashboardMetrics {
  totalRestaurants: number;
  activePartners: number;
  updatesPublished: number;
  updatesAwaitingResponses: number;
  urgentOrOverdueResponses: number;
  recentActivity: Array<{
    id: string;
    type: string;
    restaurantName: string;
    updateTitle: string;
    timestamp: string;
    status: string;
  }>;
  recentUpdates: UpdateItem[];
}
