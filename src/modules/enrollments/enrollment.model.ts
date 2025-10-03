import mongoose, { Schema, Document } from "mongoose";

export interface IEnrollment extends Document {
  student: mongoose.Types.ObjectId; 
  course: mongoose.Types.ObjectId;
  coupon?: mongoose.Types.ObjectId; 
  enrollmentDate: Date;
  amountPaid: number;
  paymentStatus: "pending" | "free" | "paid";
  stripeSessionId?: string; 
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    student: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    coupon: { type: Schema.Types.ObjectId, ref: "Coupon" },
    enrollmentDate: { type: Date, default: Date.now },
    paymentStatus: { type: String, enum: ["pending","free", "paid"], default: "paid" }, // Set to 'paid' by default for free enrollments
    amountPaid: { type: Number, default: 0 },
    stripeSessionId: { type: String },
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

const Enrollment = mongoose.model<IEnrollment>("Enrollment", enrollmentSchema);
export default Enrollment;