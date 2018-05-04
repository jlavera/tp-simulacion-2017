/*******************************************************************************
 *
 *  avast! Online Security plugin
 *  (c) 2013 Avast Corp.
 *
 *  @author: Lucian Corlaciu
 *
 *  Injected Core - cross browser
 *
 ******************************************************************************/

(function($, EventEmitter) {

  if (typeof AvastWRC == 'undefined') { AvastWRC = {}; }//AVAST Online Security

  AvastWRC.ial = AvastWRC.ial || {
    /**
     * Background script instance - browser specific
     * @type {Object}
     */
    bs: null,
    /**
     * DNT settings used to determine if a page needs to be refreshed or not
     * @type {Object}
     */
    _CHANGED_FIELDS: {},
    /**
     * Initialization
     * @param  {Object} _bs instance of browser specifics
     * @return {Object} AvastWRC.ial instance - browser agnostic
     */
    init: function(_bs){
      this.bs = _bs;
      //this.initPage();
      this.attachHandlers();
      this.bs.messageHandler('initMe');

      return this;
    },
    /**
     * EventEmitter instance to hangle injected layer events.
     * @type {Object}
     */
    _ee: new EventEmitter(),

    _isOldGui : true,
    /**
     * Register events with instance of EventEmitter.
     * @param  {Object} callback to register with instance of eventEmitter
     * @return {void}
     */
    registerEvents: function(registerCallback, thisArg) {
      if (typeof registerCallback === 'function') {
        registerCallback.call(thisArg, this._ee);
      }
    },
    /**
     * Initializes the page where this script is injected
     * @return {void}
     */
    initPage: function() {
      if($('head').length === 0) {
        $('html').prepend("<head></head>");
      }
      AvastWRC.ial.injectFonts();     
    },
    /**
     * Injects custom fonts
     * @return {void}
     */
    injectFonts: function() {
      if($('#avast_os_ext_custom_font').length === 0) {
        $('head')
          .append("<link id='avast_os_ext_custom_font' href='//fonts.googleapis.com/css?family=Source+Sans+Pro' rel='stylesheet' type='text/css'>")
          .append("<link href='//fonts.googleapis.com/css?family=Lato:400,900' rel='stylesheet' type='text/css'>")
          .append("<link href='//fonts.googleapis.com/css?family=Open+Sans:300,400,700&subset=latin,latin-ext' rel='stylesheet' type='text/css'>")
          .append("<link href='//fonts.googleapis.com/css?family=Gloria+Hallelujah' rel='stylesheet' type='text/css'>")
          .append("<link href='//fonts.googleapis.com/css?family=Roboto:400,500,700' rel='stylesheet' type='text/css'>");
        }
    },
    /**
     * Message hub - handles all the messages from the background script
     * @param  {String} message
     * @param  {Object} data
     * @param  {Function} reply
     * @return {void}
     */
    messageHub: function(message, data, reply) {
      // emit messages in specific namespace
      this._ee.emit('message.' + message, data, reply);
    },
    /**
     * Reinitialize the page. Handle 'reInit' message from background.
     */
    reInitPage: function (data) {
      AvastWRC.ial.initPage();
      AvastWRC.ial.attachHandlers();
    },
    /**
     * Attaches DOM handlers
     * @return {void}
     */
    attachHandlers: function() {
      typeof $ !== 'undefined' && $(document).ready(function() {
        window.onunload = AvastWRC.ial.onUnload;     
      });
    },
    /**
     * Notifies the background script
     * @return {void}
     */
    onUnload: function() {
      AvastWRC.ial.bs.messageHandler('unload');
    },
    /**
     * Hides the message box, if present, and restores the page to its initial state
     * @return {void}
     */
    clearBoxes: function() {
      $("body").removeClass("avast-overlay-on").removeClass("avast-bar-on").removeClass("avast-install-on");
    },
    /**
     * Retrive the top element of the page.
     * See: http://stackoverflow.com/questions/10100540/chrome-extension-inject-sidebar-into-page
     * @return retrieved top element to inject ext. HTML into
     */
    getTopHtmlElement: function () {
      var docElement = document.documentElement;
      if (docElement) {
        return $(docElement); //just drop $ wrapper if no jQuery
      } else {
        docElement = document.getElementsByTagName('html');
        if (docElement && docElement[0]) {
          return $(docElement[0]);
        } else {
          docElement = $('html');
          if (docElement.length > -1) {//drop this branch if no jQuery
            return docElement;
          } else {
            throw new Error('Cannot insert the bar.');
          }
        }
      }
    },

    /**
     * Create a top bar instance
     * @param {String} bar template HTML to be injected
     * @param {String} selector of the injected bar template
     * @param {String} bar height styling ('40px')
     * @return {Object} a wrapper for the bar
     */
    topBar: function (barHtml, barElementSelector, barHeight, topBarRules) {
        var _oldHtmlTopMargin = null;
	      var _oldGoogleTopElem = [];
        var _oldFixed = [];

        AvastWRC.ial.getTopHtmlElement().prepend(barHtml);

        return {
          /**
           * Display the bar.
           */
            show: function () {
                $(barElementSelector).css({top: '0px', left: '0px'});
                // slide page down
                AvastWRC.ial.getTopHtmlElement().css('margin-top',
                  function (index, value) {
                      _oldHtmlTopMargin =  value;
                      return barHeight;
                  }
                );
                if (!RegExp("^http(s)?\\:\\/\\/\\www\\.chase\\.com\\/?").test(document.URL)){
                  // fix for elements with position fixed
                  $("*").each(function(){
                      var $node = $(this);
                      if($node[0].className == -1){
                        if($node.css("position") == "fixed") {
                            var top = parseInt($node.css("top"));
                            if(typeof(top) == "number" && !isNaN(top)) {
                                var newValue = top + parseInt(barHeight);
                                newValue += "px";
                                $node.css("top", newValue);
                                _oldFixed.push({$node : $node, top: top});
                            }
                        }
                      }
                  });
                }
                
                var appliedRule = 0;
                if(topBarRules != null && topBarRules != undefined && topBarRules.rulesToApply >0 && topBarRules.specifics != []){
                    $(topBarRules.specifics).each(function(i,specific) {
                        if(topBarRules.rulesToApply > appliedRule){
                          var propVal = 0;
                          var newValue = 0;
                          if(specific.computedStyle){
                            var elem = document.getElementsByClassName(specific.styleName);
                            if(elem[0]){
                              propVal = window.getComputedStyle(elem[0], specific.computedStyle).getPropertyValue(specific.styleProperty);
                            }                            
                          }
                          else{
                            propVal = parseInt($(specific.styleName).css(specific.styleProperty));
                          }

                        if (specific.dynamicValue) {
                            propVal = specific.dynamicOldValue;
                            newValue = specific.dynamicValue;
                          } else if (propVal == "auto"){
                            newValue = parseInt(barHeight);
                            newValue += "px";
                          }
                          else{
                            propVal = parseInt(propVal);
                            if(typeof(propVal) == "number" && !isNaN(propVal)) {
                              newValue = propVal + parseInt(barHeight);
                              newValue += "px";
                            }
                          }
                          if(newValue != 0){
                            if(specific.computedStyle){
                              var rule = "." + specific.styleName + "::" + specific.computedStyle;
                              var value = specific.styleProperty + ": " +newValue;

                                try {
                                    document.styleSheets[0].insertRule(rule + ' { ' + value + ' }', 0);
                                } catch (e) {
                                    console.log(e);
                                }

                              _oldGoogleTopElem.push({styleName: specific.styleName, 
                                                      styleProperty: specific.styleProperty,
                                                      computedStyle: specific.computedStyle,
                                                      oldValue: propVal});
                              appliedRule ++;	
                            }
                            else{
                              $(specific.styleName).css(specific.styleProperty, newValue);
                              _oldGoogleTopElem.push({styleName: specific.styleName, 
                                                      styleProperty: specific.styleProperty,
                                                      oldValue: propVal});
                              appliedRule ++;	
                            }
                          }                      
                        }							                
                    });
                } 
                return true;  
            },
          /**
           * Remove/close the top bar and reset relevant CSS.
           */
            remove: function() {
                $(barElementSelector).remove();
                // restore page position
                if (_oldHtmlTopMargin)
                    AvastWRC.ial.getTopHtmlElement().css('margin-top', _oldHtmlTopMargin);

                // revert altered fixed positions.
                if(_oldFixed.length > 0){
                    for(var i=0, j=_oldFixed.length; i<j; i++){
                        _oldFixed[i].$node.css("top",_oldFixed[i].top+"px");
                    }
                }
                if(_oldGoogleTopElem != null){
                    for(var i=0, j=_oldGoogleTopElem.length; i<j; i++){
                      if(_oldGoogleTopElem[i].computedStyle){
                        var rule = "." + _oldGoogleTopElem[i].styleName + "::" + _oldGoogleTopElem[i].computedStyle;
                        var value = _oldGoogleTopElem[i].styleProperty + ": " + _oldGoogleTopElem[i].oldValue;

                          try {
                              document.styleSheets[0].insertRule(rule + ' { ' + value + ' }', 0);
                          } catch (e) {
                              console.log(e);
                          }
                      }
                      else{
                          $(_oldGoogleTopElem[i].styleName).css(_oldGoogleTopElem[i].styleProperty, _oldGoogleTopElem[i].oldValue + (_oldGoogleTopElem[i].oldValue === "" ? "" : "px"));
                      }                        
                    }
                }
            }
        };
    }, 

    /**
     * Create the button effect
     */

    addRippleEffect: function (e, buttonClassName) {
      if(!buttonClassName) return false;
      var target = e.target;
      if (target.className.toLowerCase() !== buttonClassName) return false;
        var rect = target.getBoundingClientRect();
        var ripple = target.querySelector('.avast-sas-ripple');
        if (!ripple) {
            ripple = document.createElement('div');
            var max = Math.floor(Math.max(rect.width, rect.height)/2);
            ripple.style.setProperty("height", max + "px", "important");
            ripple.style.setProperty("width", max + "px", "important");
            ripple.className = 'avast-sas-ripple';
            target.appendChild(ripple);
        }
        ripple.style.setProperty("zIndex", "-1", "important");
        var top = e.pageY - rect.top - ripple.offsetHeight / 2 - document.body.scrollTop;
        var left = e.pageX - rect.left - ripple.offsetWidth / 2 - document.body.scrollLeft;
        ripple.style.setProperty("top", top + "px", "important");
        ripple.style.setProperty("left", left + "px", "important");
        return false;
    },
    
  }; // AvastWRC.ial

  AvastWRC.ial.registerEvents(function(ee) {
    ee.on('message.reInit',          AvastWRC.ial.reInitPage);
  });

}).call(this, $, EventEmitter2);

