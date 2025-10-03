import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../modules/users/user.model";
import { createError } from "../utils/errorHandler";
import config from "../config";
import { getUserById } from "../modules/users/user.service";


export interface AuthRequest extends Request {
    user?: IUser;
}

// authentication middleware
export const isAuthenticated = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token: string | undefined = undefined;

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
        return next(createError("Unauthorized Access: Access Token is missing.", 401));
    }

    try {
        // 3. Verify the token
        const decoded = jwt.verify(token, config.jwt_access_secret!) as { id: string };

        // 4. Use the centralized service function to get the user
        const result = await getUserById(decoded.id); 

        if (!result.success || !result.data) return next(createError("User not found", 404));

        req.user = result.data;
        next();

    } catch (error) {
        // This handles jwt.verify errors (expired, invalid signature)
        return next(createError("Token expired or invalid", 401));
    }
};


// authorization middleware
// export const authorizeRoles = (...roles: string[]) => {
//     return (req: AuthRequest, res: Response, next: NextFunction) => {
//         if (!req.user || !roles.includes(req.user.role)) {
//             return next(new AppError("You are not authorized to access this resource", 403));
//         }
//         next();
//     };
// };