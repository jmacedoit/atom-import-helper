'use babel';

/**
 * Module dependencies.
 */

import Bluebird from 'bluebird';
import fs from 'fs';

/**
 * Export promisified `fs`.
 */

export default Bluebird.promisifyAll(fs);
