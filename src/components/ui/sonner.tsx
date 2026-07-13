"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "#FFFFFF",
          "--normal-text": "#050505",
          "--normal-border": "rgba(255,0,131,0.18)",
          "--success-bg": "#FFF3F9",
          "--success-text": "#050505",
          "--success-border": "rgba(255,0,131,0.22)",
          "--error-bg": "#FFF3F7",
          "--error-text": "#8F124C",
          "--error-border": "rgba(217,48,114,0.24)",
          "--warning-bg": "#FFF7EE",
          "--warning-text": "#9C5513",
          "--warning-border": "rgba(255,141,40,0.24)",
          "--info-bg": "#FFF8FC",
          "--info-text": "#050505",
          "--info-border": "rgba(255,0,131,0.18)",
          "--border-radius": "20px",
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast border shadow-[0_18px_44px_rgba(255,0,131,0.12),0_8px_20px_rgba(0,0,0,0.08)]",
          title: "font-semibold",
          description: "text-[0.8rem] text-black/65",
          actionButton:
            "bg-[#FF0083] text-white hover:bg-[#E70078] rounded-full px-3 font-semibold",
          cancelButton:
            "bg-black/5 text-black hover:bg-black/10 rounded-full px-3 font-semibold",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
