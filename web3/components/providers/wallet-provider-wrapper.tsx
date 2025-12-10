"use client";

import { WalletContextProvider } from "./wallet-provider";

interface WalletProviderWrapperProps {
  children: React.ReactNode;
}

export function WalletProviderWrapper({
  children,
}: WalletProviderWrapperProps) {
  return <WalletContextProvider>{children}</WalletContextProvider>;
}


