"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface LicenseContextType {
  isActivated: boolean;
  hwid: string;
  usageCount: number;
  trialLimit: number;
  isTrialExpired: boolean;
  checkActivation: () => Promise<void>;
  activate: (key: string) => Promise<boolean>;
  incrementUsage: () => Promise<void>;
  copyToClipboard: (text: string) => Promise<void>;
}

const TRIAL_LIMIT = 30;

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [isActivated, setIsActivated] = useState(false);
  const [hwid, setHwid] = useState("");
  const [usageCount, setUsageCount] = useState(0);

  const isTrialExpired = usageCount >= TRIAL_LIMIT;

  const checkActivation = async () => {
    if (window.electronAPI) {
      const status = await window.electronAPI.getLicenseStatus();
      setIsActivated(status.isActivated);
      setHwid(status.hwid);
      setUsageCount(status.usageCount || 0);
    } else {
      // Fallback for web development
      setIsActivated(process.env.NODE_ENV === "development");
      setHwid("WEB-DEV-MODE");
    }
  };

  const activate = async (key: string) => {
    if (window.electronAPI) {
      const success = await window.electronAPI.activate(key);
      if (success) {
        setIsActivated(true);
      }
      return success;
    }
    return false;
  };

  const incrementUsage = async () => {
    if (window.electronAPI) {
      const newCount = await window.electronAPI.incrementUsage();
      setUsageCount(newCount);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (window.electronAPI) {
      await window.electronAPI.copyToClipboard(text);
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  useEffect(() => {
    checkActivation();
  }, []);

  return (
    <LicenseContext.Provider value={{
      isActivated, hwid, usageCount, trialLimit: TRIAL_LIMIT, isTrialExpired,
      checkActivation, activate, incrementUsage, copyToClipboard
    }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error("useLicense must be used within a LicenseProvider");
  }
  return context;
}

declare global {
  interface Window {
    electronAPI: {
      getLicenseStatus: () => Promise<{ isActivated: boolean; hwid: string; usageCount: number }>;
      activate: (key: string) => Promise<boolean>;
      incrementUsage: () => Promise<number>;
      copyToClipboard: (text: string) => Promise<boolean>;
    };
  }
}
