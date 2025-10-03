"use strict";
// src/modules/notifications/notification.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("./notification.controller");
const notification_validation_1 = require("./notification.validation");
const middlewareStacks_1 = require("../../utils/middlewareStacks");
const notification_validation_2 = require("./notification.validation");
const router = (0, express_1.Router)();
const NOTIFICATION_CACHE_BASE = 'notifications';
// --- ENHANCED NOTIFICATION ROUTES ---
// POST create notification (admin only)
router.post("/", ...(0, middlewareStacks_1.getMutationStack)('notification:create', notification_validation_1.createNotificationSchema), notification_controller_1.createNotificationHandler);
// POST send bulk notifications (admin only)
router.post("/bulk", ...(0, middlewareStacks_1.getMutationStack)('notification:create', notification_validation_1.sendBulkNotificationSchema), notification_controller_1.sendBulkNotificationHandler);
// GET user's notifications with advanced filtering
router.get("/", ...(0, middlewareStacks_1.getCacheStack)(`${NOTIFICATION_CACHE_BASE}:user`, { param: 'user', isList: true }, notification_validation_2.getEnhancedNotificationsSchema), notification_controller_1.getEnhancedNotificationsHandler);
// GET unread count
router.get("/unread/count", ...(0, middlewareStacks_1.getCacheStack)(`${NOTIFICATION_CACHE_BASE}:unread`, { param: 'user' }, notification_validation_2.getEnhancedNotificationsSchema), notification_controller_1.getUnreadCountHandler);
// GET notification statistics (admin only)
router.get("/stats", ...(0, middlewareStacks_1.getCacheStack)(`notification-stats`, { isList: true }, notification_validation_1.getNotificationStatsSchema), notification_controller_1.getNotificationStatsHandler);
// GET notification analytics
router.get("/analytics", ...(0, middlewareStacks_1.getCacheStack)('notification:read', { isList: false }, notification_validation_2.notificationAnalyticsSchema), notification_controller_1.getNotificationAnalyticsHandler);
router.get("/analytics/:userId", ...(0, middlewareStacks_1.getCacheStack)('notification:read', { param: 'userId', isList: false }, notification_validation_2.notificationAnalyticsSchema), notification_controller_1.getNotificationAnalyticsHandler);
// GET notification preferences
router.get("/preferences", ...(0, middlewareStacks_1.getCacheStack)('notification:read', { isList: false }, notification_validation_2.emptySchema), notification_controller_1.getNotificationPreferencesHandler);
// PATCH update notification preferences
router.patch("/preferences", ...(0, middlewareStacks_1.getMutationStack)('notification:update', notification_validation_2.notificationPreferencesSchema), notification_controller_1.updateNotificationPreferencesHandler);
// PATCH mark notifications as read (enhanced)
router.patch("/read", ...(0, middlewareStacks_1.getMutationStack)('notification:update', notification_validation_2.markNotificationsAsReadSchema), notification_controller_1.markNotificationsAsReadEnhancedHandler);
// PATCH archive notifications
router.patch("/archive", ...(0, middlewareStacks_1.getMutationStack)('notification:update', notification_validation_2.archiveNotificationsSchema), notification_controller_1.archiveNotificationsHandler);
// DELETE notification
router.delete("/:id", ...(0, middlewareStacks_1.getDeleteStack)('notification:delete', notification_validation_1.notificationIdSchema), notification_controller_1.deleteNotificationHandler);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map