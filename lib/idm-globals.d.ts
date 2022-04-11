declare const identityServer: IdentityServer;

declare const logger: Logger;
declare const openidm: OpenIDM;

interface IDMBaseObject {
  readonly _id: string;
}

type Revision = {
  readonly _rev: string;
};

type Result = IDMBaseObject & Revision & Record<string, any>;

interface EncryptedValue {}
interface HashedValue {}

type HashAlgorithm = "SHA-256" | "SHA-384" | "SHA-512" | "Bcrypt" | "Scrypt" | "PBKDF2";

type PatchRemoveOperation = "remove"
type PatchValueOperation = "add" | "replace" | "increment" | "transform";
type PatchFromOperation = "copy" | "move";
type PatchOperation = PatchValueOperation | PatchRemoveOperation | PatchFromOperation;

type PatchOpts = {
  operation: PatchValueOperation;
  field: string;
  value: any;
} | {
  operation: PatchRemoveOperation;
  field: string;
} | {
  operation: PatchFromOperation;
  from: string;
  field: string;
};

type Action = "CREATE" | "UPDATE" | "DELETE" | "LINK" | "UNLINK" | "EXCEPTION" | "IGNORE" | "REPORT" | "NOREPORT" | "ASYNC";

interface OpenIDM {
  create: (resourceName: string, newResourceId: string | null, content: object, params?: object | null, fields?: string[]) => Result;
  patch: (resourceName: string, rev: string | null, value: PatchOpts[], params?: object | null, fields?: string[]) => Result;
  read: (resourceName: string, params?: object | null, fields?: string[]) => Result | null;
  update: (resourceName: string, rev: string | null, value: object, params?: object | null, fields?: string[]) => Result;
  delete: (resourceName: string, rev?: string | null, params?: object | null, fields?: string[]) => Result;
  query: (resourceName: string, params: QueryFilter, fields?: string[]) => QueryResult<Result>;
  action: (resource: string, actionName: string, content?: object | null, params?: object | null, fields?: string[]) => any;
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

type QueryFilter = (QueryFilterParams | QueryIdParams | QueryExpressionParams) & QueryOpts;

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
  getProperty: (name: string, defaultVal?: string | null, substitute?: boolean) => string;
  getInstallLocation: () => string;
  getProjectLocation: () => string;
  getWorkingLocation: () => string;
}

declare const injectedGlobalMocks: any;
