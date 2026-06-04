import * as React from "react";

interface CafeClaimRejectedEmailProps {
  ownerName: string;
  cafeName: string;
  rejectionReason: string;
  email: string;
  supportUrl?: string;
}

export const CafeClaimRejectedEmail = ({
  ownerName,
  cafeName,
  rejectionReason,
  email,
  supportUrl = "mailto:support@nookapp.ph",
}: CafeClaimRejectedEmailProps) => {
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
          <div style={styles.badge}>❌ Claim Not Approved</div>

          {/* Heading */}
          <h2 style={styles.heading}>We couldn't verify your café claim</h2>

          {/* Intro */}
          <p style={styles.text}>
            Hi <strong>{ownerName}</strong>,
          </p>
          <p style={styles.text}>
            Thank you for submitting a claim for <strong>{cafeName}</strong> on
            Nook. After reviewing your request, we were unable to approve it at
            this time.
          </p>

          {/* Rejection reason box */}
          <div style={styles.reasonBox}>
            <p style={styles.reasonHeading}>REASON FOR REJECTION</p>
            <p style={styles.reasonText}>{rejectionReason}</p>
          </div>

          {/* What to do next */}
          <div style={styles.featureBox}>
            <p style={styles.featureHeading}>WHAT YOU CAN DO</p>
            {[
              { icon: "📋", text: "Review the reason above and gather the necessary documents" },
              { icon: "📩", text: "Reply to this email or contact support if you have questions" },
              { icon: "🔄", text: "Submit a new claim once you've addressed the issue" },
            ].map(({ icon, text }) => (
              <p key={text} style={styles.featureItem}>
                {icon}&nbsp;&nbsp;{text}
              </p>
            ))}
          </div>

          {/* CTA */}
          <div style={styles.btnWrapper}>
            <a href={supportUrl} style={styles.btn}>
              Contact Support
            </a>
          </div>

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
    backgroundColor: "#fee2e2",
    color: "#991b1b",
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
  reasonBox: {
    backgroundColor: "#fff7f7",
    borderRadius: 8,
    border: "1px solid #fecaca",
    padding: "16px 20px",
    margin: "20px 0 20px",
  },
  reasonHeading: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    color: "#9ca3af",
    letterSpacing: "0.07em",
    margin: "0 0 8px",
  },
  reasonText: {
    fontFamily: "'Poppins', sans-serif",
    fontSize: 14,
    color: "#374151",
    lineHeight: 1.7,
    margin: 0,
  },
  featureBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    padding: "16px 20px",
    margin: "0 0 24px",
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

export default CafeClaimRejectedEmail;