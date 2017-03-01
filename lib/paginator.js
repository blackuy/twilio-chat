'use strict';

/**
 * @classdesc Pagination helper class
 *
 * @property {Array} items Array of elements on current page
 * @property {boolean} hasNextPage
 * @property {boolean} hasPrevPage
 */

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperties = require('babel-runtime/core-js/object/define-properties');

var _defineProperties2 = _interopRequireDefault(_defineProperties);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Paginator = function () {
  /**
   * @param {Array} items Array of element for current page
   * @param {Object} params
   */
  function Paginator(items, pageSize, anchor, direction, source) {
    (0, _classCallCheck3.default)(this, Paginator);

    var hasNextPage = direction === 'backwards' ? anchor !== 'end' : items.length === pageSize;
    var hasPrevPage = direction === 'backwards' ? items.length === pageSize && items.length > 0 && items[0].index !== 0 : anchor !== 'end';

    var nextPageArgs = hasNextPage ? [pageSize, items[items.length - 1].index, 'forward'] : null;
    var prevPageArgs = hasPrevPage ? [pageSize, items.length > 0 ? items[0].index : 'end', 'backwards'] : null;

    (0, _defineProperties2.default)(this, {
      _source: { value: source },
      _nextPageArgs: { value: nextPageArgs },
      _prevPageArgs: { value: prevPageArgs },

      hasNextPage: { value: hasNextPage, enumerable: true },
      hasPrevPage: { value: hasPrevPage, enumerable: true },
      items: { get: function get() {
          return items;
        }, enumerable: true }
    });
  }

  /**
   * Request next page.
   * Does not modify existing object
   * @return {Promise<Paginator>}
   */


  (0, _createClass3.default)(Paginator, [{
    key: 'nextPage',
    value: function nextPage() {
      return this.hasNextPage ? this._source.apply(null, this._nextPageArgs) : _promise2.default.reject(new Error('No next page for query'));
    }

    /**
     * Request previous page.
     * Does not modify existing object
     * @return {Promise<Paginator>}
     */

  }, {
    key: 'prevPage',
    value: function prevPage() {
      return this.hasPrevPage ? this._source.apply(null, this._prevPageArgs) : _promise2.default.reject(new Error('No prev page for query'));
    }
  }]);
  return Paginator;
}();

module.exports = Paginator;