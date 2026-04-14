const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// ==================== FILE UPLOAD CONFIGURATION ====================
// Ensure uploads folder exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX files are allowed'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// ==================== EMAIL TRANSPORTER ====================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify email connection
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Email connection failed:', error);
  } else {
    console.log('✅ Email server ready to send messages');
  }
});

// ==================== API ENDPOINTS ====================

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// ==================== CONTACT FORM ENDPOINT ====================
app.post('/api/contact', async (req, res) => {
  const { fullName, email, phone, subject, message } = req.body;
  
  // Validation
  if (!fullName || !email || !subject || !message) {
    return res.status(400).json({ 
      success: false, 
      error: 'Please fill all required fields' 
    });
  }
  
  const mailOptions = {
    from: `"${fullName}" <${email}>`,
    to: process.env.CONTACT_EMAIL,
    subject: `📧 Contact Form: ${subject}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #111827; margin-top: 5px; }
          .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Contact Form Submission</h2>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">👤 Name:</div>
              <div class="value">${fullName}</div>
            </div>
            <div class="field">
              <div class="label">📧 Email:</div>
              <div class="value">${email}</div>
            </div>
            <div class="field">
              <div class="label">📞 Phone:</div>
              <div class="value">${phone || 'Not provided'}</div>
            </div>
            <div class="field">
              <div class="label">📌 Subject:</div>
              <div class="value">${subject}</div>
            </div>
            <div class="field">
              <div class="label">💬 Message:</div>
              <div class="value">${message.replace(/\n/g, '<br>')}</div>
            </div>
          </div>
          <div class="footer">
            <p>Sent from Fast Group Website Contact Form</p>
          </div>
        </div>
      </body>
      </html>
    `,
    replyTo: email
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Contact email sent from ${email}`);
    res.json({ 
      success: true, 
      message: 'Your message has been sent successfully!' 
    });
  } catch (error) {
    console.error('❌ Email error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send message. Please try again later.' 
    });
  }
});

// ==================== JOB APPLICATION ENDPOINT ====================
app.post('/api/apply', upload.single('resume'), async (req, res) => {
  const { firstName, lastName, cnic, phone, email, address, jobTitle } = req.body;
  
  // Validation
  if (!firstName || !lastName || !phone || !email || !jobTitle) {
    return res.status(400).json({ 
      success: false, 
      error: 'Please fill all required fields' 
    });
  }
  
  const fullName = `${firstName} ${lastName}`;
  const resumeFile = req.file;
  
  const mailOptions = {
    from: `"${fullName}" <${email}>`,
    to: process.env.HR_EMAIL,
    subject: `💼 Job Application: ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #374151; }
          .value { color: #111827; margin-top: 5px; }
          .resume-badge { background: #10b981; color: white; padding: 5px 10px; border-radius: 5px; display: inline-block; }
          .footer { background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Job Application</h2>
            <p>Position: ${jobTitle}</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">👤 Full Name:</div>
              <div class="value">${fullName}</div>
            </div>
            <div class="field">
              <div class="label">🆔 CNIC:</div>
              <div class="value">${cnic || 'Not provided'}</div>
            </div>
            <div class="field">
              <div class="label">📞 Phone:</div>
              <div class="value">${phone}</div>
            </div>
            <div class="field">
              <div class="label">📧 Email:</div>
              <div class="value">${email}</div>
            </div>
            <div class="field">
              <div class="label">📍 Address:</div>
              <div class="value">${address || 'Not provided'}</div>
            </div>
            <div class="field">
              <div class="label">📄 Resume:</div>
              <div class="value">
                ${resumeFile ? `<span class="resume-badge">✓ Resume Attached</span>` : '<span>❌ No resume uploaded</span>'}
              </div>
            </div>
          </div>
          <div class="footer">
            <p>Application submitted via Fast Group Careers Page</p>
          </div>
        </div>
      </body>
      </html>
    `,
    attachments: resumeFile ? [{
      filename: resumeFile.originalname,
      path: resumeFile.path
    }] : [],
    replyTo: email
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Job application sent from ${email} for ${jobTitle}`);
    
    // Clean up uploaded file after sending email
    if (resumeFile) {
      fs.unlink(resumeFile.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Your application has been submitted successfully!' 
    });
  } catch (error) {
    console.error('❌ Email error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit application. Please try again.' 
    });
  }
});

// ==================== ERROR HANDLING MIDDLEWARE ====================
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ success: false, error: 'File is too large. Max 5MB allowed.' });
    }
  }
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  🚀 Server is running!
  📡 URL: http://localhost:${PORT}
  📧 Contact Email: ${process.env.CONTACT_EMAIL}
  💼 HR Email: ${process.env.HR_EMAIL}
  `);
});