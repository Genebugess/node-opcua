/**
 * @module node-opcua-client
 */
// tslint:disable:no-unused-expression
import { EventEmitter } from "events";
import { LocaleId } from "node-opcua-basic-types";
import { Certificate, makeSHA1Thumbprint, Nonce, toPem } from "node-opcua-crypto";
import { ObjectRegistry } from "node-opcua-object-registry";
import {
    ClientSecureChannelLayer,
    ConnectionStrategyOptions,
    ErrorCallback,
    SecurityPolicy,
    SecurityToken,
} from "node-opcua-secure-channel";
import {
    FindServersOnNetworkRequest, FindServersOnNetworkRequestOptions,
    FindServersRequest,
    FindServersRequestOptions, ServerOnNetwork,
} from "node-opcua-service-discovery";
import {
    ApplicationDescription, EndpointDescription,
    GetEndpointsRequest, GetEndpointsResponse
} from "node-opcua-service-endpoints";
import {
    MessageSecurityMode
} from "node-opcua-service-secure-channel";

import { ResponseCallback } from "./client_session";
import { Request, Response } from "./common";

export type FindServersRequestLike = FindServersRequest | FindServersRequestOptions;
export type FindServersOnNetworkRequestLike = FindServersOnNetworkRequest | FindServersOnNetworkRequestOptions;
export type GetEndpointCallbackFunc = ResponseCallback<EndpointDescription[]>;
export type CreateSecureChannelCallbackFunc = (err: Error | null, secureChannel?: ClientSecureChannelLayer) => void;

export interface FindEndpointOptions {
    securityMode: MessageSecurityMode;
    securityPolicy: SecurityPolicy;
    connectionStrategy: ConnectionStrategyOptions;
}

export interface FindEndpointResult {
    selectedEndpoint: EndpointDescription;
    endpoints: EndpointDescription[];
}

export type FindEndpointCallback = (err: Error | null, result?: FindEndpointResult) => void;

export interface OPCUAClientBaseOptions {

    connectionStrategy?: ConnectionStrategyOptions;

    /**
     * if not specify or set to 0 , token  renewal will happen
     * around 75% of the defaultSecureTokenLifetime
     */
    tokenRenewalInterval?: number;

    /**
     * if set to true, pending session will not be automatically closed when disconnect is called
     */
    keepPendingSessionsOnDisconnect?: boolean;

    /**
     * the server certificate.
     */
    serverCertificate?: Certificate;

    /**
     * default secure token lifetime in ms
     */
    defaultSecureTokenLifetime?: number;

    /**
     * the security mode
     * @default MessageSecurityMode.None
     */
    securityMode?: MessageSecurityMode | string;

    /**
     * the security policy
     * @default SecurityPolicy.None
     */

    securityPolicy?: SecurityPolicy | string;

    /**
     * can be set when the client doesn't create subscription. In this case,
     * the client will send a dummy request on a regular basis to keep the
     * connection active.
     * @default false
     */
    keepSessionAlive?: boolean;

    /**
     * client certificate pem file.
     * @default "certificates/client_selfsigned_cert_1024.pem"
     */
    certificateFile?: string;
    /**
     * client private key pem file.
     * @default "certificates/client_key_1024.pem"
     */
    privateKeyFile?: string;
    /**
     * a client name string that will be used to generate session names.
     */
    clientName?: string;
}

export interface GetEndpointsOptions {
    endpointUrl?: string;
    localeIds?: LocaleId[];
    profileUris?: string[];
}

export interface OPCUAClientBase {

    /***
     *
     * @param endpointUrl the endpoint of the server to connect to ( i.e "opc.tcp://machine.name:3434/name" )
     */
    connect(endpointUrl: string): Promise<void>;

    connect(endpointUrl: string, callback: ErrorCallback): void;

    /***
     * causes client to close and disconnect the communication with server
     */
    disconnect(): Promise<void>;

    disconnect(callback: ErrorCallback): void;

    findEndpointForSecurity(
        securityMode: MessageSecurityMode, securityPolicy: SecurityPolicy): EndpointDescription | undefined;

    getEndpoints(options?: GetEndpointsOptions): Promise<EndpointDescription[]>;

    getEndpoints(options: GetEndpointsOptions, callback: ResponseCallback<EndpointDescription[]>): void;

