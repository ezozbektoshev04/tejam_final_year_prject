import os
import re
import sys
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


def _extract_code(html: str) -> str:
    """Best-effort: pull a 4–8 digit verification code out of the HTML body for log visibility."""
    m = re.search(r"\b(\d{4,8})\b", html)
    return m.group(1) if m else ""


def _send(to: str, subject: str, html: str) -> bool:
    """Send an email via Gmail SMTP. Falls back to a loud stderr log if Gmail isn't configured."""
    GMAIL_USER = os.getenv("GMAIL_USER", "")
    GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        # Loud stderr log so it shows up clearly in `journalctl -u tejam`.
        # Also extract any verification code so admins can hand it to users manually.
        code = _extract_code(html)
        print(
            "\n!!! EMAIL NOT SENT — Gmail not configured (set GMAIL_USER and GMAIL_APP_PASSWORD) !!!"
            f"\n    To:      {to}"
            f"\n    Subject: {subject}"
            + (f"\n    Code:    {code}" if code else "")
            + "\n",
            file=sys.stderr,
            flush=True,
        )
        return True  # keep returning True so callers don't surface a generic error to users
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
        print(f"[EMAIL ERROR] failed sending to {to}: {e}", file=sys.stderr, flush=True)
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


def send_shop_approved_email(to: str, name: str, shop_name: str) -> bool:
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb">
      <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#1a7548;border-radius:12px;padding:10px 20px">
            <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">Tejam</span>
          </div>
        </div>
        <div style="text-align:center;margin-bottom:20px">
          <div style="display:inline-block;background:#f0fdf4;border-radius:50%;padding:16px;font-size:36px">✅</div>
        </div>
        <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;text-align:center">Your shop is approved!</h1>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px;text-align:center">Hi {name}, great news!</p>
        <p style="color:#374151;font-size:14px;margin:0 0 16px;line-height:1.6">
          <strong>{shop_name}</strong> has been reviewed and approved by our team.
          You can now log in to your Tejam dashboard and start listing your surplus food bags.
        </p>
        <div style="background:#f0fdf4;border-left:4px solid #1a7548;border-radius:8px;padding:16px;margin:20px 0">
          <p style="color:#1a7548;font-size:13px;font-weight:600;margin:0 0 6px">What you can do now:</p>
          <ul style="color:#374151;font-size:13px;margin:0;padding-left:18px;line-height:1.8">
            <li>Create your first surprise bag listing</li>
            <li>Set pickup times and pricing</li>
            <li>Track orders in real time</li>
            <li>View sales analytics</li>
          </ul>
        </div>
        <div style="text-align:center;margin:28px 0 20px">
          <a href="{FRONTEND_URL}/login"
             style="display:inline-block;background:#1a7548;color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.2px">
            Go to dashboard →
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0">
        <p style="color:#d1d5db;font-size:11px;text-align:center;margin:0">
          © 2026 Tejam · Tashkent, Uzbekistan<br>
          Questions? Reply to this email or contact support@tejam.uz
        </p>
      </div>
    </div>
    """
    return _send(to, f"Your shop '{shop_name}' is approved on Tejam 🎉", html)


def send_shop_status_email(to: str, name: str, shop_name: str, deactivated: bool) -> bool:
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    if deactivated:
        subject = f"Your shop '{shop_name}' has been deactivated"
        icon = "🔴"
        title = "Your shop has been deactivated"
        body = (
            f"<strong>{shop_name}</strong> has been temporarily deactivated by our team. "
            "Your listings are no longer visible to customers and no new orders can be placed."
        )
        action_text = "If you believe this is a mistake, please contact our support team."
        color = "#ef4444"
        bg = "#fef2f2"
        border = "#fecaca"
    else:
        subject = f"Your shop '{shop_name}' has been reactivated"
        icon = "✅"
        title = "Your shop is back online!"
        body = (
            f"<strong>{shop_name}</strong> has been reactivated by our team. "
            "Your listings are now visible to customers again and you can receive new orders."
        )
        action_text = "Log in to your dashboard to check your listings and orders."
        color = "#1a7548"
        bg = "#f0fdf4"
        border = "#bbf7d0"

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb">
      <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#1a7548;border-radius:12px;padding:10px 20px">
            <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">Tejam</span>
          </div>
        </div>
        <div style="text-align:center;margin-bottom:20px">
          <div style="display:inline-block;background:{bg};border-radius:50%;padding:16px;font-size:36px">{icon}</div>
        </div>
        <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;text-align:center">{title}</h1>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px;text-align:center">Hi {name},</p>
        <p style="color:#374151;font-size:14px;margin:0 0 16px;line-height:1.6">{body}</p>
        <div style="background:{bg};border-left:4px solid {border};border-radius:8px;padding:14px 16px;margin:0 0 24px">
          <p style="color:#374151;font-size:13px;margin:0;line-height:1.5">{action_text}</p>
        </div>
        {"" if deactivated else f'<div style="text-align:center;margin-bottom:24px"><a href="{FRONTEND_URL}/login" style="display:inline-block;background:#1a7548;color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none">Go to dashboard →</a></div>'}
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">
          Questions? Contact us at <a href="mailto:support@tejam.uz" style="color:#1a7548">support@tejam.uz</a>
        </p>
        <p style="color:#d1d5db;font-size:11px;text-align:center;margin:12px 0 0">© 2026 Tejam · Tashkent, Uzbekistan</p>
      </div>
    </div>
    """
    return _send(to, subject, html)


def send_account_deleted_email(to: str, name: str, role: str) -> bool:
    is_shop = role == "shop"
    subject = "Your Tejam shop account has been removed" if is_shop else "Your Tejam account has been removed"
    title = "Your account has been removed"
    body = (
        "After a review, your shop owner account and all associated listings have been removed from Tejam. "
        "If you believe this was a mistake, please contact our support team."
        if is_shop else
        "Your Tejam customer account has been removed by our team. "
        "If you believe this was a mistake, please contact our support team."
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb">
      <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-block;background:#1a7548;border-radius:12px;padding:10px 20px">
            <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px">Tejam</span>
          </div>
        </div>
        <div style="text-align:center;margin-bottom:20px">
          <div style="display:inline-block;background:#fef2f2;border-radius:50%;padding:16px;font-size:36px">⚠️</div>
        </div>
        <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;text-align:center">{title}</h1>
        <p style="color:#6b7280;font-size:14px;margin:0 0 20px;text-align:center">Hi {name},</p>
        <p style="color:#374151;font-size:14px;margin:0 0 20px;line-height:1.6">{body}</p>
        <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:14px 16px;margin:0 0 24px">
          <p style="color:#b91c1c;font-size:13px;margin:0;line-height:1.5">
            All your data associated with this account is no longer accessible.
          </p>
        </div>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0">
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">
          If you have questions, contact us at
          <a href="mailto:support@tejam.uz" style="color:#1a7548">support@tejam.uz</a>
        </p>
        <p style="color:#d1d5db;font-size:11px;text-align:center;margin:12px 0 0">
          © 2026 Tejam · Tashkent, Uzbekistan
        </p>
      </div>
    </div>
    """
    return _send(to, subject, html)
