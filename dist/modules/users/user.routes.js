"use strict";
// src/modules/users/user.routes.ts (FINAL OPTIMIZED VERSION)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const middlewareStacks_1 = require("../../utils/middlewareStacks");
const user_validation_1 = require("./user.validation");
const user_controller_1 = require("./user.controller");
const auth_1 = require("../../middlewares/auth");
const rbac_1 = require("../../config/rbac");
const rbac_middleware_1 = require("../../middlewares/rbac.middleware");
const router = express_1.default.Router();
// --- Unauthenticated Routes (Public Validation) ---
router.post('/register', ...(0, middlewareStacks_1.getPublicValidationStack)(user_validation_1.registerUserSchema), user_controller_1.register);
router.post('/activate-user', ...(0, middlewareStacks_1.getPublicValidationStack)(user_validation_1.activateUserSchema), user_controller_1.activate);
router.post('/login', ...(0, middlewareStacks_1.getPublicValidationStack)(user_validation_1.loginUserSchema), user_controller_1.login);
router.post('/refresh-token', ...(0, middlewareStacks_1.getPublicValidationStack)(user_validation_1.refreshTokenSchema), user_controller_1.refresh);
router.post('/social-auth', ...(0, middlewareStacks_1.getPublicValidationStack)(user_validation_1.socialAuthSchema), user_controller_1.social);
router.post("/forgot-password", ...(0, middlewareStacks_1.getPublicValidationStack)(user_validation_1.forgotPasswordSchema), user_controller_1.forgotPasswordController);
router.post("/reset-password-otp", ...(0, middlewareStacks_1.getPublicValidationStack)(user_validation_1.resetPasswordWithOtpSchema), user_controller_1.resetPasswordWithOtpController);
// --- Authenticated Routes (RBAC & Stacks) ---
// Logout user (Authentication handled by router.use, RBAC for policy/check)
router.post('/logout', auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)(rbac_1.permissions.user.read), user_controller_1.logout);
// Get user info by id
router.get('/me', auth_1.isAuthenticated, (0, rbac_middleware_1.rbac)(rbac_1.permissions.user.read), user_controller_1.getUser);
// Update user profile 
// NOTE: getMutationStack ALREADY includes isAuthenticated, but since we have router.use, 
// the stack's explicit isAuthenticated is redundant but harmless.
router.put('/update-profile', ...(0, middlewareStacks_1.getMutationStack)(rbac_1.permissions.user.updateSelf, user_validation_1.updateProfileSchema), user_controller_1.updateProfile);
// Reset user password 
router.put('/reset-password', ...(0, middlewareStacks_1.getMutationStack)(rbac_1.permissions.user.resetPasswordSelf, user_validation_1.resetPasswordSchema), user_controller_1.resetPasswordController);
// Update profile picture
router.put('/update-profile-picture', ...(0, middlewareStacks_1.getMutationStack)(rbac_1.permissions.user.updateSelf, user_validation_1.updateProfilePictureSchema), user_controller_1.updateProfilePicture);
// --- ADMIN ONLY ROUTES ---
// Update user role (Admin only)
router.put('/:id/role', ...(0, middlewareStacks_1.getMutationStack)(rbac_1.permissions.user.updateRole, user_validation_1.updateUserRoleSchema), user_controller_1.updateUserRole);
exports.default = router;
//# sourceMappingURL=user.routes.js.map