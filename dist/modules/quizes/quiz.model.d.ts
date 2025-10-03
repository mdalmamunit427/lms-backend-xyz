import mongoose, { Document, Types } from 'mongoose';
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
declare const Quiz: mongoose.Model<IQuiz, {}, {}, {}, mongoose.Document<unknown, {}, IQuiz, {}, {}> & IQuiz & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Quiz;
//# sourceMappingURL=quiz.model.d.ts.map