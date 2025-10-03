import mongoose, { Schema, Document, Types } from 'mongoose';

// The Quiz model is the source of truth for all quiz questions and answers
export interface IQuiz extends Document {
  course: Types.ObjectId;
  chapter: Types.ObjectId;
  title: string;
  order: number;
  questions: {
    questionText: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }[];
}

const QuizSchema: Schema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    chapter: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true, index: true },
    title: { type: String, required: true },
    order: { type: Number, required: true },
    questions: [
      {
       questionText: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: Number, required: true },
        explanation: String,
      },
    ],
  },
  { timestamps: true }
);

// Index for fast lookup by parent chapter
QuizSchema.index({ chapter: 1, order: 1 });

const Quiz = mongoose.model<IQuiz>("Quiz", QuizSchema);
export default Quiz;