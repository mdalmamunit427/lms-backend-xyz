"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorHandler_1 = require("../utils/errorHandler");
const config_1 = __importDefault(require("../config"));
const user_service_1 = require("../modules/users/user.service");
// authentication middleware
const isAuthenticated = async (req, res, next) => {
    let token = undefined;
    // 1. CHECK AUTHORIZATION HEADER (Bearer Token - Enterprise Standard)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"
    }
    // 2. FALLBACK TO COOKIES
    if (!token) {
        token = req.cookies.accessToken;
    }
    // If still no token, fail authentication
    if (!token) {
        return next((0, errorHandler_1.createError)("Unauthorized Access: Access Token is missing.", 401));
    }
    try {
        // 3. Verify the token
        const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt_access_secret);
        // 4. Use the centralized service function to get the user
        const result = await (0, user_service_1.getUserById)(decoded.id);
        if (!result.success || !result.data)
            return next((0, errorHandler_1.createError)("User not found", 404));
        req.user = result.data;
        next();
    }
    catch (error) {
        // This handles jwt.verify errors (expired, invalid signature)
        return next((0, errorHandler_1.createError)("Token expired or invalid", 401));
    }
};
exports.isAuthenticated = isAuthenticated;
// authorization middleware
// export const authorizeRoles = (...roles: string[]) => {
//     return (req: AuthRequest, res: Response, next: NextFunction) => {
//         if (!req.user || !roles.includes(req.user.role)) {
//             return next(new AppError("You are not authorized to access this resource", 403));
//         }
//         next();
//     };
// };
//# sourceMappingURL=auth.js.map