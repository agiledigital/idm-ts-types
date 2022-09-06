import { Filter, interpretToFilter } from "./query-filter";

interface IDMObjectType<T extends string> extends IDMBaseObject {
  readonly _tag?: T;
}

type Fields<T> = Exclude<keyof T, "_tag"> & string;
type ResultType<T extends IDMObjectType<string>, FieldTypes extends keyof T> = Pick<T, FieldTypes> &
  IDMObjectType<Exclude<T["_tag"], undefined>> &
  Revision;
type QueryFilterTypesafeParams<T extends IDMObjectType<string>> = { filter: Filter<T> };
type QueryFilterExtended<T extends IDMObjectType<string>> = QueryFilter | (QueryFilterTypesafeParams<T> & QueryOpts);

export type CheckedPatchOpts<T> = {
  operation: PatchValueOperation;
  field: Fields<T>;
  value: any;
} | {
  operation: PatchRemoveOperation;
  field: Fields<T>;
  value?: any;
} | {
  operation: PatchFromOperation;
  from: string;
  field: Fields<T>;
};

type CombinedPatchOpts<T> = { 
  readonly checkedPatches?: CheckedPatchOpts<T>[];
  readonly unCheckedPatches: PatchOpts[];
}
type CompositePatchOpts<T> = CheckedPatchOpts<T>[] | CombinedPatchOpts<T>

export type WithOptionalId<A extends { _id: string }> = Omit<A, "_id"> & {
  _id?: string;
};

export type ReferenceType<T> = Partial<T> & {
  readonly _ref: string;
  readonly _refResourceCollection?: string;
  readonly _refResourceId?: string;
  readonly _refProperties?: {
    readonly _id?: string;
    readonly _rev?: string;
  } & Record<string, unknown>;
};

export class IDMObject<T extends IDMObjectType<string>, D extends IDMObjectType<string>> {
  constructor(readonly type: Exclude<T["_tag"], undefined>) {}

  /**
   * Reads and returns a resource object with type checked fields in the options.
   * 
   * Checked fields are limited to only the direct fields on the resource and do not support:
   * * Wildcards eg `*` or `*_ref`
   * * Navigating relationships eg `manager/givenName`
   * * Leading slashes eg `/givenName`
   * 
   * @example
   * Reads a managed object with specific known fields, if the fields are deleted or renamed this code would no longer compile
   * ```ts
   * const user = idm.managed.user.read("<managedUserId>", { fields: ["userName", "givenName"] })
   * 
   * // This works
   * let name = user.givenName
   * 
   * // This doesn't compile because the type has been narrowed to the selected fields and mail isn't one of the selected fields
   * let mail = user.mail
   * ```
   * 
   * @example
   * Doesn't compile because of misspelling in `userName`
   * ```ts
   * idm.managed.user.read("<managedUserId>", { fields: ["userNome", "givenName"] })
   * ```
   * 
   * @param id - The resource id of the object
   * @param options - Options object which must contain an array of checked fields
   * @returns The object with its type narrowed to given fields in the options  or `null` if not found.
   */
  public read<F extends Fields<T>>(id: string, options: { readonly params?: object; readonly fields: [F, ...F[]] }): ResultType<T, F> | null;
  
  /**
   * Reads and returns a resource object with unchecked fields in the options.
   * 
   * This unchecked version is essentially an escape hatch to the checked version above. The following circumstances must use an escape hatch:
   * 1. Wildcards such as `*_ref`, `*` or `manager/*`
   * 2. Relationship fields such as `manager/givenName` or "reports/*&#47;givenName"
   * 
   * @example
   * Reads a managed object using un-checked fields
   * ```ts
   * idm.managed.user.read("<managedUserId>", { unCheckedFields: ["givenName", "manager/*"] })
   * ```
   * 
   * @param id - The resource id of the object
   * @param options - Options object which must contain an array of checked fields
   * @returns The object with its type allowing all fields as TypeScript won't know which fields you have chosen or `null` if not found.
   */
  public read<F extends Fields<T>>(id: string, options: { readonly params?: object; readonly unCheckedFields: string[] }): (T & Revision) | null;
  
