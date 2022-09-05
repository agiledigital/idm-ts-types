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
 * * `CREATE` - Create and link a target object.
 * * `UPDATE` - Link and update a target object.
 * * `DELETE` - Delete and unlink the target object.
 * * `LINK` - Link the correlated target object.
 * * `UNLINK` - Unlink the linked target object.
 * * `EXCEPTION` - Flag the link situation as an exception.
 * > _Important_
 * >
 * > Do not use this action for liveSync mappings.
 * > 
 * > In the context of liveSync, the EXCEPTION action triggers the liveSync failure handler, and the operation is retried in accordance with the configured retry policy. This is not useful because the operation will never succeed. If the configured number of retries is high, these pointless retries can continue for a long period of time.
 * > 
 * > If the maximum number of retries is exceeded, the liveSync operation terminates and does not continue processing the entry that follows the failed (EXCEPTION) entry. LiveSync is only resumed at the next liveSync polling interval.
 * > 
 * > This behavior differs from reconciliation, where a failure to synchronize a single source-target association does not fail the entire reconciliation.
 * * `IGNORE` - Do not change the link or target object state.
 * * `REPORT` - Do not perform any action but report what would happen if the default action were performed.
 * * `NOREPORT` - Do not perform any action or generate any report.
 * * `ASYNC` - An asynchronous process has been started, so do not perform any action or generate any report.
 *
 * @see https://backstage.forgerock.com/docs/idm/7.2/synchronization-guide/sync-actions.html#sync-actions
 */
type Action = "CREATE" | "UPDATE" | "DELETE" | "LINK" | "UNLINK" | "EXCEPTION" | "IGNORE" | "REPORT" | "NOREPORT" | "ASYNC";

