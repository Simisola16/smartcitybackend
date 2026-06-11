/**
 * SmartCity Osun State Football League
 * Email Templates — All transactional emails
 *
 * Uses table-based HTML for maximum email client compatibility.
 * Brand: Dark green (#071510), Gold (#F59E0B), White (#FFFFFF)
 */

const APP_URL = process.env.APP_URL || "http://localhost:5173";
const FROM_NAME = "SmartCity Osun State Football League";

// ─── Base Layout ─────────────────────────────────────────────────────────────
function baseLayout(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${FROM_NAME}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ""}
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:30px 20px;">
        
        <!-- Wrapper -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#071510;padding:0;">
              <!-- Gold accent top bar -->
              <div style="height:4px;background:linear-gradient(90deg,#D97706,#F59E0B,#D97706);"></div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:24px 32px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-right:16px;vertical-align:middle;">
                          <div style="width:52px;height:52px;background-color:#0f2d1a;border-radius:50%;border:2px solid #F59E0B;display:inline-flex;align-items:center;justify-content:center;text-align:center;font-size:22px;line-height:52px;">
                            ⚽
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0;font-size:18px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:2px;line-height:1.1;">
                            Smart<span style="color:#F59E0B;">City</span>
                          </p>
                          <p style="margin:2px 0 0;font-size:10px;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:3px;">
                            Osun State Football League
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content Area -->
          ${content}
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#071510;padding:32px;">
              <!-- Gold divider -->
              <div style="height:1px;background-color:#1a3a25;margin-bottom:24px;"></div>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <!-- Co-branding -->
                    <p style="margin:0;font-size:10px;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:2px;">
                      Powered by SmartCity PLC &bull; In Partnership with Osun State FA
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:16px;">
                    <!-- Social placeholders -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:0 6px;">
                          <a href="#" style="display:inline-block;width:32px;height:32px;background-color:#0f2d1a;border-radius:4px;text-align:center;line-height:32px;font-size:14px;text-decoration:none;">🐦</a>
                        </td>
                        <td style="padding:0 6px;">
                          <a href="#" style="display:inline-block;width:32px;height:32px;background-color:#0f2d1a;border-radius:4px;text-align:center;line-height:32px;font-size:14px;text-decoration:none;">📷</a>
                        </td>
                        <td style="padding:0 6px;">
                          <a href="#" style="display:inline-block;width:32px;height:32px;background-color:#0f2d1a;border-radius:4px;text-align:center;line-height:32px;font-size:14px;text-decoration:none;">👤</a>
                        </td>
                        <td style="padding:0 6px;">
                          <a href="#" style="display:inline-block;width:32px;height:32px;background-color:#0f2d1a;border-radius:4px;text-align:center;line-height:32px;font-size:14px;text-decoration:none;">▶️</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0 0 8px;font-size:11px;color:#4b7a5e;">
                      © ${new Date().getFullYear()} SmartCity Osun State Football League. All Rights Reserved.
                    </p>
                    <p style="margin:0;font-size:10px;color:#2d5040;line-height:1.5;">
                      You are receiving this email because your club is registered with the SmartCity Osun State Football League.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        <!-- End Wrapper -->
        
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────
function goldButton(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto 0;">
    <tr>
      <td align="center" style="border-radius:8px;background-color:#F59E0B;">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:900;color:#071510;text-decoration:none;text-transform:uppercase;letter-spacing:2px;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;width:40%;vertical-align:top;">${label}</td>
    <td style="padding:10px 16px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:600;color:#111827;vertical-align:top;">${value}</td>
  </tr>`;
}

function sectionHeader(icon: string, title: string): string {
  return `<p style="margin:0 0 16px;font-size:11px;font-weight:900;color:#065f46;text-transform:uppercase;letter-spacing:2px;">${icon} ${title}</p>`;
}

// ─── Template 1: Registration Received ───────────────────────────────────────
export function registrationReceivedEmail(
  clubName: string,
  lga: string,
  category: string,
  chairmanName: string
): string {
  const content = `
  <tr>
    <td style="padding:40px 32px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:2px;">Application Received ✅</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#111827;line-height:1.2;">Welcome to SmartCity League!</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
        Dear <strong>${chairmanName}</strong>,<br/>Thank you for registering <strong>${clubName}</strong> for the SmartCity Osun State Football League. We've received your application and our team will begin reviewing it shortly.
      </p>
    </td>
  </tr>
  
  <tr>
    <td style="padding:0 32px 32px;">
      ${sectionHeader("📋", "Your Submission Summary")}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
        ${infoRow("Club Name", clubName)}
        ${infoRow("LGA", lga)}
        ${infoRow("Category", category)}
        ${infoRow("Chairman", chairmanName)}
      </table>
    </td>
  </tr>
  
  <tr>
    <td style="padding:0 32px 32px;">
      <div style="background-color:#f0fdf4;border-left:4px solid #059669;border-radius:0 8px 8px 0;padding:20px 24px;">
        ${sectionHeader("📌", "What Happens Next?")}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;">
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">✅ &nbsp;Your application is being reviewed by Osun FA</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">📞 &nbsp;Our team will contact you within <strong>48 hours</strong></td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">📧 &nbsp;You'll receive an email with your login details once approved</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#374151;">🔑 &nbsp;Log in to your Club Portal and set up your squad roster</td></tr>
        </table>
      </div>
      ${goldButton("Track Your Application", `${APP_URL}/#/club-login`)}
    </td>
  </tr>`;

  return baseLayout(content, `Your registration for ${clubName} has been received — we'll be in touch within 48 hours.`);
}

