/**
 * emails/winback-template.js
 * Single day-3 win-back email. Two segments, different copy:
 *   - new_unengaged: signed up, never touched a chapter
 *   - lapsed: had real activity, went quiet
 * Reuses the same theme tokens and table-based layout as reminder-template.js
 * for visual consistency across BoardOS emails.
 */

import { theme } from './email-theme.js';
import { escapeHtml } from './email-utils.js';

export function buildWinbackEmail({ name, segment, chaptersTouched, appUrl }) {
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
                                ${buildBody(greeting, segment, chaptersTouched)}
                                ${buildCTA(appUrl, segment)}
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

function buildBody(greeting, segment, chaptersTouched) {
    let heading, text;

    if (segment === 'lapsed') {
        heading = 'Your progress is still here';
        text = `You'd tracked ${chaptersTouched} chapter${chaptersTouched === 1 ? '' : 's'} on BoardOS before things got busy. Nothing's been lost — pick up exactly where you left off whenever you're ready.`;
    } else {
        heading = "Here's what BoardOS actually does";
        text = `You signed up but probably didn't get a real feel for it yet. BoardOS tracks your CBSE syllabus chapter by chapter, so you always know exactly what's done and what's left before the exam.`;
    }

    return `
    <h1 style="margin: 0 0 ${theme.spacing.sm} 0; font-size: ${theme.typography.sizes.xl}; color: ${theme.colors.textPrimary}; font-weight: ${theme.typography.weights.bold}; letter-spacing: -0.5px;">
        ${greeting}
    </h1>
    <h2 style="margin: 0 0 ${theme.spacing.sm} 0; font-size: ${theme.typography.sizes.lg}; color: ${theme.colors.textPrimary}; font-weight: ${theme.typography.weights.medium};">
        ${heading}
    </h2>
    <p style="margin: 0 0 ${theme.spacing.lg} 0; font-size: ${theme.typography.sizes.base}; color: ${theme.colors.textSecondary}; line-height: 1.5;">
        ${text}
    </p>`;
}

function buildCTA(appUrl, segment) {
    const ctaText = segment === 'lapsed' ? 'Pick Up Where You Left Off &rarr;' : 'See Your Syllabus &rarr;';

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
                    ${ctaText}
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
                    This is a one-time note — you won't get another one of these.<br>
                    To manage your email preferences, visit your account settings.
                </p>
            </td>
        </tr>
    </table>`;
}