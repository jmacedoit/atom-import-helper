'use babel';

/**
 * Module dependencies.
 */

import * as t from 'babel-types';
import { every, get, isEmpty, sortBy } from 'lodash';
import { parse } from 'babylon';
import generate from 'babel-generator';
import traverse from 'babel-traverse';

/**
 * Import specifiers constants.
 */

const DEFAULT_SPECIFIER = 'ImportDefaultSpecifier';
const NORMAL_SPECIFIER = 'ImportSpecifier';

/**
 * Test if specifier matches the import specifier.
 */

function specifierMatchesWishedImport(wishedImport, specifier) {
  if (wishedImport.type === specifier.type) {
    if (t.isImportDefaultSpecifier(specifier)) {
      return wishedImport.local === specifier.local.name;
    }

    if (t.isImportSpecifier(specifier)) {
      return wishedImport.imported === specifier.imported.name;
    }
  }

  return false;
}

/**
 * Create specifier from the import object.
 */

function createSpecifier(wishedImport) {
  if (wishedImport.type === NORMAL_SPECIFIER) {
    return t.importSpecifier(t.identifier(wishedImport.local), t.identifier(wishedImport.imported));
  }

  if (wishedImport.type === DEFAULT_SPECIFIER) {
    return t.importDefaultSpecifier(t.identifier(wishedImport.local));
  }

  return null;
}

/**
 * Calculate node range.
 */

function calculateNodeRange(node, takeCommentsIntoAccount = true) {
  let rangeStart;
  let rangeEnd;

  if (!isEmpty(node.leadingComments) && takeCommentsIntoAccount) {
    rangeStart = node.leadingComments[0].start;
  } else {
    rangeStart = node.start;
  }

  if (!isEmpty(node.trailingComments) && takeCommentsIntoAccount) {
    rangeEnd = node.trailingComments[0].end;
  } else {
    rangeEnd = node.end;
  }

  return [rangeStart, rangeEnd];
}

/**
 * Sort normal specifiers.
 */

function sortNormalSpecifiers(specifiers) {
  return sortBy(specifiers, specifier => specifier.imported.name);
}

/**
 * Add import to file contents.
 */

export function addImport(wishedImport, fileContents, configs) {
  if (wishedImport.type !== NORMAL_SPECIFIER && wishedImport.type !== DEFAULT_SPECIFIER) {
    return fileContents;
  }

  const ast = parse(fileContents, {
    plugins: configs.babylonPlugins,
    sourceType: 'module'
  });

  let addedImport = false;
  let createdImportDeclaration = false;
  let importAlreadyExists = false;
  let modifiedInstruction = null;
  let modifiedInstructionRange = [0, 0];

  traverse(ast, {
    enter(path) {
      if (!addedImport && !importAlreadyExists && t.isImportDeclaration(path.node) && path.node.source.value === wishedImport.source) {
        const specifiersThatMatchImport = path.node.specifiers.filter(specifier => specifierMatchesWishedImport(wishedImport, specifier));

        if (!isEmpty(specifiersThatMatchImport)) {
          importAlreadyExists = true;
        } else if (t.isImportDefaultSpecifier(path.node.specifiers[0])) {
          const normalSpecifiers = [createSpecifier(wishedImport), path.node.specifiers.slice(1)];

          path.node.specifiers = [path.node.specifiers[0], ...sortNormalSpecifiers(normalSpecifiers)];
          modifiedInstruction = path.node;
          modifiedInstructionRange = calculateNodeRange(path.node);

          addedImport = true;
        } else {
          if (wishedImport.type === DEFAULT_SPECIFIER) {
            path.node.specifiers = [createSpecifier(wishedImport), ...path.node.specifiers];
          } else {
            path.node.specifiers = sortNormalSpecifiers([createSpecifier(wishedImport), ...path.node.specifiers]);
          }

          modifiedInstruction = path.node;
          modifiedInstructionRange = calculateNodeRange(path.node);

          addedImport = true;
        }
      }
    }
  });

  const programBody = get(ast, 'program.body');

  if (!addedImport && !importAlreadyExists) {
    let placeImportIndex = 0;

    for (let instructionIndex = 0; instructionIndex < programBody.length; instructionIndex++) {
      const instructionBefore = programBody[instructionIndex - 1];
      const instruction = programBody[instructionIndex];

      if (t.isImportDeclaration(instruction)) {
        if (!t.isImportDeclaration(instructionBefore)) {
          placeImportIndex = instructionIndex;
        }

        if (t.isImportDefaultSpecifier(instruction.specifiers[0]) && wishedImport.type === DEFAULT_SPECIFIER) {
          placeImportIndex = instructionIndex;

          break;
        }

        const allImportSpecifiersNormal = every(instruction.specifiers, ({ type }) => type === NORMAL_SPECIFIER);

        if (allImportSpecifiersNormal && wishedImport.type === NORMAL_SPECIFIER) {
          placeImportIndex = instructionIndex;

          break;
        }
      }
    }

    modifiedInstructionRange = calculateNodeRange(programBody[placeImportIndex], false);
    modifiedInstructionRange[1] = modifiedInstructionRange[0];
    modifiedInstruction = t.importDeclaration([createSpecifier(wishedImport)], t.stringLiteral(wishedImport.source));
    addedImport = true;
    createdImportDeclaration = true;
  }

  if (!addedImport) {
    return fileContents;
  }

  const generatedCode = generate(modifiedInstruction, {
    quotes: configs.quotesStyle,
    retainFunctionParens: true
  }, fileContents).code;

  let finalFile = '';

  finalFile += fileContents.substring(0, modifiedInstructionRange[0]);
  finalFile += generatedCode;
  finalFile += createdImportDeclaration ? '\n' : '';
  finalFile += fileContents.substring(modifiedInstructionRange[1]);

  return finalFile;
}
