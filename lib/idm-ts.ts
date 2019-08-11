interface IDMObjectType<T extends string> extends IDMBaseObject {
  readonly _tag?: T;
}

type Fields<T> = Exclude<keyof T, "_tag"> & string;
type ResultType<T extends IDMObjectType<string>, FieldTypes extends keyof T> = Pick<T, FieldTypes> & IDMObjectType<Exclude<T["_tag"], undefined>> & Revision;

export type WithOptionalId<A extends { _id: string }> = Omit<A, "_id"> & {
  _id?: string;
};

export type ReferenceType<T> = Partial<T> & {
  readonly _ref: string;
  readonly _refResourceCollection?: string;
  readonly _refResourceId?: string;
  readonly _refProperties?: {
    readonly _id: string;
    readonly _rev: string;
  };
};

export class IDMObject<T extends IDMObjectType<string>, D extends IDMObjectType<string>> {
  constructor(readonly type: Exclude<T["_tag"], undefined>) {}

  public read<F extends Fields<T>>(id: string, options: { readonly params?: object; readonly fields: [F, ...F[]] }): ResultType<T, F>;
  public read<F extends Fields<T>>(id: string, options: { readonly params?: object; readonly unCheckedFields: string[] }): T & Revision;
  public read<F extends Fields<T>>(id: string, options?: { readonly params?: object }): D & Revision;
  public read<F extends Fields<T>>(id: string, { params, fields, unCheckedFields }: { readonly params?: object; readonly fields?: F[]; readonly unCheckedFields?: string[] } = {}) {
    return openidm.read(`${this.type}/${id}`, params, unCheckedFields ? unCheckedFields : fields);
  }

  public create<F extends Fields<T>>(newResourceId: string | null, content: WithOptionalId<T>, options: { readonly params?: object; readonly fields: F[] }): ResultType<T, F>;
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

  public patch<F extends Fields<T>>(id: string, rev: string | null, value: PatchOpts[], options: { readonly params?: object; readonly fields: F[] }): ResultType<T, F>;
  public patch<F extends Fields<T>>(id: string, rev: string | null, value: PatchOpts[], options: { readonly params?: object; readonly unCheckedFields: F[] }): T & Revision;
  public patch<F extends Fields<T>>(id: string, rev: string | null, value: PatchOpts[], options?: { readonly params?: object }): D & Revision;
  public patch<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: PatchOpts[],
    { params, fields, unCheckedFields }: { params?: object; fields?: F[]; unCheckedFields?: string[] } = {}
  ) {
    return openidm.patch(`${this.type}/${id}`, rev, value, params, unCheckedFields ? unCheckedFields : fields);
  }

  public update<F extends Fields<T>>(id: string, rev: string | null, value: WithOptionalId<T>, options: { readonly params: object; readonly fields: F[] }): ResultType<T, F>;
  public update<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: WithOptionalId<T>,
    options: { readonly params: object; readonly unCheckedFields: string[] }
  ): T & Revision;
  public update<F extends Fields<T>>(id: string, rev: string | null, value: WithOptionalId<T>, options: { readonly params: object }): D & Revision;
  public update<F extends Fields<T>>(
    id: string,
    rev: string | null,
    value: WithOptionalId<T>,
    { params, fields, unCheckedFields }: { readonly params?: object; readonly fields?: F[]; readonly unCheckedFields?: string[] } = {}
  ) {
    return openidm.update(`${this.type}/${id}`, rev, value, params, unCheckedFields ? unCheckedFields : fields);
  }

  public delete<F extends Fields<T>>(id: string, rev: string | null, options: { readonly params?: object; readonly fields: F[] }): ResultType<T, F>;
  public delete<F extends Fields<T>>(id: string, rev: string | null, options: { readonly params?: object; readonly unCheckedFields: F[] }): T & Revision;
  public delete<F extends Fields<T>>(id: string, rev: string | null, options?: { readonly params?: object }): D & Revision;
  public delete<F extends Fields<T>>(
    id: string,
    rev: string | null,
    { params, fields, unCheckedFields }: { readonly params?: object; readonly fields?: F[]; unCheckedFields?: string[] } = {}
  ) {
    return openidm.delete(`${this.type}/${id}`, rev, params, unCheckedFields ? unCheckedFields : fields);
  }

  public query<F extends Fields<T>>(params: QueryFilter, options: { readonly fields: F[] }): QueryResult<ResultType<T, F>>;
  public query<F extends Fields<T>>(params: QueryFilter, options: { readonly unCheckedFields: string[] }): QueryResult<T & Revision>;
  public query<F extends Fields<T>>(params: QueryFilter): QueryResult<D & Revision>;
  public query<F extends Fields<T>>(params: QueryFilter, { fields, unCheckedFields }: { readonly fields?: F[]; readonly unCheckedFields?: string[]} = {}) {
    return openidm.query(this.type, params, unCheckedFields ? unCheckedFields : fields);
  }
  /**
   * Create a relationship object for the given managed object and id.
   *
   * @param managedObjectId The managed object id to link to
   */
  public relationship(managedObjectId: string) {
    return {
      _ref: this.type + "/" + managedObjectId
    };
  }
}

export const idmObject = <T extends IDMObjectType<string>, D extends IDMObjectType<string>>(type: Exclude<T["_tag"], undefined>) => new IDMObject<T, D>(type);
