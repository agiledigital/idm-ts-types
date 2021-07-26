enum Kind {
  Equals = "eq",
  Greater = "gt",
  GreaterOrEqual = "ge",
  Less = "lt",
  LessOrEqual = "le",
  Contains = "co",
  StartsWith = "sw",
  And = "and",
  Or = "or",
  Not = "!",
  Presence = "pr",
  True = "true",
  False = "false"
}
export type Filter<A> =
  | { kind: Kind.Equals; field: keyof A; val: A[keyof A] }
  | { kind: Kind.Greater; field: keyof A; val: A[keyof A] }
  | { kind: Kind.GreaterOrEqual; field: keyof A; val: A[keyof A] }
  | { kind: Kind.Less; field: keyof A; val: A[keyof A] }
  | { kind: Kind.LessOrEqual; field: keyof A; val: A[keyof A] }
  | { kind: Kind.Contains; field: keyof A; val: A[keyof A] }
  | { kind: Kind.StartsWith; field: keyof A; val: A[keyof A] }
  | { kind: Kind.Presence; field: keyof A }
  | { kind: Kind.True }
  | { kind: Kind.False }
  | { kind: Kind.Not; filter: Filter<A> }
  | { kind: Kind.And; a: Filter<A>; b: Filter<A> }
  | { kind: Kind.Or; a: Filter<A>; b: Filter<A> };

export const equals = <A, K extends keyof A>(field: K, val: A[K]): Filter<A> => ({
  field,
  kind: Kind.Equals,
  val
});
export const greater = <A, K extends keyof A>(field: K, val: A[K]): Filter<A> => ({
  field,
  kind: Kind.Greater,
  val
});
export const greaterOrEqual = <A, K extends keyof A>(field: K, val: A[K]): Filter<A> => ({
  field,
  kind: Kind.GreaterOrEqual,
  val
});
export const less = <A, K extends keyof A>(field: K, val: A[K]): Filter<A> => ({
  field,
  kind: Kind.Less,
  val
});
export const lessOrEqual = <A, K extends keyof A>(field: K, val: A[K]): Filter<A> => ({
  field,
  kind: Kind.LessOrEqual,
  val
});
export const contains = <A, K extends keyof A>(field: K, val: A[K]): Filter<A> => ({
  field,
  kind: Kind.Contains,
  val
});
export const startsWith = <A, K extends keyof A>(field: K, val: A[K]): Filter<A> => ({
  field,
  kind: Kind.StartsWith,
  val
});
export const presence = <A, K extends keyof A>(field: K): Filter<A> => ({
  field,
  kind: Kind.Presence
});
export const and = <A>(a: Filter<A>, b: Filter<A>): Filter<A> => ({
  a,
  b,
  kind: Kind.And
});
export const or = <A>(a: Filter<A>, b: Filter<A>): Filter<A> => ({
  a,
  b,
  kind: Kind.Or
});
export const not = <A>(filter: Filter<A>): Filter<A> => ({
  filter,
  kind: Kind.Not
});
export const trueVal = <A>(): Filter<A> => ({
  kind: Kind.True
});
export const falseVal = <A>(): Filter<A> => ({
  kind: Kind.False
});

// combine 1 to many filters returning true if all are true (and)
export const allOf = <A>(...dsl: Filter<A>[]): Filter<A> => dsl.reduce((p, c) => and(p, c));

// combine 1 to many filters returning true if any are true (or)
export const anyOf = <A>(...dsl: Filter<A>[]): Filter<A> => dsl.reduce((p, c) => or(p, c));

// essentially sql's in operator.  Given a field and a collection of values
// this returns true if any are true.
export const oneOf = <A, K extends keyof A>(field: keyof A, ...vals: A[K][]): Filter<A> => anyOf(...vals.map(x => equals(field, x)));

const escapeQuotes = (str: string): string => str.replace("'", "\\'");
const prepareValue = (val: unknown): string => {
  if (typeof val === "string") {
    return `'${escapeQuotes(val ?? "")}'`;
  } else {
    return (val as any)?.toString() ?? "''";
  }
};

export const interpretToFilter = <A>(dsl: Filter<A>): string => {
  switch (dsl.kind) {
    case Kind.Equals:
    case Kind.Greater:
    case Kind.GreaterOrEqual:
    case Kind.Less:
    case Kind.LessOrEqual:
    case Kind.Contains:
    case Kind.StartsWith:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      return `/${dsl.field} ${dsl.kind} ${prepareValue(dsl.val)}`;
    case Kind.And:
    case Kind.Or:
      return `(${interpretToFilter(dsl.a)} ${dsl.kind} ${interpretToFilter(dsl.b)})`;
    case Kind.Presence:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      return `/${dsl.field} ${dsl.kind}`;
    case Kind.Not:
      return `${dsl.kind}(${interpretToFilter(dsl.filter)})`;
    case Kind.True:
    case Kind.False:
      return dsl.kind;
  }
};
