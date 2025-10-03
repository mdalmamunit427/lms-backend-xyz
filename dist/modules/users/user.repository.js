"use strict";
// src/modules/users/user.repository.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRole = exports.updateRefreshToken = exports.updateProfileData = exports.saveUser = exports.findUserForOtpReset = exports.findUserForPasswordResetById = exports.findUserForPasswordReset = exports.findUserForTokenRefresh = exports.findUserById = exports.findUserForActivation = exports.findUserForLogin = exports.findUserByEmail = void 0;
const user_model_1 = __importDefault(require("./user.model"));
// --- READ Operations ---
const findUserByEmail = (email) => {
    return user_model_1.default.findOne({ email });
};
exports.findUserByEmail = findUserByEmail;
const findUserForLogin = (email) => {
    return user_model_1.default.findOne({ email }).select('+password');
};
exports.findUserForLogin = findUserForLogin;
const findUserForActivation = (email) => {
    return user_model_1.default.findOne({ email }).select('+activationCode +activationCodeExpiry');
};
exports.findUserForActivation = findUserForActivation;
const findUserById = (userId) => {
    return user_model_1.default.findById(userId).select('-password');
};
exports.findUserById = findUserById;
const findUserForTokenRefresh = (userId) => {
    return user_model_1.default.findById(userId).select('+refreshToken');
};
exports.findUserForTokenRefresh = findUserForTokenRefresh;
const findUserForPasswordReset = (email) => {
    return user_model_1.default.findOne({ email }).select('+password +resetPasswordOtp +resetPasswordOtpExpiry');
};
exports.findUserForPasswordReset = findUserForPasswordReset;
const findUserForPasswordResetById = (userId) => {
    return user_model_1.default.findById(userId).select('+password');
};
exports.findUserForPasswordResetById = findUserForPasswordResetById;
const findUserForOtpReset = (email) => {
    return user_model_1.default.findOne({ email }).select('+password +resetPasswordOtp +resetPasswordOtpExpiry');
};
exports.findUserForOtpReset = findUserForOtpReset;
// --- WRITE Operations ---
const saveUser = (user, session) => {
    return user.save({ session });
};
exports.saveUser = saveUser;
const updateProfileData = (userId, updateData) => {
    return user_model_1.default.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
    }).select('-password');
};
exports.updateProfileData = updateProfileData;
const updateRefreshToken = (user, refreshToken, expiry) => {
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = expiry;
    return user.save();
};
exports.updateRefreshToken = updateRefreshToken;
const updateUserRole = (userId, role) => {
    return user_model_1.default.findByIdAndUpdate(userId, { role }, {
        new: true,
        runValidators: true
    }).select('-password');
};
exports.updateUserRole = updateUserRole;
//# sourceMappingURL=user.repository.js.map