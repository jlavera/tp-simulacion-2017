/**
 *  CSL Parse by CIUVO for avast! Online Security Plugin
 *
 *
 *  AvastWRC.ial.productScan(json_rules, callback_function)
 *
 *
 * Test code for amazon.de product page

AvastWRC.ial.productScan({
    "status":201,
    "csl":"$title = trim(sizzle('span#btAsinTitle', 'textContent'))\r\n$artist = sizzle('.buying > .parseasinTitle + a', 'textContent') or sizzle('.buying>span>a', 'textContent')\r\n$store_id = sizzle('input#storeID', 'value')\r\n$asin = sizzle('form#handleBuy>input#ASIN', 'value')\r\n$isbn = re('<li><b>ISBN-13:</b>\\\\s*([\\\\d-]{14})\\\\s*</li>')\r\n$availability = sizzle('.buying > span[class^=\"avail\"]', 'class')\r\n$availability = re(/avail(.+)$/, 'i', $availability)\r\n$price = sizzle('td .priceLarge', 'textContent') or sizzle('.olpCondLink:first > .price', 'textContent')\r\n$image = sizzle('#main-image', 'src')\r\n\r\n\n$title = $title or sizzle('#product-title', 'textContent')\r\n$price = $price or sizzle('#prices .a-color-price:first', 'textContent')\r\n$artist = $artist or sizzle('#by-line>a:first', 'textContent')\r\n$asin = $asin or sizzle('#addToCart>input[name=\"a\"]', 'value')\r\n$availability = $availability or sizzle('#availability>#scarcity', 'textContent')\r\n$image = $image or sizzle('#aw-image-block .a-image-wrapper>img:first', 'src')\r\n\r\nif ($price == \"GRATIS\") {\r\n  $price = \"\"\r\n}\r\n\r\n$swatcher = sizzle('#jsSwatches')\r\nif ($store_id == 'videogames' and $swatcher) {\r\n  refresh(5000)\r\n}\r\n\r\nrequire $title, $price\r\nreturn $title, $price, $asin, $artist, $store_id, $isbn, $availability, $image",
    "priority":1,
    "version":"1.4.9",
    "plugins":[["CiuvoSearch",{}],["VoucherSearch",{}]],
    "match":"http://(\\w+\\.)?amazon\\.de"
}, function(response){
  console.log("RESULT", response);
});

 *
 */

