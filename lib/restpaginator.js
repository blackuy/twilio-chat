'use strict';

/**
 * @class Paginator
 * @classdesc Pagination helper class
 *
 * @property {Array} items Array of elements on current page
 * @property {boolean} hasNextPage Indicates the existence of next page
 * @property {boolean} hasPrevPage Indicates the existence of previous page
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
  /*
  * @constructor
  * @param {Array} items Array of element for current page
  * @param {Object} params
  * @private
  */
  function Paginator(items, source, prevToken, nextToken) {
    (0, _classCallCheck3.default)(this, Paginator);

    (0, _defineProperties2.default)(this, {
      prevToken: { value: prevToken },
      nextToken: { value: nextToken },
      source: { value: source },
      hasNextPage: { value: !!nextToken, enumerable: true },
      hasPrevPage: { value: !!prevToken, enumerable: true },
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
      return this.hasNextPage ? this.source(this.nextToken) : _promise2.default.reject(new Error('No next page'));
    }

    /**
     * Request previous page.
     * Does not modify existing object
     * @return {Promise<Paginator>}
     */

  }, {
    key: 'prevPage',
    value: function prevPage() {
      return this.hasPrevPage ? this.source(this.prevToken) : _promise2.default.reject(new Error('No previous page'));
    }
  }]);
  return Paginator;
}();

module.exports = Paginator;