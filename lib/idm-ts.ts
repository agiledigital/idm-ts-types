interface IDMObjectType<T extends string> extends IDMBaseObject {
    readonly _tag?: T
}

type Fields<T> = Exclude<keyof T, '_tag'> & string
type ResultType<T extends IDMObjectType<string>, FieldTypes extends keyof T> = Pick<T, FieldTypes> & IDMObjectType<Exclude<T['_tag'], undefined>> & Revision

export type WithOptionalId<A extends { _id: string }> = Omit<A, "_id"> & {
    _id?: string;
};

export type ReferenceType<T> = Partial<T> & {
    readonly _ref: string
    readonly _refResourceCollection?: string
    readonly _refResourceId?: string
    readonly _refProperties?: {
        readonly _id: string
        readonly _rev: string
    }
}

export class IDMObject<T extends IDMObjectType<string>, D extends IDMObjectType<string>> {
    constructor(readonly type: Exclude<T['_tag'], undefined>) { }

    public read<F extends Fields<T>>(id: string, options: {readonly params?: object, readonly fields: [F, ...F[]]}): ResultType<T, F>
    public read<F extends Fields<T>>(id: string, options?: {readonly params?: object}): D & Revision
    public read<F extends Fields<T>>(id: string, {params, fields}: {readonly params?: object, readonly fields?: F[]} = {}) {
        return openidm.read(`${this.type}/${id}`, params, fields)
    }

    public create<F extends Fields<T>>(newResourceId: string | null, content: WithOptionalId<T>, params: object | undefined, fields: F[]): ResultType<T, F>
    public create<F extends Fields<T>>(newResourceId: string | null, content: WithOptionalId<T>, params?: object): D & Revision
    public create<F extends Fields<T>>(newResourceId: string | null, content: WithOptionalId<T>, params?: object, fields?: F[]) {
        return openidm.create(this.type, newResourceId, content, params, fields)
    }

    public patch<F extends Fields<T>>(id: string, rev: string | null, value: PatchOpts[], params: object | undefined, fields: F[]): ResultType<T, F>
    public patch<F extends Fields<T>>(id: string, rev: string | null, value: PatchOpts[], params?: object): D & Revision
    public patch<F extends Fields<T>>(id: string, rev: string | null, value: PatchOpts[], params?: object, fields?: F[]) {
        return openidm.patch(`${this.type}/${id}`, rev, value, params, fields)
    }

    public update<F extends Fields<T>>(id: string, rev: string | null, value: WithOptionalId<T>, params: object | undefined, fields?: F[]): ResultType<T, F>
    public update<F extends Fields<T>>(id: string, rev: string | null, value: WithOptionalId<T>, params?: object): D & Revision
    public update<F extends Fields<T>>(id: string, rev: string | null, value: WithOptionalId<T>, params?: object, fields?: F[]) {
        return openidm.update(`${this.type}/${id}`, rev, value, params, fields)
    }

    public delete<F extends Fields<T>>(id: string, rev: string | null, params: object | undefined, fields?: F[]): ResultType<T, F>
    public delete<F extends Fields<T>>(id: string, rev: string | null, params?: object): D & Revision
    public delete<F extends Fields<T>>(id: string, rev: string | null, params?: object, fields?: F[]) {
        return openidm.delete(`${this.type}/${id}`, rev, params, fields)
    }

    public query<F extends Fields<T>>(params: QueryFilter, fields: F[]): QueryResult<ResultType<T, F>>
    public query<F extends Fields<T>>(params: QueryFilter): QueryResult<D & Revision>
    public query<F extends Fields<T>>(params: QueryFilter, fields?: F[]) {
        return openidm.query(this.type, params, fields)
    }

    /**
     * Create a relationship object for the given managed object and id.
     * 
     * @param managedObjectId The managed object id to link to
     */
    public relationship (managedObjectId: string)  {
        return {
            _ref: this.type + "/" + managedObjectId
        }
    }
}

export const idmObject = <T extends IDMObjectType<string>, D extends IDMObjectType<string>>(type: Exclude<T['_tag'], undefined>) => new IDMObject<T, D>(type)
