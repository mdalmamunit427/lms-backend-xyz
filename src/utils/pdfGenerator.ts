import puppeteer from 'puppeteer';

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
    await page.setViewport({ width: 1200, height: 800 });

    const htmlContent = generateCertificateHTML(data);
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
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
    <meta charset="UTF-8" />
    <title>Certificate of Completion</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Open+Sans:wght@300;400;600&display=swap');

      * { margin: 0; padding: 0; box-sizing: border-box; }

      body {
        font-family: 'Open Sans', sans-serif;
        background: #f3f0e7;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 30px;
      }

      .certificate-container {
        background: #fff;
        width: 100%;
        max-width: 950px;
        padding: 60px 70px;
        border: 12px double #c9a646;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        position: relative;
      }

      .certificate-header {
        text-align: center;
        margin-bottom: 40px;
      }

      .certificate-logo {
        font-family: 'Playfair Display', serif;
        font-size: 40px;
        font-weight: 900;
        color: #2c3e50;
      }

      .certificate-subtitle {
        font-size: 18px;
        color: #555;
        letter-spacing: 3px;
        text-transform: uppercase;
        margin-top: 8px;
      }

     .certificate-title {
  font-family: 'Playfair Display', serif;
  font-size: 34px;
  font-weight: 700;
  margin: 30px 0 15px;
  color: #1a1a1a;
  letter-spacing: 2px;
  text-align: center;
}

.certificate-text {
  font-size: 18px;
  color: #555;
  line-height: 1.8;
  margin-bottom: 20px;
  text-align: center;
}

.student-name {
  font-family: 'Playfair Display', serif;
  font-size: 30px;
  font-weight: 700;
  color: #2c3e50;
  margin: 20px 0;
  text-decoration: underline;
  text-underline-offset: 10px;
  text-align: center;
}

.course-title {
  font-size: 24px;
  font-style: italic;
  color: #764ba2;
  margin: 15px 0 30px;
  text-align: center;
}

/* Details aligned evenly in a row */
.certificate-details {
  margin: 50px 0 20px;
  display: flex;
  justify-content: space-around;
  border-top: 1px solid #ddd;
  padding-top: 20px;
  text-align: center;
}

.detail-item {
  flex: 1;
}

/* Signature alignment fix */
.signature-section {
  margin-top: 60px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.signature {
  text-align: center;
  flex: 0 0 45%; /* prevent stretching */
}

.signature-line {
  width: 180px;
  height: 1px;
  background: #333;
  margin: 8px auto;
}

/* Move issue date bottom-right */
.date-section {
  text-align: right;
  margin-top: 40px;
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
      <div class="certificate-header">
        <div class="certificate-logo">🎓 CodeTutor LMS</div>
        <div class="certificate-subtitle">Certificate of Completion</div>
      </div>

      <div class="certificate-title">Certificate of Completion</div>

      <div class="certificate-text">This is to certify that</div>

      <div class="student-name">${data.studentName}</div>

      <div class="certificate-text">has successfully completed the course</div>

      <div class="course-title">"${data.courseTitle}"</div>

      <div class="certificate-text">with dedication and commitment to learning.</div>

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
          <div class="signature-label">Instructor</div>
        </div>
        <div class="signature">
          ${data.adminSignatureUrl ? `<img class="signature-image" src="${data.adminSignatureUrl}" alt="Administrator Signature" />` : ''}
          <div class="signature-line"></div>
          <div class="signature-label">${data.adminName || 'Platform Administrator'}</div>
        </div>
      </div>

      <div class="date-section">
        <div class="date-label">Date of Issue</div>
        <div class="date-value">${data.issueDate}</div>
      </div>
    </div>
  </body>
  </html>
  `;
};
