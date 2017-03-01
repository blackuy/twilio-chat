'use strict';

/**
 * @classdesc Pagination helper class
 *
 * @property {Array} items Array of elements on current page
 * @property {boolean} hasNextPage
 * @property {boolean} hasPrevPage
 */
class Paginator {
  /**
   * @param {Array} items Array of element for current page
   * @param {Object} params
   */
  constructor(items, pageSize, anchor, direction, source) {
    let hasNextPage = direction === 'backwards' ? anchor !== 'end' : items.length === pageSize;
    let hasPrevPage = direction === 'backwards'
      ? items.length === pageSize && (items.length > 0 && items[0].index !== 0)
      : anchor !== 'end';

    let nextPageArgs = hasNextPage ? [pageSize, items[items.length - 1].index, 'forward'] : null;
    let prevPageArgs = hasPrevPage ? [pageSize, (items.length > 0 ? items[0].index : 'end'), 'backwards'] : null;

    Object.defineProperties(this, {
      _source: { value: source },
      _nextPageArgs: { value: nextPageArgs },
      _prevPageArgs: { value: prevPageArgs },

      hasNextPage: { value: hasNextPage, enumerable: true },
      hasPrevPage: { value: hasPrevPage, enumerable: true },
      items: { get: () => items, enumerable: true }
    });
  }

  /**
   * Request next page.
   * Does not modify existing object
   * @return {Promise<Paginator>}
   */
  nextPage() {
    return this.hasNextPage ? this._source.apply(null, this._nextPageArgs)
                            : Promise.reject(new Error('No next page for query'));
  }

  /**
   * Request previous page.
   * Does not modify existing object
   * @return {Promise<Paginator>}
   */
  prevPage() {
    return this.hasPrevPage ? this._source.apply(null, this._prevPageArgs)
                            : Promise.reject(new Error('No prev page for query'));
  }
}

module.exports = Paginator;
