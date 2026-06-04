import * as React from "react";

interface CafeClaimApprovedEmailProps {
  ownerName: string;
  cafeName: string;
  dashboardUrl: string;
  email: string;
  siteUrl?: string;
}

export const CafeClaimApprovedEmail = ({
  ownerName,
  cafeName,
  dashboardUrl,
  email,
  siteUrl = "https://nook.com",                                                                                 
}: CafeClaimApprovedEmailProps) => {
  return (
    <html>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={styles.body}>
        <div style={styles.container}>
          {/* Logo */}
          <div style={styles.logoWrapper}>
            <img
              src="https://lucerocris.sgp1.cdn.digitaloceanspaces.com/nookLogo.png"
              alt="Nook"
              width={80}
              style={{ display: "block" }}
            />
          </div>

          {/* Approved badge */}
          <div style={styles.badge}>✅ Claim Approved</div>

          {/* Heading */}
          <h2 style={styles.heading}>Your café has been verified!</h2>

          {/* Intro */}
          <p style={styles.text}>
            Hi <strong>{ownerName}</strong>,
          </p>
          <p style={styles.text}>
            Great news — your claim for <strong>{cafeName}</strong> has been
            reviewed and approved. You now have full access to manage your
            café&apos;s listing on Nook.
          </p>

          {/* What you can do now */}
          <div style={styles.featureBox}>
            <p style={styles.featureHeading}>WHAT YOU CAN DO NOW</p>
            {[
              { icon: "📷", text: "Upload photos and update your café details" },
              { icon: "🕐", text: "Set your hours and amenities" },
              { icon: "⭐", text: "Respond to reviews from your customers" },
              { icon: "📊", text: "View analytics and insights for your listing" },
            ].map(({ icon, text }) => (
              <p key={text} style={styles.featureItem}>
                {icon}&nbsp;&nbsp;{text}
              </p>
            ))}
          </div>

          {/* CTA Button */}
          <div style={styles.btnWrapper}>
            <a href={dashboardUrl} style={styles.btn}>
              Go to Your Dashboard
            </a>
          </div>

          {/* Fallback URL */}
          <p style={styles.fallback}>
            If the button above doesn&apos;t work, copy and paste this URL into
            your browser:
            <br />
            <span style={styles.fallbackLink}>{dashboardUrl}</span>
          </p>

          {/* Divider */}
          <hr style={styles.divider} />

          {/* Footer */}
          <p style={styles.footer}>
            You&apos;re receiving this email because you submitted a café claim
            on Nook using {email}. If this wasn&apos;t you, please contact our
            support team immediately.
          </p>
        </div>
      </body>
    </html>
  );
};

const styles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: "#f3f4f6",
    margin: 0,
    padding: "32px 16px",
    fontFamily: "'Poppins', sans-serif",
  },
  container: {
    maxWidth: 560,
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: "32px",
  },
  logoWrapper: {
    textAlign: "center",
    marginBottom: 24,
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#d1fae5",
    color: "#065f46",
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: 100,
    marginBottom: 16,
    fontFamily: "'Poppins', sans-serif",
  },
  heading: {
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    fontSize: 20,
    color: "#111827",
    margin: "0 0 12px",
  },
  text: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: 14,
    color: "#374151",
    lineHeight: 1.7,
    margin: "0 0 8px",
  },
  featureBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    padding: "16px 20px",
    margin: "20px 0 24px",
  },
  featureHeading: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
    letterSpacing: "0.07em",
    margin: "0 0 12px",
  },
  featureItem: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: 13,
    color: "#374151",
    margin: "6px 0",
    lineHeight: 1.6,
  },
  btnWrapper: {
    textAlign: "center",
    margin: "0 0 24px",
  },
  btn: {
    backgroundColor: "#344E41",
    color: "#ffffff",
    padding: "12px 28px",
    textDecoration: "none",
    borderRadius: 6,
    fontWeight: 600,
    display: "inline-block",
    fontFamily: "'Poppins', sans-serif",
    fontSize: 14,
  },
  fallback: {
    fontSize: 13,
    color: "#6b7280",
    fontFamily: "'Poppins', sans-serif",
    margin: "0 0 4px",
    lineHeight: 1.6,
  },
  fallbackLink: {
    color: "#344E41",
  },
  divider: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    margin: "24px 0",
  },
  footer: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "'Poppins', sans-serif",
    margin: 0,
    lineHeight: 1.6,
  },
};

export default CafeClaimApprovedEmail;