/**
 * emails/reminder-template.js
 * Renders the HTML email. Uses a functional layout composition pattern.
 * Strictly uses table-based or basic block elements with inline styles 
 * for maximum cross-client compatibility (Gmail, Outlook, Apple Mail).
 */

import { theme } from './email-theme.js';
import { escapeHtml, TYPE_LABELS } from './email-utils.js';

export function buildReminderEmail({ name, stats, slot, appUrl }) {
    const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
    
    const topItems = [...stats.active]
        .sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (b.priority === 'high' && a.priority !== 'high') return 1;
            return (b.board_marks || 0) - (a.board_marks || 0);
        })
        .slice(0, 5);

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BoardOS Reminder</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${theme.colors.background}; font-family: ${theme.typography.fontFamily}; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: ${theme.colors.background}; padding: ${theme.spacing.xl} 0;">
            <tr>
                <td align="center" style="padding: 0 ${theme.spacing.sm};">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: ${theme.layout.maxWidth}; background-color: ${theme.colors.surface}; border-radius: ${theme.layout.borderRadius}; border: 1px solid ${theme.colors.border}; overflow: hidden;">
                        
                        <!-- Header -->
                        ${buildHeader(appUrl)}
                        
                        <!-- Body Content -->
                        <tr>
                            <td style="padding: ${theme.spacing.xl} ${theme.spacing.lg};">
                                ${buildGreeting(greeting, slot)}
                                ${buildDashboardStats(stats)}
                                ${buildPriorityTasks(topItems)}
                                ${buildCTA(appUrl, slot)}
                            </td>
                        </tr>
                        
                    </table>
                    
                    <!-- Footer -->
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

function buildGreeting(greeting, slot) {
    let contextText = '';
    let positiveFraming = '';

    if (slot === 'morning') {
        contextText = "Here is your study focus for today. Planning your session now removes friction later.";
        positiveFraming = "✦ Every completed topic today moves you closer to your board target.";
    } else if (slot === 'evening') {
        contextText = "It's getting late, but there is still time. Completing just one chapter right now is enough to keep your momentum alive.";
        positiveFraming = "✦ Small, consistent steps matter more than perfect, long sessions.";
    } else if (slot === 'night') {
        contextText = "Did you make progress today? If you studied, make sure to log it so your dashboard stats stay accurate.";
        positiveFraming = "✦ Tracking your effort is just as important as the effort itself.";
    }

    return `
    <h1 style="margin: 0 0 ${theme.spacing.sm} 0; font-size: ${theme.typography.sizes.xl}; color: ${theme.colors.textPrimary}; font-weight: ${theme.typography.weights.bold}; letter-spacing: -0.5px;">
        ${greeting}
    </h1>
    <p style="margin: 0 0 ${theme.spacing.sm} 0; font-size: ${theme.typography.sizes.base}; color: ${theme.colors.textSecondary}; line-height: 1.5;">
        ${contextText}
    </p>
    <p style="margin: 0 0 ${theme.spacing.lg} 0; font-size: ${theme.typography.sizes.sm}; color: ${theme.colors.brand}; font-weight: ${theme.typography.weights.medium};">
        ${positiveFraming}
    </p>`;
}

function buildDashboardStats(stats) {
    return `
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: ${theme.spacing.xl};">
        <tr>
            <td width="48%" valign="top" style="background-color: ${theme.colors.highlightBg}; border: 1px solid ${theme.colors.highlightBorder}; border-radius: ${theme.layout.cardRadius}; padding: ${theme.spacing.md};">
                <p style="margin: 0 0 4px 0; font-size: ${theme.typography.sizes.sm}; color: ${theme.colors.highlightText}; font-weight: ${theme.typography.weights.medium}; text-transform: uppercase; letter-spacing: 0.05em;">
                    Marks in Focus
                </p>
                <p style="margin: 0; font-size: 28px; font-weight: ${theme.typography.weights.bold}; color: ${theme.colors.highlightText};">
                    ${stats.marksAtRisk}
                </p>
            </td>
            <td width="4%"></td>
            <td width="48%" valign="top" style="background-color: ${theme.colors.neutralBg}; border: 1px solid ${theme.colors.neutralBorder}; border-radius: ${theme.layout.cardRadius}; padding: ${theme.spacing.md};">
                <p style="margin: 0 0 4px 0; font-size: ${theme.typography.sizes.sm}; color: ${theme.colors.textSecondary}; font-weight: ${theme.typography.weights.medium}; text-transform: uppercase; letter-spacing: 0.05em;">
                    Pending Topics
                </p>
                <p style="margin: 0; font-size: 28px; font-weight: ${theme.typography.weights.bold}; color: ${theme.colors.textPrimary};">
                    ${stats.total}
                </p>
            </td>
        </tr>
    </table>`;
}

function buildPriorityTasks(items) {
    if (items.length === 0) return '';

    const listHtml = items.map((item, index) => {
        const isLast = index === items.length - 1;
        const borderStyle = isLast ? '' : `border-bottom: 1px solid ${theme.colors.border};`;
        
        const priorityBadge = item.priority === 'high' 
            ? `<span style="background-color: ${theme.colors.dangerBg}; color: ${theme.colors.dangerText}; font-size: 11px; font-weight: ${theme.typography.weights.bold}; padding: 2px 6px; border-radius: 4px; margin-left: 6px; text-transform: uppercase; letter-spacing: 0.05em;">High Priority</span>` 
            : '';

        const marksBadge = item.board_marks 
            ? `<span style="display: inline-block; background-color: ${theme.colors.neutralBg}; border: 1px solid ${theme.colors.border}; color: ${theme.colors.textPrimary}; font-size: ${theme.typography.sizes.sm}; font-weight: ${theme.typography.weights.medium}; padding: 4px 8px; border-radius: 6px;">${item.board_marks}M</span>`
            : '';

        return `
        <tr>
            <td style="padding: ${theme.spacing.md} 0; ${borderStyle}">
                <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                        <td valign="middle">
                            <div style="margin-bottom: 4px;">
                                <span style="font-size: ${theme.typography.sizes.base}; font-weight: ${theme.typography.weights.medium}; color: ${theme.colors.textPrimary};">
                                    ${escapeHtml(item.chapter)}
                                </span>
                            </div>
                            <div style="font-size: ${theme.typography.sizes.sm}; color: ${theme.colors.textSecondary};">
                                ${escapeHtml(item.subject)} 
                                <span style="color: ${theme.colors.textMuted}; margin: 0 4px;">•</span> 
                                ${TYPE_LABELS[item.type] || 'Pending'}
                                ${priorityBadge}
                            </div>
                        </td>
                        <td align="right" valign="middle" width="60">
                            ${marksBadge}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>`;
    }).join('');

    return `
    <h2 style="margin: 0 0 ${theme.spacing.sm} 0; font-size: ${theme.typography.sizes.base}; font-weight: ${theme.typography.weights.bold}; color: ${theme.colors.textPrimary};">
        Up Next
    </h2>
    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: ${theme.spacing.xl};">
        ${listHtml}
    </table>`;
}

function buildCTA(appUrl, slot) {
    let ctaText = "Continue Today's Study &rarr;";
    if (slot === "morning") ctaText = "Start Today's Study &rarr;";
    if (slot === "evening") ctaText = "Clear One Topic &rarr;";
    if (slot === "night") ctaText = "Log Today's Session &rarr;";

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
                    You are receiving this because you use BoardOS to track your study goals.<br>
                    To manage your email preferences, visit your account settings.
                </p>
            </td>
        </tr>
    </table>`;
}