/**
 * Functions (access to managed objects, system objects, and configuration objects) within IDM are accessible to scripts via the `openidm` object, which is included in the top-level scope provided to each script.
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

  /**
   * This function reads and returns a resource object.
   * 
   * @example
   * ```javascript
   * openidm.read("managed/user/"+userId, null, ["*", "manager"]);
   * ```
   * 
   * @param resourceName - The full path to the object to be read, including the ID.
   * @param params - The parameters that are passed to the read request. Generally, no additional parameters are passed to a read request, but this might differ, depending on the request. If you need to specify a list of `fields` as a third parameter, and you have no additional `params` to pass, you must pass `null` here. Otherwise, you simply omit both parameters.
   * @param fields - An array of the fields that should be returned in the result. The list of fields can include wild cards, such as `*` or `*_ref`. If no fields are specified, the entire object is returned.
   * @returns The resource object, or `null` if not found.
   */
  read: (resourceName: string, params?: object | null, fields?: string[]) => Result | null;

  /**
   * This function updates an entire resource object.
   * 
   * @example
   * In this example, the managed user entry is read (with an openidm.read, the user entry that has been read is updated with a new description, and the entire updated object is replaced with the new value.
   * 
   * ```javascript
   * var user_read = openidm.read('managed/user/' + source._id);
   * user_read['description'] = 'The entry has been updated';
   * openidm.update('managed/user/' + source._id, null, user_read);
   * ```
   * 
   * @param id - The identifier of the object to be updated
   * @param rev - The revision of the object to be updated. Use `null` if the object is not subject to revision control, or if you want to skip the revision check and update the object, regardless of the revision.
   * @param value - The complete replacement object.
   * @param params - The parameters that are passed to the update request.
   * @param fields - An array of the fields that should be returned in the result. The list of fields can include wild cards, such as `*` or `*_ref`. If no fields are specified, the entire object is returned.
   * @returns The modified resource object.
   * @throws An exception is thrown if the object could not be updated.
   */
  update: (resourceName: string, rev: string | null, value: object, params?: object | null, fields?: string[]) => Result;

  /**
   * This function deletes a resource object.
   * 
   * @example
   * ```javascript
   * openidm.delete('managed/user/'+ user._id, user._rev);
   * ```
   * 
   * @param resourceName - The complete path to the to be deleted, including its ID.
   * @param rev - The revision of the object to be deleted. Use `null` if the object is not subject to revision control, or if you want to skip the revision check and delete the object, regardless of the revision.
   * @param params - The parameters that are passed to the delete request.
   * @param fields - An array of the fields that should be returned in the result. The list of fields can include wild cards, such as `*` or `*_ref`. If no fields are specified, the entire object is returned.
   * @returns Returns the deleted object if successful.
   * @throws An exception is thrown if the object could not be deleted.
   */
  delete: (resourceName: string, rev?: string | null, params?: object | null, fields?: string[]) => Result;

  /**
   * This function performs a query on the specified resource object. For more information, see {@link https://backstage.forgerock.com/docs/idm/7.2/objects-guide/queries.html#constructing-queries Construct Queries}.
   * 
   * Additional information is also in the {@link https://backstage.forgerock.com/docs/idm/7.2/crest/crest-query.html CREST Query Reference}.
   * 
   * @example
   * ```javascript
   * reconAudit = openidm.query("audit/recon", {
   *     "_queryFilter": queryFilter,
   *     "_pageSize": limit,
   *     "_pagedResultsOffset": offset,
   *     "_pagedResultsCookie": string,
   *     "_sortKeys": "-timestamp"
   * });
   * ```
   * 
   * @param resourceName - The resource object on which the query should be performed, for example, `managed/user`, or `system/ldap/account`.
   * @param params - The parameters that are passed to the query (_queryFilter, or _queryId). Additional parameters passed to the query will differ, depending on the query.
   * 
   * Certain common parameters can be passed to the query to restrict the query results. The following sample query passes paging parameters and sort keys to the query.
   * @example
   * ```javascript
   * reconAudit = openidm.query("audit/recon", {
   *     "_queryFilter": queryFilter,
   *     "_pageSize": limit,
   *     "_pagedResultsOffset": offset,
   *     "_pagedResultsCookie": string,
   *     "_sortKeys": "-timestamp"
   * });
   * ```
   * 
   * For more information about _queryFilter syntax, see {@link https://backstage.forgerock.com/docs/idm/7.2/objects-guide/queries.html#query-filters Common Filter Expressions}. For more information about paging, see {@link https://backstage.forgerock.com/docs/idm/7.2/objects-guide/queries.html#query-filters Page Query Results}.
   * @param fields - A list of the fields that should be returned in the result. The list of fields can include wild cards, such as `*` or `*_ref`. The following example returns only the userName and _id fields:
   * @example
   * ```javascript
   * openidm.query("managed/user", { "_queryFilter": "/userName sw \"user.1\""}, ["userName", "_id"]);
   * ```
   * This parameter is particularly useful in enabling you to return the response from a query without including intermediary code to massage it into the right format.
   * 
   * Fields are specified as JSON pointers.
   * @returns The result of the query. A query result includes the following parameters:
   * *query-time-ms* (For JDBC repositories only) the time, in milliseconds, that IDM took to process the query.
   * @throws
   */
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
  /**
   * (For JDBC repositories only) the time, in milliseconds, that IDM took to process the query.
   */
  "query-time-ms"?: number;

  /**
   * The list of entries retrieved by the query. The result includes the properties that were requested in the query.
   * 
   * The following example shows the result of a custom query that requests the ID, user name, and email address of all managed users in the repository.
   * 
   * @example
   * ```json
   * {
   *   "result": [
   *     {
   *       "_id": "9dce06d4-2fc1-4830-a92b-bd35c2f6bcbb",
   *       "_rev": "00000000a059dc9f",
   *       "userName": "bjensen",
   *       "mail": "bjensen@example.com"
   *     },
   *     {
   *       "_id": "42f8a60e-2019-4110-a10d-7231c3578e2b",
   *       "_rev": "00000000d84ade1c",
   *       "userName": "scarter",
   *       "mail": "scarter@example.com"
   *     }
   *   ],
   *   "resultCount": 2,
   *   "pagedResultsCookie": null,
   *   "totalPagedResultsPolicy": "NONE",
   *   "totalPagedResults": -1,
   *   "remainingPagedResults": -1
   * }
   * ```
   */
  result: T[];

  /**
   * The number of records in the result.
   */
  resultCount?: number;
  pagedResultsCookie?: Cookie;
  totalPagedResultsPolicy?: string;
  totalPagedResults?: number;
  remainingPagedResults?: number;
}

