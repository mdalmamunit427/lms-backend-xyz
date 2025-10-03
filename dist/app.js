"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const globalError_1 = require("./middlewares/globalError");
const user_routes_1 = __importDefault(require("./modules/users/user.routes"));
const course_routes_1 = __importDefault(require("./modules/courses/course.routes"));
const enrollment_routes_1 = __importDefault(require("./modules/enrollments/enrollment.routes"));
const coupon_routes_1 = __importDefault(require("./modules/coupons/coupon.routes"));
const enrollment_controller_1 = require("./modules/enrollments/enrollment.controller");
const chapter_routes_1 = __importDefault(require("./modules/chapters/chapter.routes"));
const lecture_routes_1 = __importDefault(require("./modules/lectures/lecture.routes"));
const quiz_routes_1 = __importDefault(require("./modules/quizes/quiz.routes"));
const progress_routes_1 = __importDefault(require("./modules/progress/progress.routes"));
const discussion_routes_1 = __importDefault(require("./modules/discussions/discussion.routes"));
const review_routes_1 = __importDefault(require("./modules/reviews/review.routes"));
const certificate_routes_1 = __importDefault(require("./modules/certificates/certificate.routes"));
const notification_routes_1 = __importDefault(require("./modules/notifications/notification.routes"));
const app = (0, express_1.default)();
app.post('/api/v1/stripe/webhook', express_1.default.raw({ type: 'application/json' }), enrollment_controller_1.handleStripeWebhook);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
// routes
app.use("/api/v1/user", user_routes_1.default);
app.use("/api/v1/courses", course_routes_1.default);
app.use("/api/v1/enrollment", enrollment_routes_1.default);
app.use("/api/v1/coupon", coupon_routes_1.default);
app.use("/api/v1/chapters", chapter_routes_1.default);
app.use("/api/v1/lectures", lecture_routes_1.default);
app.use("/api/v1/quizzes", quiz_routes_1.default);
app.use("/api/v1/progress", progress_routes_1.default);
app.use("/api/v1/discussions", discussion_routes_1.default);
app.use("/api/v1/reviews", review_routes_1.default);
app.use("/api/v1/certificates", certificate_routes_1.default);
app.use("/api/v1/notifications", notification_routes_1.default);
app.use(globalError_1.globalErrorHandler);
app.get("/", (_req, res) => {
    res.send("LMS Backend Server is Running...");
});
exports.default = app;
//# sourceMappingURL=app.js.map