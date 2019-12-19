#!/usr/bin/env node

const path = require("path");
const camelCase = require("camelcase");
const fs = require("fs");
const glob = require("glob");
const _ = require("lodash/fp");
const prettier = require("prettier");
const config = require("config");
const nunjucks = require("nunjucks");

function coalesce() {
  var len = arguments.length;
  for (var i = 0; i < len; i++) {
    if (arguments[i] !== null && arguments[i] !== undefined) {
      // convert boolean strings to actual booleans
      if (arguments[i] === "true") {
        return true;
      } else if (arguments[i] === "false") {
        return false;
      } else {
        return arguments[i];
      }
    }
  }
  return null;
}

const idmTsCodeGen = config.get("idmTsCodeGen");
const managedObjectValueType = coalesce(idmTsCodeGen.useUnknownInsteadOfAnyForManagedObj, idmTsCodeGen.useUnknownInsteadOfAny, false)
  ? "unknown"
  : "any";
const connectorObjectValueType = coalesce(idmTsCodeGen.useUnknownInsteadOfAnyForConnectorObj, idmTsCodeGen.useUnknownInsteadOfAny, false)
  ? "unknown"
  : "any";

const generateManagedTypeName = managedObjectName =>
  "Managed" +
  camelCase(managedObjectName, {
    pascalCase: true
  });
const generateSystemTypeName = (connectorName, typeName) =>
  "System" +
  camelCase(connectorName, {
    pascalCase: true
  }) +
  camelCase(typeName, {
    pascalCase: true
  });
const generateSystemObjName = (connectorName, typeName) =>
  camelCase(connectorName) +
  camelCase(typeName, {
    pascalCase: true
  });

const generateSubTsTypeName = (objectBaseType, subType) =>
  objectBaseType +
  camelCase(subType, {
    pascalCase: true
  });

const isManagedType = typeName => typeName.startsWith("Managed");

const filterResourceCollection = resourceCollection => resourceCollection.filter(res => res.path.startsWith("managed/"));

const provisionerRegex = /\.*\/provisioner.openicf-(.*)\.json.*/;

function convertType(props, propName, originalObjectName, tsTypeName, subTypes) {
  var type;
  var schemaType = props.type;
  var nullable = "";
  if (Array.isArray(schemaType)) {
    // Check if the type is nullable
    if (schemaType.length === 2 && schemaType[1] === "null") {
      nullable = " | null";
    }
    schemaType = schemaType[0];
  }
  switch (schemaType) {
    case "boolean":
    case "number":
    case "string":
      type = schemaType;
      break;
    case "integer":
      type = "number";
      break;
    case "object":
      if (props.properties && Object.keys(props.properties).length > 0) {
        type = generateSubType(props, originalObjectName + "/" + propName, tsTypeName, propName, subTypes);
      } else {
        type = `Record<string, ${managedObjectValueType}>`;
      }
      break;
    case "array":
      if (props.items && props.items.type) {
        type = convertType(props.items, propName, originalObjectName, tsTypeName, subTypes) + "[]";
      } else {
        type = `${managedObjectValueType}[]`;
      }
      break;
    case "relationship":
      if (!isManagedType(tsTypeName)) {
        throw new Error(`Relationships are only supported for Managed Objects. Type ${tsTypeName}, property ${propName}`);
      }
      type = `ReferenceType<${generateManagedTypeName(filterResourceCollection(props.resourceCollection)[0].path.replace("managed/", ""))}>`;
      break;
    default:
      throw new Error("Unsupported type [" + schemaType + "] for property [" + propName + "]");
  }
  type += nullable;
  return type;
}

function calcReturnByDefault(prop) {
  if (prop.returnByDefault) {
    return prop.returnByDefault;
  } else {
    if (prop.type === "relationship") {
      return false;
    } else if (prop.type === "array" && prop.items.type === "relationship") {
      return false;
    } else {
      return true;
    }
  }
}

function compareName(a, b) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

