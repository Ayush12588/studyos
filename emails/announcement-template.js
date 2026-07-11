/**
 * emails/announcement-template.js
 * Feature-announcement email. Reuses email-theme.js and escapeHtml from
 * email-utils.js for visual consistency with reminder-template.js and
 * winback-template.js — same header, card, button, and footer patterns,
 * so all three email types feel like one product rather than three
 * differently-styled one-offs.
 */

import { theme } from './email-theme.js';
import { escapeHtml } from './email-utils.js';

export function buildAnnouncementEmail({ name, announcement, appUrl }) {
    const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BoardOS</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${theme.colors.background}; font-family: ${theme.typography.fontFamily}; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: ${theme.colors.background}; padding: ${theme.spacing.xl} 0;">
            <tr>
                <td align="center" style="padding: 0 ${theme.spacing.sm};">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: ${theme.layout.maxWidth}; background-color: ${theme.colors.surface}; border-radius: ${theme.layout.borderRadius}; border: 1px solid ${theme.colors.border}; overflow: hidden;">

                        ${buildHeader(appUrl)}

                        <tr>
                            <td style="padding: ${theme.spacing.xl} ${theme.spacing.lg};">
                                ${buildBody(greeting, announcement)}
                                ${buildCTA(appUrl, announcement)}
                            </td>
                        </tr>

                    </table>

                    ${buildFooter()}
                </td>
            </tr>
        </table>
    </body>
    </html>`;
}

function buildHeader(appUrl) {
    const logoUrl = `${appUrl}/icons/icon-192.png`;
    return `
    <tr>
        <td style="padding: ${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.sm}; border-bottom: 1px solid ${theme.colors.border};">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                    <td valign="middle" style="padding-right: 12px;">
                        <img src="${logoUrl}" width="28" height="28" alt="" style="display: block; border-radius: 6px;" />
                    </td>
                    <td valign="middle">
                        <span style="font-size: ${theme.typography.sizes.lg}; font-weight: ${theme.typography.weights.bold}; color: ${theme.colors.textPrimary}; letter-spacing: -0.5px;">
                            BoardOS
                        </span>
                    </td>
                </tr>
            </table>
        </td>
    </tr>`;
}

function buildBody(greeting, announcement) {
    // Small "What's new" eyebrow label gives the email a product-update
    // identity at a glance, distinct from reminder/winback emails, even
    // before reading the heading itself.
    return `
    <p style="margin: 0 0 4px 0; font-size: ${theme.typography.sizes.sm}; color: ${theme.colors.brand}; font-weight: ${theme.typography.weights.bold}; text-transform: uppercase; letter-spacing: 0.05em;">
        What's new
    </p>
    <h1 style="margin: 0 0 ${theme.spacing.sm} 0; font-size: ${theme.typography.sizes.xl}; color: ${theme.colors.textPrimary}; font-weight: ${theme.typography.weights.bold}; letter-spacing: -0.5px;">
        ${escapeHtml(announcement.heading)}
    </h1>
    <p style="margin: 0 0 ${theme.spacing.xs} 0; font-size: ${theme.typography.sizes.sm}; color: ${theme.colors.textMuted};">
        ${greeting}
    </p>
    <p style="margin: 0 0 ${theme.spacing.lg} 0; font-size: ${theme.typography.sizes.base}; color: ${theme.colors.textSecondary}; line-height: 1.5;">
        ${escapeHtml(announcement.body)}
    </p>`;
}

function buildCTA(appUrl, announcement) {
    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto;">
        <tr>
            <td align="center"
                bgcolor="${theme.colors.brand}"
                style="border-radius:${theme.layout.cardRadius};">
                <a
                    href="${appUrl}"
                    style="
                        display:block;
                        padding:14px 24px;
                        font-size:${theme.typography.sizes.base};
                        font-weight:${theme.typography.weights.medium};
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:${theme.layout.cardRadius};
                        white-space:nowrap;
                        mso-padding-alt:14px 24px;
                    ">
                    ${escapeHtml(announcement.ctaText)}
                </a>
            </td>
        </tr>
    </table>`;
}

function buildFooter() {
    return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: ${theme.layout.maxWidth}; margin-top: ${theme.spacing.xl};">
        <tr>
            <td align="center" style="padding: 0 ${theme.spacing.lg};">
                <p style="margin: 0; font-size: ${theme.typography.sizes.xs}; color: ${theme.colors.textMuted}; line-height: 1.5; text-align: center;">
                    You're getting this because you have feature updates enabled on BoardOS.<br>
                    To manage your email preferences, visit your account settings.
                </p>
            </td>
        </tr>
    </table>`;
}