import { WalletAPIClient } from "@ledgerhq/wallet-api-client";
import { useEffect, useMemo, useRef, useState } from "react";
import { WalletAPIProviderContext, initialContextValue } from "./context";
import type {
  WalletAPIProviderContextState,
  WalletAPIProviderContextValue,
  WalletAPIProviderProps,
} from "./types";

export * from "./types";

export function WalletAPIProvider({
  children,
  transport,
  logger,
  getCustomModule,
  eventHandlers,
  client: providedClient,
}: WalletAPIProviderProps) {
  const [state, setState] = useState<WalletAPIProviderContextState>(
    initialContextValue.state,
  );

  const client = useRef<WalletAPIClient>();

  if (client.current === undefined) {
    client.current = providedClient
      ? providedClient
      : new WalletAPIClient(transport, logger, getCustomModule, eventHandlers);
  }

  useEffect(() => {
    if (eventHandlers) {
      client.current?.setEventHandlers(eventHandlers);
    }
  }, [eventHandlers]);

  const value = useMemo<WalletAPIProviderContextValue>(
    () => ({
      client: client.current,
      state,
      setState,
    }),
    [client, state, setState],
  );

  return (
    <WalletAPIProviderContext.Provider value={value}>
      {children}
    </WalletAPIProviderContext.Provider>
  );
}
