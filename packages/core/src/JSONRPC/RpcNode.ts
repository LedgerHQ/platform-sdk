import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { Transport } from "../transports";
import { parseRPCCall, createRpcResponse } from "./helpers";
import { RpcError } from "./RPCError";
import { RpcResponse, RpcRequest, RpcErrorCode } from "./types";

type Resolver<T> = (response: T) => void;

type ReturnTypeOfMethod<T> = T extends (...args: Array<any>) => any
  ? ReturnType<T>
  : any;
type ReturnTypeOfMethodIfExists<T, S> = S extends keyof T
  ? ReturnTypeOfMethod<T[S]>
  : any;
type MethodParams<T> = T extends (...args: infer P) => any ? P[0] : T;
type MethodParamsIfExists<T, S> = S extends keyof T ? MethodParams<T[S]> : S;

export abstract class RpcNode<TSHandlers, TCHandlers> {
  private transport: Transport;

  protected requestHandlers: TSHandlers;

  private ongoingRequests: {
    [requestId: number | string]: Resolver<
      RpcResponse<ReturnTypeOfMethodIfExists<TCHandlers, keyof TCHandlers>, any>
    >;
  } = {};

  constructor(transport: Transport, requestHandlers: TSHandlers) {
    this.transport = transport;
    this.requestHandlers = requestHandlers;
    this.transport.onMessage = (message) => {
      void this.handleMessage(message);
    };
  }

  private _request<K extends keyof TCHandlers, TError = any>(
    request: RpcRequest<K, MethodParamsIfExists<TCHandlers, K>>
  ): Promise<RpcResponse<ReturnTypeOfMethodIfExists<TCHandlers, K>, TError>> {
    return new Promise((resolve) => {
      if (!request.id) {
        throw new Error("requests need to have an id");
      }
      const resolver: Resolver<
        RpcResponse<ReturnTypeOfMethodIfExists<TCHandlers, K>, TError>
      > = (response) => {
        if ("error" in response) {
          throw new RpcError(response.error);
        }
        resolve(response);
      };
      this.ongoingRequests[request.id] = resolver;

      this.transport.send(JSON.stringify(request));
    });
  }

  private _notify<K extends keyof TCHandlers>(
    request: RpcRequest<K, MethodParamsIfExists<TCHandlers, K>>
  ): void {
    this.transport.send(JSON.stringify(request));
  }

  public request<K extends keyof TCHandlers, TError = any>(
    method: K,
    params: MethodParamsIfExists<TCHandlers, K>
  ): Promise<RpcResponse<ReturnTypeOfMethodIfExists<TCHandlers, K>, TError>> {
    const requestId = uuidv4();
    return this._request({
      id: requestId,
      jsonrpc: "2.0",
      method,
      params,
    });
  }

  public notify<K extends keyof TCHandlers>(
    method: K,
    params: MethodParamsIfExists<TCHandlers, K>
  ): void {
    return this._notify({
      jsonrpc: "2.0",
      method,
      params,
    });
  }

  private async handleMessage(message: string) {
    let requestId: number | string | null | undefined;
    try {
      const rpcCall = parseRPCCall(message);
      requestId = rpcCall.id;

      if ("method" in rpcCall) {
        const result = await this.handleRpcRequest(rpcCall);

        if (requestId) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
          const response = createRpcResponse({
            id: requestId,
            result,
          });
          this.transport.send(JSON.stringify(response));
        }
        return;
      }
      this.handleRpcResponse(
        rpcCall as RpcResponse<
          ReturnTypeOfMethodIfExists<TCHandlers, keyof TCHandlers>,
          unknown
        >
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse = createRpcResponse({
          id: requestId || null,
          error: {
            code: RpcErrorCode.INVALID_PARAMS,
            message: "invalid params",
            data: error.errors,
          },
        });

        this.transport.send(JSON.stringify(errorResponse));
        return;
      }
      if (error instanceof RpcError) {
        const errorResponse = createRpcResponse({
          id: requestId || null,
          error: {
            code: error.getCode(),
            message: error.message,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            data: error.getData(),
          },
        });

        this.transport.send(JSON.stringify(errorResponse));
        return;
      }
      throw error;
    }
  }

  protected abstract handleRpcRequest(request: RpcRequest): Promise<unknown>;

  private handleRpcResponse(
    response: RpcResponse<
      ReturnTypeOfMethodIfExists<TCHandlers, keyof TCHandlers>,
      unknown
    >
  ) {
    if (!response.id) {
      return;
    }
    const resolver = this.ongoingRequests[response.id];

    if (!resolver) {
      throw new Error(`no ongoingRequest ${response.id}`);
    }

    resolver(response);
  }
}
