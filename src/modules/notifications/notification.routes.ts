// src/modules/notifications/notification.routes.ts

import { Router } from "express";
import {
  createNotificationHandler,
  deleteNotificationHandler,
  getUnreadCountHandler,
  sendBulkNotificationHandler,
  getNotificationStatsHandler,
  getNotificationAnalyticsHandler,
  getNotificationPreferencesHandler,
  updateNotificationPreferencesHandler,
  getEnhancedNotificationsHandler,
  markNotificationsAsReadEnhancedHandler,
  archiveNotificationsHandler
} from "./notification.controller";
import {
  createNotificationSchema,
  notificationIdSchema,
  sendBulkNotificationSchema,
  getNotificationStatsSchema,
} from "./notification.validation";
import { getCacheStack, getDeleteStack, getMutationStack } from "../../utils/middlewareStacks";
import {
  getEnhancedNotificationsSchema,
  notificationAnalyticsSchema,
  notificationPreferencesSchema,
  markNotificationsAsReadSchema,
  archiveNotificationsSchema,
  emptySchema
} from "./notification.validation";

const router = Router();
const NOTIFICATION_CACHE_BASE = 'notifications';

// --- ENHANCED NOTIFICATION ROUTES ---

// POST create notification (admin only)
router.post(
  "/", 
  ...getMutationStack('notification:create', createNotificationSchema), 
  createNotificationHandler
);

// POST send bulk notifications (admin only)
router.post(
  "/bulk", 
  ...getMutationStack('notification:create', sendBulkNotificationSchema), 
  sendBulkNotificationHandler
);

// GET user's notifications with advanced filtering
router.get(
  "/", 
  ...getCacheStack(`${NOTIFICATION_CACHE_BASE}:user`, { param: 'user', isList: true }, getEnhancedNotificationsSchema),
  getEnhancedNotificationsHandler
);

// GET unread count
router.get(
  "/unread/count", 
  ...getCacheStack(`${NOTIFICATION_CACHE_BASE}:unread`, { param: 'user' }, getEnhancedNotificationsSchema),
  getUnreadCountHandler
);

// GET notification statistics (admin only)
router.get(
  "/stats", 
  ...getCacheStack(`notification-stats`, { isList: true }, getNotificationStatsSchema),
  getNotificationStatsHandler
);

// GET notification analytics
router.get(
  "/analytics",
  ...getCacheStack('notification:read', { isList: false }, notificationAnalyticsSchema),
  getNotificationAnalyticsHandler
);

router.get(
  "/analytics/:userId",
  ...getCacheStack('notification:read', { param: 'userId', isList: false }, notificationAnalyticsSchema),
  getNotificationAnalyticsHandler
);

// GET notification preferences
router.get(
  "/preferences",
  ...getCacheStack('notification:read', { isList: false }, emptySchema),
  getNotificationPreferencesHandler
);

// PATCH update notification preferences
router.patch(
  "/preferences",
  ...getMutationStack('notification:update', notificationPreferencesSchema),
  updateNotificationPreferencesHandler
);

// PATCH mark notifications as read (enhanced)
router.patch(
  "/read",
  ...getMutationStack('notification:update', markNotificationsAsReadSchema),
  markNotificationsAsReadEnhancedHandler
);

// PATCH archive notifications
router.patch(
  "/archive",
  ...getMutationStack('notification:update', archiveNotificationsSchema),
  archiveNotificationsHandler
);

// DELETE notification
router.delete(
  "/:id", 
  ...getDeleteStack('notification:delete', notificationIdSchema),
  deleteNotificationHandler
);

export default router;