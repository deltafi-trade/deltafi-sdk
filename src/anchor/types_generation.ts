/**
 * Code in this file is for generating typescript type definitions of the anchor types
 * defined in src/anchor/idl/deltafi_dex_v2.json
 */
import idl from "./idl/deltafi_dex_v2.json";
import fs from "fs";
import { exec } from "child_process";

const datatypes: Array<any> = idl.types;
const accountTypes: Array<any> = idl.accounts;
const primitiveTypesMapping = {
  u128: "anchor.BN",
  i128: "anchor.BN",
  u64: "anchor.BN",
  i64: "anchor.BN",
  u32: "number",
  i32: "number",
  u16: "number",
  i16: "number",
  u8: "number",
  i8: "number",
  bool: "boolean",
  string: "string",
  publicKey: "PublicKey",
  bytes: "Array<any>",
};

const parseType = (field: { name: string; type: any }) => {
  if (field.type.defined) {
    return field.type.defined;
  }
  if (field.type.array) {
    return "Array<any>";
  }

  const result = primitiveTypesMapping[field.type];
  if (!result) {
    throw Error("unmatched type: " + field.type);
  }
  return result;
};

const getTypeDefinition = (typeDefinitionJson) => {
  if (typeDefinitionJson.type.kind === "struct") {
    return generateStructDefinition(typeDefinitionJson.name, typeDefinitionJson.type.fields);
  } else if (typeDefinitionJson.type.kind === "enum") {
    return generateEnumDefinition(typeDefinitionJson.name, typeDefinitionJson.type.variants);
  }
};

const generateStructDefinition = (structName, structFields) => {
  const strList = ["export interface " + structName + " {"];
  structFields.forEach((field) => {
    const fieldType = parseType(field);
    if (!fieldType) {
      throw Error("Cannot parse field: " + field);
    }
    strList.push("  " + field.name + ": " + fieldType + ";");
  });
  strList.push("}");
  return strList.join("\n");
};

const generateEnumDefinition = (enumName: string, enumVariants: Array<any>) => {
  const interfaceList = [];
  const variantList = [];
  enumVariants.forEach((variant) => {
    variantList.push(`${variant.name[0].toLowerCase()}${variant.name.slice(1)}`);
  });

  for (let i = 0; i < variantList.length; i++) {
    const fieldsList = [];
    for (let j = 0; j < variantList.length; j++) {
      if (i === j) {
        fieldsList.push(`${variantList[j]}? : any`);
      } else {
        fieldsList.push(`${variantList[j]}?: never`);
      }
    }
    interfaceList.push(`| { ${fieldsList.join(", ")} }`);
  }

  return "export type " + enumName + " =\n" + interfaceList.join("\n") + "\n";
};

export const generateDefinitions = (outputFileName) => {
  const definitionList: Array<any> = [];
  const types: Array<any> = datatypes.concat(accountTypes);
  types.forEach((type) => {
    definitionList.push(getTypeDefinition(type));
  });

  const result: string =
    `import * as anchor from "${"@project-serum/anchor"}";\n` +
    `import { PublicKey } from "${"@solana/web3.js"}";\n\n` +
    `${definitionList.join("\n\n")}\n`;
  fs.writeFileSync(outputFileName, result);
  exec(`yarn prettier --write ${outputFileName}`);
  return result;
};
