'use strict';

/**
 * We're using that wersion of JSONdiff instead of vanilla one
 * since vanilla has the bug in path calculation and maintaner doesn't accept the patch.
 * 
 * Should return to the using of original module when situation will change
 */

function JsonDiff() { }

JsonDiff.prototype.toString = Object.prototype.toString;

JsonDiff.prototype.hasOwnProperty = Object.prototype.hasOwnProperty;

JsonDiff.prototype.isArray = function(obj) {
      return this.toString.call(obj) === '[object Array]';
    };

JsonDiff.prototype.isObject = function(obj) {
      return this.toString.call(obj) === '[object Object]';
    };

JsonDiff.prototype.isString = function(obj) {
      return this.toString.call(obj) === '[object String]';
    };

JsonDiff.prototype.isFunction = function(obj) {
      return this.toString.call(obj) === '[object Function]';
    };

JsonDiff.prototype.has = function(obj, key) {
      return hasOwnProperty.call(obj, key);
    };

JsonDiff.prototype.isEqual = function(a, b) {
      return this.eq(a, b, [], []);
    };

JsonDiff.prototype.isContainer = function(obj) {
      return this.isArray(obj) || isObject(obj);
    };

JsonDiff.prototype.isSameContainer = function(obj1, obj2) {
      return (this.isArray(obj1) && this.isArray(obj2)) || (this.isObject(obj1) && this.isObject(obj2));
    };
    
JsonDiff.prototype.eq = function(a, b, aStack, bStack) {
      var aCtor, bCtor, className, key, length, result, size;
      if (a === b) {
        return a !== 0 || 1 / a === 1 / b;
      }
      if (!(a != null) || !(b != null)) {
        return a === b;
      }
      className = this.toString.call(a);
      if (className !== this.toString.call(b)) {
        return false;
      }
      switch (className) {
        case '[object String]':
          return a === String(b);
        case '[object Number]':
          return (a !== +a ? b !== +b : (a === 0 ? 1 / a === 1 / b : a === +b));
        case '[object Date]':
        case '[object Boolean]':
          return +a === +b;
        case '[object RegExp]':
          return a.source === b.source && a.global === b.global && a.multiline === b.multiline && a.ignoreCase === b.ignoreCase;
      }
      if (typeof a !== 'object' || typeof b !== 'object') {
        return false;
      }
      length = aStack.length;
      if ((function() {
        var _results;
        _results = [];
        while (length--) {
          _results.push(aStack[length] === a);
        }
        return _results;
      })()) {
        return bStack[length] === b;
      }
      aStack.push(a);
      bStack.push(b);
      size = 0;
      result = true;
      if (className === '[object Array]') {
        size = a.length;
        result = size === b.length;
        if (result) {
          while (size--) {
            if (!(result = this.eq(a[size], b[size], aStack, bStack))) {
              break;
            }
          }
        }
      } else {
        aCtor = a.constructor;
        bCtor = b.constructor;
        if (aCtor !== bCtor && !(this.isFunction(aCtor) && (aCtor instanceof aCtor) && this.isFunction(bCtor) && (bCtor instanceof bCtor))) {
          return false;
        }
        for (key in a) {
          if (this.has(a, key)) {
            size++;
            if (!(result = this.has(b, key) && this.eq(a[key], b[key], aStack, bStack))) {
              break;
            }
          }
        }
        if (result) {
          for (key in b) {
            if (this.has(b, key) && !(size--)) {
              break;
            }
          }
          result = !size;
        }
      }
      aStack.pop();
      bStack.pop();
      return result;
};

JsonDiff.prototype.getParent = function(paths, path) {
      var parsedPath = path.replace(/\/[^\/]*$/, '');
      if(!parsedPath) {
          parsedPath = '/';
      }
      return paths[parsedPath];
};

JsonDiff.prototype.flattenObject = function(obj, prefix, paths) {
      var i, key, o, _i, _len;
      if (prefix == null) {
        prefix = '/';
      }
      if (paths == null) {
        paths = {};
      }
      paths[prefix] = {
        path: prefix,
        value: obj
      };
      if (prefix !== '/') {
        prefix = prefix + '/';
      }
      if (this.isArray(obj)) {
        for (i = _i = 0, _len = obj.length; _i < _len; i = ++_i) {
          o = obj[i];
          this.flattenObject(o, prefix + i, paths);
        }
      } else if (this.isObject(obj)) {
        for (key in obj) {
          o = obj[key];
          this.flattenObject(o, prefix + key, paths);
        }
      }
      return paths;
};

JsonDiff.prototype.diff = function(obj1, obj2) {
    var add, doc, doc1, doc2, key, key1, key2, keyfrom, keyto, move, patch, paths1, paths2, remove, replace;
    if (!this.isSameContainer(obj1, obj2)) {
      throw new Error('Patches can only be derived from objects or arrays');
    }
    paths1 = this.flattenObject(obj1);
    paths2 = this.flattenObject(obj2);
    add = {};
    remove = {};
    replace = {};
    move = {};
    for (key in paths1) {
      doc1 = paths1[key];
      doc2 = paths2[key];
      if (!this.getParent(paths2, key)) {
        continue;
      } else if (!doc2) {
        remove[key] = doc1;
      } else if (this.isSameContainer(doc1.value, doc2.value)) {
        continue;
      } else if (!this.isEqual(doc1.value, doc2.value)) {
        replace[key] = doc2;
      }
    }
    for (key in paths2) {
      doc1 = paths1[key];
      doc2 = paths2[key];
      if (!doc1 && this.isSameContainer(this.getParent(paths1, key), this.getParent(paths2, key))) {
        add[key] = doc2;
      }
    }
    for (key1 in remove) {
      doc1 = remove[key1];
      for (key2 in add) {
        doc2 = add[key2];
        if (this.isEqual(doc2.value, doc1.value)) {
          delete remove[key1];
          delete add[key2];
          move[key2] = key1;
          break;
        }
      }
    }
    patch = [];
    for (key in add) {
      doc = add[key];
      patch.push({
        op: 'add',
        path: key,
        value: doc.value
      });
    }
    for (key in remove) {
      patch.push({
        op: 'remove',
        path: key
      });
    }
    for (key in replace) {
      doc = replace[key];
      patch.push({
        op: 'replace',
        path: key,
        value: doc.value
      });
    }
    for (keyto in move) {
      keyfrom = move[keyto];
      patch.push({
        op: 'move',
        from: keyfrom,
        path: keyto
      });
    }
    return patch;
};

JsonDiff.diff = function(o1, o2)
{
    var diff = new JsonDiff();
    return diff.diff(o1, o2);
};

JsonDiff.isDeepEqual = function(o1, o2)
{
    return (this.diff(o1, o2).length === 0);
};

module.exports = JsonDiff;

