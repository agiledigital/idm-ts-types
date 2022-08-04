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
  value?: any;
} | {
  operation: PatchFromOperation;
  from: string;
  field: string;
};

/**
 * These are the valid actions available to a particular situation during synchronization.
 *
 * @see https://backstage.forgerock.com/docs/idm/7.1/synchronization-guide/sync-actions.html#sync-actions
 */
type Action = "CREATE" | "UPDATE" | "DELETE" | "LINK" | "UNLINK" | "EXCEPTION" | "IGNORE" | "REPORT" | "NOREPORT" | "ASYNC";

/**
 * IDM scripted functions.
 * 
 @see https://backstage.forgerock.com/docs/idm/7.2/scripting-guide/scripting-func-ref.html
 */
interface OpenIDM {
  /**
   * This function creates a new resource object.
   * 
   * @example
   * ```javascript
   * openidm.create("managed/user", ID, JSON object);
   * ```
   * 
   * @param resourceName - The container in which the object will be created, for example, `managed/user`.
   * @param newResourceId - The identifier of the object to be created, if the client is supplying the ID. If the server should generate the ID, pass null here.
   * @param content - The content of the object to be created.
   * @param params - Additional parameters that are passed to the create request.
   * @param fields - An array of the fields that should be returned in the result. The list of fields can include wild cards, such as `*` or `*_ref`. If no fields are specified, the entire new object is returned.
   * @return The created resource object.
   * @throws An exception is thrown if the object could not be created.
   */
  create: (resourceName: string, newResourceId: string | null, content: object, params?: object | null, fields?: string[]) => Result;

  /**
   * This function performs a partial modification of a managed or system object. Unlike the update function, only the modified attributes are provided, not the entire object.
   * 
   * @example
   * A `remove` operation removes a property if the value of that property equals the specified value, or if no value is specified in the request. The following example `value` removes the `marital_status` property from the object, if the value of that property is `single`:
   * 
   * ```json
   * [
   *     {
   *         "operation": "remove",
   *         "field": "marital_status",
   *         "value": "single"
   *     }
   * ]
   * ```
   * For fields whose value is an array, it’s not necessary to know the position of the value in the array, as long as you specify the full object. If the full object is found in the array, that value is removed. The following example removes user adonnelly from bjensen’s `reports`:
   * 
   * ```json
   * {
   *     "operation": "remove",
   *     "field": "/manager",
   *     "value": {
   *       "_ref": "managed/user/adonnelly",
   *       "_refResourceCollection": "managed/user",
   *       "_refResourceId": "adonnelly",
   *       "_refProperties": {
   *         "_id": "ed6620e4-98ba-410c-abc0-e06dc1be7aa7",
   *         "_rev": "000000008815942b"
   *       }
   *     }
   * }
   * ```
   * If an invalid value is specified (that is a value that does not exist for that property in the current object) the patch request is silently ignored.
   * 
   * A replace operation replaces an existing value, or adds a value if no value exists.
   * 
   * @example
   * Patching an object to add a value to an array:
   * ```javascript
   * openidm.patch("managed/role/" + role._id, null, [{"operation":"add", "field":"/members/-", "value": {"_ref":"managed/user/" + user._id}}]);
   * ```
     * 
   * @example
   * Patching an object to remove an existing property:
     * 
   * ```javascript
   * openidm.patch("managed/user/" + user._id, null, [{"operation":"remove", "field":"marital_status", "value":"single"}]);
   * ```
     * 
   * @example
   * Patching an object to replace a field value:
     * 
   * ```javascript
   * openidm.patch("managed/user/" + user._id, null, [{"operation":"replace", "field":"/password", "value":"Passw0rd"}]);
   * ```
     * 
   * @example
   * Patching an object to increment an integer value:
   * ```javascript
   * openidm.patch("managed/user/" + user._id, null, [{"operation":"increment","field":"/age","value":1}]);
   * ```
   * 
   * @param resourceName - The full path to the object being updated, including the ID.
   * @param rev - The revision of the object to be updated. Use null if the object is not subject to revision control, or if you want to skip the revision check and update the object, regardless of the revision.
   * @param value - An array of one or more JSON objects. The value of the modifications to be applied to the object. The patch set includes the operation type, the field to be changed, and the new values. A PATCH request can `add`, `remove`, `replace`, or `increment` an attribute value.
   * @param params - Additional parameters that are passed to the patch request.
   * @param fields - An array of the fields that should be returned in the result. The list of fields can include wild cards, such as `*` or `*_ref`. If no fields are specified, the entire new object is returned.
   * @returns The modified resource object.
   * @throws An exception is thrown if the object could not be updated.
   */
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
  matches: (string: string, value: HashedValue) => boolean;
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
