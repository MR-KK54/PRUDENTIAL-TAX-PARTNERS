import nodemailer from 'nodemailer';

function json(data, status = 200, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const cors = getCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (url.pathname === '/health' || url.pathname === '/') {
      return json({ status: 'ok', worker: 'prudential-tax-partners-api' }, 200, cors);
    }

    if (request.method === 'POST' && url.pathname === '/api/contact') {
      return handleContact(request, env, cors);
    }

    return json({ error: 'Not found' }, 404, cors);
  },
};

async function handleContact(request, env, cors) {
  let Name, Email, Company, Phone, Service, Message;

  try {
    const ct = request.headers.get('Content-Type') || '';

    if (ct.includes('application/json')) {
      const body = await request.json();
      Name = body.Name; Email = body.Email; Company = body.Company;
      Phone = body.Phone; Service = body.Service; Message = body.Message;
    } else {
      const fd = await request.formData();
      Name = fd.get('Name'); Email = fd.get('Email'); Company = fd.get('Company');
      Phone = fd.get('Phone'); Service = fd.get('Service'); Message = fd.get('Message');
    }

    if (!Name || !Email || !Message) {
      return json({ success: false, message: 'Name, Email, and Message are required.' }, 400, cors);
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      pool: false,
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
    console.error('Worker error:', error.message, error.stack);
    return json({
      success: false,
      message: 'Failed to send message. Please try again later.',
      debug: error.message,
    }, 500, cors);
  }
}
