'use babel';

/**
 * Module dependencies.
 */

import { isFunction } from 'lodash';

/**
 * `resolve`.
 */

function resolve(valueOrFactory: any): any {
  return isFunction(valueOrFactory) ? valueOrFactory() : valueOrFactory;
}

/**
 * Export `branch`.
 */

export function branch<T, F>(condition: boolean, onTrue: (() => T) | T, onFalse: (() => F) | F): T | F {
  return condition ? resolve(onTrue) : resolve(onFalse);
}
