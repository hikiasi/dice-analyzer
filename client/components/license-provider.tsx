"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface LicenseContextType {
  isActivated: boolean;
  hwid: string;
  checkActivation: () => Promise<void>;
  activate: (key: string) => Promise<boolean>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [isActivated, setIsActivated] = useState(false);
  const [hwid, setHwid] = useState("");

  const checkActivation = async () => {
    if (window.electronAPI) {
      const status = await window.electronAPI.getLicenseStatus();
      setIsActivated(status.isActivated);
      setHwid(status.hwid);
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

  useEffect(() => {
    checkActivation();
  }, []);

  return (
    <LicenseContext.Provider value={{ isActivated, hwid, checkActivation, activate }}>
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
      getLicenseStatus: () => Promise<{ isActivated: boolean; hwid: string }>;
      activate: (key: string) => Promise<boolean>;
    };
  }
}
