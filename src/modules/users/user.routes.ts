import { activateUserSchema, forgotPasswordSchema, loginUserSchema, refreshTokenSchema, registerUserSchema, resetPasswordSchema, resetPasswordWithOtpSchema, socialAuthSchema, updateProfilePictureSchema, updateProfileSchema, updateUserRoleSchema } from './user.validation';
import { activate, register, login, refresh, social, forgotPasswordController, resetPasswordWithOtpController, getUser, logout, updateProfile, resetPasswordController, updateProfilePicture, updateUserRole } from './user.controller';
import { isAuthenticated } from '../../middlewares/auth';
import { permissions } from '../../config/rbac';
import { rbac } from '../../middlewares/rbac.middleware';
import { validate } from "../../middlewares/validate.middleware";
import { cacheMiddleware } from "../../middlewares/cacheMiddleware";
// src/modules/users/user.routes.ts (FINAL OPTIMIZED VERSION)

import express from 'express';


const router = express.Router();

// --- Unauthenticated Routes (Public Validation) ---

router.post('/register', validate(registerUserSchema), register);
router.post('/activate-user', validate(activateUserSchema), activate);
router.post('/login', validate(loginUserSchema), login);
router.post('/refresh-token', validate(refreshTokenSchema), refresh);
router.post('/social-auth', validate(socialAuthSchema), social);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPasswordController);
router.post("/reset-password-otp", validate(resetPasswordWithOtpSchema), resetPasswordWithOtpController);


// --- Authenticated Routes (RBAC & Stacks) ---

// Logout user (Authentication handled by router.use, RBAC for policy/check)
router.post('/logout', isAuthenticated, rbac(permissions.user.read), logout); 

// Get user info by id
router.get('/me', isAuthenticated, rbac(permissions.user.read), getUser); 

// Update user profile 
// NOTE: getMutationStack ALREADY includes isAuthenticated, but since we have router.use, 
// the stack's explicit isAuthenticated is redundant but harmless.
router.put(
  '/update-profile', 
  isAuthenticated,
    rbac(permissions.user.updateSelf),
    validate(updateProfileSchema), 
  updateProfile
);

// Reset user password 
router.put(
  '/reset-password', 
  isAuthenticated,
    rbac(permissions.user.resetPasswordSelf),
    validate(resetPasswordSchema), 
  resetPasswordController
);

// Update profile picture
router.put(
  '/update-profile-picture', 
  isAuthenticated,
    rbac(permissions.user.updateSelf),
    validate(updateProfilePictureSchema), 
  updateProfilePicture
);

// --- ADMIN ONLY ROUTES ---

// Update user role (Admin only)
router.put(
  '/:id/role', 
  isAuthenticated,
    rbac(permissions.user.updateRole),
    validate(updateUserRoleSchema), 
  updateUserRole
);

export default router;