import { Router } from 'express';
import { permissions } from '../../config/rbac';
import { validate } from '../../middlewares/validate.middleware';
import { cacheMiddleware } from '../../middlewares/cacheMiddleware';
import { isAuthenticated } from '../../middlewares/auth';
import { rbac } from '../../middlewares/rbac.middleware';
import { createCouponSchema, deleteCouponSchema, updateCouponSchema, validateCouponSchema } from './coupon.validation';
import { createCouponController, deleteCouponController, getAllCouponsController, updateCouponController, validateCouponController } from './coupon.controller';

const router = Router();
const COUPON_CACHE_BASE = 'coupon';

// --- Public Routes (No Authentication Required) ---
// Validate coupon for course (used in course purchase flow)
router.post('/validate/:id', validate(validateCouponSchema), validateCouponController);

// --- Admin Protected Routes ---

// Create a new coupon (Admin only)
router.post(
  '/',
  isAuthenticated,
  rbac(permissions.coupon.create),
  validate(createCouponSchema),
  createCouponController
);

// Get all coupons (Admin only) - with caching
router.get(
  '/',
  isAuthenticated,
  rbac(permissions.coupon.read),
  cacheMiddleware('coupons:list', { isList: true }),
  getAllCouponsController
);

// Update a coupon (Admin only)
router.put(
  '/:id',
  isAuthenticated,
  rbac(permissions.coupon.update),
  validate(updateCouponSchema),
  updateCouponController
);

// Delete a coupon (Admin only)
router.delete(
  '/:id',
  isAuthenticated,
  rbac(permissions.coupon.delete),
  validate(deleteCouponSchema),
  deleteCouponController
);

export default router;