type QueryFilter = (QueryFilterParams | QueryIdParams | QueryExpressionParams) & QueryOpts;

type QueryFilterParams = { 
  /**
   * Query filters request that the server return entries that match the filter expression. You must URL-escape the filter expression.
   * 
   * The string representation is summarized as follows. Continue reading for additional explanation:
   * 
   * ```
   * Expr           = OrExpr
   * OrExpr         = AndExpr ( 'or' AndExpr ) *
   * AndExpr        = NotExpr ( 'and' NotExpr ) *
   * NotExpr        = '!' PrimaryExpr | PrimaryExpr
   * PrimaryExpr    = '(' Expr ')' | ComparisonExpr | PresenceExpr | LiteralExpr
   * ComparisonExpr = Pointer OpName JsonValue
   * PresenceExpr   = Pointer 'pr'
   * LiteralExpr    = 'true' | 'false'
   * Pointer        = JSON pointer
   * OpName         = 'eq' |  # equal to
   *                  'co' |  # contains
   *                  'sw' |  # starts with
   *                  'lt' |  # less than
   *                  'le' |  # less than or equal to
   *                  'gt' |  # greater than
   *                  'ge' |  # greater than or equal to
   *                  STRING  # extended operator
   * JsonValue      = NUMBER | BOOLEAN | '"' UTF8STRING '"'
   * STRING         = ASCII string not containing white-space
   * UTF8STRING     = UTF-8 string possibly containing white-space
   * ```
   * 
   * _JsonValue_ components of filter expressions follow {@link https://www.rfc-editor.org/rfc/rfc7159.html RFC 7159: The JavaScript Object Notation (JSON) Data Interchange Format}. In particular, as described in section 7 of the RFC, the escape character in strings is the backslash character. For example, to match the identifier `test\`, use `_id eq 'test\\'`. In the JSON resource, the `\` is escaped the same way: `"_id":"test\\"`.
   * 
   * When using a query filter in a URL, be aware that the filter expression is part of a query string parameter. A query string parameter must be URL encoded as described in {@link https://www.rfc-editor.org/rfc/rfc3986.html RFC 3986: Uniform Resource Identifier (URI): Generic Syntax}. For example, white space, double quotes (`"`), parentheses, and exclamation characters need URL encoding in HTTP query strings. The following rules apply to URL query components:
   * 
   * ```
   * query       = *( pchar / "/" / "?" )
   * pchar       = unreserved / pct-encoded / sub-delims / ":" / "@"
   * unreserved  = ALPHA / DIGIT / "-" / "." / "_" / "~"
   * pct-encoded = "%" HEXDIG HEXDIG
   * sub-delims  = "!" / "$" / "&" / "'" / "(" / ")"
   *                   / "*" / "+" / "," / ";" / "="
   * ```
   * 
   * `ALPHA`, `DIGIT`, and `HEXDIG` are core rules of {@link https://www.rfc-editor.org/rfc/rfc5234.html RFC 5234: Augmented BNF for Syntax Specifications}:
   * 
   * ```
   * ALPHA       =  %x41-5A / %x61-7A   ; A-Z / a-z
   * DIGIT       =  %x30-39             ; 0-9
   * HEXDIG      =  DIGIT / "A" / "B" / "C" / "D" / "E" / "F"
   * ```
   * 
   * As a result, a backslash escape character in a _JsonValue_ component is percent-encoded in the URL query string parameter as `%5C`. To encode the query filter expression `_id eq 'test\\'`, use `_id+eq+'test%5C%5C'`, for example.
   * 
   * A simple filter expression can represent a comparison, presence, or a literal value.
   * 
   * For comparison expressions use _json-pointer_ _comparator_ _json-value_, where the comparator is one of the following:
   * 
   * `eq` (equals)
   * `co` (contains)
   * `sw` (starts with)
   * `lt` (less than)
   * `le` (less than or equal to)
   * `gt` (greater than)
   * `ge` (greater than or equal to)
   * 
   * For presence, use _json-pointer pr_ to match resources where:
   * 
   * The JSON pointer is present.
   * 
   * The value it points to is not `null`.
   * 
   * Literal values include true (match anything) and false (match nothing).
   * 
   * Complex expressions employ `and`, `or`, and `!` (not), with parentheses, `(expression)`, to group expressions.
   */
  _queryFilter: string 
};
type QueryIdParams = { 
  /**
   * Specify a query by its identifier.
   * 
   * Specific queries can take their own query string parameter arguments, which depend on the implementation.
   */
  _queryId: string 
};
type QueryExpressionParams = { _queryExpression: string };

