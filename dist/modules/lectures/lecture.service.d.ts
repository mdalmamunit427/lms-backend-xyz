import { ILecture } from './lecture.model';
import { ICreateLectureBody, IUpdateLectureBody } from './lecture.validation';
import { UserRole } from '../../utils/ownership';
import { ServiceResponse } from "../../@types/api";
/**
 * Creates a new lecture with smart conflict resolution for order, and atomically links it to the parent chapter.
 */
export declare const createLectureService: (data: ICreateLectureBody, userId: string, userRole: UserRole) => Promise<ServiceResponse<ILecture>>;
/**
 * Gets a single lecture by ID.
 * Implements security: Hides videoUrl if the user is not enrolled or is not the instructor/admin.
 */
export declare const getLectureByIdService: (id: string, cacheKey: string, isEnrolled: boolean) => Promise<ServiceResponse<ILecture>>;
/**
 * Gets all lectures for a chapter.
 * Implements security: Hides videoUrl for non-preview content.
 */
export declare const getLecturesByChapterService: (chapterId: string, cacheKey: string, isEnrolled: boolean) => Promise<ServiceResponse<{
    lectures: ILecture[];
}>>;
/**
 * Updates a lecture with smart order conflict resolution.
 */
export declare const updateLectureService: (id: string, data: IUpdateLectureBody, userId: string, userRole: UserRole) => Promise<ServiceResponse<ILecture>>;
/**
 * Deletes a lecture and unlinks it from the parent chapter (Transactional Cascading Delete).
 */
export declare const deleteLectureService: (id: string, userId: string, userRole: UserRole) => Promise<ServiceResponse<ILecture>>;
/**
 * Reorders lectures within a chapter with conflict resolution (Transactional Bulk Write).
 */
export declare const reorderLecturesService: (chapterId: string, orderList: {
    lectureId: string;
    order: number;
}[], userId: string, userRole: UserRole) => Promise<ServiceResponse<any>>;
//# sourceMappingURL=lecture.service.d.ts.map