#!/usr/bin/env node

const path = require("path");
const camelCase = require("camelcase");
const fs = require("fs");
const glob = require("glob");
const _ = require("lodash/fp");
const prettier = require("prettier");
const config = require('config');
const nunjucks = require("nunjucks");

function coalesce() {
  var len = arguments.length;
  for (var i=0; i<len; i++) {
      if (arguments[i] !== null && arguments[i] !== undefined) {
          // convert boolean strings to actual booleans
          if (arguments[i] === "true") return true;
          if (arguments[i] === "false") return false;

          return arguments[i];
      }
  }
  return null;
}

const idmTsCodeGen = config.get('idmTsCodeGen');
const managedObjectValueType = coalesce(idmTsCodeGen.useUnknownInsteadOfAnyForManagedObj,idmTsCodeGen.useUnknownInsteadOfAny, false) ? "unknown" : "any";
const connectorObjectValueType = coalesce(idmTsCodeGen.useUnknownInsteadOfAnyForConnectorObj,idmTsCodeGen.useUnknownInsteadOfAny, false) ? "unknown" : "any";

const generateManagedTypeName = managedObjectName =>
  "Managed" + camelCase(managedObjectName, { pascalCase: true });
const generateSystemTypeName = (connectorName, typeName) =>
  "System" +
  camelCase(connectorName, { pascalCase: true }) +
  camelCase(typeName, { pascalCase: true });
const generateSystemObjName = (connectorName, typeName) =>
  camelCase(connectorName) + camelCase(typeName, { pascalCase: true });

const generateManagedSubTypeName = (managedObjectBaseType, subType) => managedObjectBaseType + camelCase(subType, { pascalCase: true });

const filterResourceCollection = resourceCollection =>
  resourceCollection.filter(res => res.path.startsWith("managed/"));

const provisionerRegex = /\.*\/provisioner.openicf-(.*)\.json.*/;

// TODO: Support nested types like managed objects
function convertSystemType(props, propName) {
  var type;
  var schemaType = props.type;

  switch (schemaType) {
    case "boolean":
    case "number":
    case "string":
      type = schemaType;
      break;
    case "object":
      type = `Record<string, ${connectorObjectValueType}>`;
      break;
    case "array":
      if (props.items && props.items.type) {
        const childType = convertSystemType(props.items, propName);
        type = `${childType}[]`;
      } else {
        type = `${connectorObjectValueType}[]`;
      }
      break;
    default:
      throw new Error(
        "Unsupported type [" + schemaType + "] for property [" + propName + "]"
      );
  }
  return type;
}

function convertManagedType(props, propName, moName, tsTypeName, subManagedTypes) {
  var type;
  var schemaType = props.type;
  if (Array.isArray(schemaType)) {
    schemaType = schemaType[0];
  }
  switch (schemaType) {
    case "boolean":
    case "number":
    case "string":
      type = schemaType;
      break;
    case "object":
        if (props.properties && Object.keys(props.properties).length > 0) {
          type = generateManagedSubType(props, moName + '/' + propName, tsTypeName, propName, subManagedTypes)
        }
        else {
          type = `Record<string, ${managedObjectValueType}>`;
        }
        break;
    case "array":
      if (props.items && props.items.type) {
        type = convertManagedType(props.items, propName, moName, tsTypeName, subManagedTypes) + "[]";
      }
      else {
        type = `${managedObjectValueType}[]`;
      }
      break;
    case "relationship":
      type = `ReferenceType<${generateManagedTypeName(
        filterResourceCollection(props.resourceCollection)[0].path.replace(
          "managed/",
          ""
        )
      )}>`;
      break;
    default:
      throw new Error(
        "Unsupported type [" + schemaType + "] for property [" + propName + "]"
      );
  }
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

function generateConnectorTypes(idmConfigDir) {
  const connectorFiles = glob.sync(
    idmConfigDir + "/provisioner.openicf-*.json"
  );

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
      return {
        fullName: systemTypeName + "/" + objName,
        name: sysObjName,
        tsType: tsType,
        connectorName: systemTypeName,
        properties: Object.keys(connObj.properties).map(propName => {
          const value = connObj.properties[propName];
          return {
            name: propName,
            type: convertSystemType(value, propName)
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
    var newErr = Error(
      "Failed to load managed objects file [" + managedObjectsFile + "]"
    );
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
          type: convertManagedType(value, propName, mo.name, managedTypeName, subManagedTypes),
          required: mo.schema.required.includes(propName),
          title: title,
          description: description
        };
      })
    }
  });

  return idmTypes;
}

function generateManagedSubType(subType, moName, managedObjectBaseName, propName, subManagedTypes) {
  // Don't add Sub to the start of the name if it already starts with Sub
  const subName = managedObjectBaseName.startsWith("Sub") ? managedObjectBaseName: "Sub" + managedObjectBaseName;
  const managedTypeName = generateManagedSubTypeName(subName, propName);
  subManagedTypes.push({
    name: moName,
    tsType: managedTypeName,
    parentTsType: managedObjectBaseName,
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
        type: convertManagedType(value, propertyName, moName, managedTypeName, subManagedTypes),
        required: Array.isArray(subType.required)? subType.required.includes(propertyName) : false,
        title: title,
        description: description
      };
    })
  });

  return managedTypeName
}

function generateIdmTsTypes() {

  var subManagedTypes = []
  const managedIdmTypes = generateManagedTypes(idmTsCodeGen.idmProjectConfigDir, subManagedTypes);
  subManagedTypes = subManagedTypes.sort(compareName);
  const connectorIdmTypes = _.flatten(
    generateConnectorTypes(idmTsCodeGen.idmProjectConfigDir)
  ).sort(compareName);


  const template = nunjucks.render(path.resolve(__dirname, "idm.ts.nj"), {
    managedObjects: managedIdmTypes,
    subManagedTypes: subManagedTypes,
    connectorObjects: connectorIdmTypes
  });

  // Load the prettier config
  prettier.resolveConfig(process.cwd()).then(options => {
    // Prettify the generated IDM TS tpes
    const formatted = prettier.format(template, { ...options, parser: "typescript" });
  
    fs.writeFile(idmTsCodeGen.idmTsTypesOutputFile, formatted, err => {
      if (err) {
        throw err;
      } else {
        console.log("Wrote typescript types to [" + idmTsCodeGen.idmTsTypesOutputFile + "]");
      }
    });
  })
}

generateIdmTsTypes();
