import { Option, fromNullable } from 'fp-ts/lib/Option'

interface IDMObjectType<T extends string> {
    _tag: T
}

type Fields<T> = Exclude<keyof T, '_tag'> & string
type ResultType<T extends IDMObjectType<string>, D extends IDMObjectType<string>, Fields extends keyof T> = Pick<T, Fields> & IDMObjectType<T['_tag']>

export type ReferenceType<T> = Partial<T> & {
    _ref: string
    _refResourceCollection: string,
    _refResourceId: string,
    _refProperties: {
        _id: string
        _rev: string
    },
}


const assignType = (type: string) => (obj: unknown) => ({_tag: type, ...obj}) as unknown

export class IDMObject<T extends IDMObjectType<string>, D extends IDMObjectType<string>> {
    constructor(private readonly type: T['_tag']) { }

    read<F extends Fields<T>>(id: string, options: {params?: object, fields: [F, ...F[]]}): Option<ResultType<T, D, F>>
    read<F extends Fields<T>>(id: string, options: {params?: object}): Option<D>
    read<F extends Fields<T>>(id: string): Option<D>
    read<F extends Fields<T>>(id: string, options: {params?: object, fields?: F[]} = {}) {
        return fromNullable(openidm.read(`${this.type}/${id}`, options.params, options.fields)).map(assignType(this.type))
    }

    create<F extends Fields<T>>(id: string, newResourceId: string, content: object, params: object | undefined, fields: F[]): ResultType<T, D, F>
    create<F extends Fields<T>>(id: string, newResourceId: string, content: object, params?: object): D
    create<F extends Fields<T>>(id: string, newResourceId: string, content: object, params?: object, fields?: F[]) {
        return assignType(this.type)(openidm.create(`${this.type}/${id}`, newResourceId, content, params, fields))
    }

    patch<F extends Fields<T>>(id: string, rev: string, value: object, params: object | undefined, fields: F[]): ResultType<T, D, F>
    patch<F extends Fields<T>>(id: string, rev: string, value: object, params?: object): D
    patch<F extends Fields<T>>(id: string, rev: string, value: object, params?: object, fields?: F[]) {
        return assignType(this.type)(openidm.patch(`${this.type}/${id}`, rev, value, params, fields))
    }

    update<F extends Fields<T>>(id: string, rev: string, value: object, params: object | undefined, fields?: F[]): ResultType<T, D, F>
    update<F extends Fields<T>>(id: string, rev: string, value: object, params?: object): D
    update<F extends Fields<T>>(id: string, rev: string, value: object, params?: object, fields?: F[]) {
        return assignType(this.type)(openidm.update(`${this.type}/${id}`, rev, value, params, fields))
    }

    delete<F extends Fields<T>>(id: string, rev: string, params: object | undefined, fields?: F[]): ResultType<T, D, F>
    delete<F extends Fields<T>>(id: string, rev: string, params?: object): D
    delete<F extends Fields<T>>(id: string, rev: string, params?: object, fields?: F[]) {
        return assignType(this.type)(openidm.delete(`${this.type}/${id}`, rev, params, fields))
    }

    query<F extends Fields<T>>(params: QueryFilter, fields: F[]): QueryResult<ResultType<T, D, F>>
    query<F extends Fields<T>>(params: QueryFilter): QueryResult<D>
    query<F extends Fields<T>>(params: QueryFilter, fields?: F[]) {
        const response = openidm.query(this.type, params, fields)
        const result = response.result.map(assignType(this.type))
        return {...response, result}
    }
}

export const idmObject = <T extends IDMObjectType<string>, D extends IDMObjectType<string>>(type: T['_tag']) => new IDMObject<T, D>(type)