(function(jQuery) {
  if(typeof(AvastWRC) === 'undefined') AvastWRC = { ial : {} };

  AvastWRC.ial.productScan = function(json, callback){
    console.log('productscan called');

    var com = {ciuvo : {}};

  // START CIUVO PARSER

  com.ciuvo.cslrunner = function() {
    var CSL_CACHE = [];
    var DEFAULT_CSL = "require $noop\nreturn $noop";
    var CSLRunner = function(csl_code, plugins) {
      this.csl_code = csl_code;
      if(typeof csl_code !== "string") {
        throw"CSL code must be string.";
      }
      this.plugins = plugins;
      this.create_csl()
    };
    var get_csl = function(url) {
      var now = new Date;
      for(var i = 0, l = CSL_CACHE.length;i < l;i++) {
        var config = CSL_CACHE[i];
        var expired = now - config.added > com.ciuvo.setting("csl_expiry_ms");
        if(!expired && config.match.test(url)) {
          return config.csl
        }
      }
      return undefined
    };
    var set_csl = function(priority, csl_code, match, plugins) {
      var csl = new com.ciuvo.cslrunner.CSLRunner(csl_code, plugins);
      CSL_CACHE.push({priority:priority, match:new RegExp(match), csl:csl, plugins:plugins, added:new Date});
      CSL_CACHE.sort(function(a, b) {
        return a.priority - b.priority
      });
      return csl
    };
    var set_default_csl = function(url) {
      return com.ciuvo.cslrunner.set_csl(0, DEFAULT_CSL, url)
    };
    return{CSLRunner:CSLRunner, get_csl:get_csl, set_csl:set_csl, set_default_csl:set_default_csl}
  }();
  com.ciuvo.csl = function() {
    function objectEquals(a, b) {
      if(a === null || b === null) {
        if(a === b) {
          return true
        }else {
          return false
        }
      }
      if(a === undefined || b === undefined) {
        if(a === b) {
          return true
        }else {
          return false
        }
      }
      for(var p in b) {
        if(p[0] == "_") {
          continue
        }
        if(!a.hasOwnProperty(p)) {
          return false
        }
      }
      for(var p in a) {
        if(p[0] == "_") {
          continue
        }
        if(!b.hasOwnProperty(p)) {
          return false
        }
        if(a[p]) {
          switch(typeof a[p]) {
            case "object":
              if(!objectEquals(a[p], b[p])) {
                return false
              }
              break;
            default:
              if(a[p] !== b[p]) {
                return false
              }
          }
        }else {
          if(b[p]) {
            return false
          }
        }
      }
      return true
    }
    function Timer(callback, delay) {
      var timerId, start, remaining = delay;
      this.pause = function() {
        window.clearTimeout(timerId);
        remaining -= new Date - start
      };
      this.resume = function() {
        start = new Date;
        timerId = window.setTimeout(function() {
          callback()
        }, remaining)
      };
      this.cancel = function() {
        window.clearTimeout(timerId)
      };
      this.resume()
    }
    var TypeError = function(message) {
      this.message = message;
      this.name = "TypeError"
    };
    var ValueError = function(message) {
      this.message = message;
      this.name = "ValueError"
    };
    var RequireError = function(message) {
      this.message = message;
      this.name = "RequireError"
    };
    RequireError.prototype.getMessage = function() {
      return this.name + ": " + this.message
    };
    var InterpreterError = function(message) {
      this.message = message;
      this.name = "InterpreterError"
    };
    var InterruptException = function() {
      this.name = "InterruptException"
    };
    var Interpreter = function(doc, window, return_callback, error_callback) {
      this.doc = doc;
      this.window = window;
      this.ret = {};
      this.id = Interpreter.id++;
      this.first_run = true;
      var self = this;
      this.return_callback = function(result) {
        return_callback(result, self.getCurrentContext())
      };
      this.error_callback = function(error) {
        var context = self.getCurrentContext();
        if(context._modified) {
          error_callback(error, context)
        }
      }
    };
    Interpreter.id = 0;
    Interpreter.prototype.InterpreterError = InterpreterError;
    Interpreter.prototype.RequireError = RequireError;
    Interpreter.prototype.interpretNext = function() {
      var stmt_stack = this.stmt_stack;
      if(stmt_stack.length > 0) {
        try {
          var stmt = stmt_stack.pop();
          this.current_stmt = stmt;
          stmt.interpret(this);
          this.interpretNext()
        }catch(e) {
          if(e instanceof InterruptException) {
            stmt_stack.push(stmt)
          }else {
            this.error_callback.call(this, e)
          }
        }
      }
    };
    Interpreter.prototype.getCurrentContext = function() {
      var context = {"_refresh":this.refresh_timer !== undefined};
      for(var name in this.variables) {
        var varname = name.substring(1);
        context[varname] = this.variables[name]
      }
      if(this.previousContext === undefined) {
        context._modified = true
      }else {
        context._modified = !objectEquals(this.previousContext, context)
      }
      return context
    };
    Interpreter.prototype.interpret = function(ast) {
      if(this.first_run) {
        this.previousContext = undefined;
        this.first_run = false
      }else {
        this.previousContext = this.getCurrentContext()
      }
      this.variables = {};
      this.temp = {};
      this.stmt_stack = [];
      this.ast = ast;
      this.refresh_timer = undefined;
      this.wait_timer = undefined;
      ast.interpret(this)
    };
    Interpreter.prototype.pause_timers = function(ast) {
      if(this.refresh_timer) {
        this.refresh_timer.pause()
      }
      if(this.wait_timer) {
        this.wait_timer.pause()
      }
    };
    Interpreter.prototype.resume_timers = function(ast) {
      if(this.refresh_timer) {
        this.refresh_timer.resume()
      }
      if(this.wait_timer) {
        this.wait_timer.resume()
      }
    };
    Interpreter.prototype.close = function(ast) {
      if(this.refresh_timer) {
        this.refresh_timer.cancel()
      }
      if(this.wait_timer) {
        this.wait_timer.cancel()
      }
    };
    Interpreter.prototype.function_table = {"const":function(value) {
      return value
    }, sizzle:function() {
      var args = Array.prototype.slice.call(arguments);
      var selector = args[0];
      var attribute;
      var cssSelector;
      var elem_array;
      if(args.length > 1) {
        attribute = args[1]
      }
      try {
        cssSelector = jQuery
      }catch(e) {
        throw new InterpreterError("jQuery not available under com.ciuvo.jQuery.");
      }
      try {
        elem_array = cssSelector(selector, this.doc)
      }catch(e) {
        throw new InterpreterError("CSS Selector - " + e);
      }
      if(elem_array.length === 0) {
        return""
      }else {
        var res = [];
        for(var i = 0;i < elem_array.length;i++) {
          var elem = elem_array[i];
          var value = "";
          if(attribute) {
            if(attribute == "textContent") {
              value = elem.textContent || elem.innerText
            }else {
              value = elem.getAttribute(attribute)
            }
          }else {
            value = elem.innerHTML
          }
          res.push(value)
        }
        if(res.length == 1) {
          return res[0]
        }else {
          return res
        }
      }
    }, debug:function() {
      var args = Array.prototype.slice.call(arguments);
      if(com && com.ciuvo && com.ciuvo.log) {
        com.ciuvo.log(args)
      }
      return undefined
    }, httpGet:function(url) {
      var temp = this.temp;
      var expr_id = "__httpGet__" + url;
      if(expr_id in temp) {
        var value = temp[expr_id];
        delete temp[expr_id];
        return value
      }else {
        var req = new com.ciuvo.AjaxRequest("GET", url);
        var self = this;
        req.set_onreadystatechange(function(e) {
          var value = null;
          if(req.req.readyState == 4) {
            if(req.req.status == 200) {
              value = req.req.responseText
            }
            temp[expr_id] = value;
            self.interpretNext()
          }
        });
        req.set_onerror(function(e) {
          temp[expr_id] = null;
          self.interpretNext()
        });
        req.send(null);
        throw new InterruptException;
      }
    }, join:function(values, joiner) {
      return values.join(joiner)
    }, len:function(value) {
      if(value.hasOwnProperty("length")) {
        return value.length
      }else {
        return undefined
      }
    }, re:function() {
      var args = arguments;
      var mycontent = this.doc.documentElement.innerHTML;
      var regexp = args[0];
      var flags = "";
      if(args.length >= 2) {
        flags = args[1]
      }
      if(args.length == 3) {
        mycontent = args[2]
      }
      if(args.length > 3) {
        throw new ValueError("'re' expression expects 3 arguments at most.");
      }
      if(!mycontent) {
        return""
      }
      if(typeof mycontent !== "string") {
        try {
          mycontent = mycontent.toString()
        }catch(e) {
          throw new ValueError("'re' block argument has no 'toString'.");
        }
      }
      mycontent = mycontent.replace(/(\r|\n)/ig, "");
      if(regexp instanceof RegExp) {
        regexp = regexp.source
      }
      regexp = regexp.replace(/"([^?])/ig, '"?$1');
      if(flags.search("i") == -1) {
        flags += "i"
      }
      regexp = new RegExp(regexp, flags);
      var m = mycontent.match(regexp);
      if(!m) {
        return""
      }else {
        if(flags.search("g") != -1) {
          return m
        }else {
          if(m.length == 1) {
            return true
          }else {
            return m[1]
          }
        }
      }
    }, refresh:function(interval) {
      var self = this;
      if(interval === undefined) {
        throw new ValueError("refresh interval argument required.");
      }
      interval = parseInt(interval, 10);
      if(interval < 1E3) {
        throw new ValueError("interval must be at least 1000.");
      }
      if(this.refresh_timer) {
        this.refresh_timer.cancel()
      }
      var timer = new Timer(function() {
        self.interpret(self.ast)
      }, interval);
      this.refresh_timer = timer
    }, replace:function() {
      var args = Array.prototype.slice.call(arguments);
      var value = args.shift();
      if(typeof value !== "string") {
        throw new TypeError("First argument must be of type string.");
      }
      if(args.length === 0 || args.length % 2 !== 0) {
        throw new ValueError("ReplaceExpression got wrong number of args.");
      }
      args.reverse();
      var i = 2;
      while(args.length > 0) {
        var regexp = args.pop();
        if(regexp instanceof RegExp) {
          regexp = regexp.source
        }
        var replace_str = args.pop();
        try {
          regexp = new RegExp(regexp, "gi")
        }catch(e) {
          throw new ValueError("Cannot create RegExp for " + regexp);
        }
        i += 2;
        value = value.replace(regexp, replace_str)
      }
      return value
    }, trim:function(value) {
      if(typeof value == "string") {
        value = value.replace(/\s+/gi, " ");
        value = value.replace(/^\s/i, "").replace(/\s$/i, "")
      }
      return value
    }, url:function() {
      var doc = this.doc;
      try {
        var url = doc.location.href;
        return url
      }catch(e) {
        throw new InterpreterError("'doc' has no property 'location.href'.");
      }
    }, urlParam:function(param_name) {
      var doc = this.doc;
      var url;
      try {
        url = doc.location.href
      }catch(e) {
        throw new InterpreterError("'doc' has no property 'location.href'.");
      }
      var qs = url.slice(url.indexOf("?") + 1).split("&");
      var vars = {};
      for(var i = 0, l = qs.length;i < l;i++) {
        var pair = qs[i].split("=");
        vars[pair[0]] = pair[1]
      }
      return vars[param_name]
    }, version:function() {
      if(com.ciuvo.csl.parser) {
        return com.ciuvo.csl.parser.VERSION
      }else {
        return undefined
      }
    }, at_least_version:function(value) {
      if(!com.ciuvo.csl.parser) {
        throw new InterpreterError("CSL Parser not in namespace. ");
      }
      function parseVersionString(str) {
        if(typeof str != "string") {
          return false
        }
        var x = str.split(".");
        var maj = parseInt(x[0], 10) || 0;
        var min = parseInt(x[1], 10) || 0;
        var pat = parseInt(x[2], 10) || 0;
        return{major:maj, minor:min, patch:pat}
      }
      var given_version = parseVersionString(value);
      var running_version = parseVersionString(com.ciuvo.csl.parser.VERSION);
      if(running_version.major != given_version.major) {
        return running_version.major > given_version.major
      }else {
        if(running_version.minor != given_version.minor) {
          return running_version.minor > given_version.minor
        }else {
          if(running_version.patch != given_version.patch) {
            return running_version.patch > given_version.patch
          }else {
            return true
          }
        }
      }
    }, wait:function(delay) {
      var self = this;
      if(!("wait_token" in this.temp)) {
        delay = parseInt(delay, 10);
        if(delay < 0) {
          throw new ValueError("Delay must be larger than 0.");
        }
        window.setTimeout(function() {
          self.temp.wait_token = null;
          self.interpretNext()
        }, delay);
        throw new InterruptException;
      }
      delete this.temp.wait_token
    }, xpath:function(value) {
      var doc = this.doc;
      if(!("evaluate" in doc)) {
        throw new InterpreterError("DOM doc object has no 'evaluate' function.");
      }
      var xresult = null;
      try {
        xresult = doc.evaluate(value, doc, null, 2, null)
      }catch(e) {
        throw new InterpreterError(e);
      }
      if(xresult) {
        return xresult.stringValue
      }else {
        return""
      }
    }};
    return{TypeError:TypeError, ValueError:ValueError, InterruptException:InterruptException, Interpreter:Interpreter}
  }();
  
  com.ciuvo.csl.parser = function() {
    function peg$subclass(child, parent) {
        function ctor() {
            this.constructor = child;
        }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor;
    }

    function SyntaxError(message, expected, found, offset, line, column) {
        this.message = message;
        this.expected = expected;
        this.found = found;
        this.offset = offset;
        this.line = line;
        this.column = column;
        this.name = "SyntaxError";
    }
    peg$subclass(SyntaxError, Error);

    function parse(input) {
        var options = arguments.length > 1 ? arguments[1] : {},
            peg$FAILED = {},
            peg$startRuleIndices = {
                start: 0
            },
            peg$startRuleIndex = 0,
            peg$consts = [peg$FAILED, function(program) {
                    return program;
                }, {
                    type: "any",
                    description: "any character"
                }, {
                    type: "other",
                    description: "whitespace"
                }, /^[\t\x0B\f \xA0\uFEFF]/, {
                    type: "class",
                    value: "[\\t\\x0B\\f \\xA0\\uFEFF]",
                    description: "[\\t\\x0B\\f \\xA0\\uFEFF]"
                }, /^[\n\r\u2028\u2029]/, {
                    type: "class",
                    value: "[\\n\\r\\u2028\\u2029]",
                    description: "[\\n\\r\\u2028\\u2029]"
                }, {
                    type: "other",
                    description: "end of line"
                }, "\n", {
                    type: "literal",
                    value: "\n",
                    description: '"\\n"'
                }, "\r\n", {
                    type: "literal",
                    value: "\r\n",
                    description: '"\\r\\n"'
                }, "\r", {
                    type: "literal",
                    value: "\r",
                    description: '"\\r"'
                }, "\u2028", {
                    type: "literal",
                    value: "\u2028",
                    description: '"\\u2028"'
                }, "\u2029", {
                    type: "literal",
                    value: "\u2029",
                    description: '"\\u2029"'
                }, {
                    type: "other",
                    description: "comment"
                }, "/*", {
                    type: "literal",
                    value: "/*",
                    description: '"/*"'
                },
                [], void 0, "*/", {
                    type: "literal",
                    value: "*/",
                    description: '"*/"'
                }, "//", {
                    type: "literal",
                    value: "//",
                    description: '"//"'
                }, "$", {
                    type: "literal",
                    value: "$",
                    description: '"$"'
                },
                /^[ \xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000]/, {
                    type: "class",
                    value: "[ \\xA0\\u1680\\u180E\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200A\\u202F\\u205F\\u3000]",
                    description: "[ \\xA0\\u1680\\u180E\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200A\\u202F\\u205F\\u3000]"
                }, "}", {
                    type: "literal",
                    value: "}",
                    description: '"}"'
                }, {
                    type: "other",
                    description: "Statement"
                }, {
                    type: "other",
                    description: "Assignment Statement"
                },
                null,
                function(variable, accessor, operator, value) {
                    return {
                        type: "AssignmentStatement",
                        variable: variable,
                        accessor: accessor,
                        operator: operator,
                        value: value,
                        interpret: function(interpreter) {
                            var value = this.value.interpret(interpreter);
                            if (this.operator != "=") {
                                var var_value = this.variable.interpret(interpreter);
                                value = binaryOperator(var_value, this.operator.substring(
                                    0, 1), value);
                            }
                            if (this.accessor !== null) {
                                var index = accessor.interpret(interpreter);
                                var var_value = this.variable.interpret(interpreter);
                                index = absolute_index(index, var_value);
                                interpreter.variables[this.variable.identifier][index] =
                                    value;
                            } else {
                                interpreter.variables[this.variable.identifier] =
                                    value;
                            }
                        },
                        accept: function(visitor) {
                            visitor.visitAssignmentStatement(this);
                        }
                    };
                }, {
                    type: "other",
                    description: "Assignment Operator"
                }, "=", {
                    type: "literal",
                    value: "=",
                    description: '"="'
                },
                function() {
                    return "=";
                }, "*=", {
                    type: "literal",
                    value: "*=",
                    description: '"*="'
                }, "/=", {
                    type: "literal",
                    value: "/=",
                    description: '"/="'
                }, "%=", {
                    type: "literal",
                    value: "%=",
                    description: '"%="'
                }, "+=", {
                    type: "literal",
                    value: "+=",
                    description: '"+="'
                }, "-=", {
                    type: "literal",
                    value: "-=",
                    description: '"-="'
                }, /^[a-zA-Z0-9_]/, {
                    type: "class",
                    value: "[a-zA-Z0-9_]",
                    description: "[a-zA-Z0-9_]"
                },
                function(start, name) {
                    return {
                        type: "VariableExpression",
                        identifier: start + name.join(""),
                        interpret: function(interpreter) {
                            if (!(this.identifier in interpreter.variables)) {
                                throw new interpreter.InterpreterError("Variable " +
                                    this.identifier + " not defined.");
                            }
                            var value = interpreter.variables[this.identifier];
                            return value;
                        },
                        accept: function(visitor) {
                            return visitor.visitVariableExpression(this);
                        }
                    };
                }, ",", {
                    type: "literal",
                    value: ",",
                    description: '","'
                },
                function(head, tail) {
                    var vars = [head];
                    for (var i = 0; i < tail.length; i++) {
                        vars.push(tail[i][3]);
                    }
                    return vars;
                },
                function(expr) {
                    return {
                        type: "StatementExpression",
                        expr: expr,
                        interpret: function(interpreter) {
                            this.expr.interpret(interpreter);
                        },
                        accept: function(visitor) {
                            return visitor.visitStatementExpression(this);
                        }
                    };
                }, {
                    type: "other",
                    description: "Block"
                }, "{", {
                    type: "literal",
                    value: "{",
                    description: '"{"'
                },
                function(statements) {
                    return {
                        type: "Block",
                        statements: statements !== null ? statements[0] : [],
                        interpret: function(interpreter) {
                            for (var i = this.statements.length - 1; i >= 0; i--) {
                                interpreter.stmt_stack.push(this.statements[i]);
                            }
                        },
                        accept: function(visitor) {
                            visitor.visitBlock(this);
                        }
                    };
                },
                function(head, tail) {
                    var result = [head];
                    for (var i = 0; i < tail.length; i++) {
                        result.push(tail[i][1]);
                    }
                    return result;
                }, {
                    type: "other",
                    description: "No-op Statement"
                }, ";", {
                    type: "literal",
                    value: ";",
                    description: '";"'
                },
                function() {
                    return {
                        type: "EmptyStatement",
                        interpret: function(interpreter) {},
                        accept: function(visitor) {
                            visitor.visitEmptyStatement(this);
                        }
                    };
                }, {
                    type: "other",
                    description: "For-In Loop"
                }, "(", {
                    type: "literal",
                    value: "(",
                    description: '"("'
                }, ")", {
                    type: "literal",
                    value: ")",
                    description: '")"'
                },
                function(iterator, collection, statement) {
                    return {
                        type: "ForInStatement",
                        iterator: iterator,
                        collection: collection,
                        statement: statement,
                        interpret: function(interpreter) {
                            var collection = this.collection.interpret(interpreter);
                            var statement = this.statement;
                            if (!collection.hasOwnProperty("length")) {
                                throw new interpreter.InterpreterError(
                                    "ForIn Loop only on Arrays or Strings.");
                            }
                            var i = 0;
                            var iteratorid = this.iterator.identifier;

                            function LoopClosure() {
                                this.type = "LoopClosure";
                            }
                            LoopClosure.prototype.interpret = function(interpreter) {
                                if (i < collection.length) {
                                    interpreter.variables[iteratorid] = collection[
                                        i];
                                    i += 1;
                                    interpreter.stmt_stack.push(this);
                                    interpreter.stmt_stack.push(statement);
                                }
                            };
                            interpreter.stmt_stack.push(new LoopClosure);
                        },
                        accept: function(visitor) {
                            visitor.visitForInStatement(this);
                        }
                    };
                }, {
                    type: "other",
                    description: "If Statement"
                },
                function(condition, if_statement, else_statement) {
                    return {
                        type: "IfStatement",
                        condition: condition,
                        if_statement: if_statement,
                        else_statement: else_statement,
                        interpret: function(interpreter) {
                            if (this.condition.interpret(interpreter)) {
                                interpreter.stmt_stack.push(this.if_statement);
                            } else {
                                if (this.else_statement !== null) {
                                    interpreter.stmt_stack.push(this.else_statement[2]);
                                }
                            }
                        },
                        accept: function(visitor) {
                            visitor.visitIfStatement(this);
                        }
                    };
                }, {
                    type: "other",
                    description: "Require Statement"
                },
                function(vars) {
                    return {
                        type: "RequireStatement",
                        vars: vars,
                        interpret: function(interpreter) {
                            for (var i = 0; i < this.vars.length; i++) {
                                var identifier = this.vars[i].identifier;
                                var value = this.vars[i].interpret(interpreter);
                                if (!value) {
                                    interpreter.error_callback.call(this, new interpreter
                                        .RequireError("Variable " + identifier +
                                            " required."));
                                    while (interpreter.stmt_stack.length > 0) {
                                        interpreter.stmt_stack.pop();
                                    }
                                    interpreter.ret = undefined;
                                    break;
                                }
                            }
                        },
                        accept: function(visitor) {
                            visitor.visitRequireStatement(this);
                        }
                    };
                }, {
                    type: "other",
                    description: "Return Statement"
                },
                function(vars) {
                    return {
                        type: "ReturnStatement",
                        vars: vars,
                        interpret: function(interpreter) {
                            var different = false;
                            var var_identifiers = {};
                            var i = this.vars.length - 1;
                            while (i >= 0) {
                                var_identifiers[this.vars[i].identifier] = true;
                                i = i - 1;
                            }
                            if (interpreter.ret === undefined) {
                                interpreter.ret = {};
                            }
                            var i = this.vars.length - 1;
                            while (i >= 0) {
                                var variable = this.vars[i];
                                var value = variable.interpret(interpreter);
                                var identifier = variable.identifier.substring(1);
                                if (!(identifier in interpreter.ret && compare(
                                        interpreter.ret[identifier], value))) {
                                    different = true;
                                    interpreter.ret[identifier] = value;
                                }
                                i = i - 1;
                            }
                            var n_vars_ret = 0;
                            for (var prop in interpreter.ret) {
                                n_vars_ret += 1;
                            }
                            var n_vars = 0;
                            for (var prop in var_identifiers) {
                                n_vars += 1;
                            }
                            if (n_vars != n_vars_ret) {
                                different = true;
                            }
                            if (different) {
                                interpreter.return_callback.call(interpreter.return_callback,
                                    interpreter.ret);
                            } else {}
                        },
                        accept: function(visitor) {
                            visitor.visitReturnStatement(this);
                        }
                    };
                },
                function(expression) {
                    return expression;
                }, /^[a-zA-Z_]/, {
                    type: "class",
                    value: "[a-zA-Z_]",
                    description: "[a-zA-Z_]"
                },
                function(name) {
                    return name.join("");
                },
                function(func_name, arg_exprs) {
                    return {
                        type: "CallExpression",
                        func_name: func_name,
                        arg_exprs: arg_exprs !== null ? arg_exprs : [],
                        interpret: function(interpreter) {
                            var args = [];
                            for (var i = 0; i < this.arg_exprs.length; i++) {
                                var val = this.arg_exprs[i].interpret(interpreter);
                                args.push(val);
                            }
                            var func = interpreter.function_table[this.func_name];
                            if (!func) {
                                return undefined;
                            }
                            return func.apply(interpreter, args);
                        },
                        accept: function(visitor) {
                            return visitor.visitCallExpression(this);
                        }
                    };
                },
                function(head, tail) {
                    var args = [head];
                    for (var i = 0; i < tail.length; i++) {
                        args.push(tail[i][3]);
                    }
                    return args;
                }, "[", {
                    type: "literal",
                    value: "[",
                    description: '"["'
                }, "]", {
                    type: "literal",
                    value: "]",
                    description: '"]"'
                },
                function(index) {
                    return index;
                },
                function(value, index) {
                    return {
                        type: "AccessorExpression",
                        value: value,
                        index: index,
                        interpret: function(interpreter) {
                            var value = this.value.interpret(interpreter);
                            var index = this.index.interpret(interpreter);
                            index = absolute_index(index, value);
                            return value[index];
                        },
                        accept: function(visitor) {
                            return visitor.visitAccessorExpression(this);
                        }
                    };
                },
                function(operator, expression) {
                    return {
                        type: "UnaryExpression",
                        operator: operator,
                        expression: expression,
                        interpret: function(interpreter) {
                            var val = this.expression.interpret(interpreter);
                            return unaryOperator(this.operator, val);
                        },
                        accept: function(visitor) {
                            return visitor.visitUnaryExpression(this);
                        }
                    };
                }, "+", {
                    type: "literal",
                    value: "+",
                    description: '"+"'
                }, "-", {
                    type: "literal",
                    value: "-",
                    description: '"-"'
                }, "~", {
                    type: "literal",
                    value: "~",
                    description: '"~"'
                }, "not", {
                    type: "literal",
                    value: "not",
                    description: '"not"'
                },
                function(head, tail) {
                    var result = head;
                    for (var i = 0; i < tail.length; i++) {
                        result = {
                            type: "MultiplicativeExpression",
                            operator: tail[i][1],
                            left: result,
                            right: tail[i][3],
                            interpret: function(interpreter) {
                                var left = this.left.interpret(interpreter);
                                var right = this.right.interpret(interpreter);
                                return binaryOperator(left, this.operator, right);
                            },
                            accept: function(visitor) {
                                return visitor.visitMultiplicativeExpression(this);
                            }
                        };
                    }
                    return result;
                }, "*", {
                    type: "literal",
                    value: "*",
                    description: '"*"'
                }, "/", {
                    type: "literal",
                    value: "/",
                    description: '"/"'
                }, "%", {
                    type: "literal",
                    value: "%",
                    description: '"%"'
                },
                function(operator) {
                    return operator;
                },
                function(head, tail) {
                    var result = head;
                    for (var i = 0; i < tail.length; i++) {
                        result = {
                            type: "AdditiveExpression",
                            operator: tail[i][1],
                            left: result,
                            right: tail[i][3],
                            interpret: function(interpreter) {
                                var left = this.left.interpret(interpreter);
                                var right = this.right.interpret(interpreter);
                                return binaryOperator(left, this.operator, right);
                            },
                            accept: function(visitor) {
                                return visitor.visitAdditiveExpression(this);
                            }
                        };
                    }
                    return result;
                },
                function() {
                    return "+";
                },
                function() {
                    return "-";
                },
                function(head, tail) {
                    var result = head;
                    for (var i = 0; i < tail.length; i++) {
                        result = {
                            type: "RelationalExpression",
                            operator: tail[i][1],
                            left: result,
                            right: tail[i][3],
                            interpret: function(interpreter) {
                                var left = this.left.interpret(interpreter);
                                var right = this.right.interpret(interpreter);
                                return binaryOperator(left, this.operator, right);
                            },
                            accept: function(visitor) {
                                return visitor.visitRelationalExpression(this);
                            }
                        };
                    }
                    return result;
                }, "<=", {
                    type: "literal",
                    value: "<=",
                    description: '"<="'
                }, ">=", {
                    type: "literal",
                    value: ">=",
                    description: '">="'
                }, "<", {
                    type: "literal",
                    value: "<",
                    description: '"<"'
                }, ">", {
                    type: "literal",
                    value: ">",
                    description: '">"'
                },
                function(head, tail) {
                    var result = head;
                    for (var i = 0; i < tail.length; i++) {
                        result = {
                            type: "EqualsExpression",
                            operator: tail[i][1],
                            left: result,
                            right: tail[i][3],
                            interpret: function(interpreter) {
                                var left_val = this.left.interpret(interpreter);
                                var right_val = this.right.interpret(interpreter);
                                return left_val == right_val;
                            },
                            accept: function(visitor) {
                                return visitor.visitEqualsExpression(this);
                            }
                        };
                    }
                    return result;
                }, "==", {
                    type: "literal",
                    value: "==",
                    description: '"=="'
                },
                function() {
                    return "==";
                },
                function(head, tail) {
                    var result = head;
                    for (var i = 0; i < tail.length; i++) {
                        result = {
                            type: "LogicalANDExpression",
                            operator: tail[i][1],
                            left: result,
                            right: tail[i][3],
                            interpret: function(interpreter) {
                                var left = this.left.interpret(interpreter);
                                if (!left) {
                                    return false;
                                } else {
                                    return this.right.interpret(interpreter);
                                }
                            },
                            accept: function(visitor) {
                                return visitor.visitLogicalANDExpression(this);
                            }
                        };
                    }
                    return result;
                },
                function(head, tail) {
                    var result = head;
                    for (var i = 0; i < tail.length; i++) {
                        result = {
                            type: "LogicalORExpression",
                            operator: tail[i][1],
                            left: result,
                            right: tail[i][3],
                            interpret: function(interpreter) {
                                var left = this.left.interpret(interpreter);
                                if (left) {
                                    return left;
                                } else {
                                    return this.right.interpret(interpreter);
                                }
                            },
                            accept: function(visitor) {
                                return visitor.visitLogicalORExpression(this);
                            }
                        };
                    }
                    return result;
                },
                function(elements) {
                    return {
                        type: "ArrayLiteral",
                        elements: elements !== null ? elements : [],
                        interpret: function(interpreter) {
                            var res = new Array;
                            for (var i = 0; i < this.elements.length; i++) {
                                res.push(this.elements[i].interpret(interpreter));
                            }
                            return res;
                        },
                        accept: function(visitor) {
                            return visitor.visitArrayLiteral(this);
                        }
                    };
                }, {
                    type: "other",
                    description: "regex"
                },
                function(value_) {
                    return {
                        type: "RegexLiteral",
                        value: value_,
                        interpret: function(interpreter) {
                            return this.value;
                        },
                        accept: function(visitor) {
                            return visitor.visitRegularExpressionLiteral(this);
                        }
                    };
                },
                function() {
                    return {
                        type: "NullLiteral",
                        value: null,
                        interpret: function(interpreter) {
                            return this.value;
                        },
                        accept: function(visitor) {
                            return visitor.visitNullLiteral(this);
                        }
                    };
                },
                function() {
                    return {
                        type: "BooleanLiteral",
                        value: true,
                        interpret: function(interpreter) {
                            return this.value;
                        },
                        accept: function(visitor) {
                            return visitor.visitBooleanLiteral(this);
                        }
                    };
                },
                function() {
                    return {
                        type: "BooleanLiteral",
                        value: false,
                        interpret: function(interpreter) {
                            return this.value;
                        },
                        accept: function(visitor) {
                            return visitor.visitBooleanLiteral(this);
                        }
                    };
                }, {
                    type: "other",
                    description: "number"
                },
                function(value) {
                    return {
                        type: "NumericLiteral",
                        value: value,
                        interpret: function(interpreter) {
                            return this.value;
                        },
                        accept: function(visitor) {
                            return visitor.visitNumericLiteral(this);
                        }
                    };
                }, ".", {
                    type: "literal",
                    value: ".",
                    description: '"."'
                },
                function(before, after, exponent) {
                    return parseFloat(before + "." + after + exponent);
                },
                function(after, exponent) {
                    return parseFloat("." + after + exponent);
                },
                function(before, exponent) {
                    return parseFloat(before + exponent);
                }, "0", {
                    type: "literal",
                    value: "0",
                    description: '"0"'
                },
                function(digit, digits) {
                    return digit + digits;
                },
                function(digits) {
                    return digits.join("");
                }, /^[0-9]/, {
                    type: "class",
                    value: "[0-9]",
                    description: "[0-9]"
                }, /^[1-9]/, {
                    type: "class",
                    value: "[1-9]",
                    description: "[1-9]"
                },
                function(indicator, integer) {
                    return indicator + integer;
                }, /^[eE]/, {
                    type: "class",
                    value: "[eE]",
                    description: "[eE]"
                }, /^[\-+]/, {
                    type: "class",
                    value: "[\\-+]",
                    description: "[\\-+]"
                },
                function(sign, digits) {
                    return sign + digits;
                }, /^[xX]/, {
                    type: "class",
                    value: "[xX]",
                    description: "[xX]"
                },
                function(digits) {
                    return parseInt("0x" + dgits.join(""));
                }, /^[0-9a-fA-F]/, {
                    type: "class",
                    value: "[0-9a-fA-F]",
                    description: "[0-9a-fA-F]"
                }, {
                    type: "other",
                    description: "string"
                }, '"', {
                    type: "literal",
                    value: '"',
                    description: '"\\""'
                }, "'", {
                    type: "literal",
                    value: "'",
                    description: '"\'"'
                },
                function(parts) {
                    return {
                        type: "StringLiteral",
                        value: parts[1] || "",
                        quote: parts[0],
                        interpret: function(interpreter) {
                            return this.value;
                        },
                        accept: function(visitor) {
                            return visitor.visitStringLiteral(this);
                        }
                    };
                },
                function(chars) {
                    return chars.join("");
                }, "\\", {
                    type: "literal",
                    value: "\\",
                    description: '"\\\\"'
                },
                function(char_) {
                    return char_;
                },
                function(sequence) {
                    return sequence;
                },
                function(slash) {
                    return slash;
                },
                function(sequence) {
                    return sequence;
                },
                function() {
                    return "\x00";
                }, /^['"\\bfnrtv]/, {
                    type: "class",
                    value: "['\"\\\\bfnrtv]",
                    description: "['\"\\\\bfnrtv]"
                },
                function(char_) {
                    return char_.replace("b", "\b").replace("f", "\f").replace("n", "\n").replace(
                        "r", "\r").replace("t", "\t").replace("v", "\x0B");
                },
                function(char_) {
                    return char_;
                }, "x", {
                    type: "literal",
                    value: "x",
                    description: '"x"'
                }, "u", {
                    type: "literal",
                    value: "u",
                    description: '"u"'
                },
                function(h1, h2) {
                    return String.fromCharCode(parseInt("0x" + h1 + h2));
                },
                function(h1, h2, h3, h4) {
                    return String.fromCharCode(parseInt("0x" + h1 + h2 + h3 + h4));
                }, "and", {
                    type: "literal",
                    value: "and",
                    description: '"and"'
                }, "or", {
                    type: "literal",
                    value: "or",
                    description: '"or"'
                }, "break", {
                    type: "literal",
                    value: "break",
                    description: '"break"'
                }, "else", {
                    type: "literal",
                    value: "else",
                    description: '"else"'
                }, "false", {
                    type: "literal",
                    value: "false",
                    description: '"false"'
                }, "for", {
                    type: "literal",
                    value: "for",
                    description: '"for"'
                }, "in", {
                    type: "literal",
                    value: "in",
                    description: '"in"'
                }, "if", {
                    type: "literal",
                    value: "if",
                    description: '"if"'
                }, "null", {
                    type: "literal",
                    value: "null",
                    description: '"null"'
                }, "return", {
                    type: "literal",
                    value: "return",
                    description: '"return"'
                }, "true", {
                    type: "literal",
                    value: "true",
                    description: '"true"'
                }, "require", {
                    type: "literal",
                    value: "require",
                    description: '"require"'
                },
                function(statements) {
                    return {
                        type: "Program",
                        statements: statements !== null ? statements : [],
                        interpret: function(interpreter) {
                            var statements = this.statements;
                            for (var i = this.statements.length - 1; i >= 0; i--) {
                                interpreter.stmt_stack.push(this.statements[i]);
                            }
                            interpreter.interpretNext();
                        },
                        accept: function(visitor) {
                            visitor.visitProgram(this);
                        }
                    };
                },
                function(head, tail, ret_stmt) {
                    var result = [head];
                    for (var i = 0; i < tail.length; i++) {
                        result.push(tail[i][1]);
                    }
                    result.push(ret_stmt);
                    return result;
                }
            ],
            peg$bytecode = [peg$decode('!7.+<$7{+2%7.+(%4#6!#!!%$##  $"#  "#  '),
                peg$decode('-""1!3"'), peg$decode('80$""1!3%*# "7*9*" 3#'), peg$decode(
                    '0&""1!3\''), peg$decode(
                    '8.)""2)3**M ".+""2+3,*A ".-""2-3.*5 "./""2/30*) ".1""21329*" 3('),
                peg$decode('87&*# "7(9*" 33'), peg$decode(
                    '!.4""2435+\u0097$ 6!!8.8""28399*$$"" 7"#  +-$7!+#%\'"%$"#  "#  ,L&!!8.8""28399*$$"" 7"#  +-$7!+#%\'"%$"#  "#  "+3%.8""2839+#%\'#%$##  $"#  "#  '
                ), peg$decode(
                    '!.4""2435+\u00a3$ 6!!8.8""2839*# "7#9*$$"" 7"#  +-$7!+#%\'"%$"#  "#  ,R&!!8.8""2839*# "7#9*$$"" 7"#  +-$7!+#%\'"%$"#  "#  "+3%.8""2839+#%\'#%$##  $"#  "#  '
                ),
                peg$decode(
                    '!.:""2:3;+{$ 6!!87#9*$$"" 7"#  +-$7!+#%\'"%$"#  "#  ,F&!!87#9*$$"" 7"#  +-$7!+#%\'"%$"#  "#  "+#%\'"%$"#  "#  '
                ), peg$decode('.<""2<3='), peg$decode('0>""1!3?'), peg$decode(
                    '!7-+-$7$+#%\'"%$"#  "#  *g "!7-+A$!8.@""2@3A9+$$"# 7""  +#%\'"%$"#  "#  *8 "!7.+-$7,+#%\'"%$"#  "#  '
                ), peg$decode('!8-""1!3"9*$$"" 7"#  '), peg$decode(
                    ' 67"*) "7\'*# "7(,/&7"*) "7\'*# "7("'), peg$decode(
                    ' 67"*) "7$*# "7%,/&7"*) "7$*# "7%"'), peg$decode(
                    '870*; "78*5 "79*/ "7:*) "74*# "779*" 3B'), peg$decode(
                    '8!72+w$7.+m%7@*# " D+]%7.+S%71+I%7.+?%7M+5%7+++%4(6E($\'%#!%$(#  $\'#  $&#  $%#  $$#  $##  $"#  "#  9*" 3C'
                ),
                peg$decode(
                    '8!.G""2G3H+E$!8.G""2G3H9*$$"" 7"#  +\'%4"6I" %$"#  "#  *Y ".J""2J3K*M ".L""2L3M*A ".N""2N3O*5 ".P""2P3Q*) ".R""2R3S9*" 3F'
                ), peg$decode('!7)+N$ 60T""1!3U+,$,)&0T""1!3U"""  +)%4"6V""! %$"#  "#  '),
                peg$decode(
                    '!72+\u0099$ 6!7.+G$.W""2W3X+7%7.+-%72+#%\'$%$$#  $##  $"#  "#  ,R&!7.+G$.W""2W3X+7%7.+-%72+#%\'$%$$#  $##  $"#  "#  "+)%4"6Y""! %$"#  "#  '
                ), peg$decode("!7>+' 4!6Z!! %"), peg$decode(
                    '8!.\\""2\\3]+g$7.+]%!76+-$7.+#%\'"%$"#  "#  *# " D+8%.@""2@3A+(%4$6^$!!%$$#  $##  $"#  "#  9*" 3['
                ),
                peg$decode(
                    '!7/+e$ 6!7.+-$7/+#%\'"%$"#  "#  ,8&!7.+-$7/+#%\'"%$"#  "#  "+)%4"6_""! %$"#  "#  '
                ), peg$decode('8!.a""2a3b+& 4!6c! %9*" 3`'), peg$decode(
                    '8!7t+\u00ba$7.+\u00b0%.e""2e3f+\u00a0%7.+\u0096%72+\u008c%7.+\u0082%7u+x%7.+n%7<*# "72+^%7.+T%.g""2g3h+D%7.+:%7/*# "75+*%4-6i-#($ %$-#  $,#  $+#  $*#  $)#  $(#  $\'#  $&#  $%#  $$#  $##  $"#  "#  9*" 3d'
                ), peg$decode(
                    '8!7v+\u00cb$7.+\u00c1%.e""2e3f+\u00b1%7.+\u00a7%7M+\u009d%7.+\u0093%.g""2g3h+\u0083%7.+y%7/*# "75+i%7.+_%!7r+=$7.+3%7/*# "75+#%\'#%$##  $"#  "#  *# " D+*%4+6k+#&" %$+#  $*#  $)#  $(#  $\'#  $&#  $%#  $$#  $##  $"#  "#  9*" 3j'
                ),
                peg$decode('8!7z+F$7.+<%73+2%7++(%4$6m$!!%$$#  $##  $"#  "#  9*" 3l'),
                peg$decode('8!7x+F$7.+<%73+2%7++(%4$6o$!!%$$#  $##  $"#  "#  9*" 3n'),
                peg$decode(
                    '7>*s "72*m "7N*g "!.e""2e3f+V$7.+L%7M+B%7.+8%.g""2g3h+(%4%6p%!"%$%#  $$#  $##  $"#  "#  '
                ), peg$decode('! 60q""1!3r+,$,)&0q""1!3r"""  +\' 4!6s!! %'), peg$decode(
                    '!7=+w$7.+m%.e""2e3f+]%7.+S%7?*# " D+C%7.+9%.g""2g3h+)%4\'6t\'"&"%$\'#  $&#  $%#  $$#  $##  $"#  "#  '
                ), peg$decode(
                    '!7<+\u0099$ 6!7.+G$.W""2W3X+7%7.+-%7<+#%\'$%$$#  $##  $"#  "#  ,R&!7.+G$.W""2W3X+7%7.+-%7<+#%\'$%$$#  $##  $"#  "#  "+)%4"6u""! %$"#  "#  '
                ),
                peg$decode(
                    '!.v""2v3w+V$7.+L%7M+B%7.+8%.x""2x3y+(%4%6z%!"%$%#  $$#  $##  $"#  "#  '
                ), peg$decode('!7<+=$7.+3%7@+)%4#6{#"" %$##  $"#  "#  '), peg$decode(
                    '7A*N "7<*H "!7C+=$7.+3%7<+)%4#6|#"" %$##  $"#  "#  '), peg$decode(
                    '.}""2}3~*A ".\u007f""2\u007f3\u0080*5 ".\u0081""2\u00813\u0082*) ".\u0083""2\u00833\u0084'
                ), peg$decode(
                    '!7B+\u008d$ 6!7.+A$7E+7%7.+-%7B+#%\'$%$$#  $##  $"#  "#  ,L&!7.+A$7E+7%7.+-%7B+#%\'$%$$#  $##  $"#  "#  "+)%4"6\u0085""! %$"#  "#  '
                ), peg$decode(
                    '!.\u0086""2\u00863\u0087*5 ".\u0088""2\u00883\u0089*) ".\u008a""2\u008a3\u008b+F$!8.G""2G3H9*$$"" 7"#  +(%4"6\u008c"!!%$"#  "#  '
                ),
                peg$decode(
                    '!7D+\u008d$ 6!7.+A$7G+7%7.+-%7D+#%\'$%$$#  $##  $"#  "#  ,L&!7.+A$7G+7%7.+-%7D+#%\'$%$$#  $##  $"#  "#  "+)%4"6\u008d""! %$"#  "#  '
                ), peg$decode(
                    '!.}""2}3~+Q$!8.}""2}3~*) ".G""2G3H9*$$"" 7"#  +\'%4"6\u008e" %$"#  "#  *b "!.\u007f""2\u007f3\u0080+Q$!8.\u007f""2\u007f3\u0080*) ".G""2G3H9*$$"" 7"#  +\'%4"6\u008f" %$"#  "#  '
                ), peg$decode(
                    '!7F+\u008d$ 6!7.+A$7I+7%7.+-%7F+#%\'$%$$#  $##  $"#  "#  ,L&!7.+A$7I+7%7.+-%7F+#%\'$%$$#  $##  $"#  "#  "+)%4"6\u0090""! %$"#  "#  '
                ), peg$decode(
                    '.\u0091""2\u00913\u0092*A ".\u0093""2\u00933\u0094*5 ".\u0095""2\u00953\u0096*) ".\u0097""2\u00973\u0098'
                ),
                peg$decode(
                    '!7H+\u008d$ 6!7.+A$7K+7%7.+-%7H+#%\'$%$$#  $##  $"#  "#  ,L&!7.+A$7K+7%7.+-%7H+#%\'$%$$#  $##  $"#  "#  "+)%4"6\u0099""! %$"#  "#  '
                ), peg$decode('!.\u009a""2\u009a3\u009b+& 4!6\u009c! %'), peg$decode(
                    '!7J+\u008d$ 6!7.+A$7m+7%7.+-%7J+#%\'$%$$#  $##  $"#  "#  ,L&!7.+A$7m+7%7.+-%7J+#%\'$%$$#  $##  $"#  "#  "+)%4"6\u009d""! %$"#  "#  '
                ), peg$decode(
                    '!7L+\u008d$ 6!7.+A$7n+7%7.+-%7L+#%\'$%$$#  $##  $"#  "#  ,L&!7.+A$7n+7%7.+-%7L+#%\'$%$$#  $##  $"#  "#  "+)%4"6\u009e""! %$"#  "#  '
                ), peg$decode('7Q*; "7R*5 "7S*/ "7^*) "7P*# "7O'),
                peg$decode(
                    '!.v""2v3w+\\$7.+R%7?*# " D+B%7.+8%.x""2x3y+(%4%6\u009f%!"%$%#  $$#  $##  $"#  "#  '
                ), peg$decode(
                    '8!.\u0088""2\u00883\u0089+B$7a+8%.\u0088""2\u00883\u0089+(%4#6\u00a1#!!%$##  $"#  "#  9*" 3\u00a0'
                ), peg$decode("!7w+& 4!6\u00a2! %"), peg$decode(
                    '!7y+& 4!6\u00a3! %*. "!7s+& 4!6\u00a4! %'), peg$decode(
                    '8!7\\*# "7T+@$!87)9*$$"" 7"#  +(%4"6\u00a6"!!%$"#  "#  9*" 3\u00a5'),
                peg$decode(
                    '!7U+Z$.\u00a7""2\u00a73\u00a8+J%7V*# " D+:%7Y*# " D+*%4$6\u00a9$##! %$$#  $##  $"#  "#  *{ "!.\u00a7""2\u00a73\u00a8+C$7V+9%7Y*# " D+)%4#6\u00aa#"! %$##  $"#  "#  *D "!7U+9$7Y*# " D+)%4"6\u00ab""! %$"#  "#  '
                ),
                peg$decode(
                    '.\u00ac""2\u00ac3\u00ad*D "!7X+9$7V*# " D+)%4"6\u00ae""! %$"#  "#  '),
                peg$decode('! 67W+&$,#&7W"""  +\' 4!6\u00af!! %'), peg$decode(
                    '0\u00b0""1!3\u00b1'), peg$decode('0\u00b2""1!3\u00b3'), peg$decode(
                    '!7Z+3$7[+)%4"6\u00b4""! %$"#  "#  '), peg$decode('0\u00b5""1!3\u00b6'),
                peg$decode('!0\u00b7""1!3\u00b8*# " D+3$7V+)%4"6\u00b9""! %$"#  "#  '),
                peg$decode(
                    '!.\u00ac""2\u00ac3\u00ad+Q$0\u00ba""1!3\u00bb+A% 67]+&$,#&7]"""  +(%4#6\u00bc#! %$##  $"#  "#  '
                ), peg$decode('0\u00bd""1!3\u00be'),
                peg$decode(
                    '8!!.\u00c0""2\u00c03\u00c1+C$7_*# " D+3%.\u00c0""2\u00c03\u00c1+#%\'#%$##  $"#  "#  *T "!.\u00c2""2\u00c23\u00c3+C$7`*# " D+3%.\u00c2""2\u00c23\u00c3+#%\'#%$##  $"#  "#  +\' 4!6\u00c4!! %9*" 3\u00bf'
                ), peg$decode('! 67b+&$,#&7b"""  +\' 4!6\u00c5!! %'), peg$decode(
                    '! 67c+&$,#&7c"""  +\' 4!6\u00c5!! %'), peg$decode(
                    '! 67d+&$,#&7d"""  +\' 4!6\u00c5!! %'), peg$decode(
                    '!!8.\u00c0""2\u00c03\u00c1*/ ".\u00c6""2\u00c63\u00c7*# "7#9*$$"" 7"#  +2$7!+(%4"6\u00c8"! %$"#  "#  *I "!.\u00c6""2\u00c63\u00c7+2$7f+(%4"6\u00c9"! %$"#  "#  *# "7e'
                ),
                peg$decode(
                    '!!8.\u00c2""2\u00c23\u00c3*/ ".\u00c6""2\u00c63\u00c7*# "7#9*$$"" 7"#  +2$7!+(%4"6\u00c8"! %$"#  "#  *I "!.\u00c6""2\u00c63\u00c7+2$7f+(%4"6\u00c9"! %$"#  "#  *# "7e'
                ), peg$decode(
                    '!.\u00c6""2\u00c63\u00c7+8$.\u0088""2\u00883\u0089+(%4"6\u00ca"! %$"#  "#  *] "!!8.\u0088""2\u00883\u0089*# "7#9*$$"" 7"#  +2$7!+(%4"6\u00c8"! %$"#  "#  *# "7e'
                ), peg$decode('!.\u00c6""2\u00c63\u00c7+2$7$+(%4"6\u00cb"! %$"#  "#  '),
                peg$decode(
                    '7g*\\ "!.\u00ac""2\u00ac3\u00ad+?$!87W9*$$"" 7"#  +\'%4"6\u00cc" %$"#  "#  *) "7k*# "7l'
                ),
                peg$decode('7h*# "7i'), peg$decode('!0\u00cd""1!3\u00ce+\' 4!6\u00cf!! %'),
                peg$decode('!!87j9*$$"" 7"#  *# "7#+2$7!+(%4"6\u00d0"! %$"#  "#  '),
                peg$decode(
                    '7h*; "7W*5 ".\u00d1""2\u00d13\u00d2*) ".\u00d3""2\u00d33\u00d4'),
                peg$decode(
                    '!.\u00d1""2\u00d13\u00d2+=$7]+3%7]+)%4#6\u00d5#"! %$##  $"#  "#  '),
                peg$decode(
                    '!.\u00d3""2\u00d33\u00d4+S$7]+I%7]+?%7]+5%7]++%4%6\u00d6%$#"! %$%#  $$#  $##  $"#  "#  '
                ), peg$decode('.\u00d7""2\u00d73\u00d8'), peg$decode(
                    '.\u00d9""2\u00d93\u00da'), peg$decode('.\u0083""2\u00833\u0084'),
                peg$decode('.\u009a""2\u009a3\u009b'), peg$decode(
                    '.\u00db""2\u00db3\u00dc'), peg$decode('.\u00dd""2\u00dd3\u00de'),
                peg$decode('.\u00df""2\u00df3\u00e0'), peg$decode(
                    '.\u00e1""2\u00e13\u00e2'), peg$decode('.\u00e3""2\u00e33\u00e4'),
                peg$decode('.\u00e5""2\u00e53\u00e6'), peg$decode(
                    '.\u00e7""2\u00e73\u00e8'), peg$decode('.\u00e9""2\u00e93\u00ea'),
                peg$decode('.\u00eb""2\u00eb3\u00ec'), peg$decode(
                    '.\u00ed""2\u00ed3\u00ee'), peg$decode("!7|*# \" D+' 4!6\u00ef!! %"),
                peg$decode(
                    '!7/+z$ 6!7.+-$7/+#%\'"%$"#  "#  ,8&!7.+-$7/+#%\'"%$"#  "#  "+>%7.+4%7;+*%4$6\u00f0$##" %$$#  $##  $"#  "#  '
                )
            ],
            peg$currPos = 0,
            peg$reportedPos = 0,
            peg$cachedPos = 0,
            peg$cachedPosDetails = {
                line: 1,
                column: 1,
                seenCR: false
            },
            peg$maxFailPos = 0,
            peg$maxFailExpected = [],
            peg$silentFails = 0,
            peg$result;
        if ("startRule" in options) {
            if (!(options.startRule in peg$startRuleIndices)) {
                throw new Error("Can't start parsing from rule \"" + options.startRule +
                    '".');
            }
            peg$startRuleIndex = peg$startRuleIndices[options.startRule];
        }

        function text() {
            return input.substring(peg$reportedPos, peg$currPos);
        }

        function offset() {
            return peg$reportedPos;
        }

        function line() {
            return peg$computePosDetails(peg$reportedPos).line;
        }

        function column() {
            return peg$computePosDetails(peg$reportedPos).column;
        }

        function expected(description) {
            throw peg$buildException(null, [{
                type: "other",
                description: description
            }], peg$reportedPos);
        }

        function error(message) {
            throw peg$buildException(message, null, peg$reportedPos);
        }

        function peg$computePosDetails(pos) {
            function advance(details, startPos, endPos) {
                var p, ch;
                for (p = startPos; p < endPos; p++) {
                    ch = input.charAt(p);
                    if (ch === "\n") {
                        if (!details.seenCR) {
                            details.line++;
                        }
                        details.column = 1;
                        details.seenCR = false;
                    } else {
                        if (ch === "\r" || (ch === "\u2028" || ch === "\u2029")) {
                            details.line++;
                            details.column = 1;
                            details.seenCR = true;
                        } else {
                            details.column++;
                            details.seenCR = false;
                        }
                    }
                }
            }
            if (peg$cachedPos !== pos) {
                if (peg$cachedPos > pos) {
                    peg$cachedPos = 0;
                    peg$cachedPosDetails = {
                        line: 1,
                        column: 1,
                        seenCR: false
                    };
                }
                advance(peg$cachedPosDetails, peg$cachedPos, pos);
                peg$cachedPos = pos;
            }
            return peg$cachedPosDetails;
        }

        function peg$fail(expected) {
            if (peg$currPos < peg$maxFailPos) {
                return;
            }
            if (peg$currPos > peg$maxFailPos) {
                peg$maxFailPos = peg$currPos;
                peg$maxFailExpected = [];
            }
            peg$maxFailExpected.push(expected);
        }

        function peg$buildException(message, expected, pos) {
            function cleanupExpected(expected) {
                var i = 1;
                expected.sort(function(a, b) {
                    if (a.description < b.description) {
                        return -1;
                    } else {
                        if (a.description > b.description) {
                            return 1;
                        } else {
                            return 0;
                        }
                    }
                });
                while (i < expected.length) {
                    if (expected[i - 1] === expected[i]) {
                        expected.splice(i, 1);
                    } else {
                        i++;
                    }
                }
            }

            function buildMessage(expected, found) {
                function stringEscape(s) {
                    function hex(ch) {
                        return ch.charCodeAt(0).toString(16).toUpperCase();
                    }
                    return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(
                        /\x08/g, "\\b").replace(/\t/g, "\\t").replace(
                        /\n/g, "\\n").replace(/\f/g, "\\f").replace(/\r/g,
                        "\\r").replace(/[\x00-\x07\x0B\x0E\x0F]/g,
                        function(ch) {
                            return "\\x0" + hex(ch);
                        }).replace(/[\x10-\x1F\x80-\xFF]/g, function(ch) {
                        return "\\x" + hex(ch);
                    }).replace(/[\u0180-\u0FFF]/g, function(ch) {
                        return "\\u0" + hex(ch);
                    }).replace(/[\u1080-\uFFFF]/g, function(ch) {
                        return "\\u" + hex(ch);
                    });
                }
                var expectedDescs = new Array(expected.length),
                    expectedDesc, foundDesc, i;
                for (i = 0; i < expected.length; i++) {
                    expectedDescs[i] = expected[i].description;
                }
                expectedDesc = expected.length > 1 ? expectedDescs.slice(0, -1).join(
                        ", ") + " or " + expectedDescs[expected.length - 1] :
                    expectedDescs[0];
                foundDesc = found ? '"' + stringEscape(found) + '"' :
                    "end of input";
                return "Expected " + expectedDesc + " but " + foundDesc +
                    " found.";
            }
            var posDetails = peg$computePosDetails(pos),
                found = pos < input.length ? input.charAt(pos) : null;
            if (expected !== null) {
                cleanupExpected(expected);
            }
            return new SyntaxError(message !== null ? message : buildMessage(expected,
                found), expected, found, pos, posDetails.line, posDetails.column);
        }

        function peg$decode(s) {
            var bc = new Array(s.length),
                i;
            for (i = 0; i < s.length; i++) {
                bc[i] = s.charCodeAt(i) - 32;
            }
            return bc;
        }

        function peg$parseRule(index) {
            var bc = peg$bytecode[index],
                ip = 0,
                ips = [],
                end = bc.length,
                ends = [],
                stack = [],
                params, i;

            function protect(object) {
                return Object.prototype.toString.apply(object) ===
                    "[object Array]" ? [] : object;
            }
            while (true) {
                while (ip < end) {
                    switch (bc[ip]) {
                        case 0:
                            stack.push(protect(peg$consts[bc[ip + 1]]));
                            ip += 2;
                            break;
                        case 1:
                            stack.push(peg$currPos);
                            ip++;
                            break;
                        case 2:
                            stack.pop();
                            ip++;
                            break;
                        case 3:
                            peg$currPos = stack.pop();
                            ip++;
                            break;
                        case 4:
                            stack.length -= bc[ip + 1];
                            ip += 2;
                            break;
                        case 5:
                            stack.splice(-2, 1);
                            ip++;
                            break;
                        case 6:
                            stack[stack.length - 2].push(stack.pop());
                            ip++;
                            break;
                        case 7:
                            stack.push(stack.splice(stack.length - bc[ip + 1], bc[ip +
                                1]));
                            ip += 2;
                            break;
                        case 8:
                            stack.pop();
                            stack.push(input.substring(stack[stack.length - 1],
                                peg$currPos));
                            ip++;
                            break;
                        case 9:
                            ends.push(end);
                            ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);
                            if (stack[stack.length - 1]) {
                                end = ip + 3 + bc[ip + 1];
                                ip += 3;
                            } else {
                                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                                ip += 3 + bc[ip + 1];
                            }
                            break;
                        case 10:
                            ends.push(end);
                            ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);
                            if (stack[stack.length - 1] === peg$FAILED) {
                                end = ip + 3 + bc[ip + 1];
                                ip += 3;
                            } else {
                                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                                ip += 3 + bc[ip + 1];
                            }
                            break;
                        case 11:
                            ends.push(end);
                            ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);
                            if (stack[stack.length - 1] !== peg$FAILED) {
                                end = ip + 3 + bc[ip + 1];
                                ip += 3;
                            } else {
                                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                                ip += 3 + bc[ip + 1];
                            }
                            break;
                        case 12:
                            if (stack[stack.length - 1] !== peg$FAILED) {
                                ends.push(end);
                                ips.push(ip);
                                end = ip + 2 + bc[ip + 1];
                                ip += 2;
                            } else {
                                ip += 2 + bc[ip + 1];
                            }
                            break;
                        case 13:
                            ends.push(end);
                            ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);
                            if (input.length > peg$currPos) {
                                end = ip + 3 + bc[ip + 1];
                                ip += 3;
                            } else {
                                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                                ip += 3 + bc[ip + 1];
                            }
                            break;
                        case 14:
                            ends.push(end);
                            ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);
                            if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length) ===
                                peg$consts[bc[ip + 1]]) {
                                end = ip + 4 + bc[ip + 2];
                                ip += 4;
                            } else {
                                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                                ip += 4 + bc[ip + 2];
                            }
                            break;
                        case 15:
                            ends.push(end);
                            ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);
                            if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length)
                                .toLowerCase() === peg$consts[bc[ip + 1]]) {
                                end = ip + 4 + bc[ip + 2];
                                ip += 4;
                            } else {
                                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                                ip += 4 + bc[ip + 2];
                            }
                            break;
                        case 16:
                            ends.push(end);
                            ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);
                            if (peg$consts[bc[ip + 1]].test(input.charAt(peg$currPos))) {
                                end = ip + 4 + bc[ip + 2];
                                ip += 4;
                            } else {
                                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                                ip += 4 + bc[ip + 2];
                            }
                            break;
                        case 17:
                            stack.push(input.substr(peg$currPos, bc[ip + 1]));
                            peg$currPos += bc[ip + 1];
                            ip += 2;
                            break;
                        case 18:
                            stack.push(peg$consts[bc[ip + 1]]);
                            peg$currPos += peg$consts[bc[ip + 1]].length;
                            ip += 2;
                            break;
                        case 19:
                            stack.push(peg$FAILED);
                            if (peg$silentFails === 0) {
                                peg$fail(peg$consts[bc[ip + 1]]);
                            }
                            ip += 2;
                            break;
                        case 20:
                            peg$reportedPos = stack[stack.length - 1 - bc[ip + 1]];
                            ip += 2;
                            break;
                        case 21:
                            peg$reportedPos = peg$currPos;
                            ip++;
                            break;
                        case 22:
                            params = bc.slice(ip + 4, ip + 4 + bc[ip + 3]);
                            for (i = 0; i < bc[ip + 3]; i++) {
                                params[i] = stack[stack.length - 1 - params[i]];
                            }
                            stack.splice(stack.length - bc[ip + 2], bc[ip + 2],
                                peg$consts[bc[ip + 1]].apply(null, params));
                            ip += 4 + bc[ip + 3];
                            break;
                        case 23:
                            stack.push(peg$parseRule(bc[ip + 1]));
                            ip += 2;
                            break;
                        case 24:
                            peg$silentFails++;
                            ip++;
                            break;
                        case 25:
                            peg$silentFails--;
                            ip++;
                            break;
                        default:
                            throw new Error("Invalid opcode: " + bc[ip] + ".");;
                    }
                }
                if (ends.length > 0) {
                    end = ends.pop();
                    ip = ips.pop();
                } else {
                    break;
                }
            }
            return stack[0];
        }
        this.VERSION = "0.2.2";

        function binaryOperator(left, operator, right) {
            switch (operator) {
                case "+":
                    return left + right;
                case "-":
                    return left - right;
                case "*":
                    return left * right;
                case "/":
                    return left / right;
                case "%":
                    return left % right;
                case "<":
                    return left < right;
                case ">":
                    return left > right;
                case "<=":
                    return left <= right;
                case ">=":
                    return left >= right;
                case "==":
                    return left == right;
                case "!=":
                    return left != right;
                default:
                    return undefined;
            }
        }

        function unaryOperator(operator, val) {
            switch (operator) {
                case "+":
                    return +val;
                case "-":
                    return -val;
                case "~":
                    return ~val;
                case "not":
                    return !val;
                default:
                    return undefined;
            }
        }

        function compare(a, b) {
            if (a instanceof Array && b instanceof Array) {
                if (a.length !== b.length) {
                    return false;
                } else {
                    for (var i = 0; i < a.length; i++) {
                        if (a[i] != b[i]) {
                            return false;
                        }
                    }
                    return true;
                }
            } else {
                return a == b;
            }
        }

        function absolute_index(index, value) {
            if (value === undefined || index === undefined) {
                return undefined;
            }
            index = parseInt(index);
            if (isNaN(index)) {
                return undefined;
            } else {
                if (index < 0 && value.hasOwnProperty("length")) {
                    index = value.length + index;
                    if (index < 0) {
                        index = 0;
                    }
                }
                return index;
            }
        }
        peg$result = peg$parseRule(peg$startRuleIndex);
        if (peg$result !== peg$FAILED && peg$currPos === input.length) {
            return peg$result;
        } else {
            if (peg$result !== peg$FAILED && peg$currPos < input.length) {
                peg$fail({
                    type: "end",
                    description: "end of input"
                });
            }
            throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
        }
    }
    return {
        SyntaxError: SyntaxError,
        parse: parse
    };
}();

  // END CIUVO PARSER



    // Run parser
    var ast = com.ciuvo.csl.parser.parse(json.csl);

    var interpreter = new com.ciuvo.csl.Interpreter(document, window, function(res) {
      callback(res);
      interpreter.close()
    }, function(err) {
      console.error('csl interp finished with err', err);
      callback(err);
      interpreter.close()
    });
    interpreter.interpret(ast)


  };

}).call(this, jQuery);
