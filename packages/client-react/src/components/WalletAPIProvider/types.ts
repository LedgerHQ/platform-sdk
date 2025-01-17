import type {
  Account,
  AnyCustomGetter,
  Currency,
  EventHandlers,
  Logger,
  Transport,
  WalletAPIClient,
  WalletInfo,
} from "@ledgerhq/wallet-api-client";
import type { PropsWithChildren } from "react";

export type Loadable<T> = {
  loading: boolean;
  updatedAt: Date | null;
  error: unknown;
  value: T | null;
};

export type WalletAPIProviderProps = PropsWithChildren<
  | {
      transport: Transport;
      logger?: Logger;
      getCustomModule?: AnyCustomGetter;
      eventHandlers?: EventHandlers;
      client?: never;
    }
  | {
      transport?: never;
      logger?: never;
      getCustomModule?: never;
      eventHandlers?: never;
      client: WalletAPIClient;
    }
>;

export type WalletAPIProviderContextState = {
  accounts: Loadable<Account[]>;
  currencies: Loadable<Currency[]>;
  capabilities: Loadable<string[]>;
  walletInfo: Loadable<WalletInfo["result"]>;
  userId: Loadable<string>;
};

// Register is used to allow users of the lib to customize the default client used in our types
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-interface
export interface Register {
  // client: WalletAPIClient
}

export type RegisteredClient = Register extends {
  client: infer TClient extends WalletAPIClient;
}
  ? TClient
  : WalletAPIClient;

export type WalletAPIProviderContextValue = {
  client?: RegisteredClient;
  state: WalletAPIProviderContextState;
  setState: React.Dispatch<React.SetStateAction<WalletAPIProviderContextState>>;
};
