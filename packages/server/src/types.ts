import type {
  Account,
  BitcoinGetXPub,
  Currency,
  DeviceClose,
  DeviceExchange,
  DeviceTransport,
  Promisable,
  RpcRequest,
  Transaction,
  TransactionSign,
  TransactionSignAndBroadcast,
} from "@ledgerhq/wallet-api-core";
import type { Observable, Subject } from "rxjs";

export type WalletContext = {
  currencies$: Subject<Currency[]>;
  accounts$: Subject<Account[]>;
  selectedAccount$: Subject<Account | null>;
  config: ServerConfig;
};

export type RPCHandler<TResult> = (
  request: RpcRequest<string, unknown>,
  context: WalletContext,
  handlers: Partial<WalletHandlers>
) => Promise<TResult>;

export interface WalletHandlers {
  "account.request": (params: {
    currencies$: Observable<Currency[]>;
    accounts$: Observable<Account[]>;
  }) => Promisable<Account>;
  "account.receive": (params: { account: Account }) => Promisable<string>;
  "message.sign": (params: {
    account: Account;
    message: Buffer;
  }) => Promisable<Buffer>;
  "transaction.sign": (params: {
    account: Account;
    transaction: Transaction;
    options?: TransactionSign["params"]["options"];
  }) => Promisable<Buffer>;
  "transaction.signAndBroadcast": (params: {
    account: Account;
    transaction: Transaction;
    options?: TransactionSignAndBroadcast["params"]["options"];
  }) => Promisable<string>;
  "device.close": (params: DeviceClose["params"]) => Promisable<string>;
  "device.exchange": (params: DeviceExchange["params"]) => Promisable<string>;
  "device.transport": (params: DeviceTransport["params"]) => Promisable<string>;
  "storage.set": (params: {
    key: string;
    value: string;
    storeId: string;
  }) => Promisable<void>;
  "storage.get": (params: {
    key: string;
    storeId: string;
  }) => Promisable<string | undefined>;
  "bitcoin.getXPub": (params: BitcoinGetXPub["params"]) => Promisable<string>;
}

type ReturnTypeOfMethod<T> = T extends (...args: Array<unknown>) => unknown
  ? ReturnType<T>
  : unknown;
type ReturnTypeOfMethodIfExists<T, S> = S extends keyof T
  ? ReturnTypeOfMethod<T[S]>
  : unknown;

export type TransformHandler<T> = {
  [K in keyof T]: RPCHandler<ReturnTypeOfMethodIfExists<T, K>>;
};

export type WalletInfo = {
  name: string;
  version: string;
};

export type ServerConfig = {
  userId: string;
  tracking: boolean;
  wallet: WalletInfo;
  appId: string;
};
