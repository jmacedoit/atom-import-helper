'use babel';

/**
 * Module dependencies.
 */

import { branch } from '../utils/branch';
import { compose, withProps, withState } from 'recompose';
import { isEmpty, sortBy } from 'lodash';
import React, { Component } from 'react';

/**
 * Styles.
 */

const styles = {
  container: {
    minWidth: 'initial',
    width: 'initial'
  },
  count: {
    marginRight: 8,
    marginTop: -2
  },
  imported: {
    color: '#FA8072',
    fontWeight: 'bold'
  },
  source: {
    fontWeight: 'bold',
    marginRight: '0.5em'
  },
  suggestionContainer: {
    minWidth: 'initial',
    width: 'initial'
  }
};

/**
 * `Suggestions component.
 */

class Suggestions extends Component {

  /**
   * Render suggestion.
   */

  renderSuggestion = ({ count, imported, local, source, type }, index) => {
    const { selected } = this.props;

    if (type !== 'ImportSpecifier' && type !== 'ImportDefaultSpecifier') {
      return null;
    }

    const renderImported = () => {
      if (type === 'ImportDefaultSpecifier') {
        return (
          <span style={styles.imported}>
            {local}
          </span>
        );
      }

      return (
        <span>
          <span>{'{ '}</span>

          <span style={styles.imported}>
            {imported}
          </span>

          {branch(
            local !== imported,
            () => (
              <span>
                {' as '}

                <span style={styles.imported}>
                  {local}
                </span>
              </span>
            ),
            null
          )}

          <span>{' }'}</span>
        </span>
      );
    };

    return (
      <li
        className={index === selected ? 'selected' : undefined}
        style={styles.suggestionContainer}
      >
        <span
          className={'badge'}
          style={styles.count}
        >
          {count}
        </span>

        {renderImported()}

        <span style={styles.from}>{' from '}</span>

        <span style={styles.source}>{`'${source}'`}</span>
      </li>
    );
  }

  /**
   * Hide.
   */

  hide() {
    const { setVisible } = this.props;

    setVisible(false);
  }

  /**
   * Is visible.
   */

  isVisible() {
    return this.props.visible;
  }

  /**
   * Confirm selection.
   */

  confirmSelection() {
    const { addImport, selected, setVisible, suggestions } = this.props;

    if (selected > suggestions.length - 1) {
      return;
    }

    addImport(suggestions[selected]);
    setVisible(false);
  }

  /**
   * Set suggestions.
   */

  moveSelection(up) {
    const { setSelected, selected, suggestions, visible } = this.props;
    const incrementedIndex = up ? selected - 1 : selected + 1;

    setSelected(Math.max(Math.min(incrementedIndex, suggestions.length - 1), 0));

    return visible;
  }

  /**
   * Set suggestions.
   */

  setSuggestions(suggestions) {
    const { setSelected, setSuggestions, setVisible } = this.props;

    setSelected(0);
    setSuggestions(suggestions);
    setVisible(true);
  }

  /**
   * Component did mount.
   */

  componentDidMount() {
    const { setComponent } = this.props;

    setComponent(this);
  }

  /**
   * Render.
   */

  render() {
    const { suggestions, visible } = this.props;

    if (!visible) {
      return null;
    }

    return (
      <div
        className={'select-list popover-list'}
        onKeyPress={this.onKeyPress}
        style={styles.container}
      >
        {branch(
          isEmpty(suggestions),
          () => (
            <small>
              {'No import suggestions available.'}
            </small>
          ),
          () => (
            <ol
              className={'list-group'}
              style={styles.container}
            >
              {suggestions.map(this.renderSuggestion)}
            </ol>
          )
        )}
      </div>
    );
  }
}

/**
 * Export `Suggestions`.
 */

export default compose(
  withState('visible', 'setVisible', false),
  withState('selected', 'setSelected', 0),
  withState('suggestions', 'setSuggestions', []),
  withProps(({ suggestions }) => ({
    suggestions: sortBy([...suggestions], 'count').reverse()
  })),
)(Suggestions);
