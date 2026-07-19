"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";
import { alpha, mou3amla } from "@/features/mou3amla/constants";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      closeButton
      offset={{ top: "max(1rem, env(safe-area-inset-top))" }}
      mobileOffset={{ top: "max(1rem, env(safe-area-inset-top))" }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": mou3amla.card,
          "--normal-text": mou3amla.text,
          "--normal-border": mou3amla.border,
          "--success-bg": mou3amla.card,
          "--success-text": mou3amla.text,
          "--success-border": alpha(mou3amla.accent, 0.35),
          "--error-bg": mou3amla.card,
          "--error-text": mou3amla.destructive,
          "--error-border": alpha(mou3amla.destructive, 0.35),
          "--warning-bg": mou3amla.card,
          "--warning-text": mou3amla.subtle,
          "--warning-border": alpha(mou3amla.subtle, 0.35),
          "--info-bg": mou3amla.card,
          "--info-text": mou3amla.text,
          "--info-border": mou3amla.border,
          "--border-radius": "20px",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast relative overflow-hidden border shadow-[0_18px_44px_rgba(0,0,0,0.5),0_8px_20px_rgba(0,0,0,0.4)]",
          title: "font-semibold",
          description: "text-[0.8rem] text-white/65",
          actionButton: "bg-[#0095F6] text-white hover:bg-[#0077C7] rounded-full px-3 font-semibold",
          cancelButton: "bg-white/8 text-white hover:bg-white/14 rounded-full px-3 font-semibold",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
