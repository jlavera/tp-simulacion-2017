(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// abek.bl.crx.js - instantiate ABEK object in the scope
//  - enable to use ABEK in former Chrome code()

ABEK = {
  
  locale : require('./locale')

};
},{"./locale":2}],2:[function(require,module,exports){
if (typeof browser === "object") chrome = browser;

module.exports = require('../abek/locale')({ // pass browser specific impl.
    
    /**
     * Get raw localization string for key in Chrome
     */
    getRawLocalizedString: function(key) {
      return chrome.i18n.getMessage(key);
    },
    /**
     * Get local resource URL in Chrome
     */
    getLocalResourceURL: function(file) {
      return chrome.extension.getURL(file);
    },
    /**
     * Retrieve browser language - from navigatro obj.
     */
    getRawBrowserLocale : function () {
      return window.navigator.language;
    }

});
},{"../abek/locale":3}],3:[function(require,module,exports){
/*
 * ba - browser specific implementation
 */
module.exports = function(bs) {
  // maping specific languege resources to resolve locales correctly
  // lowerCase(locale) => resource in locales directory
  var SPECIFIC_LANG_MAP = {
      en_gb: 'en_GB',
      pt: 'pt_BR', pt_br: 'pt_BR', pt_pt: 'pt_PT',
      zh: 'zh_TW', zh_tw: 'zh_TW', zh_cn: 'zh_CN'
  };

  // Default browser specific code
  bs = bs || {
    /**
     * Get extension local resource URL
     */
    getLocalResourceURL : function (resourcePath) {
      return resourcePath; // override with browser spec code
    },
    /**
     * Get just the localization string resource
     */
    getRawLocalizedString : function (key) {
      return key; // override with browser spec code
    },
    /**
     * Retrieve browser language
     */
    getRawBrowserLocale : function () {
      return "en"; //require('sdk/l10n/json/core').locale() || "en";
    }

  };

  var rawLocale = bs.getRawBrowserLocale();
  var rawLocaleArr = rawLocale.split('-');
  var browserLang = rawLocaleArr[0];
  var browserLocale = rawLocaleArr[rawLocaleArr.length-1];


  return {
    /**
     * Get extension local resource URL
     */
    getLocalResourceURL : bs.getLocalResourceURL,
    /**
     * Get just the localization string resource
     */
    getRawLocalizedString : bs.getRawLocalizedString,
    /**
     * Get localization string for key
     * @param  {String} key  Key for the language string
     * @param  {String} args [optional] arguments to insert in the resource
     * @return {String}      Translated value
     */
    getLocalizedString : function(key, args) {
      return this.insertInResourceFormat(bs.getRawLocalizedString(key), args);
    },

    /**
     * Replace "%s" placeholders in strings with provided arguments.
     */
    insertInResourceFormat : function(formatted, args) {
        for (var arg in args) {
            formatted = formatted.replace("%s", args[arg]);
        }
        return formatted;
    },

    /**
     * A mean to localize Mustache templates prior they are parsed and used by templating engine.
     * @param template to localize
     * @return localized template
     */
    localizeTemplate: function(template) {
      // img:/pat/to/img.png = provide local path
      // string:resourceKey[,insertParam1[,insertParam2[,insertParam3]]] - provide localized strin with inserted params
      var replacer = function (match, rscType, rscIdPath, p1, p2, p3, offset, string) {
        if (rscType == 'img') {
          return this.getLocalResourceURL(rscIdPath);
        } else if (rscType == 'string') {
          return this.getLocalizedString(rscIdPath, [p1, p2, p3]);
        } else {
          return rscIdPath;
        }
      };

      return template ?
        template.replace(
          /\[\[(img|string):([^,\]]+)(?:,([^,]+)(?:,([^,]+)(?:,([^,]+))?)?)?\]\]/gi,
          replacer.bind(this)
        )
        : template;
    },

    /**
     * Get browser's lang setting.
     */
    getBrowserLang: function() {
      return browserLang;
    },

    /**
     * Get browser's locale setting.
     */
    getBrowserLocale: function() {
      return browserLocale;
    },

    /**
     * Get browser language and adjust it
     *  to match resources specified for the extension
     *  (TODO - use ext. specific definition of resource to adjust)
     */
    getAdjustedBrowserLang: function() {
      var lang = rawLocale.replace("-", "_");
      var slang = SPECIFIC_LANG_MAP[lang.toLowerCase()];
      if (slang) {
        lang = slang;
      } else {
        var pos = lang.indexOf("_");
        if(pos >= 0) {
          lang = lang.substr(0, pos);
        }
      }
      return lang;
    }

  };
};

},{}]},{},[1])