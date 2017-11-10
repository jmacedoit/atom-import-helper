'use babel';

/**
 * Module dependencies.
 */

import * as t from 'babel-types';
import { flatten, get, isEqual, uniqWith } from 'lodash';
import { parse } from 'babylon';
import fs from './fs';
import program from 'commander';
import readdirp from 'readdirp';
import traverse from 'babel-traverse';

/**
 * Get import nodes from a file.
 */

function getImportNodes(filePath, configs) {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8'); // eslint-disable-line no-sync
    const ast = parse(fileContents, {
      plugins: configs.babylonPlugins,
      sourceType: 'module'
    });

    const importNodes = [];

    traverse(ast, {
      enter(path) {
        if (t.isImportDeclaration(path.node)) {
          importNodes.push(Object.assign({}, path.node, { file: filePath }));
        }
      }
    });

    return importNodes;
  } catch (error) {
    console.log(`Error reading or parsing ${filePath}`);
    console.log(error);

    return [];
  }
}

/**
 * Create specifiers map.
 */

function createSpecifiersMap(importNodes) {
  const unflattenedSpecifiers = importNodes.map(node => {
    return node.specifiers.map(specifier => {
      return {
        imported: get(specifier, 'imported.name'),
        local: get(specifier, 'local.name'),
        source: get(node, 'source.value'),
        type: get(specifier, 'type')
      };
    });
  });

  const specifiers = flatten(unflattenedSpecifiers);
  const uniqSpecifiers = uniqWith(specifiers, isEqual);
  const uniqSpecifiersWithCount = uniqSpecifiers.map(specifierDetails => {
    return Object.assign(
      {},
      specifierDetails,
      { count: specifiers.filter(inspected => isEqual(inspected, specifierDetails)).length }
    );
  });

  return uniqSpecifiersWithCount;
}

/**
 * Build import index file.
 */

function indexImports(projectRootPath, importDataDirectory, jsonStringifiedConfigs) {
  const configs = JSON.parse(jsonStringifiedConfigs);

  readdirp({
    directoryFilter: configs.directoryFilters,
    fileFilter: configs.fileFilters,
    root: projectRootPath
  }, (error, entries) => {
    if (error) {
      console.log(error);
    }

    const allImportNodes = entries.files.map(({ fullPath }) => {
      const importNodes = getImportNodes(fullPath, configs);

      return importNodes;
    });

    const importsList = flatten(allImportNodes);
    const specifiersMap = createSpecifiersMap(importsList);

    console.log('Import data diretory', importDataDirectory);

    fs.writeFileSync(`${importDataDirectory}/.import-helper-data`, JSON.stringify(specifiersMap)); // eslint-disable-line no-sync
  });
}

/**
 * Parse command options and create translations.
 */

program
  .arguments('<projectRootPath> <importDataDirectory> <jsonStringifiedConfigs>')
  .action((projectRootPath, importDataDirectory, jsonStringifiedConfigs) => {
    indexImports(projectRootPath, importDataDirectory, jsonStringifiedConfigs);
  })
  .parse(process.argv);
