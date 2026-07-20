import nodemailer from 'nodemailer';

const ALLOWED_ORIGINS = [
  'https://mr-kk54.github.io',
  'http://localhost:3000',
  'http://localhost:8787',
];

function json(data, status = 200, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const cors = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/contact') {
      return handleContact(request, env, cors);
    }

    return json({ error: 'Not found' }, 404, cors);
  },
};

async function handleContact(request, env, cors) {
  try {
    const ct = request.headers.get('Content-Type') || '';
    let body;
    if (ct.includes('application/x-www-form-urlencoded')) {
      const fd = await request.formData();
      body = Object.fromEntries(fd);
    } else if (ct.includes('application/json')) {
      body = await request.json();
    } else {
      const fd = await request.formData();
      body = Object.fromEntries(fd);
    }

    const { Name, Email, Company, Phone, Service, Message } = body;

    if (!Name || !Email || !Message) {
      return json({ success: false, message: 'Name, Email, and Message are required.' }, 400, cors);
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
    });

    const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const ownerHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#064e3b">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f0fdf4;font-weight:600;color:#064e3b">Name</td><td style="padding:10px;border:1px solid #e2e8f0">${Name}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f0fdf4;font-weight:600;color:#064e3b">Email</td><td style="padding:10px;border:1px solid #e2e8f0">${Email}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f0fdf4;font-weight:600;color:#064e3b">Company</td><td style="padding:10px;border:1px solid #e2e8f0">${Company || 'N/A'}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f0fdf4;font-weight:600;color:#064e3b">Phone</td><td style="padding:10px;border:1px solid #e2e8f0">${Phone || 'N/A'}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f0fdf4;font-weight:600;color:#064e3b">Service</td><td style="padding:10px;border:1px solid #e2e8f0">${Service || 'N/A'}</td></tr>
          <tr><td style="padding:10px;border:1px solid #e2e8f0;background:#f0fdf4;font-weight:600;color:#064e3b">Message</td><td style="padding:10px;border:1px solid #e2e8f0">${Message}</td></tr>
        </table>
        <p style="color:#64748b;font-size:0.85rem;margin-top:16px">Received on ${dateStr}</p>
      </div>`;

    const clientHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#064e3b">Thank You, ${Name}!</h2>
        <p style="color:#1e293b;font-size:1rem;line-height:1.6">We have received your enquiry and our team will review it shortly.</p>
        <p style="color:#1e293b;font-size:1rem;line-height:1.6">We typically respond within <strong>24 hours</strong> during business days.</p>
        <div style="background:#f0fdf4;padding:20px;border-radius:8px;margin:20px 0">
          <p style="margin:0 0 8px;color:#064e3b;font-weight:600">For urgent matters:</p>
          <p style="margin:0;color:#64748b">Phone: <a href="tel:+919884455667" style="color:#10b981">+91 98844 55667</a></p>
          <p style="margin:0;color:#64748b">Email: <a href="mailto:kishorekumar.78k@gmail.com" style="color:#10b981">kishorekumar.78k@gmail.com</a></p>
        </div>
        <p style="color:#1e293b;font-size:1rem;line-height:1.6">Best regards,</p>
        <p style="color:#064e3b;font-weight:700;font-size:1.1rem">PRUDENTIAL TAX PARTNERS</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
        <p style="color:#94a3b8;font-size:0.8rem">Precision. Integrity. Trust. — Since 2012</p>
      </div>`;

    await transporter.sendMail({
      from: `"PRUDENTIAL TAX PARTNERS" <${env.EMAIL_USER}>`,
      to: 'kishorekumar.78k@gmail.com',
      subject: 'New enquiry from PRUDENTIAL TAX PARTNERS website',
      html: ownerHtml,
    });

    await transporter.sendMail({
      from: `"PRUDENTIAL TAX PARTNERS" <${env.EMAIL_USER}>`,
      to: Email,
      subject: 'Thank you for contacting PRUDENTIAL TAX PARTNERS',
      html: clientHtml,
    });

    return json({ success: true, message: 'Your message has been sent successfully!' }, 200, cors);
  } catch (error) {
    console.error('Worker error:', error);
    return json({ success: false, message: 'Failed to send message. Please try again later.' }, 500, cors);
  }
}
