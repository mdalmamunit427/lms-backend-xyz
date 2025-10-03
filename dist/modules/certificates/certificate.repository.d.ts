import { ClientSession } from 'mongoose';
import { ICertificate } from './certificate.model';
export type CertificateQueryOptions = {
    page?: number;
    limit?: number;
    userId?: string;
    courseId?: string;
    startDate?: Date;
    endDate?: Date;
};
export declare const findCertificateById: (certificateId: string, session?: ClientSession) => Promise<ICertificate | null>;
export declare const findCertificateByUserAndCourse: (userId: string, courseId: string, session?: ClientSession) => Promise<ICertificate | null>;
export declare const findCertificatesByUser: (userId: string, options?: CertificateQueryOptions, session?: ClientSession) => Promise<ICertificate[]>;
export declare const findCertificatesByCourse: (courseId: string, options?: CertificateQueryOptions, session?: ClientSession) => Promise<ICertificate[]>;
export declare const findRecentCertificates: (limit?: number, session?: ClientSession) => Promise<ICertificate[]>;
export declare const countCertificatesByUser: (userId: string, session?: ClientSession) => Promise<number>;
export declare const countCertificatesByCourse: (courseId: string, session?: ClientSession) => Promise<number>;
export declare const createCertificate: (data: Partial<ICertificate>, session?: ClientSession) => Promise<ICertificate>;
export declare const updateCertificateById: (certificateId: string, updateData: Partial<ICertificate>, session?: ClientSession) => Promise<ICertificate | null>;
export declare const deleteCertificateById: (certificateId: string, session?: ClientSession) => Promise<ICertificate | null>;
export declare const deleteCertificateByUserAndCourse: (userId: string, courseId: string, session?: ClientSession) => Promise<ICertificate | null>;
export declare const bulkDeleteCertificatesByCourse: (courseId: string, session?: ClientSession) => Promise<void>;
export declare const bulkDeleteCertificatesByUser: (userId: string, session?: ClientSession) => Promise<void>;
export declare const aggregateCertificateStats: (options?: CertificateQueryOptions) => Promise<any>;
export declare const aggregateCertificatesByPeriod: (period?: "day" | "week" | "month") => Promise<any>;
//# sourceMappingURL=certificate.repository.d.ts.map