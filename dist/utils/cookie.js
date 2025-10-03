"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAuthCookies = exports.setAccessTokenCookie = exports.setAuthCookies = void 0;
// Get token expiry times from environment variables, or use defaults
const ACCESS_TOKEN_EXPIRES_IN_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// Helper function to set a single cookie
const setCookie = (res, name, token, maxAge) => {
    res.cookie(name, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge,
    });
};
/**
 * Sets both the access token and refresh token cookies.
 * @param res The Express response object.
 * @param accessToken The JWT access token.
 * @param refreshToken The JWT refresh token.
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
    setCookie(res, "accessToken", accessToken, ACCESS_TOKEN_EXPIRES_IN_MS);
    setCookie(res, "refreshToken", refreshToken, REFRESH_TOKEN_EXPIRES_IN_MS);
};
exports.setAuthCookies = setAuthCookies;
/**
 * Sets only the access token cookie.
 * @param res The Express response object.
 * @param accessToken The JWT access token.
 */
const setAccessTokenCookie = (res, accessToken) => {
    setCookie(res, "accessToken", accessToken, ACCESS_TOKEN_EXPIRES_IN_MS);
};
exports.setAccessTokenCookie = setAccessTokenCookie;
/**
 * Clears both the access token and refresh token cookies.
 * @param res The Express response object.
 */
const clearAuthCookies = (res) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
};
exports.clearAuthCookies = clearAuthCookies;
//# sourceMappingURL=cookie.js.map