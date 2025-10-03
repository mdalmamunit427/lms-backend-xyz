import mongoose, { Document, Types } from 'mongoose';
interface IContentItem {
    type: "lecture" | "quiz";
    refId: Types.ObjectId;
    title: string;
    isPreview?: boolean;
}
export interface IChapter extends Document {
    title: string;
    course: Types.ObjectId;
    order: number;
    content: IContentItem[];
    chapterDuration: number;
}
declare const Chapter: mongoose.Model<IChapter, {}, {}, {}, mongoose.Document<unknown, {}, IChapter, {}, {}> & IChapter & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Chapter;
//# sourceMappingURL=chapter.model.d.ts.map