// ─── Template 2: Club Approved ────────────────────────────────────────────────
export function clubApprovedEmail(
  clubName: string,
  email: string,
  password: string,
  approvedDate: string
): string {
  const content = `
  <tr>
    <td style="background:linear-gradient(135deg,#064e3b,#065f46);padding:40px 32px 32px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:2px;">Official Approval 🎉</p>
      <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:#ffffff;line-height:1.2;">Congratulations!</h1>
      <p style="margin:0;font-size:16px;color:#a7f3d0;line-height:1.6;">
        <strong>${clubName}</strong> has been officially approved to compete in the SmartCity Osun State Football League!
      </p>
    </td>
  </tr>
  
  <tr>
    <td style="padding:32px;">
      ${sectionHeader("📋", "Approval Details")}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:24px;">
        ${infoRow("Club Name", clubName)}
        ${infoRow("Approval Date", approvedDate)}
        ${infoRow("Status", "✅ Approved")}
      </table>
      
      ${sectionHeader("🔑", "Your Login Credentials")}
      <div style="background-color:#071510;border-radius:8px;padding:24px;margin-bottom:8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1a3a25;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:2px;">🌐 Login URL</p>
              <p style="margin:0;font-size:14px;color:#ffffff;font-weight:600;">${APP_URL}/#/club-login</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1a3a25;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:2px;">📧 Email Address</p>
              <p style="margin:0;font-size:14px;color:#ffffff;font-weight:600;">${email}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0 0;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:2px;">🔑 Temporary Password</p>
              <p style="margin:0;font-size:20px;color:#F59E0B;font-weight:900;letter-spacing:4px;font-family:monospace;">${password}</p>
            </td>
          </tr>
        </table>
      </div>
      
      <div style="background-color:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#92400e;font-weight:700;">
          ⚠️ Please log in and change your password immediately after your first login.
        </p>
      </div>
      
      ${sectionHeader("📌", "What to Expect Next")}
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-bottom:16px;">
        <tr><td style="padding:6px 0;font-size:14px;color:#374151;">🏆 &nbsp;Conference assignment will be communicated soon</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#374151;">⚽ &nbsp;Start adding your players to the squad roster</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#374151;">📅 &nbsp;Season kickoff dates will be published in the announcements</td></tr>
      </table>
      
      ${goldButton("Login to Club Portal →", `${APP_URL}/#/club-login`)}
    </td>
  </tr>`;

  return baseLayout(content, `${clubName} has been approved! Log in with your temporary credentials.`);
}

// ─── Template 3: Club Rejected ────────────────────────────────────────────────
export function clubRejectedEmail(clubName: string, reason: string): string {
  const content = `
  <tr>
    <td style="padding:40px 32px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:2px;">Registration Update</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#111827;line-height:1.2;">Update on Your Application</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
        Dear <strong>${clubName}</strong> Team,<br/>Thank you for your interest in the SmartCity Osun State Football League. After careful review, we regret to inform you that your registration was not approved at this time.
      </p>
    </td>
  </tr>
  
  <tr>
    <td style="padding:0 32px 32px;">
      <div style="background-color:#fef2f2;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:2px;">❌ Reason for Rejection</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${reason || "Your application did not meet the current registration requirements. Please review the league guidelines and reapply."}</p>
      </div>
      
      <div style="background-color:#f0fdf4;border-left:4px solid #059669;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:2px;">💡 How to Reapply</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;">
          <tr><td style="padding:5px 0;font-size:14px;color:#374151;">1. Review the rejection reason above carefully</td></tr>
          <tr><td style="padding:5px 0;font-size:14px;color:#374151;">2. Address and correct the identified issues</td></tr>
          <tr><td style="padding:5px 0;font-size:14px;color:#374151;">3. Submit a new application using the link below</td></tr>
        </table>
      </div>
      
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        If you believe this decision was made in error or need further clarification, please contact our team at <a href="mailto:info@smartcityleague.ng" style="color:#059669;font-weight:700;">info@smartcityleague.ng</a>.
      </p>
      
      ${goldButton("Re-Apply Now →", `${APP_URL}/#/club-register`)}
    </td>
  </tr>`;

  return baseLayout(content, `Update on the registration application for ${clubName}.`);
}

// ─── Template 4: Player Approved ─────────────────────────────────────────────
export function playerApprovedEmail(
  clubName: string,
  playerName: string,
  position: string,
  jerseyNumber: string | number
): string {
  const content = `
  <tr>
    <td style="background:linear-gradient(135deg,#064e3b,#065f46);padding:32px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:2px;">Player Approved ✅</p>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#ffffff;">Great News!</h1>
      <p style="margin:0;font-size:15px;color:#a7f3d0;">A player from your squad has been officially registered.</p>
    </td>
  </tr>
  
  <tr>
    <td style="padding:32px;">
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
        Dear <strong>${clubName}</strong> Management,<br/>
        We're pleased to inform you that the following player has been <strong>approved</strong> and is now officially registered with the SmartCity Osun State Football League.
      </p>
      
      <div style="background-color:#071510;border-radius:8px;padding:24px;margin-bottom:24px;text-align:center;">
        <div style="width:60px;height:60px;background-color:#0f2d1a;border-radius:50%;border:3px solid #F59E0B;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:28px;line-height:60px;">⚽</div>
        <p style="margin:0 0 4px;font-size:20px;font-weight:900;color:#ffffff;">${playerName}</p>
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:2px;">${position} &bull; Jersey #${jerseyNumber}</p>
        <span style="display:inline-block;background-color:#065f46;color:#6ee7b7;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;padding:4px 16px;border-radius:999px;">✅ Officially Registered</span>
      </div>
      
      ${goldButton("View Squad Roster →", `${APP_URL}/#/club-dashboard`)}
    </td>
  </tr>`;

  return baseLayout(content, `${playerName} has been approved and is now registered for the SmartCity League.`);
}

// ─── Template 5: Player Rejected ─────────────────────────────────────────────
export function playerRejectedEmail(
  clubName: string,
  playerName: string,
  reason: string
): string {
  const content = `
  <tr>
    <td style="padding:40px 32px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:2px;">Player Registration Update ⚠️</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#111827;">Action Required</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
        Dear <strong>${clubName}</strong> Management,<br/>
        Unfortunately, the registration for <strong>${playerName}</strong> could not be approved at this time. Please review the reason below and resubmit with the correct information.
      </p>
    </td>
  </tr>
  
  <tr>
    <td style="padding:0 32px 32px;">
      <div style="background-color:#fffbeb;border-left:4px solid #d97706;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:2px;">⚠️ Rejection Reason for ${playerName}</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${reason || "The submitted player details did not meet the league's eligibility requirements."}</p>
      </div>
      
      <div style="background-color:#f0fdf4;border-left:4px solid #059669;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:2px;">💡 Next Steps</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• Review and correct the player's information</td></tr>
          <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• Ensure all documents (NIN, DOB certificate) are valid and clear</td></tr>
          <tr><td style="padding:5px 0;font-size:14px;color:#374151;">• Resubmit the player from your Club Dashboard</td></tr>
        </table>
      </div>
      
      ${goldButton("Update Player Details →", `${APP_URL}/#/club-dashboard`)}
    </td>
  </tr>`;

  return baseLayout(content, `Registration update for ${playerName} — action required.`);
}

// ─── Template 6: New Announcement ────────────────────────────────────────────
const categoryColors: Record<string, { bg: string; text: string }> = {
  Urgent:         { bg: "#fef2f2", text: "#dc2626" },
  General:        { bg: "#eff6ff", text: "#2563eb" },
  Fixtures:       { bg: "#f0fdf4", text: "#059669" },
  "League Updates": { bg: "#faf5ff", text: "#7c3aed" },
  Registration:   { bg: "#fff7ed", text: "#ea580c" },
};

export function newAnnouncementEmail(
  clubName: string,
  title: string,
  category: string,
  content: string,
  publishDate: string
): string {
  const colors = categoryColors[category] || { bg: "#f4f4f5", text: "#374151" };
  const formattedDate = new Date(publishDate).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric"
  });

  const emailContent = `
  <tr>
    <td style="padding:40px 32px 24px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:16px;">
        <tr>
          <td style="background-color:${colors.bg};color:${colors.text};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;padding:5px 14px;border-radius:999px;">
            📢 ${category}
          </td>
        </tr>
      </table>
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#111827;line-height:1.3;">${title}</h1>
      <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;">Published: ${formattedDate}</p>
    </td>
  </tr>
  
  <tr>
    <td style="padding:0 32px 32px;">
      <div style="background-color:#f9fafb;border-radius:8px;padding:24px;border:1px solid #e5e7eb;margin-bottom:24px;">
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.8;white-space:pre-wrap;">${content}</p>
      </div>
      
      <p style="margin:0 0 24px;font-size:13px;color:#6b7280;">
        Dear <strong>${clubName}</strong>, log in to your Club Portal to view the full announcement and all related updates.
      </p>
      
      ${goldButton("View Announcement →", `${APP_URL}/#/club-dashboard`)}
    </td>
  </tr>`;

  return baseLayout(emailContent, `New announcement: ${title}`);
}

// ─── Template 7: New Document ─────────────────────────────────────────────────
export function newDocumentEmail(
  clubName: string,
  docTitle: string,
  docType: string,
  description: string
): string {
  const emailContent = `
  <tr>
    <td style="padding:40px 32px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:2px;">📁 New Document Available</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#111827;line-height:1.2;">${docTitle}</h1>
    </td>
  </tr>
  
  <tr>
    <td style="padding:0 32px 32px;">
      <div style="background-color:#071510;border-radius:8px;padding:24px;margin-bottom:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #1a3a25;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:2px;">Document Type</p>
              <p style="margin:0;font-size:14px;color:#ffffff;font-weight:600;">${docType}</p>
            </td>
          </tr>
          ${description ? `<tr>
            <td style="padding:10px 0 0;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:2px;">Description</p>
              <p style="margin:0;font-size:14px;color:#d1fae5;line-height:1.6;">${description}</p>
            </td>
          </tr>` : ""}
        </table>
      </div>
      
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        Dear <strong>${clubName}</strong>, a new document has been made available in your Club Portal. Log in to download and review it.
      </p>
      
      ${goldButton("Download Document →", `${APP_URL}/#/club-dashboard`)}
    </td>
  </tr>`;

  return baseLayout(emailContent, `New document available: ${docTitle}`);
}

// ─── Template 8: Password Reset OTP ──────────────────────────────────────────
export function passwordResetCodeEmail(clubName: string, code: string): string {
  const digits = code.split("");

  const emailContent = `
  <tr>
    <td style="padding:40px 32px 24px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:2px;">🔐 Password Reset</p>
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#111827;line-height:1.2;">Your Verification Code</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
        Hi <strong>${clubName}</strong>, here is your 6-digit password reset code. Enter this on the reset page to create a new password.
      </p>
    </td>
  </tr>
  
  <tr>
    <td style="padding:0 32px 32px;">
      <!-- OTP Display -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px;">
        <tr>
          ${digits.map(d => `
          <td style="padding:0 6px;">
            <div style="width:52px;height:64px;background-color:#071510;border-radius:8px;border:2px solid #F59E0B;text-align:center;line-height:64px;font-size:28px;font-weight:900;color:#F59E0B;font-family:monospace;">${d}</div>
          </td>`).join("")}
        </tr>
      </table>
      
      <div style="background-color:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#92400e;font-weight:700;">
          ⏰ This code expires in <strong>15 minutes</strong>
        </p>
      </div>
      
      <div style="background-color:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:16px;">
        <p style="margin:0;font-size:13px;color:#dc2626;line-height:1.6;">
          🚨 <strong>Security Warning:</strong> If you did not request a password reset, please ignore this email or contact the league admin at <a href="mailto:info@smartcityleague.ng" style="color:#dc2626;font-weight:700;">info@smartcityleague.ng</a> immediately.
        </p>
      </div>
    </td>
  </tr>`;

  return baseLayout(emailContent, `Your password reset code is: ${code}. Expires in 15 minutes.`);
}
