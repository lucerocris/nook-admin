import * as React from "react";

interface CafeClaimApprovedEmailProps {
  ownerName: string;
  cafeName: string;
  dashboardUrl: string;
  email: string;
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: "#f6f6f6",
    fontFamily: "'Poppins', Arial, sans-serif",
    color: "#1f2937",
  },
  container: {
    maxWidth: "560px",
    margin: "0 auto",
    padding: "32px 24px",
    backgroundColor: "#ffffff",
  },
  logoWrapper: {
    marginBottom: "24px",
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
    borderRadius: "9999px",
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: 600,
    marginBottom: "16px",
  },
  heading: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 16px 0",
  },
  text: {
    fontSize: "15px",
    lineHeight: "1.6",
    color: "#374151",
    margin: "0 0 12px 0",
  },
  ctaWrapper: {
    textAlign: "center",
    margin: "28px 0",
  },
  cta: {
    display: "inline-block",
    backgroundColor: "#111827",
    color: "#ffffff",
    textDecoration: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 600,
  },
  linkFallback: {
    fontSize: "13px",
    color: "#6b7280",
    wordBreak: "break-all" as const,
  },
  footer: {
    marginTop: "32px",
    fontSize: "12px",
    color: "#9ca3af",
  },
};

export const CafeClaimApprovedEmail = ({
  ownerName,
  cafeName,
  dashboardUrl,
  email,
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

          {/* Badge */}
          <div style={styles.badge}>🎉 Claim Approved</div>

          {/* Heading */}
          <h2 style={styles.heading}>Your café claim has been approved</h2>

          {/* Intro */}
          <p style={styles.text}>
            Hi <strong>{ownerName}</strong>,
          </p>
          <p style={styles.text}>
            Great news — your claim for <strong>{cafeName}</strong> has been
            approved. You can now manage your listing on Nook.
          </p>

          {/* CTA */}
          <div style={styles.ctaWrapper}>
            <a href={dashboardUrl} style={styles.cta}>
              Go to your dashboard
            </a>
          </div>

          <p style={styles.text}>
            If the button above doesn&apos;t work, paste this link into your
            browser:
          </p>
          <p style={styles.linkFallback}>{dashboardUrl}</p>

          {/* Footer */}
          <p style={styles.footer}>
            Questions? Just reply to this email.
            <br />
            — The Nook Team
          </p>
          <p style={styles.footer}>
            This email was sent to {email} because your café claim was approved.
          </p>
        </div>
      </body>
    </html>
  );
};

export default CafeClaimApprovedEmail;
