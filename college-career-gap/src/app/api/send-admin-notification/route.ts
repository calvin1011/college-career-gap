import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

//process key
const resend = new Resend(process.env.RESEND_API_KEY);

function getAdminApprovedEmailHTML(name: string, channelName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #2563eb; 
            color: white; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
          }
          .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>College Career Gap</h1>
          </div>
          <div class="content">
            <h2>Admin Access Granted! 🎉</h2>
            <p>Hi ${name},</p>
            <p>Great news! You've been approved as an administrator for the <strong>${channelName}</strong> channel on College Career Gap.</p>
            <p>As a channel admin, you can now:</p>
            <ul>
              <li>Post career opportunities and resources</li>
              <li>Share job postings and internships</li>
              <li>Provide industry insights to students</li>
              <li>Manage posts with custom expiration dates</li>
            </ul>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://your-platform-url.vercel.app'}" class="button">Go to Platform</a>
            <p>Log in with your .edu email to start posting resources for your students.</p>
            <p>If you have any questions, feel free to reach out.</p>
            <p>Best regards,<br>Calvin<br>College Career Gap</p>
          </div>
          <div class="footer">
            <p>This email was sent because you were granted admin access on College Career Gap.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { professorEmail, professorName, channelName, superAdminUid } = await request.json();

    if (!professorEmail || !professorName || !channelName || !superAdminUid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send email
    const { data, error } = await resend.emails.send({
      from: 'College Career Gap <notifications@collegecareergap.com>',
      to: professorEmail,
      subject: `Admin Access Granted - ${channelName}`,
      html: getAdminApprovedEmailHTML(professorName, channelName),
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}