/*******************************************************************************
 *
 *  avast! Online Security plugin
 *  (c) 2014 Avast Corp.
 *
 *  @author:
 *
 *  Injected Layer - Avast Online Security - cross browser
 *
 ******************************************************************************/
(function($, EventEmitter) {
  $.extend(AvastWRC.ial, {
        /**
     * Creates the UI for a message box (SiteCorrect, Phishing, Malware, CreditCard Warning)
     * @param  {Object} data
     * @return {[type]}
     */
    createMessageBox: function(data) {
      AvastWRC.ial._isOldGui = data.isOldGui;
      setTimeout(function() {
        AvastWRC.ial.initPage();
        if($('#aos-inpage').length <= 0) {
          AvastWRC.ial._messageBoxData = data;
          AvastWRC.ial.getTopHtmlElement()
            .prepend(Mustache.render(data.isOldGui ? AvastWRC.Templates.messageBoxOld : AvastWRC.Templates.messageBox, data));

          var ignore = function(){
            AvastWRC.ial.clearBoxes();
            $('input').unbind('blur', AvastWRC.ial.onBlurHandler);
            $('#aos-inpage').remove();
            AvastWRC.ial.bs.messageHandler('messageBoxFeedback',{
            type: AvastWRC.ial._messageBoxData.type,
            ok: false,
            auto: false,
            url_from: AvastWRC.ial._messageBoxData.url_from
            });
            AvastWRC.ial._messageBoxData = null;
          };

          var proceed = function(){
            var $checkBox = $('#avast-extra-checkbox');

            AvastWRC.ial.bs.messageHandler('messageBoxFeedback',{
            type: AvastWRC.ial._messageBoxData.type,
            ok: true,
            safety_url: AvastWRC.ial._messageBoxData.safety_url,
            auto: $checkBox.prop ? $checkBox.prop('checked') : $checkBox.attr('checked'),
            redirect_id: AvastWRC.ial._messageBoxData.redirect_id,
            url_from: AvastWRC.ial._messageBoxData.url_from,
            url_to: AvastWRC.ial._messageBoxData.url,
            brand: AvastWRC.ial._messageBoxData.brand
            });
          };
            
          var phishingTooltip = function phishingTooltip() {
            var hideTimer;

            function hide() {
              hideTimer = setTimeout(function() {
                $('#phishHoverDiv', document).css({display: 'none'});
              }, 500);
            }

            $(document).on('mouseover', '.phishingImg', function(e) {
              if (hideTimer) clearTimeout(hideTimer);
              hideTimer = null;

              $('#phishHoverDiv', document).css({position: 'absolute', display: 'block'});

            });

            $(document).on('mouseout', '.phishingImg', hide);

            // Disable popup timeout when hoverin over it.
            $('#phishHoverDiv', document).bind('mouseover', function(e) {
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = null;
            });

            $('#phishHoverDiv', document).bind('mouseout', hide);
          }
        
          $('#aos-inpage')
            .find('#avast-action-ignore')
            .click(ignore);


          $('#aos-inpage')
            .find('#avast-action-proceed')
            .click(proceed);
          
          $('#aos-inpage')
            .find('#phishingImg')
            .hover(phishingTooltip);

          if(data.warning !== false) {
            AvastWRC.ial.showMessageBox();
          } else {
            AvastWRC.ial.monitorSensitiveFields();
          }
        }
        AvastWRC.ial.bs.messageHandler('messageBoxOpened', {type: data.type});
      },2000);
    },

    /**
     * Displays an prior injected message box
     * @return {[type]}
     */
    showMessageBox: function() {
      AvastWRC.ial.getTopHtmlElement().addClass("avast-overlay-on");
    },

    /**
     * Monitors sensitive fields for Credit Card warning functionality
     * @return {[type]}
     */
    monitorSensitiveFields: function() {
      // start monitoring all input elements
      $("input").blur(AvastWRC.ial.onBlurHandler);
    },
    /**
     * DOM handlers for specific fields
     * @param  {DOMElement} el
     * @return {Boolean}
     */
    checkInput: function(el) {
      switch(el.attr("type")) {
        case "password":
          // User is trying to insert a password
          return el.val().length > 0;
        case "text":
          var val = el.val();

          var is4DigitCC = function(val){
            return (val.length == 4 && val.search(new RegExp('[0-9]{4}')) == 0);
          }
          // user has entered 4 numbers into the input field
          if(is4DigitCC(val)) {
            // get all previous input fields
            var prevs = el.prevAll("input[type=text]"),
              total = prevs.length;
              // check 3 previous input field for 4 digit numbes
              if (total >= 3) {
                for (var i = 0; i < 3; i++) {
                  if (!is4DigitCC(prevs.eq(i).val())) {
                    return false;
                  }
                }
                // looks like a credit card number split input 4 fields
                return true;
              } else {
                return false;
              }
          }
          // check credit card numbers in the field
          if(val.length == 19) {
            var regExp = new RegExp('[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}');
            return (val.search(regExp) == 0);
          } else if(val.length == 16) {
            var regExp = new RegExp('[0-9]{4}[0-9]{4}[0-9]{4}[0-9]{4}');
            return (val.search(regExp) == 0);
          }
          return false;
      }
    },
    onBlurHandler: function() {
      var el = $(this);
      // validate input
      if (AvastWRC.ial.checkInput(el)) {
        // insert card / password message

        $("#avast-title").remove();
        $(AvastWRC.ial._isOldGui ? "#avast-body P" : "#avast-body").text(AvastWRC.ial._messageBoxData.strings.inputwarning);

        // display the dialog
        AvastWRC.ial.showMessageBox();
      }
    },
    /**
     * Check anchor tags in given page and add events to those opening avast:// URLs.
     */
    fixAosUrls: function(data) {
      $('a')
        .filter(function() {
          return (/^avast\:\/\//).test(this.href);
        })
        .click(function(e){
          var matches = this.href.match(/^avast\:\/\/(.+)/);
          if (matches) {
            e.preventDefault();
            var action = data.actions[matches[1]];
            if (action) {
              AvastWRC.ial.bs.messageHandler(action.message, action.data);
            }
          }
        });
    }
  }); 	

  AvastWRC.ial.registerEvents(function(ee) {
    ee.on('message.showMessageBox', AvastWRC.ial.createMessageBox);
    ee.on('message.fixAosUrls', AvastWRC.ial.fixAosUrls);
  });
}).call(this, $, EventEmitter2);

(function($) {

  // UI selectors
  var SEL_SIDEBAR_MIDDLE = '#avast_os_ext_rightContent > .avast_os_ext_middle_wrapper > .avast_os_ext_middle';

  if (typeof AvastWRC === 'undefined' || typeof AvastWRC.ial === 'undefined') {
    console.error('AvastWRC.ial instance not initialised to add SafePrice component');
    return;
  } else if (typeof AvastWRC.ial.aos !== 'undefined') {
    return;
  }

  AvastWRC.ial.aos = {

    /**
     * DNT settings used to determine if a page needs to be refreshed or not
     * @type {Object}
     */
    _CHANGED_FIELDS: {},

    /**
     * Injects containers to the page to be used for UI creation
     * @return {[type]}
     */
    injectContainers: function() {
      AvastWRC.ial.initPage();
      if($('#avast_os_ext_mask').length === 0)
      {
        var topElem = AvastWRC.ial.getTopHtmlElement();
        topElem.prepend(
          $('<div/>',{id:'avast_os_ext_mask','css': {'opacity': '0'}})
            .click(function(){ AvastWRC.ial.aos.hideContainers();  })
        );

        topElem.prepend($('<div/>',{id:'avast_os_ext_rightContent', class:'avast_os_ext_rightContent', style: 'right: -420px; position: fixed;'}));
      }
    },
    /**
     * assesses if the sidebar is open
     * @return {Boolean}
     */
    isBEopen: function(){
      return (($('#avast_os_ext_rightContent').length) &&
        (Math.abs(($(window).width() - ($('#avast_os_ext_rightContent').offset().left + $('#avast_os_ext_rightContent').outerWidth()))) <= 20) &&
        ($('#avast_os_ext_rightContent').offset().left != 0))
    },
    /**
     * Hides all the injected containers
     * @return {void}
     */
    hideContainers: function(){
      $('#avast_os_ext_rightContent').css({right: '-420px'});
      //$('#topContent').animate({top: '-90px'});
      $('#avast_os_ext_mask').animate({'opacity': '0'}, function(){
        $('#avast_os_ext_mask').css({'z-index': '-2147483648'});
        for(var field in AvastWRC.ial.aos._CHANGED_FIELDS){
          AvastWRC.ial.aos._CHANGED_FIELDS = {};
          document.location.reload();
          return;
        }
      });
    },
    /**
     * Updates DNT settings
     * @param  {String} key
     * @return {void}
     */
    updateChangedFiels: function(key) {
      var changedFields = AvastWRC.ial.aos._CHANGED_FIELDS;
      changedFields[key] ? delete changedFields[key] : changedFields[key] = true;
    },
    /**
     * Returns DNT cached data
     * @param  {String} type - Category
     * @return {Object}
     */
    getDNTcache: function(type) {
      for(var i=0;i<AvastWRC.ial.aos._data.dnt.elements.length; i++)
        if(AvastWRC.ial.aos._data.dnt.elements[i].type == type)
          return AvastWRC.ial.aos._data.dnt.elements[i];
    },
    /**
     * Cascades a change to a DNT category to all the Trackers inside that Category
     * @param  {String}  type     - category
     * @param  {Boolean} active  - state
     * @return {void}
     */
    cascadeSmallSwitches: function(type, active) {
      var ids = [], switches = $('#avast_os_ext_rightContent .avast_os_ext_dnt_companies')
                        .find('.avast_os_ext_dnt_company_icon[data-type=' + type + ']');
      for(var s =0; s < switches.length; s++) {
        $(switches[s])
          .addClass('avast_os_ext_' + (active?'red':'green') + '_bubble_switch')
          .removeClass('avast_os_ext_' + (active?'green':'red') + '_bubble_switch');
        ids.push($(switches[s]).data('trk-id'));
      }
      return ids;
    },
    /**
     * Cascades a change to an individual Tracker to the corresponding Category, if needed
     * @param  {String} type - Category
     * @return {void}
     */
    cascadeBigSwitches: function(type) {
      var count = 0 ,switches = $('#avast_os_ext_rightContent .avast_os_ext_dnt_companies')
                        .find('.avast_os_ext_dnt_company_icon[data-type=' + type + ']'),
          bigSwitch = $('#avast_os_ext_rightContent .avast_os_ext_dnt_group_switcher[data-type=' + type + ']');

      for(var s =0; s < switches.length; s++) {
        if($(switches[s]).hasClass('avast_os_ext_green_bubble_switch')) {
          count++;
        }
      }
      AvastWRC.ial.aos.changeBigSwitch(bigSwitch.parent(), count === 0 ? 0 : count === switches.length ? 1 : 2, false);
    },
    // state:
    /**
     * Changes the state of an Category switch
     * @param  {DOMElement} element
     * @param  {Boolean} state      - 0 - tracking allowed, 1 - tracking blocked, 2 - tracking partially allowed
     * @param  {Boolean} cascade    - 1 - cascade to individual Trackers, 0 - do not cascade
     * @return {void}
     *
     * TODO - refactorization needed
     */
    changeBigSwitch: function(element, state, cascade) {
      var newPos = state == 0 ?'left':'right', css, trk_ids = [],
          el = element.find('.avast_os_ext_dnt_group_switcher'),
          txt = el.parent().parent().parent().find('.avast_os_ext_dnt_group_left'),
          symbol = $(el.siblings()[0]),
          cache = AvastWRC.ial.aos.getDNTcache(el.data('type')),
          strings = txt.data('strings').split(',');

      if(state == 0) { //traking allowed
        css = {
          left: -1,
          right: 'auto',
        };
      }
      else {
        css = {
          right: -1,
          left: 'auto'
        };
      }

      cache.text = txt.data('type') + ' ' + strings[state];
      cache.switcher = cache.switchers[state];
      cache.wrapper = cache.wrappers[state];
      cache.symbol  = cache.symbols[state]

      txt.text(cache.text);
      symbol.css('background-image','url(' + cache.symbol + ')');
      el.data('position',newPos);
      css['background-image'] = 'url(' + cache.switchers[state] + ')';
      el.css(css);
      element.css({'background-image': 'url(' + cache.wrapper + ')'});

      if(cascade === true) {
        trk_ids = AvastWRC.ial.aos.cascadeSmallSwitches(el.data('type'), state == 0);
      }
      AvastWRC.ial.bs.messageHandler('DNTstate',{ allow: state != 0, type: el.data('type'), ids: trk_ids });

      AvastWRC.ial.aos.updateChangedFiels(el.data('type'));
      cache.position = el.data('position');

    },
    /**
     * Creades DNT UI and attaches all the needed handlers
     * @return {void}
     */
    fillDNT: function() {
      $(SEL_SIDEBAR_MIDDLE)
        .html(Mustache.render(AvastWRC.Templates.dnt, AvastWRC.ial.aos._data.dnt));
      AvastWRC.ial.aos._page = 1;

      $('#avast_os_ext_rightContent')
        .find('.avast_os_ext_dnt_group_right_wrapper')
          .click(function(element){
            var switcher = $(element.currentTarget).find('.avast_os_ext_dnt_group_switcher');
            AvastWRC.ial.aos.changeBigSwitch($(element.currentTarget), switcher.css('left') !== '-1px'? 0 : 1, true);
          });

      var hideDNTdetails = function(el) {
        var type = $(el).parent().data('type');
        $('#avast_os_ext_rightContent .avast_os_ext_dnt_companies[data-type!=' + type + ']').slideUp(50);
      };
      $('#avast_os_ext_rightContent')
        .find('.avast_os_ext_dnt_group_right')
          .hover(
            function (el) {
              clearTimeout(AvastWRC.ial.aos._dntDetailsTimer);
              hideDNTdetails(el.currentTarget);

              var $details = $(el.currentTarget.parentElement).next();
              if($details.children().length > 1)
                $details.slideDown(50);
            },
            function () {
              AvastWRC.ial.aos._dntDetailsTimer = setTimeout(hideDNTdetails,200);
            }
          );
      $('#avast_os_ext_rightContent .avast_os_ext_dnt_companies')
        .hover(
          function () {
            clearTimeout(AvastWRC.ial.aos._dntDetailsTimer);
          },
          function () {
            AvastWRC.ial.aos._dntDetailsTimer = setTimeout(hideDNTdetails,200);
          }
        );

      $('#avast_os_ext_rightContent .avast_os_ext_dnt_companies')
        .find('.avast_os_ext_dnt_company_icon')
          .click(function(el) {
            var $el = $(el.currentTarget),
                active = $el.hasClass('avast_os_ext_green_bubble_switch'),
                disabled = $el.hasClass('avast_os_ext_grey_bubble_switch'),
                trkId =  $el.data('trk-id');
            if(!disabled) {
              $el.toggleClass('avast_os_ext_green_bubble_switch');
              $el.toggleClass('avast_os_ext_red_bubble_switch');

              AvastWRC.ial.bs.messageHandler('DNTstate',{ allow: !active, ids: [trkId]});
              AvastWRC.ial.aos.updateChangedFiels(trkId);

              var cache = AvastWRC.ial.aos.getDNTcache($el.data('type')).elements;
              for(var el in cache) {
                if(cache[el].id == trkId) {
                  cache[el].active = !active;
                }
              }
              AvastWRC.ial.aos.cascadeBigSwitches($el.data('type'));
            }
          });
    },
    /**
     * Creates Details page UI for WebRep feature
     * @return {[type]}
     */
    fillDetails: function() {
      if(AvastWRC.ial.aos._data.details){
        $(SEL_SIDEBAR_MIDDLE)
          .html(Mustache.render(AvastWRC.Templates.details, AvastWRC.ial.aos._data.details));
        AvastWRC.ial.aos._page = 2;
      }
    },
    /**
     * Creates the Thanks page UI which is trigered after voting
     * @param  {Object} rating
     * @param  {Object} flags
     * @return {void}
     */
    fillThanks: function(rating, flags) {
      $(SEL_SIDEBAR_MIDDLE)
        .html(Mustache.render(AvastWRC.Templates.thanks, AvastWRC.ial.aos._data.thanks));

      AvastWRC.ial.bs.messageHandler('userVote',
        {
          url    : document.location.href,
          rating : rating,
          flags  : flags
        });
    },
    /**
     * Creates Rating Details UI
     * @param  {Object} data
     * @return {[type]}
     */
    fillRatingDetails: function(data) {
      if(data){
        $(SEL_SIDEBAR_MIDDLE)
          .html(Mustache.render(AvastWRC.Templates.ratingExtra, data));

        $(SEL_SIDEBAR_MIDDLE)
          .find('.avast_os_ext_item_button')
            .click(function(){
              var flags =
                  {
                    shopping: 0,
                    social: 0,
                    news: 0,
                    it: 0,
                    corporate: 0,
                    pornography: 0,
                    violence: 0,
                    gambling: 0,
                    drugs: 0,
                    illegal: 0,
					others: 0
                  } ,
                  elements = $(SEL_SIDEBAR_MIDDLE)
                                .find('.avast_os_ext_rating_extra_group_left');

              for(var e =0; e < elements.length; e++) {
                var el = $(elements[e]);
                if(el.hasClass('rating_checked')) {
                  flags[el.data('flag')] = 1;
                }
              }

              AvastWRC.ial.aos.fillThanks(0, flags);
            });

        $(SEL_SIDEBAR_MIDDLE)
          .find('.avast_os_ext_rating_extra_group_left')
            .click(function(){
              $(this).toggleClass('rating_checked');
            });
        }
    },
    /**
     * Creates Rating Page UI
     * @return {void}
     */
    fillRating: function() {
      $(SEL_SIDEBAR_MIDDLE)
        .html(Mustache.render(AvastWRC.Templates.rating, AvastWRC.ial.aos._data.rating));
      AvastWRC.ial.aos._page = 3;

      $(SEL_SIDEBAR_MIDDLE)
        .find('.avast_os_ext_item_footer')
          .click(function(){
            AvastWRC.ial.aos.fillDNT();
          });

      $(SEL_SIDEBAR_MIDDLE)
        .find('.avast_os_ext_rating_group_right')
          .each(function(item){
            $(this).click(function(){
              if(item === 0) //positive
              {
                AvastWRC.ial.aos.fillThanks(100, {
                    shopping: 0,
                    social: 0,
                    news: 0,
                    it: 0,
                    corporate: 0,
                    pornography: 0,
                    violence: 0,
                    gambling: 0,
                    drugs: 0,
                    illegal: 0,
					others: 0
                  });
              } else { //negative
                AvastWRC.ial.aos.fillRatingDetails(AvastWRC.ial.aos._data.rating.negative);
              }
            });
          });
    },
    /**
     * Creates the general UI for the sidebar and attaches DOM handlers
     * @param  {Object} response
     * @return {void}
     */
    fillContent: function(response){
      response.webrep.logo = AvastWRC.ial.bs.getLocalImageURL('logo_.png');
      $('#avast_os_ext_rightContent').html(Mustache.render(AvastWRC.Templates.header, response.webrep || { nodata: true }));
      AvastWRC.ial.aos._data = response.webrep;
      AvastWRC.ial.aos._data.dnt = response.dnt;

      AvastWRC.ial.aos.fillDNT();
      //close button
      $('#avast_os_ext_rightContent > .avast_os_ext_header')
        .find('.avast_os_ext_close').click(function(){ AvastWRC.ial.aos.hideContainers(); });


      $(SEL_SIDEBAR_MIDDLE)
          .click(function(ev){
            if(ev.target.classList.contains('avast_os_ext_close')) {
              AvastWRC.ial.aos.fillDNT();
            }
          });

      $('#avast_os_ext_rightContent')
        .find('.avast_os_ext_header_button_left')
          .click(function(){
            if(AvastWRC.ial.aos._page == 2){
              AvastWRC.ial.aos.fillDNT();
            }
            else {
              AvastWRC.ial.aos.fillDetails();
            }
          });

      $('#avast_os_ext_rightContent')
        .find('.avast_os_ext_header_button_right')
          .click(function(){
            if(AvastWRC.ial.aos._page == 3){
              AvastWRC.ial.aos.fillDNT();
            }
            else {
              AvastWRC.ial.aos.fillRating();
            }
          });

      $('#avast_os_ext_rightContent > .avast_os_ext_bottom')
        .click(function(ev){
          if(ev.target.classList.contains('avast_os_ext_full')) {
            AvastWRC.ial.bs.triggerSettingsPage();
          }
        });
    },
    /**
     * Checks the state of the Sidebar and injects it if needed
     * @param  {Object} response
     * @return {void}
     */
    populate: function(response){
      if(this.isBEopen()){
        this.hideContainers();
      }
      else{
        this.injectContainers();
        setTimeout(function(){
          $('#avast_os_ext_rightContent').css({right: '0px'});
        },0);
        //$('#topContent').animate({top: '0px'});
        $('#avast_os_ext_mask').css({'z-index': '2147483646'});
        $('#avast_os_ext_mask').animate({'opacity': '0.2'});

        this.fillContent(response);
      }
    },
    /**
     * Refreshes UI content.
     */
    refreshContent: function (data) {
      if(AvastWRC.ial.aos.isBEopen()){
          AvastWRC.ial.aos.fillContent(data);
      }
    },
    /**
     * Displays an prior injected message box
     * @return {[type]}
     */
    showMessageBox: function() {
      AvastWRC.ial.getTopHtmlElement().addClass("avast-overlay-on");
    },
    /**
     * Creates UI for the Top Bar (SafeZone)
     * @param  {Object} data
     * @return {void}
     */
    createTopBar: function(data) {
      if($('.avast-extension-topbar-promo').length > 0) {
        return;
      }

      var bar;

      var proceed = function (ok, decline) {
        AvastWRC.ial.bs.messageHandler('messageBoxFeedback',{
          type: 'safeZone',
          url_from: document.location.href,
          ok: ok,
          decline: decline
        });
      };

      function alignPosition(elementSel, alignToSel, toRight, offset) {
        var $elm = $(elementSel);
        var $aTo = $(alignToSel);
        if ($elm.length && $aTo.length) {
          var pos = $aTo.position().left;
          if (toRight) {
            pos += $aTo.width();
          }
          $elm.css('left', pos + offset + 'px');
        }
      }

      function setCheckbox() {
          $('.avast-browser-never-icon').toggleClass("noDisplay");
      }

      function isCheckboxSet() {
          return !$(".avast-browser-never-icon.noDisplay").attr("src");
      }
      
      function toggleCheckboxHover() {
          $('.avast-browser-never-icon-checkbox').toggleClass("avast-browser-never-icon-checkbox-hover");
      }

      function hideForThisDomain() {
          if (isCheckboxSet()) proceed(false, true);
          bar.remove();
      }

      var infoMessage = function (hideInfoMessage) {
        function hideInfo() {
            $('#infoHoverDiv', document).css({display: 'none'});
        }

        function showInfo(){
          if ($('#infoHoverDiv').is(":visible")) return;
          alignPosition('#avast-arrow', '#avast-browser-info', true, -12);
          alignPosition('#avast-container', '#avast-browser-info', true, -300);

          $('#infoHoverDiv', document).css({display: 'block'});
          $('#neverHoverDiv', document).css({display: 'none'});
        }

        hideInfoMessage === true ? hideInfo() : showInfo();
      };

      var neverMessage = function(){
              
        function hideNeverMsg() {
          $('#neverHoverDiv', document).css({display: 'none'});          
        }

        function showNeverMsg(){
          $('#neverHoverDiv', document).css({display: 'block'});
          $('#infoHoverDiv', document).css({display: 'none'});
        }

        $(document).on('click', '#avast-btn-ok-reopen', hideNeverMsg);
        $(document).on('click', '#avast-link-close-forever', hideNeverMsg);
        $(document).on('click', '#avast-never-close', hideNeverMsg);

      };

      bar = AvastWRC.ial.topBar(
        Mustache.render(AvastWRC.Templates.topBar, data),
        '.avast-extension-topbar-promo',
        '50px'
      );

      $('.avast-extension-topbar-promo #avast-browser-reopen, .avast-extension-topbar-promo #avast-browser-hide').click(hideForThisDomain);

      $('.avast-extension-topbar-promo #avast-btn-ok-reopen').click(
        function() {
          proceed(true, false);
		      bar.remove();
        });

      $('.avast-extension-topbar-promo #avast-link-close-forever').click(
        function() {
          //proceed(false, true); this block only the promo for this host
		      proceed(false, false); // this block the promo for all host for an specific promo-type(bank, video, shopping, ads)
          bar.remove();
        });

      $('.avast-extension-topbar-promo #avast-never-close').click(
        function() {
          bar.remove();
        });

      $('.avast-extension-topbar-promo #avast-browser-info, .avast-extension-topbar-promo #avast-arrow, .avast-extension-topbar-promo #avast-container').on("mouseenter", infoMessage).on("mouseleave", function () {
          infoMessage(true);
      });

      $("#avast-browser-never").click(setCheckbox).on("mouseenter", toggleCheckboxHover).on("mouseleave", toggleCheckboxHover);

      $('#avast-browser-reopen').mousedown(function (e) {
          e.preventDefault();
          AvastWRC.ial.addRippleEffect(e, e.target.className);
      }).mouseleave(function (e) {
          e.preventDefault();
          $(".avast-sas-ripple").remove();
      }).click(function (e) {
          proceed(true, false);
          bar.remove();
      });

      bar.show();
    }

  }; // AvastWRC.ial.aos

  /* Register AOS Event handlers */
  AvastWRC.ial.registerEvents(function(ee) {
    ee.on('message.showMessageBox', AvastWRC.ial.createMessageBox);
    ee.on('message.fixAosUrls', AvastWRC.ial.fixAosUrls);
    ee.on('message.populate', AvastWRC.ial.aos.populate.bind(AvastWRC.ial.aos));
    ee.on('message.refresh', AvastWRC.ial.aos.refreshContent.bind(AvastWRC.ial.aos));
    ee.on('message.showTopBar', AvastWRC.ial.aos.createTopBar.bind(AvastWRC.ial.aos));
  });

}).call(this, $);

/**
 * Search results checking and highlighting
 */

(function ($) {
    /**
     * Retrieve domain from given URL.
     */
    function getDomainFromUrl(url) {
        var matches = url.match(new RegExp("^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(www.)?([a-z0-9\-\.]+[a-z]{2,6})(:[0-9]+)?(.*)?$"));
        if (matches && matches.length > 4) {
            // var protocol = matches[1];
            // var credentials = matches[2];
            // var www = matches[3];
            var domain = matches[4];
            // var wport = matches[5];
            return domain;
        }
        return null;
    }

    /**
     * Attampt to retrive target url if URL is redirector URL. Otherwise return the URL itself.
     */
    function retrieveTargetUrl(url) {
        var target = getTargetFromRedirectorUrl(url);
        return target ? (target.indexOf("http") != 0 ? "http://" : "") + target : url;
    }

    /**
     * Recognizes target urls inside arbitrary redirector urls (also handles base64 encoded urls)
     */
    function getTargetFromRedirectorUrl(url) {
        var args = getUrlVars(url);

        for (var p in args) {
            if (args.hasOwnProperty(p)) {
                //This regexp extracts domain from URL encoded address of type http
                try {
                    //Matches URLs starting with http(s)://domain.com http(s)://www.domain.com www.domain.com
                    //optionally followed by path and GET parameters
                    //If successful then matches[1] holds the domain name

                    var re = /((https?\:\/\/(www\.)?|www\.)(([\w|\-]+\.)+(\w+)))([\/#\?].*)?/;
                    var decoded = decodeURIComponent(args[p]);
                    var matches = decoded.match(re);
                    if (matches) {
                        return matches[1];
                    }

                    var b64decoded = atob(decoded);
                    matches = b64decoded.match(re);
                    if (matches) {
                        return matches[1];
                    }
                }
                catch (e) {
                    //alert("Exception: "+JSON.stringify(e));
                }
            }
        }

        return null;
    }

    function getUrlVars(url) {
        // Creates an associative array of GET URL parameters
        var vars = {};

        var parts = url.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
            vars[key] = value;
        });

        return vars;
    }

    function sendCheckRequest(rule) {
        var links = [];
        var site = getDomainFromUrl(document.location.href);
        $("a", document).each(function () {
            var href = $(this).attr("href");
            var data_url = $(this).attr("data-url");
            if (data_url && data_url.indexOf("http") != -1) {
                href = data_url;
            }
            if (href) {
                var link = retrieveTargetUrl(href);
                var domain = getDomainFromUrl(link);
                // query only existing external links
                if (domain && domain !== site) {
                    links.push({
                        url: link,
                        fullUrl: link,
                    });
                }
            }
        });

        var domain = site.substring(0, site.lastIndexOf('.')) + '.com';

        AvastWRC.ial.bs.messageHandler("serpRules", { value: domain, });
        AvastWRC.ial.bs.messageHandler("checkLinks", { links: links, });
    }

    function serpParsing(res) {
        // See AOSP-568
        var result = [];

        var allResults = document.querySelectorAll(res.allSelectors);
        for (var htmlElem of allResults) {
            for (var elemInfo of res.usecases) {
                let eSelector = elemInfo.selector
                    .replace(/\./g, ' ')
                    .substring(1, elemInfo.selector.length);

                if (htmlElem.className.indexOf(eSelector) !== -1 || eSelector.indexOf(htmlElem.className) !== -1) {
                    var url = getUrlForElement(htmlElem, elemInfo);
                    var usecase = elemInfo.usecase;
                    result.push({ url, usecase });
                    break;
                }
            }
        }

        const blockCounter = new Map();
        let lastCategory = '';

        let categoryIndex = 0; // how many times we had this category
        let blockIndex = -1; // what is the index of category
        let inBlockIndex = 0; // what is the relative index of element inside category

        result.forEach(res => {
            const category = res.usecase;

            if (category !== lastCategory) {
                // Update category counter
                categoryIndex = blockCounter.get(category); // you can't use short syntag blockCounter.get() || -1, because undefined and 0 are treated as equal
                if (categoryIndex === undefined) { categoryIndex = -1; }

                blockCounter.set(category, ++categoryIndex);

                // Increase block-index
                blockIndex++;

                // Reset in-block index, because we are now in new category
                inBlockIndex = 0;
            }

            // Save data to current res
            res.categoryIndex = categoryIndex;
            res.blockIndex = blockIndex;
            res.inBlockIndex = inBlockIndex;

            // Increase in-block index, for other elements
            inBlockIndex++;

            // Save current category as last seen
            lastCategory = category;
        });

        AvastWRC.ial.bs.messageHandler("serpResults", { value: result });
    }

    function getUrlForElement(element, elementInfo) {
        if (!elementInfo.urlSelector) {
            if (element.querySelector('a')) {
                return element.querySelector('a').href;
            }
            else if (element.querySelector('a:last-child')) {
                return element.querySelector('a:last-child').href;
            }
            else {
                return element.href;
            }
        }
        else {
            return elementInfo.urlSelector === 'noUrl' ? 'noUrl' : element.querySelector(elementInfo.urlSelector).href;
        }
    }

    const TOOLTIP_RATING_CLASSES = ["aos-tooltip-none", "aos-tooltip-ok", "aos-tooltip-attention", "aos-tooltip-error",];

    function createPopup(data) {
        var hideTimer;

        function getRatingText(rating) {
            return data.ratingTexts[rating];
        }

        function getRatingIcon(rating) {
            return data.ratingIcons[rating];
        }

        function hide() {
            hideTimer = setTimeout(function () {
                $("#wrcHoverDiv", document).css({ display: "none", });
            }, 500);
        }

        if (document.getElementById("wrcHoverDiv")) {
            return;
        }

        $("body", document).prepend(
            $("<div/>", { id: "wrcHoverDiv", }).append(
                $("<div/>", { id: "wrccontainer", class: "aos-tooltip", })
                    .append($("<div/>", { class: "aos-tooltip-arrow", }))
                    .append($("<a/>", { class: "aos-tooltip-logo", })
                        .append($("<span/>", { class: "aos-tooltip-logo-img", }))
                        .append($("<span/>", { class: "aos-tooltip-logo-text", }).text("Online Security")))
                    .append($("<div/>", { id: "wrcratingicon", class: "aos-tooltip-icon", })
                        .css("background-image", "url(" + getRatingIcon(0) + ")"))
                    .append($("<div/>", { id: "wrcratingtext", class: "aos-tooltip-text", })
                        .text(getRatingText(0)))));

        $(document).on("mouseover", ".wrc_icon", function (e) {
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = null;

            $("#wrcHoverDiv", document).css({ display: "block", });

            var offset = $(e.target).offset();
            offset.left += 25;
            offset.top -= 70;
            $("#wrcHoverDiv", document).css(offset);

            var rtg = $(e.target).data("rating");

            $("#wrcratingtext", document).text(getRatingText(rtg));
            $("#wrcratingicon", document).css({ "background-image": "url(" + getRatingIcon(rtg) + ")", });
            $("#wrccontainer", document).removeClass(TOOLTIP_RATING_CLASSES.join(" "))
                .addClass(TOOLTIP_RATING_CLASSES[rtg]);
        });

        $(document).on("mouseout", ".wrc_icon", hide);

        // Disable popup timeout when hoverin over it.
        $("#wrcHoverDiv", document).bind("mouseover", function (e) {
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = null;
        });

        $("#wrcHoverDiv", document).bind("mouseout", hide);
    }

    AvastWRC.ial.search = {
        checkLinks: function (data) {
            console.log("checkLinks called");

            $(".wrc_injected", document).remove();
            $("a", document).each(function () {
                var a = $(this);
                a.removeAttr("wrc_done");
            });

            AvastWRC.ial.initPage();

            var css = document.getElementById("wrc-css");
            if (!css && data.style) {
                css = document.createElement("style");
                css.id = "wrc-css";
                css.type = "text/css";
                css.innerHTML = data.style;
                $("head", document).append(css);
            }

            sendCheckRequest(data.style);

            window.addEventListener("hashchange", function () {
                console.log("hashchange event, triggering request");
                setTimeout(sendCheckRequest, 500);
            });
        },

        checkLinksResult: function (data) {
            if (data.showPopup) {
                createPopup(data);
            }

            var result = data.result;

            var fastMap = [];
            for (var site in result) {
                fastMap[result[site].url] = result[site];
            }

            $("a", document).each(function () {
                var a = $(this);
                if (!a || a.attr("wrc_done")) {
                    return;
                }

                var href = a.attr("href");
                var data_url = a.attr("data-url");

                if(data_url && data_url.indexOf("http") != -1) {
                    href = data_url;
                }

                if (!href) {
                    return;
                }

                var link = retrieveTargetUrl(href);
                var newResult = fastMap[link];
                if (!newResult) {
                    newResult = fastMap[getDomainFromUrl(link)];
                    if (!newResult) {
                        return;
                    }
                }

                var scoreClass = "wrc" + newResult.rating;
                var element = document.createElement("span");
                element.setAttribute("class", scoreClass + " wrc_icon wrc_injected");
                $(element).data("rating", newResult.rating);

                a.attr("wrc_done", "true").after(element);
            });
            //apply specific style to seznam, because our serp icon misconfigured it
            if (document.URL.indexOf("search.seznam.cz") != -1) {
                var result = document.getElementsByClassName("Result-title");
                for (i = 0; i < result.length; i++) {
                    result[i].style.height = "24px";
                }
            }
        },

        serpRules: function (data) {
            serpParsing(data.value);
        }
    };

    /* Register search handlers */
    AvastWRC.ial.registerEvents(function (ee) {
        ee.on("message.checkLinks", AvastWRC.ial.search.checkLinks.bind(AvastWRC.ial.search));
        ee.on("message.checkLinksResult", AvastWRC.ial.search.checkLinksResult.bind(AvastWRC.ial.search));
        ee.on("message.serpRules", AvastWRC.ial.search.serpRules.bind(AvastWRC.ial.search));
    });

}).call(this, $);