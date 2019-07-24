export interface IDMBaseObject {
    readonly _id?: string
}

interface IDMObjectType<T extends string> {
    readonly _tag?: T
}

type Fields<T> = Exclude<keyof T, '_tag'> & string
type ResultType<T extends IDMObjectType<string>, FieldTypes extends keyof T> = Pick<T, FieldTypes> & IDMObjectType<Exclude<T['_tag'], undefined>>

export type ReferenceType<T> = Partial<T> & {
    readonly _ref: string
    readonly _refResourceCollection?: string
    readonly _refResourceId?: string
    readonly _refProperties?: {
        readonly _id: string
        readonly _rev: string
    }
}

const assignType = (type: string) => (obj: unknown) => ({_tag: type, ...obj})

export class IDMObject<T extends IDMObjectType<string>, D extends IDMObjectType<string>> {
    constructor(readonly type: Exclude<T['_tag'], undefined>) { }

    public read<F extends Fields<T>>(id: string, options: {readonly params?: object, readonly fields: [F, ...F[]]}): ResultType<T, F>
    public read<F extends Fields<T>>(id: string, options?: {readonly params?: object}): D
    public read<F extends Fields<T>>(id: string, {params, fields}: {readonly params?: object, readonly fields?: F[]} = {}) {
        return openidm.read(`${this.type}/${id}`, params, fields).map(assignType(this.type))
    }

    public create<F extends Fields<T>>(newResourceId: string | null, content: T, params: object | undefined, fields: F[]): ResultType<T, F>
    public create<F extends Fields<T>>(newResourceId: string | null, content: T, params?: object): D
    public create<F extends Fields<T>>(newResourceId: string | null, content: T, params?: object, fields?: F[]) {
        return assignType(this.type)(openidm.create(this.type, newResourceId, content, params, fields))
    }

    public patch<F extends Fields<T>>(id: string, rev: string, value: PatchOpts, params: object | undefined, fields: F[]): ResultType<T, F>
    public patch<F extends Fields<T>>(id: string, rev: string, value: PatchOpts, params?: object): D
    public patch<F extends Fields<T>>(id: string, rev: string, value: PatchOpts, params?: object, fields?: F[]) {
        return assignType(this.type)(openidm.patch(`${this.type}/${id}`, rev, value, params, fields))
    }

    public update<F extends Fields<T>>(id: string, rev: string, value: T, params: object | undefined, fields?: F[]): ResultType<T, F>
    public update<F extends Fields<T>>(id: string, rev: string, value: T, params?: object): D
    public update<F extends Fields<T>>(id: string, rev: string, value: T, params?: object, fields?: F[]) {
        return assignType(this.type)(openidm.update(`${this.type}/${id}`, rev, value, params, fields))
    }

    public delete<F extends Fields<T>>(id: string, rev: string, params: object | undefined, fields?: F[]): ResultType<T, F>
    public delete<F extends Fields<T>>(id: string, rev: string, params?: object): D
    public delete<F extends Fields<T>>(id: string, rev: string, params?: object, fields?: F[]) {
        return assignType(this.type)(openidm.delete(`${this.type}/${id}`, rev, params, fields))
    }

    public query<F extends Fields<T>>(params: QueryFilter, fields: F[]): QueryResult<ResultType<T, F>>
    public query<F extends Fields<T>>(params: QueryFilter): QueryResult<D>
    public query<F extends Fields<T>>(params: QueryFilter, fields?: F[]) {
        const response = openidm.query(this.type, params, fields)
        const result = response.result.map(assignType(this.type))
        return {...response, result}
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
