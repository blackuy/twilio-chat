'use strict';

/**
 * @class Paginator
 * @classdesc Pagination helper class
 *
 * @property {Array} items Array of elements on current page
 * @property {boolean} hasNextPage Indicates the existence of next page
 * @property {boolean} hasPrevPage Indicates the existence of previous page
 */
class Paginator
{
  /*
  * @constructor
  * @param {Array} items Array of element for current page
  * @param {Object} params
  * @private
  */
  constructor(items, source, prevToken, nextToken) {
    Object.defineProperties(this, {
      prevToken: { value: prevToken },
      nextToken: { value: nextToken },
      source: { value: source },
      hasNextPage: { value: !!nextToken, enumerable: true },
      hasPrevPage: { value: !!prevToken, enumerable: true },
      items: { get: () => items, enumerable: true }
    });
  }

  /**
   * Request next page.
   * Does not modify existing object
   * @return {Promise<Paginator>}
   */
  nextPage() {
    return this.hasNextPage ? this.source(this.nextToken) : Promise.reject(new Error('No next page'));
  }

  /**
   * Request previous page.
   * Does not modify existing object
   * @return {Promise<Paginator>}
   */
  prevPage() {
    return this.hasPrevPage ? this.source(this.prevToken) : Promise.reject(new Error('No previous page'));
  }
}

module.exports = Paginator;
