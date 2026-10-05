import * as React from "react";

interface CafeClaimApprovedEmailProps {
  ownerName: string;
  cafeName: string;
  dashboardUrl: string;
  email: string;
  // The owner added this cafe themselves: it's approved but still hidden, so
  // the email has to say what's left before it goes live.
  isNewListing?: boolean;
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
  isNewListing = false,
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
          <div style={styles.badge}>
            {isNewListing ? "Verified" : "🎉 Claim Approved"}
          </div>

          {/* Heading */}
          <h2 style={styles.heading}>
            {isNewListing
              ? `${cafeName} is verified. Next, set up its page`
              : "Your café claim has been approved"}
          </h2>

          {/* Intro */}
          <p style={styles.text}>
            Hi <strong>{ownerName}</strong>,
          </p>
          {isNewListing ? (
            <>
              <p style={styles.text}>
                We&apos;ve confirmed <strong>{cafeName}</strong> is yours. It
                isn&apos;t public on Nook yet: add a few things first, then send
                it to us to publish.
              </p>
              <ol style={{ ...styles.text, paddingLeft: "20px" }}>
                <li>Add a cover photo, your opening hours and a short description.</li>
                <li>
                  Optional but worth it: menu highlights and tags like Wi-Fi or
                  outlets.
                </li>
                <li>
                  Press <strong>Submit for review</strong> on your dashboard.
                  We check it and publish it, usually within 2 working days,
                  and email you when it&apos;s live.
                </li>
              </ol>
            </>
          ) : (
            <p style={styles.text}>
              Great news — your claim for <strong>{cafeName}</strong> has been
              approved. You can now manage your listing on Nook.
            </p>
          )}

          {/* CTA */}
          <div style={styles.ctaWrapper}>
            <a href={dashboardUrl} style={styles.cta}>
              {isNewListing ? "Set up your page" : "Go to your dashboard"}
            </a>
          </div>

          <p style={styles.text}>
            If the button above doesn&apos;t work, paste this link into your
            browser:
          </p>
          <p style={styles.linkFallback}>{dashboardUrl}</p>

          {/* Footer */}
          <p style={styles.footer}>
            Questions? Message us on Instagram at @nook_cafefinder.
            <br />
            — The Nook Team
          </p>
          <p style={styles.footer}>
            This email was sent to {email} because{" "}
            {isNewListing
              ? "the café you added to Nook was verified."
              : "your café claim was approved."}
          </p>
        </div>
      </body>
    </html>
  );
};

export default CafeClaimApprovedEmail;
