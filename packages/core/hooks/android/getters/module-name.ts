import * as fs from 'fs';

const ANDROID_GET_NAME_FN = /getName\(\)[\s\S]*?\{[^}]*\}/gm;
const GET_NAME_RETURN_VALUE = /(?<=return ).*(?=;)/gm;
const MODULE_NAME_ANNOTATION = /(?<=@ReactModule\(name.*=).*(?=\))/gm;

/**
 * Gets the exported name for the module, or null if there's no such match.
 * @example 'IntentAndroid', for the class named 'IntentModule'.
 */
export function getModuleName(
  moduleContents: string,
  files: string[]
): string | null {
  let getNameFunctionReturnValue =
    moduleContents.match(MODULE_NAME_ANNOTATION)?.[0]?.trim() ||
    moduleContents
      .match(ANDROID_GET_NAME_FN)?.[0]
      ?.match(GET_NAME_RETURN_VALUE)?.[0]
      ?.trim();
  // The module doesn't have a getName() method at all. It may be a spec, or not
  // a ReactModule in the first place.
  if (!getNameFunctionReturnValue) {
    return null;
  }
  let variableDefinitionLine;
  if (getNameFunctionReturnValue.startsWith(`"`))
    return getNameFunctionReturnValue.replace(/"/g, '');

  // Handle scoped variables such as RNTestCaseScopedNameVariable.NAME;
  // This will extract moduleName from the correct class by searching
  // the classes in the Package.
  if (getNameFunctionReturnValue.indexOf('.') > -1) {
    const split = getNameFunctionReturnValue.split('.');
    const className = split[0] + '.java';
    getNameFunctionReturnValue = split[1];
    for (const file of files) {
      if (file.includes(`/${className}`)) {
        variableDefinitionLine = fs
          .readFileSync(file, { encoding: 'utf-8' })
          .split('\n')
          .find((line) =>
            line.includes(`String ${getNameFunctionReturnValue}`)
          );
      }
    }
  }

  if (!variableDefinitionLine) {
    variableDefinitionLine = moduleContents
      .split('\n')
      .find((line) => line.includes(`String ${getNameFunctionReturnValue}`));
  }

  return variableDefinitionLine.split(`"`)[1];
}