  /**
   * Reads and returns a resource object with the default fields.
   * 
   * @example
   * Reads a managed object with an escape 
   * ```ts
   * idm.managed.user.read("<managedUserId>")
   * ```
   * 
   * @param id - The resource id of the object.
   * @param options - Options object which can contain params, but no fields.
   * @returns The object with its type narrowed to the default fields for the object or `null` if not found.
   */
  public read<F extends Fields<T>>(id: string, options?: { readonly params?: object }): (D & Revision) | null;
  public read<F extends Fields<T>>(
    id: string,
    { params, fields, unCheckedFields }: { readonly params?: object; readonly fields?: F[]; readonly unCheckedFields?: string[] } = {}
  ) {
    return openidm.read(`${this.type}/${id}`, params, unCheckedFields ? unCheckedFields : fields);
  }

  /**
   * This function creates a new resource object returning the newly created object with only the specified fields and the type narrowed accordingly.
   * 
   * Checked fields are limited to only the direct fields on the resource and do not support:
   * * Wildcards eg `*` or `*_ref`
   * * Navigating relationships eg `manager/givenName`
   * * Leading slashes eg `/givenName`
   * 
   * @example
   * ```ts
   * idm.managed.user.create(
   *  "<managedUserId>",
   *  { userName: "abc123", givenName: "Babs", sn: "Jansen", mail: "babs@babs.com"},
   *  { fields: ["userName", "givenName"] }
   * )
   * ```
   * 
   * @param newResourceId - The identifier of the object to be created, if the client is supplying the ID. If the server should generate the ID, pass null here.
   * @param content - The content of the object to be created.
   * @param options - Options object which must contain an array of checked fields.
   * @returns The created resource object with it's type narrowed to the specified fields.
   */
  public create<F extends Fields<T>>(
    newResourceId: string | null,
    content: WithOptionalId<T>,
    options: { readonly params?: object; readonly fields: F[] }
  ): ResultType<T, F>;

  /**
   * This function creates a new resource object returning the newly created object with only the specified unchecked fields. The resulting type contains all possible fields as TypeScript isn't able to figure out which fields should be returned.
   * 
   * This unchecked version is essentially an escape hatch to the checked version above. The following circumstances must use an escape hatch:
   * 1. Wildcards such as `*_ref`, `*` or `manager/*`
   * 2. Relationship fields such as `manager/givenName` or "reports/*&#47;givenName"
   * 
   * @example
   * ```ts
   * idm.managed.user.create(
   *  "<managedUserId>",
   *  { userName: "abc123", givenName: "Babs", sn: "Jansen", mail: "babs@babs.com"},
   *  { uncheckedFields: ["*"] }
   * )
   * ```
   * 
   * @param newResourceId - The identifier of the object to be created, if the client is supplying the ID. If the server should generate the ID, pass null here.
   * @param content - The content of the object to be created.
   * @param options - Options object which must contain an array of unchecked fields.
   * @returns The created resource object with it's type allowing all fields as TypeScript won't know which fields you have chosen.
   */
  public create<F extends Fields<T>>(
    newResourceId: string | null,
    content: WithOptionalId<T>,
    options: { readonly params?: object; readonly unCheckedFields: string[] }
  ): T & Revision;


  /**
   * This function creates a new resource object returning the newly created object with the default fields.
   * 
   * @example
   * ```ts
   * idm.managed.user.create(
   *  "<managedUserId>",
   *  { userName: "abc123", givenName: "Babs", sn: "Jansen", mail: "babs@babs.com"}
   * )
   * ```
   * 
   * @param newResourceId - The identifier of the object to be created, if the client is supplying the ID. If the server should generate the ID, pass null here.
   * @param content - The content of the object to be created.
   * @param options - Options object which can contain params, but no fields.
   * @returns The created resource object with it's type narrowed to the default fields.
   */
  public create<F extends Fields<T>>(newResourceId: string | null, content: WithOptionalId<T>, options?: { readonly params?: object }): D & Revision;
  public create<F extends Fields<T>>(
    newResourceId: string | null,
    content: WithOptionalId<T>,
    { params, fields, unCheckedFields }: { readonly params?: object; readonly fields?: F[]; readonly unCheckedFields?: string[] } = {}
  ) {
    return openidm.create(this.type, newResourceId, content, params, unCheckedFields ? unCheckedFields : fields);
  }

