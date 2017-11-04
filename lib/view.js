'use babel';

/**
 * Module dependencies.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Suggestions from './components/suggestions';

/**
 * Export class `View`.
 */

export default class View {

  /**
   * Keep suggestions setter.
   */

  setComponent = component => {
    this.component = component;
  }

  /**
   * Set suggestions.
   */

  setSuggestions = suggestions => {
    this.component.setSuggestions(suggestions);
  }

  /**
   * Confirm selection.
   */

  confirmSelection = () => {
    this.component.confirmSelection();
  }

  /**
   * Move selection.
   */

  moveSelection = up => {
    this.component.moveSelection(up);
  }

  /**
   * Is visible.
   */

  isVisible = () => {
    return this.component.isVisible();
  }

  /**
   * Hide.
   */

  hide = () => {
    this.component.hide();
  }

  /**
   * Constructor.
   */

  constructor(state, addImport) {
    this.element = document.createElement('div');

    ReactDOM.render(
      <Suggestions
        addImport={addImport}
        setComponent={this.setComponent}
      />,
      this.element
    );
  }

  /**
   * Get element.
   */

  getElement() {
    return this.element;
  }

  /**
   * Serialize.
   */

  serialize() {}

  /**
   * Destry.
   */

  destroy() {
    this.element.remove();
  }
}
