// src/modules/notifications/notification.routes.ts

import { Router } from "express";
import { isAuthenticated } from "../../middlewares/auth";
import { rbac } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware";
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
  isAuthenticated,
    rbac('notification:create'),
    validate(createNotificationSchema), 
  createNotificationHandler
);

// POST send bulk notifications (admin only)
router.post(
  "/bulk", 
  isAuthenticated,
    rbac('notification:create'),
    validate(sendBulkNotificationSchema), 
  sendBulkNotificationHandler
);

// GET user's notifications with advanced filtering
router.get(
  "/", 
  isAuthenticated,
    cacheMiddleware(`${NOTIFICATION_CACHE_BASE}:user`, { param: 'user', isList: true }),
    validate(getEnhancedNotificationsSchema),
  getEnhancedNotificationsHandler
);

// GET unread count
router.get(
  "/unread/count", 
  isAuthenticated,
    cacheMiddleware(`${NOTIFICATION_CACHE_BASE}:unread`, { param: 'user' }),
    validate(getEnhancedNotificationsSchema),
  getUnreadCountHandler
);

// GET notification statistics (admin only)
router.get(
  "/stats", 
  isAuthenticated,
    cacheMiddleware(`notification-stats`, { isList: true }),
    validate(getNotificationStatsSchema),
  getNotificationStatsHandler
);

// GET notification analytics
router.get(
  "/analytics",
  isAuthenticated,
    cacheMiddleware('notification:read', { isList: false }),
    validate(notificationAnalyticsSchema),
  getNotificationAnalyticsHandler
);

router.get(
  "/analytics/:userId",
  isAuthenticated,
    cacheMiddleware('notification:read', { param: 'userId' }),
    validate(notificationAnalyticsSchema),
  getNotificationAnalyticsHandler
);

// GET notification preferences
router.get(
  "/preferences",
  isAuthenticated,
    cacheMiddleware('notification:read', { isList: false }),
    validate(emptySchema),
  getNotificationPreferencesHandler
);

// PATCH update notification preferences
router.patch(
  "/preferences",
  isAuthenticated,
    rbac('notification:update'),
    validate(notificationPreferencesSchema),
  updateNotificationPreferencesHandler
);

// PATCH mark notifications as read (enhanced)
router.patch(
  "/read",
  isAuthenticated,
    rbac('notification:update'),
    validate(markNotificationsAsReadSchema),
  markNotificationsAsReadEnhancedHandler
);

// PATCH archive notifications
router.patch(
  "/archive",
  isAuthenticated,
    rbac('notification:update'),
    validate(archiveNotificationsSchema),
  archiveNotificationsHandler
);

// DELETE notification
router.delete(
  "/:id", 
  isAuthenticated,
    rbac('notification:delete'),
    validate(notificationIdSchema),
  deleteNotificationHandler
);

export default router;