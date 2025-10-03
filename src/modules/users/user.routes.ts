// src/modules/users/user.routes.ts (FINAL OPTIMIZED VERSION)

import express from 'express';
import { getMutationStack, getPublicValidationStack } from '../../utils/middlewareStacks';
import { activateUserSchema, forgotPasswordSchema, loginUserSchema, refreshTokenSchema, registerUserSchema, resetPasswordSchema, resetPasswordWithOtpSchema, socialAuthSchema, updateProfilePictureSchema, updateProfileSchema, updateUserRoleSchema } from './user.validation';
import { activate, register, login, refresh, social, forgotPasswordController, resetPasswordWithOtpController, getUser, logout, updateProfile, resetPasswordController, updateProfilePicture, updateUserRole } from './user.controller';
import { isAuthenticated } from '../../middlewares/auth';
import { permissions } from '../../config/rbac';
import { rbac } from '../../middlewares/rbac.middleware';


const router = express.Router();

// --- Unauthenticated Routes (Public Validation) ---

router.post('/register', ...getPublicValidationStack(registerUserSchema), register);
router.post('/activate-user', ...getPublicValidationStack(activateUserSchema), activate);
router.post('/login', ...getPublicValidationStack(loginUserSchema), login);
router.post('/refresh-token', ...getPublicValidationStack(refreshTokenSchema), refresh);
router.post('/social-auth', ...getPublicValidationStack(socialAuthSchema), social);
router.post("/forgot-password", ...getPublicValidationStack(forgotPasswordSchema), forgotPasswordController);
router.post("/reset-password-otp", ...getPublicValidationStack(resetPasswordWithOtpSchema), resetPasswordWithOtpController);


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
  ...getMutationStack(permissions.user.updateSelf, updateProfileSchema), 
  updateProfile
);

// Reset user password 
router.put(
  '/reset-password', 
  ...getMutationStack(permissions.user.resetPasswordSelf, resetPasswordSchema), 
  resetPasswordController
);

// Update profile picture
router.put(
  '/update-profile-picture', 
  ...getMutationStack(permissions.user.updateSelf, updateProfilePictureSchema), 
  updateProfilePicture
);

// --- ADMIN ONLY ROUTES ---

// Update user role (Admin only)
router.put(
  '/:id/role', 
  ...getMutationStack(permissions.user.updateRole, updateUserRoleSchema), 
  updateUserRole
);

export default router;