import mongoose, { Schema, Document, Types } from 'mongoose';

// Interface for the denormalized content structure
interface IContentItem {
    type: "lecture" | "quiz"; //can easily add type: "assignment" or type: "project" later
    refId: Types.ObjectId;
    title: string;
    isPreview?: boolean;
}

// The Chapter model acts as the ordered list and structural container
export interface IChapter extends Document {
  title: string;
  course: Types.ObjectId;
  order: number;
  content: IContentItem[]; // The sequential array of mixed content
  chapterDuration: number;
}

const ChapterSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    order: { type: Number, required: true },
    content: [
      {
        type: { type: String, enum: ["lecture", "quiz"], required: true },
        refId: { type: Schema.Types.ObjectId, required: true },
        title: { type: String, required: true },
        isPreview: { type: Boolean },
        // videoUrl field is REMOVED for size optimization.
      },
    ],
    chapterDuration: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Compound index for course structure and ordering
ChapterSchema.index({ course: 1, order: 1 });

const Chapter = mongoose.model<IChapter>("Chapter", ChapterSchema);
export default Chapter;