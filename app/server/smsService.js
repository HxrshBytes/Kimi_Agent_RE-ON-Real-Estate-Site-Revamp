// smsService.js
// Production SMS Dispatch Engine (2Factor.in with Fast2SMS fallback)

/**
 * Send an OTP code to an Indian mobile number
 * @param {string} phone - 10-digit mobile number (e.g. "8591944460")
 * @param {string} otp - 6-digit OTP code (e.g. "492015")
 * @returns {Promise<{ success: boolean, provider: string, message: string, details?: any }>}
 */
export async function sendSMSOtp(phone, otp) {
  const cleanPhone = String(phone || "")
    .replace(/\D/g, "")
    .slice(-10);
  if (cleanPhone.length < 10) {
    return {
      success: false,
      provider: "none",
      message: "Invalid 10-digit phone number",
    };
  }

  const messageText = `Your RE-ON Real Estate verification code is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`;

  // 2Factor.in owns the verification transaction, so the OTP is sent as a path parameter.
  const twoFactorKey = (process.env.TWO_FACTOR_API_KEY || "").trim();
  if (twoFactorKey) {
    try {
      const templateName = (process.env.TWO_FACTOR_TEMPLATE_NAME || "").trim();
      const templatePath = templateName
        ? `/${encodeURIComponent(templateName)}`
        : "";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(
        `https://2factor.in/API/V1/${encodeURIComponent(twoFactorKey)}/SMS/${cleanPhone}/${otp}${templatePath}`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      const data = await response.json().catch(() => null);

      if (response.ok && data?.Status === "Success") {
        return {
          success: true,
          provider: "2Factor.in",
          message: "SMS delivered via 2Factor.in",
          details: data,
        };
      }

      console.error(
        "[2Factor.in] SMS dispatch rejected:",
        response.status,
        data,
      );
    } catch (err) {
      console.error("[2Factor.in] SMS dispatch error:", err.message);
    }
  }

  // ──────────────────────────────────────────────
  // 1. FAST2SMS (India Direct Gateway)
  // ──────────────────────────────────────────────
  const fast2smsKey = (process.env.FAST2SMS_API_KEY || "").trim();
  if (fast2smsKey) {
    // Try OTP Route first
    try {
      console.log(
        `[Fast2SMS] Dispatching OTP to +91 ${cleanPhone} via Fast2SMS OTP route...`,
      );
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: cleanPhone,
        }),
      });
      const data = await res.json();
      console.log("[Fast2SMS OTP Route Response]:", data);

      if (
        data.return === true ||
        data.status_code === 200 ||
        data.message?.[0] === "SMS sent successfully."
      ) {
        return {
          success: true,
          provider: "Fast2SMS",
          message: "SMS delivered via Fast2SMS",
          details: data,
        };
      }
    } catch (err) {
      console.error("[Fast2SMS] OTP route error:", err.message);
    }

    // Try Quick SMS Route as fallback
    try {
      console.log(`[Fast2SMS] Trying Quick SMS route for +91 ${cleanPhone}...`);
      const resQuick = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: fast2smsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "q",
          message: messageText,
          language: "english",
          numbers: cleanPhone,
        }),
      });
      const dataQuick = await resQuick.json();
      console.log("[Fast2SMS Quick Route Response]:", dataQuick);

      if (
        dataQuick.return === true ||
        dataQuick.status_code === 200 ||
        dataQuick.message?.[0] === "SMS sent successfully."
      ) {
        return {
          success: true,
          provider: "Fast2SMS (Quick)",
          message: "SMS delivered via Fast2SMS",
          details: dataQuick,
        };
      }
    } catch (err) {
      console.error("[Fast2SMS] Quick route error:", err.message);
    }
  }

  // ──────────────────────────────────────────────
  // Fast2SMS is retained as a secondary provider during provider migration.
  // ──────────────────────────────────────────────
  if (process.env.TWO_FACTOR_ALLOW_LOG === "true") {
    console.log(`[SMS DEV MODE] OTP for +91 ${cleanPhone}: ${otp}`);
    return {
      success: true,
      provider: "development-log",
      message: "OTP logged for development",
    };
  }

  return {
    success: false,
    provider: "none",
    message: "No SMS provider delivered the OTP",
  };
}
