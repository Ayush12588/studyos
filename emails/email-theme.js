/**
 * emails/email-theme.js
 * Centralized design tokens for all BoardOS emails.
 * Keeps visual language consistent without requiring external CSS.
 */

export const theme = {
    colors: {
        background: '#f1f5f9',        // Slate 100 (Clean, modern exterior)
        surface: '#ffffff',           // White card
        textPrimary: '#0f172a',       // Slate 900 (High contrast readability)
        textSecondary: '#475569',     // Slate 600 (Supporting copy)
        textMuted: '#64748b',         // Slate 500 (Accessible muted text)
        brand: '#4f46e5',             // BoardOS Indigo
        brandHover: '#4338ca',
        border: '#e2e8f0',            // Slate 200 (Subtle dividers)
        
        // Semantic Dashboard Colors
        highlightBg: '#fef3c7',       // Amber 50
        highlightBorder: '#fde68a',   // Amber 200
        highlightText: '#b45309',     // Amber 700
        
        neutralBg: '#f8fafc',         // Slate 50
        neutralBorder: '#e2e8f0',     // Slate 200
        
        dangerBg: '#fef2f2',          // Red 50
        dangerText: '#b91c1c',        // Red 700
    },
    typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        sizes: {
            xs: '12px',
            sm: '14px',
            base: '16px',
            lg: '20px',
            xl: '24px',
        },
        weights: {
            normal: '400',
            medium: '500',
            bold: '700',
        }
    },
    spacing: {
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        xxl: '48px',
    },
    layout: {
        maxWidth: '560px',
        borderRadius: '12px',
        cardRadius: '8px',
    }
};