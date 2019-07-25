#!/usr/bin/env node

const path = require("path");
const camelCase = require("camelcase");
const fs = require("fs");
const glob = require("glob");
const _ = require("lodash/fp");
const generateManagedTypeName = managedObjectName =>
  "Managed" + camelCase(managedObjectName, { pascalCase: true });
const generateSystemTypeName = (connectorName, typeName) =>
  "System" +
  camelCase(connectorName, { pascalCase: true }) +
  camelCase(typeName, { pascalCase: true });
const generateSystemObjName = (connectorName, typeName) =>
  camelCase(connectorName) + camelCase(typeName, { pascalCase: true });

const filterResourceCollection = resourceCollection =>
  resourceCollection.filter(res => res.path.startsWith("managed/"));

const provisionerRegex = /\.*\/provisioner.openicf-(.*)\.json.*/;

function convertSystemType(props, propName) {
  var type;
  var schemaType = props.type;

  switch (schemaType) {
    case "boolean":
    case "number":
    case "object":
    case "string":
      type = schemaType;
      break;
    case "array":
      if (props.items && props.items.type) {
        const childType = convertSystemType(props.items, propName);
        type = `${childType}[]`;
      } else {
        type = "any[]";
      }
      break;
    default:
      throw new Error(
        "Unsupported type [" + schemaType + "] for property [" + propName + "]"
      );
  }
  return type;
}

function convertManagedType(props, propName) {
  var type;
  var schemaType = props.type;
  if (Array.isArray(schemaType)) {
    schemaType = schemaType[0];
  }
  switch (schemaType) {
    case "boolean":
    case "number":
    case "object":
    case "string":
      type = schemaType;
      break;
    case "array":
      if (props.items.type === "relationship") {
        type = `ReferenceType<${generateManagedTypeName(
          filterResourceCollection(
            props.items.resourceCollection
          )[0].path.replace("managed/", "")
        )}>[]`;
      } else {
        type = "any[]";
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
      throw "Unable to determine system type name for: " + conn;
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

function generateManagedTypes(idmConfigDir) {
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
  const idmTypes = managedObjects.objects.sort(compareName).map(mo => ({
    name: mo.name,
    type: mo.schema.type,
    tsType: generateManagedTypeName(mo.name),
    properties: Object.keys(mo.schema.properties).map(propName => {
      const value = mo.schema.properties[propName];
      var title = value.title;
      if (!title && value.description) {
        title = value.description;
      }
      var description;

      // We don't want the description if it's the same as the title.
      if (title == value.description) {
        description = "";
      }
      else {
        description = value.description;
      }
      return {
        name: propName,
        returnByDefault: calcReturnByDefault(value),
        type: convertManagedType(value, propName),
        required: mo.schema.required.includes(propName),
        title: title,
        description: description
      };
    })
  }));
  return idmTypes;
}

function generateIdmTsTypes() {
  const idmConfigDir = process.env.IDM_CONFIG_DIR || "./conf";
  const managedIdmTypes = generateManagedTypes(idmConfigDir);
  const connectorIdmTypes = _.flatten(
    generateConnectorTypes(idmConfigDir)
  ).sort(compareName);

  const nunjucks = require("nunjucks");
  const template = nunjucks.render(path.resolve(__dirname, "idm.ts.nj"), {
    managedObjects: managedIdmTypes,
    connectorObjects: connectorIdmTypes
  });
  const idmTypesFile = process.env.IDM_TS_TYPES || "src/idm.ts";
  fs.writeFile(idmTypesFile, template, err => {
    if (err) {
      throw err;
    } else {
      console.log("Wrote typescript types to [" + idmTypesFile + "]");
    }
  });
}

generateIdmTsTypes();