    getEndpoints(callback: GetEndpointCallbackFunc): void;

    findServers(options?: FindServersRequestLike): Promise<ApplicationDescription[]>;

    findServers(options: FindServersRequestLike, callback: ResponseCallback<ApplicationDescription[]>): void;

    findServers(callback: ResponseCallback<ApplicationDescription[]>): void;

    findServersOnNetwork(options?: FindServersOnNetworkRequestLike): Promise<ServerOnNetwork[]>;

    findServersOnNetwork(callback: ResponseCallback<ServerOnNetwork[]>): void;

    findServersOnNetwork(options: FindServersOnNetworkRequestLike, callback: ResponseCallback<ServerOnNetwork[]>): void;

}

// Events -----------------------------------------------------------------------------
export interface OPCUAClientBase extends EventEmitter {
    // tslint:disable:unified-signatures

    /**
     * this Event is raised when a failing connection is about to be tried again
     * @param event
     * @param eventHandler
     */
    on(event: "backoff", eventHandler: (count: number, delay: number) => void): OPCUAClientBase;

    /**
     * this event is raised when the client has encountered a connection failure and
     * and is going to reconnection mode.
     * You can intercept start_reconnection event to pause your interaction with the remote
     * OPCUA server.
     * @param event
     * @param eventHandler
     */
    on(event: "start_reconnection", eventHandler: () => void): OPCUAClientBase;

    /**
     * this event is raised after the client has successfully manage to re-establish the connection with
     * the remote OPCUA Server.
     * You can intercept start_reconnection event to resume your interaction with the remote
     * OPCUA server.
     *
     * @param event
     * @param eventHandler
     */
    on(event: "after_reconnection", eventHandler: (err?: Error) => void): OPCUAClientBase;

    /**
     * the event is raised when the connection has been aborted by the remote OPCUA Server
     * @param event
     * @param eventHandler
     */
    on(event: "abort", eventHandler: () => void): OPCUAClientBase;

    /**
     * this event is raised when the connection is closed
     * @param event
     * @param eventHandler
     */
    on(event: "close", eventHandler: () => void): OPCUAClientBase;

    /**
     * this event is raised when the client is sending a message chunk to the server
     * (advanced use only)
     * @param event
     * @param eventHandler
     */
    on(event: "send_chunk", eventHandler: (chunk: Buffer) => void): OPCUAClientBase;

    /**
     * this event is raised when the client has recevied a new message chunk from the servers
     * (advanced use only)
     * @param event
     * @param eventHandler
     */
    on(event: "receive_chunk", eventHandler: (chunk: Buffer) => void): OPCUAClientBase;
    on(event: "send_request", eventHandler: (request: Request) => void): OPCUAClientBase;
    on(event: "receive_response", eventHandler: (response: Response) => void): OPCUAClientBase;

    /**
     * this event is raised when the current security token has reached 75% of its livetime and is therefore
     * about to expired.
     * @param event
     * @param eventHandler
     */
    on(event: "lifetime_75", eventHandler: (token: SecurityToken) => void): OPCUAClientBase;

    /**
     * this event is raised after the (about ) security token as been renewed
     * and renegociated with the server.to expire
     * @param event
     * @param eventHandler
     */
    on(event: "security_token_renewed", eventHandler: () => void): OPCUAClientBase;

    /**
     * this event is raised when a broken connection with the remote Server has been reestablished
     * @param event
     * @param eventHandler
     */
    on(event: "connection_lost", eventHandler: () => void): OPCUAClientBase;

    /**
     * this event is raised when a broken connection with the remote Server has been reestablished
     * @param event
     * @param eventHandler
     */
    on(event: "connection_reestablished", eventHandler: () => void): OPCUAClientBase;

    /**
     * This event is raised when a request sent to the remote OPCUA server has reach it's timeout value without
     * a Response from the server.
     * @param event
     * @param eventHandler
     */
    on(event: "timed_out_request", eventHandler: (request: Request) => void): OPCUAClientBase;

    on(event: string | symbol, listener: (...args: any[]) => void): this;

}

export class OPCUAClientBase {

    public static registry = new ObjectRegistry(OPCUAClientBase);
    public static  create(options: OPCUAClientBaseOptions): OPCUAClientBase {
       throw new Error("Not Implemented");
    }
}