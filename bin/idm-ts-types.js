#!/usr/bin/env node

const path = require('path');
const camelCase = require('camelcase');
const fs = require('fs')
const generateTypeName = (managedObjectName) => "Managed" + camelCase(managedObjectName, { pascalCase: true });

const filterResourceCollection = (resourceCollection) => resourceCollection.filter( (res) => res.path.startsWith("managed/"))

function convertType(props, propName) {
  var type;
  var schemaType = props.type;
  if (Array.isArray(schemaType)) {
    schemaType = schemaType[0];
  }
  switch(schemaType) {
    case "object":
    case "string":
      type = schemaType
      break;
    case "array":
      if (props.items.type == "relationship") {
        type = `ReferenceType<${generateTypeName(filterResourceCollection(props.items.resourceCollection)[0].path.replace("managed/",""))}>[]`
      }
      else {
        type = "any[]"
      }
      break;
    case "relationship":
      type = `ReferenceType<${generateTypeName(filterResourceCollection(props.resourceCollection)[0].path.replace("managed/",""))}>`
      break;
    default:
      throw "Unsupported type [" + schemaType + "] for property [" + propName + "]";
  }
  return type;
}

function calcReturnByDefault(prop) {
  if (prop.returnByDefault) {
    return prop.returnByDefault;
  }
  else {
    if (prop.type == "relationship") {
      return false;
    }
    else if (prop.type == "array" && prop.items.type == "relationship") {
      return false;
    }
    else {
      return true;
    }
  }
}

function generateIdmTsTypes() {

  var managedObjectsFile = process.env.IDM_MANAGED_OBJECTS || './conf/managed.json'
  var managedObjects;
  try {
    // Resolve the path preferring the current working directory
    managedObjects = require(path.resolve(managedObjectsFile));
  }
  catch (err) {
    var newErr = Error("Failed to load managed objects file [" + managedObjectsFile + "]");
    newErr.stack += '\nCaused by: ' + err.stack;
    throw newErr;
  }
  var idmTypes = managedObjects.objects.map( (mo) => (
    {
      "name": mo.name,
      "type": mo.schema.type,
      "tsType": generateTypeName(mo.name),
      "properties": Object.keys(mo.schema.properties).map((propName) => {
        const value = mo.schema.properties[propName];
        return {
          "name" : propName,
          "returnByDefault" : calcReturnByDefault(value),
          "type": convertType(value, propName),
          "required": mo.schema.required.includes(propName)
        }
      })
    }
  ));

  const nunjucks = require('nunjucks');
  var template = nunjucks.render(path.resolve(__dirname,'idm.ts.nj'), { "managedObjects": idmTypes} );
  var idmTypesFile = process.env.IDM_TS_TYPES || 'src/idm.ts';
  fs.writeFile(idmTypesFile, template, (err) => {
    if (err) {
      throw err;
    }
    else {
      console.log("Wrote typescript types to [" + idmTypesFile + "]");
    }
  });
}

generateIdmTsTypes();