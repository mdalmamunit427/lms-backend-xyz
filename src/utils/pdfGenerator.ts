import puppeteer from 'puppeteer';
import path from 'path';

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  instructorName: string;
  certificateId: string;
  issueDate: string;
  completionDate: string;
  instructorSignatureUrl?: string;
  adminSignatureUrl?: string;
  adminName?: string;
}

export const generateCertificatePDF = async (data: CertificateData): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800 });

    // Generate HTML content for the certificate
    const htmlContent = generateCertificateHTML(data);

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0'
      }
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
};

const generateCertificateHTML = (data: CertificateData): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate of Completion</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Open+Sans:wght@300;400;600&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Open Sans', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .certificate-container {
                background: white;
                width: 100%;
                max-width: 800px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                overflow: hidden;
                position: relative;
            }
            
            .certificate-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px;
                text-align: center;
                position: relative;
            }
            
            .certificate-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
                opacity: 0.3;
            }
            
            .certificate-logo {
                font-family: 'Playfair Display', serif;
                font-size: 36px;
                font-weight: 900;
                margin-bottom: 10px;
                position: relative;
                z-index: 1;
            }
            
            .certificate-subtitle {
                font-size: 18px;
                font-weight: 300;
                opacity: 0.9;
                position: relative;
                z-index: 1;
            }
            
            .certificate-body {
                padding: 60px 40px;
                text-align: center;
                position: relative;
            }
            
            .certificate-title {
                font-family: 'Playfair Display', serif;
                font-size: 32px;
                font-weight: 700;
                color: #2c3e50;
                margin-bottom: 20px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            
            .certificate-text {
                font-size: 18px;
                color: #555;
                line-height: 1.8;
                margin-bottom: 30px;
            }
            
            .student-name {
                font-family: 'Playfair Display', serif;
                font-size: 28px;
                font-weight: 700;
                color: #667eea;
                margin: 20px 0;
                text-decoration: underline;
                text-decoration-color: #764ba2;
                text-underline-offset: 8px;
            }
            
            .course-title {
                font-size: 24px;
                font-weight: 600;
                color: #2c3e50;
                margin: 20px 0;
                font-style: italic;
            }
            
            .certificate-details {
                display: flex;
                justify-content: space-between;
                margin-top: 50px;
                padding-top: 30px;
                border-top: 2px solid #eee;
            }
            
            .detail-item {
                text-align: center;
                flex: 1;
            }
            
            .detail-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 5px;
            }
            
            .detail-value {
                font-size: 14px;
                font-weight: 600;
                color: #333;
            }
            
            .certificate-id {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 10px;
                margin-top: 30px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                color: #666;
                border: 1px solid #e9ecef;
            }
            
            .decorative-border {
                position: absolute;
                top: 20px;
                left: 20px;
                right: 20px;
                bottom: 20px;
                border: 3px solid #667eea;
                border-radius: 15px;
                pointer-events: none;
            }
            
            .corner-decoration {
                position: absolute;
                width: 40px;
                height: 40px;
                border: 3px solid #764ba2;
            }
            
            .corner-decoration.top-left {
                top: 10px;
                left: 10px;
                border-right: none;
                border-bottom: none;
            }
            
            .corner-decoration.top-right {
                top: 10px;
                right: 10px;
                border-left: none;
                border-bottom: none;
            }
            
            .corner-decoration.bottom-left {
                bottom: 10px;
                left: 10px;
                border-right: none;
                border-top: none;
            }
            
            .corner-decoration.bottom-right {
                bottom: 10px;
                right: 10px;
                border-left: none;
                border-top: none;
            }
            
            .signature-section {
                margin-top: 40px;
                display: flex;
                justify-content: space-between;
                align-items: end;
            }
            
            .signature {
                text-align: center;
                flex: 1;
            }
            
            .signature-image {
                display: block;
                height: 60px;
                margin: 0 auto 8px;
                object-fit: contain;
                filter: grayscale(10%);
            }
            
            .signature-line {
                width: 200px;
                height: 1px;
                background: #333;
                margin: 0 auto 10px;
            }
            
            .signature-label {
                font-size: 14px;
                color: #666;
                font-weight: 600;
            }
            
            .date-section {
                text-align: center;
                margin-top: 20px;
            }
            
            .date-label {
                font-size: 14px;
                color: #666;
                margin-bottom: 5px;
            }
            
            .date-value {
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }
        </style>
    </head>
    <body>
        <div class="certificate-container">
            <div class="decorative-border"></div>
            <div class="corner-decoration top-left"></div>
            <div class="corner-decoration top-right"></div>
            <div class="corner-decoration bottom-left"></div>
            <div class="corner-decoration bottom-right"></div>
            
            <div class="certificate-header">
                <div class="certificate-logo">🎓 CodeTutor LMS Platform</div>
                <div class="certificate-subtitle">Certificate of Completion</div>
            </div>
            
            <div class="certificate-body">
                <div class="certificate-title">Certificate of Completion</div>
                
                <div class="certificate-text">
                    This is to certify that
                </div>
                
                <div class="student-name">${data.studentName}</div>
                
                <div class="certificate-text">
                    has successfully completed the course
                </div>
                
                <div class="course-title">"${data.courseTitle}"</div>
                
                <div class="certificate-text">
                    with dedication and commitment to learning.
                </div>
                
                <div class="certificate-details">
                    <div class="detail-item">
                        <div class="detail-label">Certificate ID</div>
                        <div class="detail-value">${data.certificateId}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Issue Date</div>
                        <div class="detail-value">${data.issueDate}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Completion Date</div>
                        <div class="detail-value">${data.completionDate}</div>
                    </div>
                </div>
                
                <div class="signature-section">
                    <div class="signature">
                        ${data.instructorSignatureUrl ? `<img class="signature-image" src="${data.instructorSignatureUrl}" alt="Instructor Signature" />` : ''}
                        <div class="signature-line"></div>
                        <div class="signature-label">${data.instructorName || 'Instructor'}</div>
                    </div>
                    <div class="signature">
                        ${data.adminSignatureUrl ? `<img class=\"signature-image\" src=\"${data.adminSignatureUrl}\" alt=\"Administrator Signature\" />` : ''}
                        <div class="signature-line"></div>
                        <div class="signature-label">${data.adminName || 'Platform Administrator'}</div>
                    </div>
                </div>
                
                <div class="date-section">
                    <div class="date-label">Date of Issue</div>
                    <div class="date-value">${data.issueDate}</div>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};
