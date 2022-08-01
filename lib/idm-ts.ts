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
   * @returns The object with its type narrowed to given fields in the options
   */
  public read<F extends Fields<T>>(id: string, options: { readonly params?: object; readonly fields: [F, ...F[]] }): ResultType<T, F> | null;
  
  /**
   * Reads and returns a resource object with unchecked fields in the options.
   * 
   * This unchecked version is essentially an escape hatch to the checked version above. The following circumstances must use an escape hatch 
   * 
   * @example
   * Reads a managed object with an escape 
   * ```ts
   * idm.managed.user.read("<managedUserId>", { fields: ["userName", "givenName"] })
   * ```
   * 
   * @param id - The resource id of the object
   * @param options - Options object which must contain an array of checked fields
   */
  public read<F extends Fields<T>>(id: string, options: { readonly params?: object; readonly unCheckedFields: string[] }): (T & Revision) | null;
  public read<F extends Fields<T>>(id: string, options?: { readonly params?: object }): (D & Revision) | null;
  public read<F extends Fields<T>>(
    id: string,
    { params, fields, unCheckedFields }: { readonly params?: object; readonly fields?: F[]; readonly unCheckedFields?: string[] } = {}
  ) {
    return openidm.read(`${this.type}/${id}`, params, unCheckedFields ? unCheckedFields : fields);
  }

  public create<F extends Fields<T>>(
    newResourceId: string | null,
    content: WithOptionalId<T>,
    options: { readonly params?: object; readonly fields: F[] }
  ): ResultType<T, F>;
  public create<F extends Fields<T>>(
    newResourceId: string | null,
    content: WithOptionalId<T>,
    options: { readonly params?: object; readonly unCheckedFields: string[] }
  ): T & Revision;
  public create<F extends Fields<T>>(newResourceId: string | null, content: WithOptionalId<T>, options?: { readonly params?: object }): D & Revision;
  public create<F extends Fields<T>>(
    newResourceId: string | null,
    content: WithOptionalId<T>,
    { params, fields, unCheckedFields }: { readonly params?: object; readonly fields?: F[]; readonly unCheckedFields?: string[] } = {}
  ) {
    return openidm.create(this.type, newResourceId, content, params, unCheckedFields ? unCheckedFields : fields);
  }

  public patch<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: CompositePatchOpts<T>,
    options: { readonly params?: object; readonly fields: F[] }
  ): ResultType<T, F>;
  public patch<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: CompositePatchOpts<T>,
    options: { readonly params?: object; readonly unCheckedFields: F[] }
  ): T & Revision;
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

  public update<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: WithOptionalId<T>,
    options: { readonly params?: object; readonly fields: F[] }
  ): ResultType<T, F>;
  public update<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: WithOptionalId<T>,
    options: { readonly params?: object; readonly unCheckedFields: string[] }
  ): T & Revision;
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
