'use babel';

/**
 * Module dependencies.
 */

import { BufferedProcess, CompositeDisposable } from 'atom';
import { addImport as addImportToFileContents } from './utils/add-import';
import { head } from 'lodash';
import View from './view';
import fs from './utils/fs';
import path from 'path';

/**
 * Config schema.
 */

const config = {
  babylonPlugins: {
    default: ['jsx', 'flow', 'objectRestSpread', 'classProperties'],
    description: 'Plugins used by **babylon** to parse editor content.',
    items: {
      type: 'string'
    },
    title: 'Babylon plugins',
    type: 'array'
  },
  directoryFilters: {
    default: ['!node_modules', '!flow-typed'],
    description: 'Filter used by **readdirp** module which indicates which directories to scan for imports.',
    items: {
      type: 'string'
    },
    title: 'Directories filter',
    type: 'array'
  },
  fileFilters: {
    default: ['*.js'],
    description: 'Filter used by **readdirp** module which indicates which files to scan for imports.',
    items: {
      type: 'string'
    },
    title: 'Files filter',
    type: 'array'
  },
  quotesStyle: {
    default: 'single',
    description: 'Style of quotes for generated imports.',
    enum: ['single', 'double'],
    title: 'Quotes style',
    type: 'string'
  }
};

/**
 * Activate.
 */

function activate(state) {
  this.subscriptions = new CompositeDisposable();
  this.view = new View(state.viewState, this.addImport.bind(this));
  this.configValues = {
    babylonPlugins: atom.config.get('import-helper.babylonPlugins'),
    directoryFilters: atom.config.get('import-helper.directoryFilters'),
    fileFilters: atom.config.get('import-helper.fileFilters'),
    quotesStyle: atom.config.get('import-helper.quotesStyle')
  };

  this.subscriptions.add(atom.commands.add('atom-workspace', {
    'import-helper:suggest-imports': () => this.suggestImports()
  }));

  this.subscriptions.add(atom.commands.add('atom-text-editor.import-helper.import-helper-priority-1.import-helper-priority-2', {
    'import-helper:confirm': event => {
      return this.view.isVisible() ? this.view.confirmSelection() : event.abortKeyBinding();
    },
    'import-helper:leave': event => {
      return this.view.isVisible() ? this.view.hide() : event.abortKeyBinding();
    },
    'import-helper:move-down': event => {
      return this.view.isVisible() ? this.view.moveSelection(false) : event.abortKeyBinding();
    },
    'import-helper:move-up': event => {
      return this.view.isVisible() ? this.view.moveSelection(true) : event.abortKeyBinding();
    }
  }));

  this.subscriptions.add(atom.workspace.observeTextEditors(editor => {
    if (!editor.isMini()) {
      editor.element.classList.add('import-helper');
      editor.element.classList.add('import-helper-priority-1');
      editor.element.classList.add('import-helper-priority-2');
    }
  }));

  const projectPaths = atom.project.getPaths();

  if (projectPaths.length > 1) {
    console.log('Warning! Project has more than a root path!');
  }

  const projectRootPath = head(projectPaths);

  const process = new BufferedProcess({ // eslint-disable-line no-unused-vars
    args: [require.resolve('./utils/index-imports.js'), projectRootPath, JSON.stringify(this.configValues)],
    command: require.resolve('babel-cli/bin/babel-node.js'),
    exit: async () => this.getSpecifiersDataFromFile(projectRootPath),
    stdout: output => console.log('Index Imports Command: ', output)
  });

  this.getSpecifiersDataFromFile(projectRootPath);
}

/**
 * Get specifiers data from file.
 */

async function getSpecifiersDataFromFile(projectRootPath) {
  const contents = await fs.readFileAsync(path.resolve(`${projectRootPath}/.import-helper-data`));

  this.specifiersMap = JSON.parse(contents);
  this.ready = true;
}

/**
 * Deactivate.
 */

function deactivate() {
  this.subscriptions.dispose();
}

/**
 * Suggest imports.
 */

function suggestImports() {
  if (!this.ready) {
    return;
  }

  if (this.marker) {
    this.marker.destroy();
  }

  const activeTextEditor = atom.workspace.getActiveTextEditor();
  const cursor = activeTextEditor.getLastCursor();

  this.marker = activeTextEditor.markBufferRange(cursor.getCurrentWordBufferRange(), { invalidate: 'touch' });

  activeTextEditor.decorateMarker(this.marker, {
    item: this.view.getElement(),
    position: 'tail',
    type: 'overlay'
  });

  this.view.setSuggestions(this.specifiersMap.filter(({ imported, local }) => {
    const wordUnderCursor = activeTextEditor.getWordUnderCursor();

    return wordUnderCursor === imported || wordUnderCursor === local;
  }));
}

/**
 * Add import.
 */

function addImport(theImport) {
  const activeTextEditor = atom.workspace.getActiveTextEditor();
  const editorContents = activeTextEditor.getText();
  const changedFile = addImportToFileContents(theImport, editorContents, this.configValues);
  const cursorPosition = activeTextEditor.getCursorScreenPosition();

  activeTextEditor.setText(changedFile);
  activeTextEditor.setCursorScreenPosition(cursorPosition);
}

/**
 * Export `AutoImporter`.
 */

export default {
  activate,
  addImport,
  config,
  deactivate,
  getSpecifiersDataFromFile,
  subscriptions: null,
  suggestImports
};
