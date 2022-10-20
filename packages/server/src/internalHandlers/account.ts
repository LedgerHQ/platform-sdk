import { arrayOf, objectOf, primitives } from "@altostra/type-validations";
import {
  Account,
  JSONRPC,
  RFC,
  serializeAccount,
} from "@ledgerhq/wallet-api-core";
import { firstValueFrom, map } from "rxjs";
import { ACCOUNT_NOT_FOUND, NOT_IMPLEMENTED_BY_WALLET } from "../errors";
import type { RPCHandler } from "../types";

const validateAccountRequest = objectOf<RFC.AccountRequestParams>({
  currencies: arrayOf(primitives.string),
});

function filterAccountsByCurrencies(accounts: Account[], currencies: string[]) {
  return accounts.filter((account) => currencies.includes(account.currency));
}

export const request: RPCHandler<RFC.AccountRequestResult> = async (
  req,
  context,
  handlers
) => {
  if (!validateAccountRequest(req.params)) {
    throw new JSONRPC.RpcError({
      code: JSONRPC.RpcErrorCode.INVALID_PARAMS,
      message: "Bad parameters",
    });
  }

  const { currencies } = req.params;

  const walletHandler = handlers[RFC.MethodId.ACCOUNT_REQUEST];

  if (!walletHandler) {
    throw new JSONRPC.RpcError(NOT_IMPLEMENTED_BY_WALLET);
  }

  const filteredAccounts$ = context.accounts$.pipe(
    map((accounts) => filterAccountsByCurrencies(accounts, currencies))
  );

  const account = await walletHandler({ accounts$: filteredAccounts$ });

  return {
    rawAccount: serializeAccount(account),
  };
};

const validateAccountList = objectOf<RFC.AccountListParams>({
  currencies: arrayOf(primitives.string),
});

export const list: RPCHandler<RFC.AccountListResult> = async (req, context) => {
  if (!validateAccountList(req.params)) {
    throw new JSONRPC.RpcError({
      code: JSONRPC.RpcErrorCode.INVALID_PARAMS,
      message: "Bad parameters",
    });
  }

  const accounts = await firstValueFrom(context.accounts$);

  return {
    rawAccounts: accounts.map(serializeAccount),
  };
};

const validateAccountReceive = objectOf<RFC.AccountReceiveParams>({
  accountId: primitives.string,
});

export const receive: RPCHandler<RFC.AccountReceiveResult> = async (
  req,
  context,
  handlers
) => {
  if (!validateAccountReceive(req.params)) {
    throw new JSONRPC.RpcError({
      code: JSONRPC.RpcErrorCode.INVALID_PARAMS,
      message: "Bad parameters",
    });
  }

  const accounts = await firstValueFrom(context.accounts$);
  const { accountId } = req.params;

  const account = accounts.find((acc) => acc.id === accountId);

  if (!account) {
    throw new JSONRPC.RpcError(ACCOUNT_NOT_FOUND);
  }

  const walletHandler = handlers[RFC.MethodId.ACCOUNT_RECEIVE];

  if (!walletHandler) {
    throw new JSONRPC.RpcError(NOT_IMPLEMENTED_BY_WALLET);
  }

  const result = await walletHandler({ account });

  return {
    address: result,
  };
};