interface QueryOpts {
  /**
   * Return query results in pages of this size. After the initial request, use `_pagedResultsCookie` or `_pageResultsOffset` to page through the results.
   */
  _pageSize?: number;

  /**
   * When `_pageSize` is non-zero, use this as an index in the result set indicating the first page to return.
   * 
   * The `_pagedResultsCookie` and `_pagedResultsOffset` parameters are mutually exclusive, and not to be used together.
   */

  _pagedResultsOffset?: number;
  /**
   * The string is an opaque cookie used by the server to keep track of the position in the search results. The server returns the cookie in the JSON response as the value of `pagedResultsCookie`.
   * 
   * In the request `_pageSize` must also be set and non-zero. You receive the cookie value from the provider on the first request, and then supply the cookie value in subsequent requests until the server returns a `null` cookie, meaning that the final page of results has been returned.
   * 
   * The `_pagedResultsCookie` parameter is supported when used with the `_queryFilter` parameter. The `_pagedResultsCookie` parameter is not guaranteed to work when used with the `_queryExpression` and `_queryId` parameters.
   * 
   * The `_pagedResultsCookie` and `_pagedResultsOffset` parameters are mutually exclusive, and not to be used together.
   */
  _pagedResultsCookie?: Cookie;
  
  /**
   * When a `_pageSize` is specified, and non-zero, the server calculates the "totalPagedResults", in accordance with the `totalPagedResultsPolicy`, and provides the value as part of the response. The "totalPagedResults" is either an estimate of the total number of paged results `(_totalPagedResultsPolicy=ESTIMATE)`, or the exact total result count `(_totalPagedResultsPolicy=EXACT)`. If no count policy is specified in the query, or if `_totalPagedResultsPolicy=NONE`, result counting is disabled, and the server returns value of -1 for "totalPagedResults".
   */
  _totalPagedResultsPolicy?: string;
  
  /**
   * Sort the resources returned based on the specified field(s), either in `+` (ascending, default) order, or in `-` (descending) order.
   * 
   * Syntax is:
   * ```none
   * [+-]field[,[+-]field...]
   * ```
   * 
   * Because ascending order is the default, including the `+` character in the query is unnecessary. If you do include the `+`, it must be URL-encoded as `%2B`, for example:
   * 
   * ```none
   * http://localhost:8080/api/users?_prettyPrint=true&_queryFilter=true&_sortKeys=%2Bname/givenName
   * ```
   * 
   * The `_sortKeys` parameter is not supported for predefined queries (`_queryId`).
   */
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