function generateConnectorTypes(idmConfigDir, subConnectorTypes) {
  const connectorFiles = glob.sync(idmConfigDir + "/provisioner.openicf-*.json");

  return connectorFiles.map(conn => {
    var connectorObject;
    try {
      // Resolve the path preferring the current working directory
      connectorObject = require(path.resolve(conn));
    } catch (err) {
      var newErr = Error("Failed to load connector file [" + conn + "]");
      newErr.stack += "\nCaused by: " + err.stack;
      throw newErr;
    }

    const match = provisionerRegex.exec(conn);
    if (!match) {
      throw Error("Unable to determine system type name for: " + conn);
    }
    const systemTypeName = match[1];

    return Object.keys(connectorObject.objectTypes).map(objName => {
      const connObj = connectorObject.objectTypes[objName];
      const tsType = generateSystemTypeName(systemTypeName, objName);
      const sysObjName = generateSystemObjName(systemTypeName, objName);
      const fullName = systemTypeName + "/" + objName;
      return {
        fullName: fullName,
        name: sysObjName,
        tsType: tsType,
        connectorName: systemTypeName,
        properties: Object.keys(connObj.properties).map(propName => {
          const value = connObj.properties[propName];

          var title = value.title;
          if (!title && value.description) {
            title = value.description;
          }
          var description;

          // We don't want the description if it's the same as the title.
          if (title === value.description) {
            description = "";
          } else {
            description = value.description;
          }

          return {
            name: propName,
            type: convertType(value, propName, fullName, tsType, subConnectorTypes),
            required: connObj.required ? connObj.required.includes(propName) : false,
            title: title,
            description: description
          };
        })
      };
    });
  });
}

function generateManagedTypes(idmConfigDir, subManagedTypes) {
  const managedObjectsFile = idmConfigDir + "/managed.json";
  var managedObjects;
  try {
    // Resolve the path preferring the current working directory
    managedObjects = require(path.resolve(managedObjectsFile));
  } catch (err) {
    var newErr = Error("Failed to load managed objects file [" + managedObjectsFile + "]");
    newErr.stack += "\nCaused by: " + err.stack;
    throw newErr;
  }
  const idmTypes = managedObjects.objects.sort(compareName).map(mo => {
    const managedTypeName = generateManagedTypeName(mo.name);
    return {
      name: mo.name,
      type: mo.schema.type,
      tsType: managedTypeName,
      properties: Object.keys(mo.schema.properties).map(propName => {
        const value = mo.schema.properties[propName];
        var title = value.title;
        if (!title && value.description) {
          title = value.description;
        }
        var description;

        // We don't want the description if it's the same as the title.
        if (title === value.description) {
          description = "";
        } else {
          description = value.description;
        }
        return {
          name: propName,
          returnByDefault: calcReturnByDefault(value),
          type: convertType(value, propName, mo.name, managedTypeName, subManagedTypes),
          required: mo.schema.required.includes(propName),
          title: title,
          description: description
        };
      })
    };
  });

  return idmTypes;
}

function generateSubType(subType, subTypeName, originalObjectBaseName, propName, subTypes) {
  // Don't add Sub to the start of the name if it already starts with Sub
  const subName = originalObjectBaseName.startsWith("Sub") ? originalObjectBaseName : "Sub" + originalObjectBaseName;
  const subTsTypeName = generateSubTsTypeName(subName, propName);
  subTypes.push({
    name: subTypeName,
    tsType: subTsTypeName,
    parentTsType: originalObjectBaseName,
    properties: Object.keys(subType.properties).map(propertyName => {
      const value = subType.properties[propertyName];
      var title = value.title;
      if (!title && value.description) {
        title = value.description;
      }
      var description;

      // We don't want the description if it's the same as the title.
      if (title === value.description) {
        description = "";
      } else {
        description = value.description;
      }
      return {
        name: propertyName,
        type: convertType(value, propertyName, subTypeName, subTsTypeName, subTypes),
        required: Array.isArray(subType.required) ? subType.required.includes(propertyName) : false,
        title: title,
        description: description
      };
    })
  });

  return subTsTypeName;
}

function generateIdmTsTypes() {
  var subManagedTypes = [];
  const managedIdmTypes = generateManagedTypes(idmTsCodeGen.idmProjectConfigDir, subManagedTypes);
  subManagedTypes = subManagedTypes.sort(compareName);
  var subConnectorTypes = [];
  const connectorIdmTypes = _.flatten(generateConnectorTypes(idmTsCodeGen.idmProjectConfigDir, subConnectorTypes)).sort(compareName);
  subConnectorTypes = subConnectorTypes.sort(compareName);

  const template = nunjucks.render(path.resolve(__dirname, "idm.ts.nj"), {
    managedObjects: managedIdmTypes,
    subManagedTypes: subManagedTypes,
    connectorObjects: connectorIdmTypes,
    subConnectorTypes: subConnectorTypes
  });

  // Load the prettier config
  prettier.resolveConfig(process.cwd()).then(options => {
    // Prettify the generated IDM TS tpes
    const formatted = prettier.format(template, {
      ...options,
      parser: "typescript"
    });

    fs.writeFile(idmTsCodeGen.idmTsTypesOutputFile, formatted, err => {
      if (err) {
        throw err;
      } else {
        console.log("Wrote typescript types to [" + idmTsCodeGen.idmTsTypesOutputFile + "]");
      }
    });
  });
}

generateIdmTsTypes();
