declare const identityServer: IdentityServer;

declare const logger: Logger;
declare const openidm: OpenIDM;
// Allows referencing of org.* Java classes ie org.forgerock
declare const org: any;

type Result = any;

interface EncryptedValue {}
interface HashedValue {}

type HashAlgorithm =
  | "SHA-256"
  | "SHA-384"
  | "SHA-512"
  | "Bcrypt"
  | "Scrypt"
  | "PBKDF2";

interface OpenIDM {
  create: (
    resourceName: string,
    newResourceId: string,
    content: object,
    params?: object,
    fields?: string[]
  ) => Result;
  patch: (
    resourceName: string,
    rev: string,
    value: object,
    params?: object,
    fields?: string[]
  ) => Result;
  read: (
    resourceName: string,
    params?: object,
    fields?: string[]
  ) => Result | null;
  update: (
    resourceName: string,
    rev: string,
    value: object,
    params?: object,
    fields?: string[]
  ) => Result;
  delete: (
    resourceName: string,
    rev: string,
    params?: object,
    fields?: string[]
  ) => Result;
  query: (
    resourceName: string,
    params: QueryFilter,
    fields?: string[]
  ) => QueryResult<Result>;
  action: (
    resource: string,
    actionName: string,
    content: object,
    params?: object,
    fields?: string[]
  ) => any;
  encrypt: (value: any, cipher: string, alias: string) => EncryptedValue;
  decrypt: (value: EncryptedValue) => any;
  isEncrypted: (value: any) => value is EncryptedValue;
  hash: (value: any, algorithm?: HashAlgorithm) => HashedValue;
  isHashed: (value: any) => value is HashedValue;
  matches: (string: HashedValue, value: any) => boolean;
}

type Cookie = {};

interface QueryResult<T> {
  "query-time-ms"?: number;
  result: T[];
  resultCount?: number;
  pagedResultsCookie?: Cookie;
  totalPagedResultsPolicy?: string;
  totalPagedResults?: number;
  remainingPagedResults?: number;
}

type QueryFilter = (QueryFilterParams | QueryIdParams | QueryExpressionParams) &
  QueryOpts;

type QueryFilterParams = { _queryFilter: string };
type QueryIdParams = { _queryId: string };
type QueryExpressionParams = { _queryExpression: string };

interface QueryOpts {
  _pageSize?: number;
  _pagedResultsOffset?: any;
  _pagedResultsCookie?: Cookie;
  _sortKeys?: string;
}

type LogFunction = (message: string, ...params: any[]) => void;

interface Logger {
  info: LogFunction;
  debug: LogFunction;
  error: LogFunction;
  trace: LogFunction;
  warn: LogFunction;
}

interface IdentityServer {
  getProperty: (
    name: string,
    defaultVal: string,
    substitute?: boolean
  ) => string;
  getInstallLocation: () => string;
  getProjectLocation: () => string;
  getWorkingLocation: () => string;
}

declare const injectedGlobalMocks: any;
