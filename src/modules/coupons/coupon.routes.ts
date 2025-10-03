import { Router } from 'express';
import { permissions } from '../../config/rbac';
import { validate } from '../../middlewares/validate.middleware';
import { cacheMiddleware } from '../../middlewares/cacheMiddleware';
import { getMutationStack, getDeleteStack } from '../../utils/middlewareStacks';
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
  ...getMutationStack(permissions.coupon.create, createCouponSchema),
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
  ...getMutationStack(permissions.coupon.update, updateCouponSchema, deleteCouponSchema),
  updateCouponController
);

// Delete a coupon (Admin only)
router.delete(
  '/:id',
  ...getDeleteStack(permissions.coupon.delete, deleteCouponSchema),
  deleteCouponController
);

export default router;