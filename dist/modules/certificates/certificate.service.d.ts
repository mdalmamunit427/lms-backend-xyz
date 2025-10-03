import { ServiceResponse } from "../../@types/api";
/**
 * Get user certificate for a course with caching
 */
export declare const getUserCertificateService: (userId: string, courseId: string, cacheKey: string) => Promise<ServiceResponse<any>>;
/**
 * Get all user certificates with caching
 */
export declare const getUserCertificatesService: (userId: string, options: any | undefined, cacheKey: string) => Promise<ServiceResponse<any>>;
/**
 * Get certificate by certificate ID (for verification)
 */
export declare const getCertificateByIdService: (certificateId: string, cacheKey: string) => Promise<ServiceResponse<any>>;
/**
 * Verify certificate authenticity
 */
export declare const verifyCertificateService: (certificateId: string) => Promise<ServiceResponse<any>>;
/**
 * Get certificate statistics with caching
 */
export declare const getCertificateStatsService: (options: any | undefined, cacheKey: string) => Promise<ServiceResponse<any>>;
/**
 * Get certificate for download by certificate ID
 */
export declare const getCertificateForDownload: (certificateId: string) => Promise<ServiceResponse<any>>;
//# sourceMappingURL=certificate.service.d.ts.map