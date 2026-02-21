/**
 * Email Service
 * Handles sending price drop notifications to users
 */

import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

interface PriceDropAlertParams {
  productName: string;
  productUrl: string;
  currentPrice: number;
  targetPrice: number;
  email: string;
}

/**
 * Send price drop alert email
 * Returns true if email was sent successfully
 */
export async function sendPriceDropAlert(
  params: PriceDropAlertParams
): Promise<boolean> {
  try {
    const transporter = createTransporter();
    const htmlContent = generateEmailHtml(params);
    const textContent = [
      "Price Drop Alert!",
      `Product: ${params.productName}`,
      `Current price: $${params.currentPrice.toFixed(2)}`,
      `Target price: $${params.targetPrice.toFixed(2)}`,
      `Product URL: ${params.productUrl}`,
    ].join("\n");

    await transporter.sendMail({
      from: ENV.smtpFrom || ENV.smtpUser,
      to: params.email,
      subject: `Price Drop Alert: ${params.productName}`,
      text: textContent,
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error("[Email Service] Failed to send email:", error);
    return false;
  }
}

/**
 * Generate HTML email content
 */
function generateEmailHtml(params: PriceDropAlertParams): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px; }
          .content { margin: 20px 0; }
          .price-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .price-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .price-label { font-weight: bold; }
          .price-value { color: #28a745; font-weight: bold; font-size: 18px; }
          .cta-button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 15px;
          }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Price Drop Alert!</h1>
          </div>

          <div class="content">
            <p>Great news! The price of <strong>${params.productName}</strong> has dropped below your target price.</p>

            <div class="price-info">
              <div class="price-row">
                <span class="price-label">Current Price:</span>
                <span class="price-value">$${params.currentPrice.toFixed(2)}</span>
              </div>
              <div class="price-row">
                <span class="price-label">Your Target Price:</span>
                <span>$${params.targetPrice.toFixed(2)}</span>
              </div>
            </div>

            <p>
              <a href="${params.productUrl}" class="cta-button">View Product on Amazon</a>
            </p>

            <p>Don't miss out. This price may not last long.</p>
          </div>

          <div class="footer">
            <p>You received this email because you set up a price alert for this product.</p>
            <p>Amazon Price Tracker (c) 2026</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send test email
 * Useful for debugging
 */
export async function sendTestEmail(email: string): Promise<boolean> {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: ENV.smtpFrom || ENV.smtpUser,
      to: email,
      subject: "Test Email - Amazon Price Tracker",
      text: "Your SMTP setup is working.",
      html: "<p>Your SMTP setup is working.</p>",
    });
    return true;
  } catch (error) {
    console.error("[Email Service] Failed to send test email:", error);
    return false;
  }
}

function createTransporter() {
  if (!ENV.smtpHost || !ENV.smtpPort || !ENV.smtpUser || !ENV.smtpPass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM."
    );
  }

  return nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpSecure,
    auth: {
      user: ENV.smtpUser,
      pass: ENV.smtpPass,
    },
  });
}
