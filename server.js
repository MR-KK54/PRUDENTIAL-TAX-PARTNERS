require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

const DATA_FILE = path.join(__dirname, 'submissions.json');
let submissions = [];
if (fs.existsSync(DATA_FILE)) {
  try { submissions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) {}
}

function saveSubmissions() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2), 'utf8');
}

// Email transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { Name, Email, Company, Phone, Service, Message } = req.body;

    if (!Name || !Email || !Message) {
      return res.status(400).json({ success: false, message: 'Name, Email, and Message are required.' });
    }

    const submission = {
      id: Date.now(),
      Name,
      Email,
      Company: Company || 'N/A',
      Phone: Phone || 'N/A',
      Service: Service || 'N/A',
      Message,
      date: new Date().toISOString()
    };
    submissions.push(submission);
    saveSubmissions();

    // Email to owner
    await transporter.sendMail({
      from: `"PRUDENTIAL TAX PARTNERS" <${process.env.EMAIL_USER}>`,
      to: 'kishorekumar.78k@gmail.com',
      subject: 'New enquiry from PRUDENTIAL TAX PARTNERS website',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1e1b4b">New Contact Form Submission</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f5f3ff;font-weight:600;color:#1e1b4b">Name</td><td style="padding:10px;border:1px solid #e2e8f0">${Name}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f5f3ff;font-weight:600;color:#1e1b4b">Email</td><td style="padding:10px;border:1px solid #e2e8f0">${Email}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f5f3ff;font-weight:600;color:#1e1b4b">Company</td><td style="padding:10px;border:1px solid #e2e8f0">${Company || 'N/A'}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f5f3ff;font-weight:600;color:#1e1b4b">Phone</td><td style="padding:10px;border:1px solid #e2e8f0">${Phone || 'N/A'}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f5f3ff;font-weight:600;color:#1e1b4b">Service</td><td style="padding:10px;border:1px solid #e2e8f0">${Service || 'N/A'}</td></tr>
            <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f5f3ff;font-weight:600;color:#1e1b4b">Message</td><td style="padding:10px;border:1px solid #e2e8f0">${Message}</td></tr>
          </table>
          <p style="color:#64748b;font-size:0.85rem;margin-top:16px">Received on ${submission.date}</p>
        </div>`
    });

    // Auto-reply to client
    await transporter.sendMail({
      from: `"PRUDENTIAL TAX PARTNERS" <${process.env.EMAIL_USER}>`,
      to: Email,
      subject: 'Thank you for contacting PRUDENTIAL TAX PARTNERS',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1e1b4b">Thank You, ${Name}!</h2>
          <p style="color:#1e293b;font-size:1rem;line-height:1.6">We have received your enquiry and our team will review it shortly.</p>
          <p style="color:#1e293b;font-size:1rem;line-height:1.6">We typically respond within <strong>24 hours</strong> during business days.</p>
          <div style="background:#f5f3ff;padding:20px;border-radius:8px;margin:20px 0">
            <p style="margin:0 0 8px;color:#1e1b4b;font-weight:600">For urgent matters:</p>
            <p style="margin:0;color:#64748b">Phone: <a href="tel:+919884455667" style="color:#8b5cf6">+91 98844 55667</a></p>
            <p style="margin:0;color:#64748b">Email: <a href="mailto:kishorekumar.78k@gmail.com" style="color:#8b5cf6">kishorekumar.78k@gmail.com</a></p>
          </div>
          <p style="color:#1e293b;font-size:1rem;line-height:1.6">Best regards,</p>
          <p style="color:#1e1b4b;font-weight:700;font-size:1.1rem">PRUDENTIAL TAX PARTNERS</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
          <p style="color:#94a3b8;font-size:0.8rem">Precision. Integrity. Trust. — Since 2012</p>
        </div>`
    });

    res.json({ success: true, message: 'Your message has been sent successfully!' });

  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message. Please try again later.' });
  }
});

app.get('/api/submissions', (req, res) => {
  res.json(submissions.slice().reverse());
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
