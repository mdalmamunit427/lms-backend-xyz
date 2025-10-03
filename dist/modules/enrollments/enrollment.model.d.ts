import mongoose, { Document } from "mongoose";
export interface IEnrollment extends Document {
    student: mongoose.Types.ObjectId;
    course: mongoose.Types.ObjectId;
    coupon?: mongoose.Types.ObjectId;
    enrollmentDate: Date;
    amountPaid: number;
    paymentStatus: "pending" | "free" | "paid";
    stripeSessionId?: string;
}
declare const Enrollment: mongoose.Model<IEnrollment, {}, {}, {}, mongoose.Document<unknown, {}, IEnrollment, {}, {}> & IEnrollment & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Enrollment;
//# sourceMappingURL=enrollment.model.d.ts.map