  /**
   * This function performs a partial modification of a managed or system object. Unlike the update function, only the modified attributes are provided, not the entire object. It returns the modified object with only the specified fields and the type narrowed accordingly.
   * 
   * Checked fields are limited to only the direct fields on the resource and do not support:
   * * Wildcards eg `*` or `*_ref`
   * * Navigating relationships eg `manager/givenName`
   * * Leading slashes eg `/givenName`
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
   * Patching an object to add a value to an array as an unchecked patch because checked patches require the field name to match the resource attribute name exactly without slashes or other additional characters:
   * ```ts
   * idm.managed.role.patch(
   *  role._id,
   *  null,
   *  {
   *    uncheckedPatches: [{"operation":"add", "field":"/members/-", "value": {"_ref":"managed/user/" + user._id}}]
   *  },
   *  { fields: ["userName", "givenName"] }
   * );
   * ```
   * 
   * @example
   * Patching an object with both a checked and unchecked patch:
   * ```ts
   * idm.managed.role.patch(
   *  role._id,
   *  null,
   *  {
   *    checkedPatches: [{"operation":"replace", "field":"givenName", "value": "Babs"}]
   *    uncheckedPatches: [{"operation":"add", "field":"/members/-", "value": {"_ref":"managed/user/" + user._id}}]
   *  },
   *  { fields: ["userName", "givenName"] }
   * );
   * ```
   * 
   * @example
   * Patching an object to remove an existing property:
   * 
   * ```ts
   * idm.managed.user.patch(
   *  user._id,
   *  null,
   *  [{"operation":"remove", "field":"marital_status", "value":"single"}],
   *  { fields: ["userName", "givenName"] }
   * );
   * ```
   * 
   * @example
   * Patching an object to replace a field value:
   * 
   * ```ts
   * idm.managed.user.patch(
   *  user._id,
   *  null,
   *  [{"operation":"replace", "field":"password", "value":"Passw0rd"}],
   *  { fields: ["userName", "givenName"] }
   * );
   * ```
   * 
   * @example
   * Patching an object to increment an integer value:
   * ```ts
   * idm.managed.user.patch(
   *  user._id,
   *  null,
   *  [{"operation":"increment","field":"/age","value":1}],
   *  { fields: ["userName", "givenName"] }
   * );
   * ```
   * 
   * @param id - The identifier of the object to be patched
   * @param rev - The revision of the object to be updated. Use null if the object is not subject to revision control, or if you want to skip the revision check and update the object, regardless of the revision.
   * @param value - An array of one or more JSON patches with checked fields or an object that contains an unchecked patches with optional checked patches.
   * @param options Options object which must contain an array of checked fields.
   * @returns The modified resource object with it's type narrowed to the specified fields.
   */
  public patch<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: CompositePatchOpts<T>,
    options: { readonly params?: object; readonly fields: F[] }
  ): ResultType<T, F>;

  /**
   * This function performs a partial modification of a managed or system object. Unlike the update function, only the modified attributes are provided, not the entire object. It returns the modified object with only the specified unchecked fields.
   * 
   * This unchecked field values version is essentially an escape hatch to the checked version above. The following circumstances must use an escape hatch:
   * 1. Wildcards such as `*_ref`, `*` or `manager/*`
   * 2. Relationship fields such as `manager/givenName` or "reports/*&#47;givenName"
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
   * Patching an object to add a value to an array as an unchecked patch because checked patches require the field name to match the resource attribute name exactly without slashes or other additional characters:
   * ```ts
   * idm.managed.role.patch(
   *  role._id,
   *  null,
   *  {
   *    uncheckedPatches: [{"operation":"add", "field":"/members/-", "value": {"_ref":"managed/user/" + user._id}}]
   *  },
   *  { uncheckedFields: ["*"] }
   * );
   * ```
   * 
   * @example
   * Patching an object with both a checked and unchecked patch:
   * ```ts
   * idm.managed.role.patch(
   *  role._id,
   *  null,
   *  {
   *    checkedPatches: [{"operation":"replace", "field":"givenName", "value": "Babs"}]
   *    uncheckedPatches: [{"operation":"add", "field":"/members/-", "value": {"_ref":"managed/user/" + user._id}}]
   *  },
   *  { uncheckedFields: ["*"] }
   * );
   * ```
   * 
   * @example
   * Patching an object to remove an existing property:
   * 
   * ```ts
   * idm.managed.user.patch(
   *  user._id,
   *  null,
   *  [{"operation":"remove", "field":"marital_status", "value":"single"}],
   *  { uncheckedFields: ["*"] }
   * );
   * ```
   * 
   * @example
   * Patching an object to replace a field value:
   * 
   * ```ts
   * idm.managed.user.patch(
   *  user._id,
   *  null,
   *  [{"operation":"replace", "field":"password", "value":"Passw0rd"}],
   *  { uncheckedFields: ["*"] }
   * );
   * ```
   * 
   * @example
   * Patching an object to increment an integer value:
   * ```ts
   * idm.managed.user.patch(
   *  user._id,
   *  null,
   *  [{"operation":"increment","field":"/age","value":1}],
   *  { uncheckedFields: ["*"] }
   * );
   * ```
   * 
   * @param id - The identifier of the object to be patched
   * @param rev - The revision of the object to be updated. Use null if the object is not subject to revision control, or if you want to skip the revision check and update the object, regardless of the revision.
   * @param value - An array of one or more JSON patches with checked fields or an object that contains an unchecked patches with optional checked patches.
   * @param options Options object which must contain an array of checked fields.
   * @returns The modified resource object with it's type allowing all fields as TypeScript won't know which fields you have chosen.
   */
  public patch<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: CompositePatchOpts<T>,
    options: { readonly params?: object; readonly unCheckedFields: F[] }
  ): T & Revision;

  /**
   * This function performs a partial modification of a managed or system object. Unlike the update function, only the modified attributes are provided, not the entire object. It returns the modified object with the default fields.
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
   * Patching an object to add a value to an array as an unchecked patch because checked patches require the field name to match the resource attribute name exactly without slashes or other additional characters:
   * ```ts
   * idm.managed.role.patch(
   *  role._id,
   *  null,
   *  {
   *    uncheckedPatches: [{"operation":"add", "field":"/members/-", "value": {"_ref":"managed/user/" + user._id}}]
   *  }
   * );
   * ```
   * 
   * @example
   * Patching an object with both a checked and unchecked patch:
   * ```ts
   * idm.managed.role.patch(
   *  role._id,
   *  null,
   *  {
   *    checkedPatches: [{"operation":"replace", "field":"givenName", "value": "Babs"}],
   *    uncheckedPatches: [{"operation":"add", "field":"/members/-", "value": {"_ref":"managed/user/" + user._id}}]
   *  }
   * );
   * ```
   * 
   * @example
   * Patching an object to remove an existing property:
   * 
   * ```ts
   * idm.managed.user.patch(
   *  user._id,
   *  null,
   *  [{"operation":"remove", "field":"marital_status", "value":"single"}]
   * );
   * ```
   * 
   * @example
   * Patching an object to replace a field value:
   * 
   * ```ts
   * idm.managed.user.patch(
   *  user._id,
   *  null,
   *  [{"operation":"replace", "field":"password", "value":"Passw0rd"}]
   * );
   * ```
   * 
   * @example
   * Patching an object to increment an integer value:
   * ```ts
   * idm.managed.user.patch(
   *  user._id,
   *  null,
   *  [{"operation":"increment","field":"/age","value":1}]
   * );
   * ```
   * 
   * @param id - The identifier of the object to be patched
   * @param rev - The revision of the object to be updated. Use null if the object is not subject to revision control, or if you want to skip the revision check and update the object, regardless of the revision.
   * @param value - An array of one or more JSON patches with checked fields or an object that contains an unchecked patches with optional checked patches.
   * @param options Options object which can contain params, but no fields.
   * @returns The modified resource object with it's type narrowed to the default fields.
   */
  public patch<F extends Fields<T>>(id: string, rev: string | null, value: CompositePatchOpts<T>, options?: { readonly params?: object }): D & Revision;
  public patch<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: CompositePatchOpts<T>,
    { params, fields, unCheckedFields }: { readonly params?: object; readonly fields?: F[]; readonly unCheckedFields?: string[] } = {}
  ) {
    const patchValues = this.isCombinedPatchOpts(value)
      ? [...value.unCheckedPatches, ...value.checkedPatches ?? []]
      : value;
    return openidm.patch(`${this.type}/${id}`, rev, patchValues, params, unCheckedFields ? unCheckedFields : fields);
  }

  /**
   * This function updates an entire resource object returning the updated object with only the specified fields and the type narrowed accordingly.
   * 
   * Checked fields are limited to only the direct fields on the resource and do not support:
   * * Wildcards eg `*` or `*_ref`
   * * Navigating relationships eg `manager/givenName`
   * * Leading slashes eg `/givenName`
   * 
   * @example
   * ```ts
   * idm.managed.user.update(
   *  "<managedUserId>",
   *  { userName: "abc123", givenName: "Babs", sn: "Jansen", mail: "babs@babs.com"},
   *  { fields: ["userName", "givenName"] }
   * )
   * ```
   * 
   * @param id - The identifier of the object to be updated
   * @param rev - The revision of the object to be updated. Use `null` if the object is not subject to revision control, or if you want to skip the revision check and update the object, regardless of the revision.
   * @param value - The complete replacement object.
   * @param options Options object which must contain an array of checked fields.
   * @returns The updated resource object with it's type narrowed to the specified fields.
   */
  public update<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: WithOptionalId<T>,
    options: { readonly params?: object; readonly fields: F[] }
  ): ResultType<T, F>;


  /**
   * This function updates an entire resource object returning the updated object with only the specified unchecked fields. The resulting type contains all possible fields as TypeScript isn't able to figure out which fields should be returned.
   * 
   * This unchecked version is essentially an escape hatch to the checked version above. The following circumstances must use an escape hatch:
   * 1. Wildcards such as `*_ref`, `*` or `manager/*`
   * 2. Relationship fields such as `manager/givenName` or "reports/*&#47;givenName"
   * 
   * @example
   * ```ts
   * idm.managed.user.update(
   *  "<managedUserId>",
   *  { userName: "abc123", givenName: "Babs", sn: "Jansen", mail: "babs@babs.com"},
   *  { unCheckedFields: ["*"] }
   * )
   * ```
   * 
   * @param id - The identifier of the object to be updated
   * @param rev - The revision of the object to be updated. Use `null` if the object is not subject to revision control, or if you want to skip the revision check and update the object, regardless of the revision.
   * @param value - The complete replacement object.
   * @param options - Options object which must contain an array of unchecked fields.
   * @returns The updated resource object with it's type allowing all fields as TypeScript won't know which fields you have chosen.
   */
  public update<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: WithOptionalId<T>,
    options: { readonly params?: object; readonly unCheckedFields: string[] }
  ): T & Revision;

  /**
   * This function updates an entire resource object returning the newly created object with the default fields.
   * 
   * 
   * @example
   * ```ts
   * idm.managed.user.update(
   *  "<managedUserId>",
   *  { userName: "abc123", givenName: "Babs", sn: "Jansen", mail: "babs@babs.com"},
   *  { fields: ["userName", "givenName"] }
   * )
   * ```
   * 
   * @param id - The identifier of the object to be updated
   * @param rev - The revision of the object to be updated. Use `null` if the object is not subject to revision control, or if you want to skip the revision check and update the object, regardless of the revision.
   * @param value - The complete replacement object.
   * @param options Options object which must contain an array of checked fields.
   * @returns The updated resource object with it's type narrowed to the default fields.
   */
  public update<F extends Fields<T>>(id: string, rev: string | null, value: WithOptionalId<T>, options?: { readonly params?: object }): D & Revision;
  public update<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: WithOptionalId<T>,
    { params, fields, unCheckedFields }: { readonly params?: object; readonly fields?: F[]; readonly unCheckedFields?: string[] } = {}
  ) {
    return openidm.update(`${this.type}/${id}`, rev, value, params, unCheckedFields ? unCheckedFields : fields);
  }

  public delete<F extends Fields<T>>(id: string, rev: string | null, options: { readonly params?: object; readonly fields: F[] }): ResultType<T, F>;
  public delete<F extends Fields<T>>(
    id: string,
    rev: string | null,
    options: { readonly params?: object; readonly unCheckedFields: F[] }
  ): T & Revision;
  public delete<F extends Fields<T>>(id: string, rev: string | null, options?: { readonly params?: object }): D & Revision;
  public delete<F extends Fields<T>>(
    id: string,
    rev: string | null,
    { params, fields, unCheckedFields }: { readonly params?: object; readonly fields?: F[]; readonly unCheckedFields?: string[] } = {}
  ) {
    return openidm.delete(`${this.type}/${id}`, rev, params, unCheckedFields ? unCheckedFields : fields);
  }

  public query<F extends Fields<T>>(params: QueryFilterExtended<T>, options: { readonly fields: F[] }): QueryResult<ResultType<T, F>>;
  public query<F extends Fields<T>>(params: QueryFilterExtended<T>, options: { readonly unCheckedFields: string[] }): QueryResult<T & Revision>;
  public query<F extends Fields<T>>(params: QueryFilterExtended<T>): QueryResult<D & Revision>;
  public query<F extends Fields<T>>(
    params: QueryFilterExtended<T>,
    { fields, unCheckedFields }: { readonly fields?: F[]; readonly unCheckedFields?: string[] } = {}
  ) {
    return openidm.query(this.type, this.flattenFilter(params), unCheckedFields ? unCheckedFields : fields);
  }

  /**
   * Create a relationship object for the given managed object and id.
   *
   * @param managedObjectId The managed object id to link to
   * @param refProperties Any additional _refProperties to add to the relationship
   */
  public relationship(managedObjectId: string, refProperties: Record<string, unknown> = {}) {
    const refProps = { _refProperties: refProperties };
    return {
      _ref: this.type + "/" + managedObjectId,
      ...refProps
    };
  }

  private isTypeSafeFilter(params: QueryFilterExtended<T>): params is QueryFilterTypesafeParams<T> {
    return (params as QueryFilterTypesafeParams<T>).filter !== undefined;
  }

  private flattenFilter(params: QueryFilterExtended<T>): QueryFilter {
    if (this.isTypeSafeFilter(params)) {
      // Pull out the filter from everything else
      const { filter, ...noFilter } = params;

      // Generate the query filter
      return { ...noFilter, _queryFilter: interpretToFilter(filter) };
    } else {
      return params;
    }
  }

  private isCombinedPatchOpts(value: CompositePatchOpts<T>): value is CombinedPatchOpts<T> {
    return (value as CombinedPatchOpts<T>)?.unCheckedPatches !== undefined
  }
}

export const idmObject = <T extends IDMObjectType<string>, D extends IDMObjectType<string>>(type: Exclude<T["_tag"], undefined>) =>
  new IDMObject<T, D>(type);
