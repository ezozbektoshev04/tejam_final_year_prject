import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def _send(to: str, subject: str, html: str) -> bool:
    """Send an email via Gmail SMTP. Falls back to console log if not configured."""
    GMAIL_USER = os.getenv("GMAIL_USER", "")
    GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        print(f"\n[EMAIL] To: {to}\n[EMAIL] Subject: {subject}\n[EMAIL] (Gmail not configured — set GMAIL_USER and GMAIL_APP_PASSWORD)\n")
        return True
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Tejam <{GMAIL_USER}>"
        msg["To"] = to
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


def _code_html(title: str, greeting: str, body: str, code: str, note: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb">
      <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#1a7548;border-radius:12px;padding:10px 20px">
            <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">Tejam</span>
          </div>
        </div>
        <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px">{title}</h1>
        <p style="color:#6b7280;font-size:14px;margin:0 0 24px">{greeting}</p>
        <p style="color:#374151;font-size:14px;margin:0 0 16px">{body}</p>
        <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
          <p style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Your code</p>
          <p style="color:#1a7548;font-size:36px;font-weight:800;letter-spacing:8px;margin:0;font-family:monospace">{code}</p>
        </div>
        <p style="color:#9ca3af;font-size:12px;margin:0">{note}</p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0">
        <p style="color:#d1d5db;font-size:11px;text-align:center;margin:0">
          © 2026 Tejam · Tashkent, Uzbekistan<br>
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
    """


def send_verification_email(to: str, name: str, code: str) -> bool:
    html = _code_html(
        title="Verify your email",
        greeting=f"Hi {name},",
        body="Enter this code in the app to verify your email address and activate your Tejam account.",
        code=code,
        note="This code expires in 15 minutes.",
    )
    return _send(to, "Verify your Tejam account", html)


def send_reset_email(to: str, name: str, code: str) -> bool:
    html = _code_html(
        title="Reset your password",
        greeting=f"Hi {name},",
        body="We received a request to reset your Tejam password. Enter this code to continue.",
        code=code,
        note="This code expires in 15 minutes. If you didn't request a reset, ignore this email.",
    )
    return _send(to, "Reset your Tejam password", html)
