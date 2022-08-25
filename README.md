# ForgeRock IDM TypeScript Types
[![npm version](https://img.shields.io/npm/v/@agiledigital/idm-ts-types.svg?style=flat)](https://www.npmjs.com/package/@agiledigital/idm-ts-types)
[![GitHub License](https://img.shields.io/github/license/agiledigital/idm-ts-types.svg)](https://github.com/agiledigital/idm-ts-types/blob/master/LICENSE)
[![Release](https://github.com/agiledigital/idm-ts-types/actions/workflows/release.yml/badge.svg)](https://github.com/agiledigital/idm-ts-types/actions/workflows/release.yml)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Fagiledigital%2Fidm-ts-types%2Fmaster%2Fpackage.json)](https://github.com/plantain-00/type-coverage)
[![Known Vulnerabilities](https://snyk.io/test/github/agiledigital/idm-ts-types/badge.svg?targetFile=package.json)](https://snyk.io/test/github/agiledigital/idm-ts-types?targetFile=package.json)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

* TypeScript Support – Write your IDM JavaScript code in TypeScript which has modern language features while still being compatible with Rhino, the JavaScript engine that IDM uses.
* Type Safety – We've put together some TypeScript types that wrap the IDM API to ensure that all your calls to the API are type safe, plus you get the added benefit of getting type-ahead assistance from your IDE.
* Managed Object and Connector Type Generation – We've built a parser that can generate TypeScript types from your Managed Object and Connector types, this means that you can use your Managed Object or Connector types directly in TypeScript which enables IDE type-ahead assistance and type safety.

## Features

### TypeScript Type Code Generation

The Managed Object's (`managed.json`) and connector files (`provisioner.openicf-*.json`) are parsed and Typescript types are automatically generated.

A snippet of a simple `managed.json` file:
```json
{
    "$schema" : "http://forgerock.org/json-schema#",
    "type" : "object",
    "title" : "User",
    "icon" : "fa-user",
    "properties" : {
        "_id" : {
            "description" : "User ID",
            "type" : "string"
        },
        "userName" : {
            "title" : "Username",
            "description" : "Username",
            "type" : "string"
        },
        "password" : {
            "title" : "Password",
            "description" : "Password",
            "type" : "string"
        },
        "givenName" : {
            "title" : "First Name",
            "description" : "First Name",
            "type" : "string",
            "searchable" : true,
            "userEditable" : true,
            "usageDescription" : null,
            "isPersonal" : true
        }
    }
}
```

And a portion of the resulting Typescript type:

```typescript
export type ManagedUserDefaults = {
  // tslint:disable-next-line: no-duplicate-string
  _tag?: "managed/user";

  /**
   * User ID
   */
  _id?: string;

  /**
   * Username
   */
  userName: string;

  /**
   * Password
   */
  password?: string;

  /**
   * First Name
   */
  givenName: string;
}
```

### Type-safe Wrapper Functions

Compare `openidm` functions vs wrapper functions.

The code generation also generates wrapper functions for all the managed objects and connectors. This is where the power of the types really shines.

![](assets/animations/wrapper-overview.gif)

```typescript
export const idm = {
  ...openidm,
  managed: {
    SubTypeTest: idmObject<ManagedSubTypeTest, ManagedSubTypeTestDefaults>("managed/SubTypeTest"),
    assignment: idmObject<ManagedAssignment, ManagedAssignmentDefaults>("managed/assignment"),
    pendingRelationships: idmObject<ManagedPendingRelationships, ManagedPendingRelationshipsDefaults>("managed/pendingRelationships"),
    role: idmObject<ManagedRole, ManagedRoleDefaults>("managed/role"),
    user: idmObject<ManagedUser, ManagedUserDefaults>("managed/user")
  },
  system: {
    scimAccount: idmObject<SystemScimAccount, SystemScimAccount>("system/scim/account"),
    scimGroup: idmObject<SystemScimGroup, SystemScimGroup>("system/scim/group"),
    usersWithManagersAccount: idmObject<SystemUsersWithManagersAccount, SystemUsersWithManagersAccount>("system/UsersWithManagers/__ACCOUNT__")
  }
};
```

Show examples of all the main functions:

* create
* update
* patch
* delete
* relationship
* query

### Query Filter DSL

Showcase the Query Filter DSL

![](assets/animations/query-filter.gif)

### Type-safe Patches

Show how patches are also type safe

### Automatic type narrowing

Show how selecting fields can narrow the type

## Getting Started

Need to describe how to use the various parts of `idm-ts-types` and how to configure it. Then point to `idm-seed` as a working example.

## API Wrapper Documentation
TODO

## TypeScript Code Generation Documentation
TODO