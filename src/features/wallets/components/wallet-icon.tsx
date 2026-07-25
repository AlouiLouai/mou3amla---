import React from "react";

export function WalletIcon({ id, className, initials }: { id: string; className?: string; initials: string }) {
    if (id === "flouci") {
        // Flouci: abstract infinity/f loop
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 6C13 5.5 11.5 5 10 5C6 5 4 8 4 12C4 16 6 18 8 18C10.5 18 12.5 16 13 14" />
                <path d="M14 6L16 6C19 6 20 8.5 20 11C20 14 18 16 15 16" />
                <path d="M10 12H16" />
            </svg>
        );
    }
    if (id === "walletii") {
        // walletii by Ooredoo: circles
        return (
            <svg viewBox="0 0 24 24" className={className} fill="currentColor">
                <circle cx="9" cy="12" r="3.5" />
                <circle cx="17" cy="9" r="2.5" />
                <circle cx="16" cy="16" r="2" />
            </svg>
        );
    }
    if (id === "d17") {
        // D17: Postal mark / D block
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h8c4.4 0 8 3.6 8 8s-3.6 8-8 8H4V4z" fill="currentColor" fillOpacity="0.2" />
                <path d="M10 8h2a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3h-2V8z" />
                <path d="M14 12h-4" />
            </svg>
        );
    }
    if (id === "konnect") {
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 5v14" />
                <path d="M18 5L9.5 12 18 19" />
            </svg>
        );
    }
    if (id === "orangemoney") {
        // Orange
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="2.5" fill="currentColor" fillOpacity="0.8" stroke="none" />
                <path d="M8 12h8" stroke="#fff" />
                <path d="M12 8v8" stroke="#fff" />
            </svg>
        );
    }
    if (id === "zitounapay") {
        // Zitouna: leaf/star motif
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L9 8l-6 1 4.5 4.5L6 19l6-3.5L18 19l-1.5-5.5L21 9l-6-1-3-6z" fill="currentColor" fillOpacity="0.4" />
            </svg>
        );
    }
    if (id === "attijari") {
        // Attijari: abstract bird/wing
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4L12 14 8 10l-6 6 8-2 2-2 10-10z" fill="currentColor" fillOpacity="0.2" />
            </svg>
        );
    }
    if (id === "sobflous") {
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="12" rx="2" fill="currentColor" fillOpacity="0.2" />
                <circle cx="16" cy="12" r="2" />
                <path d="M3 10h18" />
            </svg>
        );
    }
    if (id === "biat" || id === "amenpay") {
        // Bank-backed RIB routes: a simple bank/column mark
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10l9-6 9 6" />
                <path d="M5 10v9M10 10v9M14 10v9M19 10v9" />
                <path d="M3 19h18" />
            </svg>
        );
    }
    if (id === "intlcard") {
        // International Card: a card with a globe motif to read as "foreign"
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="6" width="13" height="10" rx="2" />
                <path d="M2.5 9.5h13" />
                <circle cx="18" cy="16" r="4" />
                <path d="M18 12.4a5.2 5.2 0 0 1 0 7.2M18 12.4a5.2 5.2 0 0 0 0 7.2M14.3 16h7.4" strokeWidth="1.4" />
            </svg>
        );
    }
    if (id === "clictopay") {
        // ClicToPay / SMT: card mark
        return (
            <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M3 10h18" />
            </svg>
        );
    }
    // Default fallback (uses initials)
    return <span className={className}>{initials}</span>;
}
