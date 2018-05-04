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
      this.initPage();
      this.attachHandlers();
      window.onload = function() {
        console.log("onload Feedback called");
        AvastWRC.ial.sp.feedback({type: 'coupon_tab'}); 
      };
    
      $(document).ready(function () {
        console.log("ready Feedback called");
        AvastWRC.ial.sp.feedback({type: 'coupon_tab'}); 
      });
      //this.bs.messageHandler('initMe');

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
        if ($('head').length === 0) {
            $('html').prepend("<head></head>");
        }
        AvastWRC.ial.injectFonts();
    },
    /**
     * Injects custom fonts
     * @return {void}
     */
    injectFonts: function () {
        if ($('#avast_os_ext_custom_font').length === 0) {
            $('head').append(`<link id='avast_os_ext_custom_font' href='${AvastWRC.bs.getLocalResourceURL('/common/ui/fonts/fonts.css')}' rel='stylesheet' type='text/css'>`)
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
      // we should remove our content from the page
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
     * Create the button effect
     */

    addRippleEffect: function (e, buttonClassName) {
      if(!buttonClassName) return false;
      var target = e.target;
      var rect = target.getBoundingClientRect();
      var ripple = document.createElement('div');
      var max = Math.floor(Math.max(rect.width, rect.height)/2);
      ripple.style.setProperty("height", max + "px", "important");
      ripple.style.setProperty("width", max + "px", "important");
      ripple.className = 'avast-sas-ripple';
      target.appendChild(ripple);
      ripple.style.setProperty("zIndex", "-1", "important");
      var top = e.pageY - rect.top - ripple.offsetHeight / 2 - document.body.scrollTop;
      var left = e.pageX - rect.left - ripple.offsetWidth / 2 - document.body.scrollLeft;
      ripple.style.setProperty("top", top + "px", "important");
      ripple.style.setProperty("left", left + "px", "important");
      $('.avast-sas-ripple').addClass("animate");

			setTimeout(() => {
					$(".avast-sas-ripple").remove()
			}, 3000)

      return false;
    },
    
  }; // AvastWRC.ial

  /*AvastWRC.ial.registerEvents(function(ee) {
    ee.on('message.reInit',AvastWRC.ial.reInitPage);
  });*/

}).call(this, $, EventEmitter2);

/*******************************************************************************
 *
 *  avast! Online Security plugin
 *  (c) 2014 Avast Corp.
 *
 *  @author:
 *
 *  Injected Layer - SafePrice - cross browser
 *
 ******************************************************************************/

(function ($) {

    var SAFESHOP_REFRESH_INTERVAL = 45 * 60 * 1000;

    var safeShopRefreshIID = null;

    if (typeof AvastWRC === 'undefined' || typeof AvastWRC.ial === 'undefined') {
        console.error('AvastWRC.ial instance not initialised to add SafePrice component');
        return;
    } else if (typeof AvastWRC.ial.sp !== 'undefined') {
        return;
    }


    $.fn.scrollGuard = function () {
        return this
            .on('wheel', function (e) {
                var $this = $(this);
                if (e.originalEvent.deltaY < 0) {
                    /* scrolling up */
                    return ($this.scrollTop() > 0);
                } else {
                    /* scrolling down */
                    return ($this.scrollTop() + $this.innerHeight() < $this[0].scrollHeight);
                }
            });
    };

    AvastWRC.ial.sp = {
        /**
         * Check the current page using the received selector.
         * @param {Object} page related data
         */
        data: {},
        topBarElement: null,

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
                    if (AvastWRC.ial.sp.topBarMoved) return;
                    AvastWRC.ial.sp.topBarMoved = true;

                    $(barElementSelector).css({ top: '0px', left: '0px' });
                    AvastWRC.ial.getTopHtmlElement().css('margin-top',
                        function (index, value) {
                            _oldHtmlTopMargin = value;
                            return barHeight;
                        }
                    );
                    if (!RegExp("^http(s)?\\:\\/\\/\\www\\.chase\\.com\\/?").test(document.URL)) {
                        // fix for elements with position fixed
                        $("*").each(function () {
                            var $node = $(this);
                            if ($node[0].className == -1) {
                                if ($node.css("position") == "fixed") {
                                    var top = parseInt($node.css("top"));
                                    if (typeof (top) == "number" && !isNaN(top)) {
                                        var newValue = top + parseInt(barHeight);
                                        newValue += "px";
                                        $node.css("top", newValue);
                                        _oldFixed.push({ $node: $node, top: top });
                                    }
                                }
                            }
                        });
                    }

                    var appliedRule = 0;
                    if (topBarRules != null && topBarRules != undefined && topBarRules.rulesToApply > 0 && topBarRules.specifics != []) {
                        $(topBarRules.specifics).each(function (i, specific) {
                            if (topBarRules.rulesToApply > appliedRule) {
                                var propVal = 0;
                                var newValue = 0;
                                if (specific.computedStyle) {
                                    var elem = document.getElementsByClassName(specific.styleName);
                                    if (elem[0]) {
                                        propVal = window.getComputedStyle(elem[0], specific.computedStyle).getPropertyValue(specific.styleProperty);
                                    }
                                }
                                else {
                                    propVal = parseInt($(specific.styleName).css(specific.styleProperty));
                                }

                                if (specific.dynamicValue) {
                                    propVal = specific.dynamicOldValue;
                                    newValue = specific.dynamicValue;
                                } else if (propVal == "auto") {
                                    newValue = parseInt(barHeight);
                                    newValue += "px";
                                }
                                else {
                                    propVal = parseInt(propVal);
                                    if (typeof (propVal) == "number" && !isNaN(propVal)) {
                                        newValue = propVal + parseInt(barHeight);
                                        newValue += "px";
                                    }
                                }
                                if (newValue != 0) {
                                    if (specific.computedStyle) {
                                        var rule = "." + specific.styleName + "::" + specific.computedStyle;
                                        var value = specific.styleProperty + ": " + newValue;

                                        try {
                                            document.styleSheets[0].insertRule(rule + ' { ' + value + ' }', 0);
                                        } catch (e) {
                                            console.log(e);
                                        }

                                        _oldGoogleTopElem.push({
                                            styleName: specific.styleName,
                                            styleProperty: specific.styleProperty,
                                            computedStyle: specific.computedStyle,
                                            oldValue: propVal
                                        });
                                        appliedRule++;
                                    }
                                    else {
                                        $(specific.styleName).css(specific.styleProperty, newValue);
                                        _oldGoogleTopElem.push({
                                            styleName: specific.styleName,
                                            styleProperty: specific.styleProperty,
                                            oldValue: propVal
                                        });
                                        appliedRule++;
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
                remove: function () {
                    $(barElementSelector).remove();
                    // restore page position
                    if (_oldHtmlTopMargin)
                        AvastWRC.ial.getTopHtmlElement().css('margin-top', _oldHtmlTopMargin);

                    // revert altered fixed positions.
                    if (_oldFixed.length > 0) {
                        for (var i = 0, j = _oldFixed.length; i < j; i++) {
                            _oldFixed[i].$node.css("top", _oldFixed[i].top + "px");
                        }
                    }
                    if (_oldGoogleTopElem != null) {
                        for (var i = 0, j = _oldGoogleTopElem.length; i < j; i++) {
                            if (_oldGoogleTopElem[i].computedStyle) {
                                var rule = "." + _oldGoogleTopElem[i].styleName + "::" + _oldGoogleTopElem[i].computedStyle;
                                var value = _oldGoogleTopElem[i].styleProperty + ": " + _oldGoogleTopElem[i].oldValue;

                                try {
                                    document.styleSheets[0].insertRule(rule + ' { ' + value + ' }', 0);
                                } catch (e) {
                                    console.log(e);
                                }
                            }
                            else {
                                $(_oldGoogleTopElem[i].styleName).css(_oldGoogleTopElem[i].styleProperty, _oldGoogleTopElem[i].oldValue + (_oldGoogleTopElem[i].oldValue === "" ? "" : "px"));
                            }
                        }
                    }
                }
            };
        },

        checkSafeShop: function (data) {
            var safeShopData = $.extend({ scan: null }, data);
            if (data.csl && !safeShopData.onlyCoupons) {
                switch (data.providerId) {
                    case "ciuvo":
                        // product scan - to retrieve page data
                        AvastWRC.ial.productScan(data.csl, function (response) {
                            safeShopData.scan = response;
                            safeShopData.referrer = document.referrer;
                            AvastWRC.ial.bs.messageHandler('safeShopOffersFound', safeShopData);
                        });
                        break;
                    case "comprigo":
                        // product scan - to retrieve page data
                        AvastWRC.ial.comprigoRun(data.csl, data.url, function (response) {
                            safeShopData.scan = response;
                            safeShopData.referrer = document.referrer;
                            AvastWRC.ial.bs.messageHandler('safeShopOffersFound', safeShopData);
                        });
                        break;
                }
            }
        },

        feedback: function (data) {
            AvastWRC.ial.bs.messageHandler('safeShopFeedback', data);
        },

        makeDraggable: function (el, effectedEl = null) {
            if (!effectedEl) effectedEl = el;

            
            let newX = 0, newY = 0, originalX = 0, originalY = 0, movementThreshold = 3;
            el.onmousedown = onDragMouseDown;

            function onDragMouseDown(e) {
                let ids = {
                    sideNotifications: {classId: "a-sp-notifications-header-drag", eventType: 'notifications_events'},
                    redirectNotifications: {classId: "a-sp-notifications-redirect-header-drag", eventType: 'notifications_events'},
                    panel: {classId: "a-panel", eventType: 'main_ui_event'},
                    minimized: {classId: "asp-panel-min", eventType: 'minimized_ui_dragged'},
                }
                e = e || window.event;
                originalX = e.clientX;
                originalY = e.clientY;
                document.onmouseup = stopDrag;
                document.onmousemove = dragElement;
                console.log("drag:");
                console.log(e);
                var data = AvastWRC.ial.sp.data;
                var type = "";
                var category = "UNKNOWN_CATEGORY";
                var notificationType = "";
                if (e.target.id.indexOf(ids.sideNotifications.classId) != -1 || e.currentTarget.id.indexOf(ids.sideNotifications.classId) != -1) {
                    type = ids.sideNotifications.eventType;
                    category = AvastWRC.ial.sp.notifications.config.values.currentData.category;
                    notificationType = AvastWRC.ial.sp.notifications.config.values.currentData.notificationType;
                }
                else if (e.target.id.indexOf(ids.redirectNotifications.classId) != -1 || e.currentTarget.id.indexOf(ids.redirectNotifications.classId) != -1) {
                    type = ids.redirectNotifications.eventType;
                    category = AvastWRC.ial.sp.notifications.config.values.currentData.category;
                    notificationType = AvastWRC.ial.sp.notifications.config.values.currentData.notificationType;
                }
                else if (e.target.offsetParent.id.indexOf(ids.panel.classId) != -1) {
                    type = ids.panel.eventType;
                    category = AvastWRC.ial.sp.data.activeTab;
                }
                else if (e.target.offsetParent.id.indexOf(ids.minimized.classId) != -1) {
                    type = ids.sideNotifications.eventType;
                }
                if (type != "") {
                    AvastWRC.ial.sp.feedback({
                        type: type,
                        action: 'dragged',
                        category: category,
                        notificationType: notificationType || "",
                        domain: data.domain,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || ""
                    });
                }
            }

            function dragElement(e) {
                let distX = Math.abs(originalX - e.clientX);
                let distY = Math.abs(originalY - e.clientY);
                if ((originalX === e.clientX && originalY === e.clientY)) return;
                if (Math.max(distX, distY) > movementThreshold) {
                    $(effectedEl).addClass('dragged');
                }
                e = e || window.event;
                newX = originalX - e.clientX;
                newY = originalY - e.clientY;
                originalX = e.clientX;
                originalY = e.clientY;
                var newTop = effectedEl.offsetTop - newY;
                var newLeft = effectedEl.offsetLeft - newX;
                var maxHeight = window.innerHeight - effectedEl.clientHeight;
                var maxWidth = window.innerWidth - effectedEl.clientWidth;
                if (effectedEl.clientHeight < window.innerHeight) {
                    effectedEl.style.top = (newTop < 0 ? 0 : newTop > maxHeight ? maxHeight : newTop) + "px";
                    effectedEl.style.left = (newLeft < 0 ? 0 : newLeft > maxWidth ? maxWidth : newLeft) + "px";
                }
                return false;
            }

            function stopDrag(e) {
                document.onmouseup = null;
                document.onmousemove = null;
                setTimeout(function () {
                    $(effectedEl).removeClass('dragged');
                }, 100);
            }
        },

        /**
         * Creates UI for the Top Bar (SafeZone)
         * @param  {Object} data
         * @return {[type]}
         */
        createPanel: function (data, isCouponTab = null) {
            if(AvastWRC.ial.sp.couponInTab && isCouponTab){
                AvastWRC.ial.sp.data.panelData = data.panelData;
            }
            else{
                AvastWRC.ial.sp.data.panelData = data;
            }            
            // we have all the info we need to create the panel but it will be only shown on the click on notifications
            if ($('#a-panel').length === 0) {
                var ourTemplate = Mustache.render(AvastWRC.Templates.safeShopPanel, AvastWRC.ial.sp.data.panelData);
               
                AvastWRC.ial.getTopHtmlElement().prepend(ourTemplate);
                this.makeDraggable(document.getElementById('a-panel-header'), document.getElementById('a-panel'));
                AvastWRC.ial.sp.BindPanelEvents();
                $('.a-sp-items-wrapper').scrollGuard();

                $('#a-panel').mouseenter(function () {
                    AvastWRC.ial.sp.isPanelActive = true;
                }).mouseleave(function () {
                    AvastWRC.ial.sp.isPanelActive = false;
                });

            }

            // $(document).on('DOMMouseScroll', function(e){
            //     if(AvastWRC.ial.sp.isPanelActive && e.originalEvent.detail > 0) {
            //         //scroll down
            //         $('.asp-items-scrollbar').css('margin-top', function (index, curValue) {
            //             return Math.min(parseInt(curValue, 10) + ($('.a-sp-items-wrapper').height() / $('.a-sp-items-wrapper > div').children().length-1) - 20, 220) + 'px';
            //         });
            //     }else {
            //         //scroll up
            //         $('.asp-items-scrollbar').css('margin-top', function (index, curValue) {
            //             return Math.max(parseInt(curValue, 10) - ($('.a-sp-items-wrapper').height() / $('.a-sp-items-wrapper > div').children().length-1) - 20, 0) + 'px';
            //         });
            //     }
            // });
            if(!AvastWRC.ial.sp.couponInTab && !isCouponTab){
                this.notifications.prepareTemplates(data.notifications);
            }
        },

        moveExternalPanels: function (size) {
            let element = $("#honeyContainer"), positionOffset = 15;

            if (element && element[0] && element[0].shadowRoot && element[0].shadowRoot.childNodes && element[0].shadowRoot.childNodes[2])
                element[0].shadowRoot.childNodes[2].style.setProperty('top', `${isNaN(size) ? getCurrentNotificationSize() : size}px`, 'important');

            function getCurrentNotificationSize() {
                for (let key in AvastWRC.ial.sp.notifications.config.notificationsContainer) {
                    if ($(AvastWRC.ial.sp.notifications.config.notificationsContainer[key]).length
                        && ($(AvastWRC.ial.sp.notifications.config.notificationsContainer[key]).css('display') !== "none")) {
                        return document.getElementById(AvastWRC.ial.sp.notifications.config.notificationsContainer[key].replace("#", "")).clientHeight + positionOffset;
                    }
                }

                return 0;
            }
        },

        UpdateContent: function (parentClass, prepend, contentId, templateId, bindCallBack, data = null) {
            if (!data) data = AvastWRC.ial.sp.data;

            var elem = document.getElementById(contentId);
            if (elem) {
                elem.parentNode.removeChild(elem);
            }
            if (prepend) {
                $(parentClass).prepend(Mustache.render(templateId, data));
            } else {
                $(parentClass).append(Mustache.render(templateId, data));
            }
            if (typeof bindCallBack === "function") {
                bindCallBack();
            }
        },
        updatePanel: function (data, isCouponTab = null) {
            if(AvastWRC.ial.sp.couponInTab && isCouponTab){
                AvastWRC.ial.sp.coupopnIntabData = data;
                if (data && data.couponsLength > 0) {
                    AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "couponsWrapper", AvastWRC.Templates.couponsWrapper, function () {
                        $('#couponsTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                        //AvastWRC.ial.sp.BindCouponEvents();
                    }, AvastWRC.ial.sp.coupopnIntabData);
                    if (data.vouchersSelected) {
                        $(".a-sp-items-wrapper").css("height", "351px");
                        AvastWRC.ial.sp.UpdateContent("#a-panel", false, "activeCoupons", AvastWRC.Templates.activeCoupons, function () {
                            $('.a-sp-active-coupons-info').click(function (e) {
                                $(".a-sp-items-wrapper").animate({ scrollTop: 0 }, "slow");
                                AvastWRC.ial.sp.CouponsTabClick();
                            });
                        }, AvastWRC.ial.sp.coupopnIntabData);
                    }
                }
            }else{
                AvastWRC.ial.sp.data = data;
                if (data.transactionFinished && data.iconClicked) {
                    AvastWRC.ial.sp.feedback({
                        type: 'reset_icon_click'
                    });
                }
                // on the case we receive more info to show
                if (data && data.producstLength > 0) {
                    AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "offersWrapper", AvastWRC.Templates.offersWrapper, function () {
                        $('#offersTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                        AvastWRC.ial.sp.BindOfferEvents();
                    });
                }

                if (data && data.accommodationsLength > 0) {
                    AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "offersWrapper", AvastWRC.Templates.offersWrapper, function () {
                        $('#offersTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                        AvastWRC.ial.sp.BindOfferEvents();
                    });
                }

                if (data && data.couponsLength > 0) {
                    AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "couponsWrapper", AvastWRC.Templates.couponsWrapper, function () {
                        $('#couponsTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                        AvastWRC.ial.sp.BindCouponEvents();
                    });
                    if (data.vouchersSelected) {
                        $(".a-sp-items-wrapper").css("height", "351px");
                        AvastWRC.ial.sp.UpdateContent("#a-panel", false, "activeCoupons", AvastWRC.Templates.activeCoupons, function () {
                            $('.a-sp-active-coupons-info').click(function (e) {
                                $(".a-sp-items-wrapper").animate({ scrollTop: 0 }, "slow");
                                AvastWRC.ial.sp.CouponsTabClick();
                            });
                        });
                    }
                }

                if (data && data.redirectLength > 0) {
                    AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "othersWrapper", AvastWRC.Templates.othersWrapper, function () {
                        $('#othersTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                        AvastWRC.ial.sp.BindOtherEvents();
                    }, { redirect: data.redirect[0], templateData: data.panelData.redirect, isPanelTemplate: true, isRedirect: true });
                }
                else if (data && data.similarCouponsValue > 0) {
                    AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "othersWrapper", AvastWRC.Templates.othersWrapper, function () {
                        $('#othersTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                        AvastWRC.ial.sp.BindOtherEvents();
                    }, { similarCoupon: data.similarCoupons[0], templateData: AvastWRC.ial.sp.data.panelData.notifications.templateData, isPanelTemplate: true, isSimilarCoupons: true });
                }

                if (data.panelShown) {
                    if (AvastWRC.ial.sp.data.activeTab == "OFFERS_TAB_HIGHLIGHTED") {
                        AvastWRC.ial.sp.OffersTabClick();
                    }
                    else if (AvastWRC.ial.sp.data.activeTab == "COUPONS_TAB_HIGHLIGHTED") {
                        AvastWRC.ial.sp.CouponsTabClick();
                    }
                    else if (AvastWRC.ial.sp.data.activeTab == "OTHERS_TAB_HIGHLIGHTED") {
                        AvastWRC.ial.sp.OthersTabClick();
                    }
                }
            }
        },

        updateMinPanel: function (data) {
            var elem = document.getElementById("asp-panel-min");
            if (elem) {
                elem.parentNode.removeChild(elem);
            }
            var minTemplate = Mustache.render(AvastWRC.Templates.safeShopMinimizedPanel, data);
            AvastWRC.ial.getTopHtmlElement().prepend(minTemplate);
            this.makeDraggable(document.getElementById('asp-panel-min'));
            this.BindMinPanelEvents();
        },

        BindPanelEvents: function () {
            $("#closePanel").click(function (e) {
                AvastWRC.ial.sp.ClosePanel(e);
            });
            $("#minPanel").click(function (e) {
                AvastWRC.ial.sp.MinPanel(e);
                var data = AvastWRC.ial.sp.data;
                if(!AvastWRC.ial.sp.couponInTab){
                    AvastWRC.ial.sp.feedback({
                        type: 'main_ui_event',
                        action: 'minimize_click',
                        category: data.activeTab,
                        domain: data.domain,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || "",
                        //isCouponTab: AvastWRC.ial.sp.couponInTab /*only if event needed*/
                    });
                }
            });
            $("#settingsPanel").click(function (e) {
                AvastWRC.ial.sp.SettingsPanel(e);
            });
            $("#offersTab").click(function (e) {
                AvastWRC.ial.sp.OffersTabClick(e);
                var data = AvastWRC.ial.sp.data;
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'offers_tab_click',
                    category: AvastWRC.ial.sp.data.defaultTab,
                    domain: data.domain,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || ""
                });
            });
            $("#couponsTab").click(function (e) {
                AvastWRC.ial.sp.CouponsTabClick(e);
                var data = AvastWRC.ial.sp.data;
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'coupons_tab_click',
                    category: AvastWRC.ial.sp.data.defaultTab,
                    domain: data.domain,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || ""
                });
            });
            $("#othersTab").click(function (e) {
                AvastWRC.ial.sp.OthersTabClick(e);
                var data = AvastWRC.ial.sp.data;
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'others_tab_click',
                    category: AvastWRC.ial.sp.data.defaultTab,
                    domain: data.domain,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || ""
                });
            });
            $(".a-sp-header-top-left").click(function () {
                let data = AvastWRC.ial.sp.data;
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'logo_click',
                    category: data.activeTab,
                    domain: data.domain,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || ""
                });
            });

        },

        BindMinPanelEvents: function (el) {
            $("#asp-panel-min").click(function (e) {
                if (!$(this).hasClass("dragged")) {
                    AvastWRC.ial.sp.MaxPanel(e);
                }
            })
        },

        UnBindMinPanelEvents: function () {
            $("#asp-panel-min").unbind("click", AvastWRC.ial.sp.MaxPanel);
        },

        BindOfferEvents: function () {
            $(".asp-offer-item").click(function (e) {
                AvastWRC.ial.sp.OfferClick(e, true);
            });
            $(".asp-offer-item-hotel-image").on("error", function(e){
                $(this).attr('src', AvastWRC.ial.sp.data.panelData.images.placeholder);
            });
            $(".asp-offer-item-image").on("error", function(){
                $(this).attr('src', AvastWRC.ial.sp.data.panelData.images.placeholder);
            });
        },

        BindOtherEvents: function () {
            $("#redirectButton").click(function (e) {
                AvastWRC.ial.sp.OfferClick(e, true);
            });
            $("#redirectMoreInfo").click(function (e) {
                AvastWRC.ial.sp.toggleExtraRedirectInfo();
            });

            $("#redirectImage").on("error", function(e){
                $(this).attr('src', AvastWRC.ial.sp.data.panelData.images.redirectPlaceholderBig);
                $(this).css("object-fit", "contain");
            });

            $("#similarCouponsButton").click(function (e) {
                AvastWRC.ial.sp.CouponClick(e, true);
            });
        },

        toggleExtraRedirectInfo: function () {
            let redirectExtraInfoIcon = ".a-sp-notifications-redirect-info-icon",
                redirectExtraInfoText = ".a-sp-notifications-redirect-info-text",
                redirectExtraInfoTextPaddingElement = ".a-sp-notifications-redirect-info-toggle-text-padding",
                redirectExtraInfoLess = ".a-sp-notifications-redirect-info-less",
                redirectExtraInfoMore = ".a-sp-notifications-redirect-info-more",
                rotateClass = "a-sp-notifications-rotate";

            rotateExtraInfoIcon();
            toggleExtraInfoContent();

            function rotateExtraInfoIcon() {
                $(redirectExtraInfoIcon).toggleClass(rotateClass);
            }

            function toggleExtraInfoContent() {
                $(redirectExtraInfoText).toggleClass(AvastWRC.ial.sp.notifications.config.classForHidden);
                $(redirectExtraInfoLess).toggleClass(AvastWRC.ial.sp.notifications.config.classForHidden);
                $(redirectExtraInfoMore).toggleClass(AvastWRC.ial.sp.notifications.config.classForHidden);
                $(redirectExtraInfoTextPaddingElement).toggleClass(AvastWRC.ial.sp.notifications.config.classForHidden);
            }
        },

        BindCouponEvents: function () {
            console.log($(".asp-coupon-item > .asp-coupon-bottom"));
            console.log($(".asp-coupon-item"));
            $('.asp-coupon-bottom').click(function (e) {
                console.log('coupon clicked fired');
                e.preventDefault();
                $(".asp-coupon-hover").removeClass("avast-sas-display-block");
                AvastWRC.ial.sp.SetActiveCoupon(e.currentTarget.attributes.resurl.value);
                $(".a-sp-items-wrapper").css("height", "351px");
                $(".a-sp-items-wrapper").animate({ scrollTop: 0 }, "slow");
                AvastWRC.ial.sp.CouponClick(e, true);
                AvastWRC.ial.sp.UpdateContent("#a-panel", false, "activeCoupons", AvastWRC.Templates.activeCoupons, function () {
                    $('.a-sp-active-coupons-info').click(function (e) {
                        $(".a-sp-items-wrapper").animate({ scrollTop: 0 }, "slow");
                        AvastWRC.ial.sp.CouponsTabClick();
                    });
                });
                AvastWRC.ial.sp.CouponsTabClick(e);
        
            });           
            
            $(".asp-coupon-bottom-with-code").click(function (e) {
                e.preventDefault();
                AvastWRC.ial.sp.copyTextToClipboard(e);
            });

        },

        activateShowMoreTextDivs: function (){
            $(".asp-coupon-description-more-info").unbind("click");
            $(".asp-coupon-description-less-info").unbind("click");

            $(".asp-coupon-item").each(function(index,item){
                changeValue(item);
            });
            $(".asp-coupon-item-active").each(function(index,item){
                changeValue(item);
            });

            $(".asp-coupon-item-active-with-code").each(function(index,item){
                changeValue(item);
            });
            function changeValue(item){
                if(!item)return;
                var elDesc = $(item).find(".asp-coupon-description") || $(item).find(".asp-coupon-description-full-size");
                var elDescText = $(item).find(".asp-coupon-description-text") || $(item).find(".asp-coupon-description-full-size-text");
                if(elDesc &&  elDescText){
                    if($(elDescText).height() > $(elDesc).height() 
                        || $(elDescText).prop('scrollHeight') > $(elDescText).height() ){
                        $(item.children[0].children[3]).css("opacity", 1);
                        $(item.children[0].children[3])[0].id = "more-info-show";
                    }
                }
            }
            $(".asp-coupon-description-less-info").click(function(e){
                showLess(e);
            });

            $(".asp-coupon-description-more-info").click(function(e){
                showMore(e);
            });

            function showMore(e) {
                if(e.currentTarget.id.indexOf("more-info-show") == -1)return;
                var text = AvastWRC.ial.sp.data.panelData.strings.spNotificationRedirectShowLessMessage;;
                e.preventDefault();
                console.log(e);
                $(e.currentTarget.parentElement.children[2]).css("height", "auto");
                $(e.currentTarget.parentElement.children[2].children[0]).css("-webkit-line-clamp", "1000");
                e.currentTarget.className = "asp-coupon-description-less-info";
                e.currentTarget.innerText = text || "Less";
                $(".asp-coupon-description-more-info").unbind("click", showMore);
                $(".asp-coupon-description-less-info").click(function(e){
                    showLess(e);
                });
            }

            function showLess(e) {
                if(e.currentTarget.id.indexOf("more-info-show") == -1)return;
                var text = AvastWRC.ial.sp.data.panelData.strings.spNotificationRedirectShowMoreMessage;;
                e.preventDefault();
                console.log(e);
                $(e.currentTarget.parentElement.children[2]).css("height", "39px");
                $(e.currentTarget.parentElement.children[2].children[0]).css("-webkit-line-clamp", "3");
                e.currentTarget.className = "asp-coupon-description-more-info";
                e.currentTarget.innerText = text || "More";
                $(".asp-coupon-description-less-info").unbind("click", showLess);
                $(".asp-coupon-description-more-info").click(function(e){
                    showMore(e);
                });
            }    
        },

        SetActiveCoupon: function (couponUrl) {
            if (AvastWRC.ial.sp.ModifyInList(AvastWRC.ial.sp.data.coupons, couponUrl, "selected", true)) {
                AvastWRC.ial.sp.data.vouchersSelectedCounter = AvastWRC.ial.sp.data.vouchersSelectedCounter + 1;
                if (AvastWRC.ial.sp.data.vouchersSelectedCounter >= 10) {
                    AvastWRC.ial.sp.data.vouchersCounterBig = true;
                    AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "activeCoupons", AvastWRC.Templates.activeCoupons, function () {
                    });
                }
                AvastWRC.ial.sp.data.vouchersSelected = true;
                AvastWRC.ial.sp.data.vouchersAvailable = (AvastWRC.ial.sp.data.couponsLength - AvastWRC.ial.sp.data.vouchersSelectedCounter > 0) ? true : false;
                AvastWRC.ial.sp.UpdateContent(".a-sp-items-wrapper", true, "couponsWrapper", AvastWRC.Templates.couponsWrapper, function () {
                    $('#couponsTabState').removeClass("a-sp-shown").addClass("a-sp-to-be-shown");
                    AvastWRC.ial.sp.BindCouponEvents();
                });
            }
        },

        UnbindPanelEvents: function () {
            $("#closePanel").unbind("click", AvastWRC.ial.sp.ClosePanel);
            $("#minPanel").unbind("click", AvastWRC.ial.sp.MinPanel);
            $("#settingsPanel").unbind("click", AvastWRC.ial.sp.SettingsPanel);

            $("#offersTab").unbind("click", AvastWRC.ial.sp.OffersTabClick);
            $("#couponsTab").unbind("click", AvastWRC.ial.sp.CouponsTabClick);
            $("#othersTab").unbind("click", AvastWRC.ial.sp.OthersTabClick);

            $("#offer").unbind("click", AvastWRC.ial.sp.OfferClick);
            $("#accommodation").unbind("click", AvastWRC.ial.sp.OfferClick);
            $("#redirect").unbind("click", AvastWRC.ial.sp.OfferClick);
            $(".asp-coupon-bottom").unbind("click", AvastWRC.ial.sp.CouponClick);
        },

        ClosePanel: function (e) {
            $('#a-panel').removeClass('asp-sas-display-grid')
                .addClass('asp-sas-display-none');
            //AvastWRC.ial.sp.UnbindPanelEvents();

            var data = AvastWRC.ial.sp.data;
            if(!AvastWRC.ial.sp.couponInTab){
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: "close_click",
                    domain: data.domain,
                    category: data.activeTab,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    //isCouponTab: AvastWRC.ial.sp.couponInTab /*only if event needed*/
                });
            }
            AvastWRC.ial.sp.moveExternalPanels(0);
        },

        MinPanel: function (e, minimizedNotification) {
            $('#a-panel').removeClass('asp-sas-display-grid').addClass('asp-sas-display-none');
            AvastWRC.ial.sp.notifications.showMinimizedNotification();
        },

        MaxPanel: function (e) {
            $('#asp-panel-min').addClass(AvastWRC.ial.sp.notifications.config.classForHidden);
            //AvastWRC.ial.sp.UnBindMinPanelEvents();
            AvastWRC.ial.sp.showPanel("showMinimizedNotifications");
            var data = AvastWRC.ial.sp.data;
            if(!AvastWRC.ial.sp.couponInTab){
                AvastWRC.ial.sp.feedback({
                    type: 'minimized_ui_clicked',
                    domain: data.domain,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || ""
                });
            }
        },

        SettingsPanel: function (e) {
            var data = AvastWRC.ial.sp.data;
            if(!AvastWRC.ial.sp.couponInTab){
                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'settings_click',
                    category: data.activeTab,
                    domain: data.domain,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || "",
                    //isCouponTab: AvastWRC.ial.sp.couponInTab /*only if event needed*/
                });
            }
        },

        OffersTabClick: function (e) {
            $('#offersTab').removeClass('a-sp-header-bottom-col1').addClass('a-sp-header-bottom-col1-selected');
            $('#couponsTab').removeClass('a-sp-header-bottom-col2-selected').addClass('a-sp-header-bottom-col2');
            $('#othersTab').removeClass('a-sp-header-bottom-col3-selected').addClass('a-sp-header-bottom-col3');

            $('#offersWrapper').addClass('asp-sas-display-block');
            $('#couponsWrapper').removeClass('asp-sas-display-block');
            $('#othersWrapper').removeClass('asp-sas-display-block');

            $('#offersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
            AvastWRC.ial.sp.data.activeTab = "OFFERS_TAB_HIGHLIGHTED";
        },

        CouponsTabClick: function (e) {
            $('#offersTab').removeClass('a-sp-header-bottom-col1-selected').addClass('a-sp-header-bottom-col1');
            $('#couponsTab').removeClass('a-sp-header-bottom-col2').addClass('a-sp-header-bottom-col2-selected');
            $('#othersTab').removeClass('a-sp-header-bottom-col3-selected').addClass('a-sp-header-bottom-col3');

            $('#offersWrapper').removeClass('asp-sas-display-block');
            $('#couponsWrapper').addClass('asp-sas-display-block');
            $('#othersWrapper').removeClass('asp-sas-display-block');

            $('#couponsTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");

            AvastWRC.ial.sp.data.activeTab = "COUPONS_TAB_HIGHLIGHTED";

            setTimeout(() => {
                AvastWRC.ial.sp.activateShowMoreTextDivs();
            }, 1000); 
        },

        OthersTabClick: function (e) {
            $('#offersTab').removeClass('a-sp-header-bottom-col1-selected').addClass('a-sp-header-bottom-col1');
            $('#couponsTab').removeClass('a-sp-header-bottom-col2-selected').addClass('a-sp-header-bottom-col2');
            $('#othersTab').removeClass('a-sp-header-bottom-col3').addClass('a-sp-header-bottom-col3-selected');

            $('#offersWrapper').removeClass('asp-sas-display-block');
            $('#couponsWrapper').removeClass('asp-sas-display-block');
            $('#othersWrapper').addClass('asp-sas-display-block');

            $('#othersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");

            AvastWRC.ial.sp.data.activeTab = "OTHERS_TAB_HIGHLIGHTED";
        },

        FindInList: function (list, url) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].url === url) {
                    return { element: list[i], position: i };
                }
            }
            return null;
        },
        ModifyInList: function (list, url, key, value) {
            for (var i = 0; i < list.length; i++) {
                if (list[i].url === url) {
                    list[i][key] = value;
                    return true;
                }
            }
            return false;
        },

        OfferClick: function (e, panelClick = false) {
            var data = AvastWRC.ial.sp.data;
            if(!data) return;

            e.preventDefault();
            var url = e.currentTarget.attributes.resurl.value;
            var offers = [];
            var offer = null;
            var offerCategory = "";

            if(!url) return;

            if (data.producstLength > 0) {
                offers = data.products;
                providerId = data.providerId ? data.providerId : "";
                offer = AvastWRC.ial.sp.FindInList(offers, url);
                offerCategory = "PRODUCT";
                if (offer) {
                    sendOffersFeedback();
                    return;
                }
            }
            if (data.accommodationsLength > 0) {
                offers = data.accommodations;
                providerId = data.providerId ? data.providerId : "";
                offer = AvastWRC.ial.sp.FindInList(offers, url);
                offerCategory = "ACCOMMODATION";
                if (offer) {
                    sendOffersFeedback();
                    return;
                }
            }
            if (data.redirectLength > 0) {
                offers = data.redirect;
                offerCategory = "REDIRECT";
                providerId = data.redirectProviderId ? data.redirectProviderId : "";
                offer = AvastWRC.ial.sp.FindInList(offers, url);
                if (offer) {
                    sendOffersFeedback();
                    return;
                }
            }

            function sendOffersFeedback(){
                AvastWRC.ial.sp.feedback({
                    type: 'offer_click',
                    url: url,
                    offer: offer.element,
                    positionInList: offer.position,
                    offerCategory: offerCategory,
                    providerId: providerId,
                    query: data.scan ? JSON.stringify(data.scan) : "",
                    offerQuery: data.offerQuery,
                    domain: data.domain,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    showRateWindow: data.showRateWindow,
                    referrer: data.referrer || "",
                    which: e.target.myWhich || 1,
                    transactionId: data.transactionId || "",
                    panelClick: panelClick,
                    showOffersNotification: data.showOffersNotification,
                });
            }

        },
        // add the events on click of the offers and 

        CouponClick: function (e, panelClick = false) {
            var data = AvastWRC.ial.sp.data;

            e.preventDefault();

            var url = e.currentTarget.attributes.resurl.value, coupons = [], coupon = null;
            if(!url) return;
            if (data.couponsLength > 0) {
                coupons = data.coupons;
                coupon = AvastWRC.ial.sp.FindInList(coupons, url);
                if(coupon){
                    sendCouponsFeedback();
                    return;
                }
            }
            if (data.similarCouponsValue > 0) {
                coupons = data.similarCoupons;
                coupon = AvastWRC.ial.sp.FindInList(coupons, url);
                if(coupon){
                    sendCouponsFeedback();
                    return;
                }
            }

            function sendCouponsFeedback(){
                 AvastWRC.ial.sp.feedback({
                    type: 'coupon_click',
                    url: url,
                    coupon: coupon.element,
                    positionInList: coupon.position,
                    domain: data.domain,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    showRateWindow: data.showRateWindow,
                    referrer: data.referrer || "",
                    which: e.target.myWhich || 1,
                    providerId: data.voucherProviderId ? data.voucherProviderId : "",
                    query: data.scan ? JSON.stringify(data.scan) : "",
                    offerQuery: data.offerQuery,
                    merchantURL: window.location.href,
                    transactionId: data.transactionId || "",
                    panelClick: panelClick,
                    merchantURL: data.url
                });
            }
            e.target.myWhich = 0;
        },
        // add the events on click of the coupons and special deal

        copyTextToClipboard: function (e) {
            let text = e.currentTarget.attributes.cupcod.value;
            let $temp = $("<input>");
            $("body").append($temp);
            $temp.val(text).select();
            document.execCommand("copy");
            $temp.remove();

            let data = AvastWRC.ial.sp.data;
            if (!$(".asp-copied-to-clipboard") || $(".asp-copied-to-clipboard").length <= 0) {
                var template = Mustache.render(AvastWRC.Templates.copiedToClipboard, data);
                AvastWRC.ial.getTopHtmlElement().prepend(template);
            }
            let elementWidht = $(".asp-copied-to-clipboard").outerWidth();
            let elementHeigth = $(".asp-copied-to-clipboard").outerHeight();
            let top = e.pageY - document.body.scrollTop;
            let left = e.pageX - (elementWidht + 10) - document.body.scrollLeft;
            $(".asp-copied-to-clipboard").css("top", top + "px");
            $(".asp-copied-to-clipboard").css("left", left + "px");
            $(".asp-copied-to-clipboard").show("slow", function () {
                setTimeout(() => {
                    $(".asp-copied-to-clipboard").remove();
                }, 2000)
            });
        },

        showPanel: function (message, isCouponTab = null) {
            //on click on the button display the panel
            if(AvastWRC.ial.sp.couponInTab && isCouponTab){
                AvastWRC.ial.sp.CouponsTabClick();

                AvastWRC.ial.sp.data.offersToBeShown = false;
                $('#offersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
                AvastWRC.ial.sp.data.couponsToBeShown = false;
                $('#couponsTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
                AvastWRC.ial.sp.data.othersToBeShown = false;
                $('#othersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");

                $('.a-sp-header-bottom-col1').addClass("asp-sas-display-none");
                $('.a-sp-header-bottom-col3').addClass("asp-sas-display-none");
                $('#settingsPanel').addClass("asp-sas-display-none");
                $('#minPanel').addClass("asp-sas-display-none");

                $("#asp-panel-min").removeClass("asp-sas-display-block").addClass("a-sp-notifications-hidden");
                $('.a-sp-panel').removeClass('asp-sas-display-none').addClass('asp-sas-display-grid');
                
                AvastWRC.ial.sp.activateShowMoreTextDivs();
            }
            else{
                var data = AvastWRC.ial.sp.data;
                $('.a-sp-header-bottom-col1').removeClass("asp-sas-display-none");
                $('.a-sp-header-bottom-col3').removeClass("asp-sas-display-none");
                if (data.panelShown) {
                    if (AvastWRC.ial.sp.data.activeTab == "OFFERS_TAB_HIGHLIGHTED") {
                        AvastWRC.ial.sp.OffersTabClick();
                    }
                    else if (AvastWRC.ial.sp.data.activeTab == "COUPONS_TAB_HIGHLIGHTED") {
                        AvastWRC.ial.sp.CouponsTabClick();
                    }
                    else if (AvastWRC.ial.sp.data.activeTab == "OTHERS_TAB_HIGHLIGHTED") {
                        AvastWRC.ial.sp.OthersTabClick();
                    }
                    else {
                        AvastWRC.ial.sp.OffersTabClick();
                    }
                }
                else if (!message || message.indexOf("showMinimizedNotifications") != -1) {
                    if (data.offersToBeShown || (data.producstLength > 0) || (data.accommodationsLength > 0)) {
                        AvastWRC.ial.sp.OffersTabClick();
                        AvastWRC.ial.sp.data.offersToBeShown = false;
                        $('#offersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
                    } else if (data.othersToBeShown || (data.redirectLength > 0 || data.similarCouponsValue > 0)) {
                        AvastWRC.ial.sp.OthersTabClick();
                        AvastWRC.ial.sp.data.othersToBeShown = false;
                        $('#othersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
                    } else if (data.couponsToBeShown || (data.couponsLength > 0)) {
                        AvastWRC.ial.sp.CouponsTabClick();
                        AvastWRC.ial.sp.data.couponsToBeShown = false;
                        $('#couponsTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
                    }
                    else {
                        AvastWRC.ial.sp.OffersTabClick();
                        AvastWRC.ial.sp.data.offersToBeShown = false;
                        $('#offersTabState').removeClass("a-sp-to-be-shown").addClass("a-sp-shown");
                    }
                }
                else if (message.indexOf("showOffersAndCouponsNotification") != -1
                    || message.indexOf("showOffersAndCouponsBarNotification") != -1
                    || message.indexOf("showOffersNotification") != -1
                    || message.indexOf("showOffersBarNotification") != -1
                    || message.indexOf("showCityHotelsNotification") != -1
                    || message.indexOf("showCityHotelsBarNotification") != -1
                    || message.indexOf("showSimilarHotelsNotification") != -1
                    || message.indexOf("showSimilarHotelsBarNotification") != -1) {
                    AvastWRC.ial.sp.OffersTabClick();
                    AvastWRC.ial.sp.data.offersToBeShown = false;
                }
                else if (message.indexOf("showSimilarCouponsNotification") != -1
                    || message.indexOf("showRedirectNotification") != -1
                    || message.indexOf("showSimilarCouponsBarNotification") != -1
                    || message.indexOf("showRedirectBarNotification") != -1) {
                    AvastWRC.ial.sp.OthersTabClick();
                    AvastWRC.ial.sp.data.othersToBeShown = false;
                }
                else if (message.indexOf("showCouponsNotification") != -1
                    || message.indexOf("showCouponsBarNotification") != -1) {
                    AvastWRC.ial.sp.CouponsTabClick();
                    AvastWRC.ial.sp.data.couponsToBeShown = false;
                }
                $("#asp-panel-min").removeClass("asp-sas-display-block").addClass("a-sp-notifications-hidden");
                $('.a-sp-panel').removeClass('asp-sas-display-none').addClass('asp-sas-display-grid');

                AvastWRC.ial.sp.activateShowMoreTextDivs();

                AvastWRC.ial.sp.feedback({
                    type: 'main_ui_event',
                    action: 'shown', // panel was shown
                    domain: data.domain,
                    category: data.activeTab,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || ""
                });
            }

            var activeTab = AvastWRC.ial.sp.data.activeTab;
            if (!data.panelShown) {
                data.panelShown = true;
                AvastWRC.ial.sp.data.defaultTab = activeTab;
            }

            AvastWRC.ial.sp.data.defaultTab = activeTab;
            AvastWRC.ial.sp.moveExternalPanels();
        },

        extensionIconClicked: function (data) {
            // remove notifications
            AvastWRC.ial.sp.notifications.hideNotifications();
            AvastWRC.ial.sp.showPanel();
        },

        applyCouponInTab: function (data) {
            // remove notifications
            AvastWRC.ial.sp.couponInTab = true;
            console.log("applyCouponInTab");
            //AvastWRC.ial.sp.notifications.hideNotifications();
            AvastWRC.ial.sp.createPanel(data, true);
            AvastWRC.ial.sp.updatePanel(data, true);
            AvastWRC.ial.sp.showPanel(null, true);
        },


        removeElement: function (id) {
            var elem = document.getElementById(id);
            if (elem) {
                return elem.parentNode.removeChild(elem);
            }
        },

        notifications: {
            prepareTemplates: function (data) {
                prepareNotificationTemplate(data, AvastWRC.Templates.notification, AvastWRC.ial.sp.notifications.config.notificationsContainer.standard);
                prepareNotificationTemplate(data, AvastWRC.Templates.notificationBar, AvastWRC.ial.sp.notifications.config.notificationsContainer.bar, true);
                prepareNotificationTemplate(data, AvastWRC.Templates.notificationRedirectBar, AvastWRC.ial.sp.notifications.config.notificationsContainer.redirectBar, true);
                prepareNotificationTemplate(data, AvastWRC.Templates.safeShopMinimizedPanel, AvastWRC.ial.sp.notifications.config.notificationsContainer.minimized);

                function prepareNotificationTemplate(data, template, element, isBar) {
                    if (!elementExists(element)) {
                        if (isBar) {
                            AvastWRC.ial.sp.topBarElement = AvastWRC.ial.sp.topBar(Mustache.render(template, data), element,
                                AvastWRC.ial.sp.notifications.config.values.bar.height, AvastWRC.ial.sp.data.panelData.topBarRules || []);
                        } else {
                            AvastWRC.ial.getTopHtmlElement().prepend(Mustache.render(template, data));
                        }
                    }
                }

                function elementExists(element) {
                    return $(element).length;
                }
            },
            showStandardNotification: function (data) {
                if(!AvastWRC.ial.sp.couponInTab){
                    this.loadNotification(AvastWRC.ial.sp.notifications.config.notificationsType.standard, data);
                }
            },
            showRedirectNotification: function (data, template, notificationsType) {
                if(!AvastWRC.ial.sp.couponInTab){
                    AvastWRC.ial.getTopHtmlElement().prepend(Mustache.render(template, formatRedirectData(data)));
                    this.loadNotification(notificationsType, data);

                    function formatRedirectData(data) {
                        let formattedData = JSON.parse(JSON.stringify(data));
                        formattedData.redirect = data.redirect[0];

                        return formattedData;
                    }
                }
            },
            showBarNotification: function (data) {
                if(!AvastWRC.ial.sp.couponInTab){
                    this.loadNotification(AvastWRC.ial.sp.notifications.config.notificationsType.bar, data);
                }
            },
            showMinimizedNotification: function (data = {
                replace: [AvastWRC.ial.sp.data.detailsToClosed.offerNumber],
                message: AvastWRC.ial.sp.notifications.config.messages.injected.showMinimizedNotifications.key.replace("message.", "")
            }) {
                if (!AvastWRC.ial.sp.couponInTab){
                    this.loadNotification(AvastWRC.ial.sp.notifications.config.notificationsType.minimized, data);
                }
            },
            registerEventsMessage: function (ee) {
                for (let message in this.config.messages.injected) {
                    ee.on(this.config.messages.injected[message].key,
                        this.config.messages.injected[message].action || ((data) => AvastWRC.ial.sp.notifications.showStandardNotification(data)));
                }
            },
            loadNotification: function (notificationsType, data) {
                let buttonsWithRippleEffect = [".a-sp-notifications-button", ".a-sp-notifications-redirect-button-show", ".asp-notifications-bar-button"];
                AvastWRC.ial.sp.notifications.config.values.currentData = data;

                init(notificationsType);
                AvastWRC.ial.sp.moveExternalPanels();
                sendShownNotificationFeedback(data);

                function init(notificationsType) {
                    switch (notificationsType) {
                        case AvastWRC.ial.sp.notifications.config.notificationsType.redirect:
                            initRedirectNotification();
                            break;
                        case AvastWRC.ial.sp.notifications.config.notificationsType.barRedirect:
                            initRedirectBarNotification();
                            break;
                        case AvastWRC.ial.sp.notifications.config.notificationsType.bar:
                            initBarNotification();
                            break;
                        case AvastWRC.ial.sp.notifications.config.notificationsType.minimized:
                            initMinimizedNotification();
                            break;
                        default:
                            initStandardNotification();
                    }
                }

                function initRedirectBarNotification() {
                    if (!AvastWRC.ial.sp.notifications.config.values.eventsRegistered.barRedirect) registerStandardEvents();

                    hidePanels();
                    showNotification();

                    function showNotification() {
                        let currentData = AvastWRC.ial.sp.notifications.config.values.currentData,
                            currentNotificationConfig = AvastWRC.ial.sp.notifications.config.messages.injected[currentData.message];

                        hideElements(currentNotificationConfig.elementsToHide);
                        showElements(currentNotificationConfig.elementsToShow);
                        showElement(currentNotificationConfig.container);
                        replaceElements(currentNotificationConfig.replace, currentData.replace);
                        showElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.redirectBar);
                        AvastWRC.ial.sp.topBarElement.show();   
                    }

                    function registerStandardEvents() {
                        let closeNotificationIcon = ".asp-notifications-bar-close-icon",
                            settingsNotificationIcon = ".asp-notifications-bar-gear-icon",
                            notificationsButton = ".asp-notifications-bar-button",
                            infoIcon = ".asp-notifications-bar-redirect-deal-info-img",
                            infoBox = ".asp-notification-bar-redirect-deal-info-box",
                            avastIcon = ".asp-notifications-bar-logo",
                            redirectImg = ".asp-notifications-bar-redirect-deal-img";

                        $(redirectImg).on("error", function(e){
                            $(this).attr('src', AvastWRC.ial.sp.data.panelData.images.redirectPlaceholder);
                            $(this).css("object-fit", "cover");
                        });

                        $(settingsNotificationIcon).click((e) => {
                            sendSettingsNotificationFeedback();
                        });

                        $(closeNotificationIcon).click((e) => {
                            hideBar(AvastWRC.ial.sp.notifications.config.notificationsContainer.redirectBar);
                            sendCloseNotificationFeedback();
                        });

                        $(notificationsButton).click((e) => {
                            hideElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.redirectBar);
                            hideBar(AvastWRC.ial.sp.notifications.config.notificationsContainer.redirectBar);
                            AvastWRC.ial.sp.OfferClick(e, false);
                            sendButtonClickNotificationFeedback();
                        });

                        $(infoIcon).mouseenter(() => {
                            $(infoBox).show();
                        }).mouseleave(() => {
                            $(infoBox).hide();
                        });

                        $(avastIcon).click(() => {
                            AvastWRC.ial.sp.notifications.openProductPage();
                        });

                        addRippleEffectToButtons();
                        AvastWRC.ial.sp.notifications.config.values.eventsRegistered.redirectBar = true;
                    }
                }

                function initBarNotification() {
                    if (!AvastWRC.ial.sp.notifications.config.values.eventsRegistered.bar) registerStandardEvents();

                    hidePanels();
                    showNotification();

                    function showNotification() {
                        let currentData = AvastWRC.ial.sp.notifications.config.values.currentData,
                            currentNotificationConfig = AvastWRC.ial.sp.notifications.config.messages.injected[currentData.message];

                        hideElements(currentNotificationConfig.elementsToHide);
                        showElements(currentNotificationConfig.elementsToShow);
                        switchElements(currentNotificationConfig.elementsToSwitch);
                        showElement(currentNotificationConfig.container);
                        if(currentData.message.indexOf("showSimilarCoupons") != -1){
                            addSimilarCouponsUrl();
                        }
                        replaceElements(currentNotificationConfig.replace, currentData.replace);
                        showElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.bar);
                        AvastWRC.ial.sp.topBarElement.show();

                        function addSimilarCouponsUrl() {
                            $(".asp-notifications-bar-button").attr("resurl", currentData.replace[1]);
                        }
                    }

                    function registerStandardEvents() {
                        let closeNotificationIcon = ".asp-notifications-bar-close-icon",
                            settingsIcon = ".asp-notifications-bar-gear-icon",
                            notificationsButton = ".asp-notifications-bar-button",
                            avastIcon = ".asp-notifications-bar-logo";

                        $(settingsIcon).click((e) => {
                            sendSettingsNotificationFeedback();
                        });

                        $(closeNotificationIcon).click((e) => {
                            hideBar(AvastWRC.ial.sp.notifications.config.notificationsContainer.bar);
                            sendCloseNotificationFeedback();
                        });

                        $(notificationsButton).click((e) => {
                            hideBar(AvastWRC.ial.sp.notifications.config.notificationsContainer.bar);
                            if(AvastWRC.ial.sp.notifications.config.values.currentData.message.indexOf("showSimilarCoupons") != -1){
                                AvastWRC.ial.sp.CouponClick(e, false);
                            }
                            AvastWRC.ial.sp.showPanel(AvastWRC.ial.sp.notifications.config.values.currentData.message);
                            sendButtonClickNotificationFeedback();
                        });

                        $(avastIcon).click(() => {
                            AvastWRC.ial.sp.notifications.openProductPage();
                        });

                        addRippleEffectToButtons();

                        AvastWRC.ial.sp.notifications.config.values.eventsRegistered.bar = true;
                    }
                }

                function initStandardNotification() {
                    if (!AvastWRC.ial.sp.notifications.config.values.eventsRegistered.standard) registerStandardEvents();

                    hidePanels();
                    showNotification();

                    if (AvastWRC.ial.sp.notifications.config.values.currentData.replace && AvastWRC.ial.sp.notifications.config.values.currentData.replace[0] < 10) {
                        $(".a-sp-notifications-button-show-amount").css("padding", "2px 6px");
                    }

                   

                    function showNotification() {
                        let currentData = AvastWRC.ial.sp.notifications.config.values.currentData,
                            currentNotificationConfig = AvastWRC.ial.sp.notifications.config.messages.injected[currentData.message];

                        hideElements(currentNotificationConfig.elementsToHide);
                        showElements(currentNotificationConfig.elementsToShow);
                        switchElements(currentNotificationConfig.elementsToSwitch);
                        showElement(currentNotificationConfig.container);
                        replaceElements(currentNotificationConfig.replace, currentData.replace);
                        if(currentData.message.indexOf("showSimilarCoupons") != -1){
                            addSimilarCouponsUrl();
                        }
                        showElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.standard);

                        function addSimilarCouponsUrl() {
                            $(".a-sp-notifications-button").attr("resurl", currentData.replace[1]);
                        }

                        $(AvastWRC.ial.sp.notifications.config.notificationsContainer.standard).addClass(AvastWRC.ial.sp.notifications.config.classForNotificationAnimation);
                    }

                    function registerStandardEvents() {
                        let closeNotificationIcon = ".a-sp-notifications-header-close-icon",
                            settingsIcon = ".a-sp-notifications-header-gear-icon",
                            notificationsButton = ".a-sp-notifications-button",
                            headerDrag = "a-sp-notifications-header-drag",
                            avastIcon = ".a-sp-notifications-header-logo-icon";

                        $(settingsIcon).click((e) => {
                            sendSettingsNotificationFeedback();
                        });

                        $(closeNotificationIcon).click((e) => {
                            hideElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.standard);
                            sendCloseNotificationFeedback();
                        });

                        $(notificationsButton).click((e) => {
                            hideElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.standard);
                            if(AvastWRC.ial.sp.notifications.config.values.currentData.message.indexOf("showSimilarCoupons") != -1){
                                AvastWRC.ial.sp.CouponClick(e, false);
                            }
                            AvastWRC.ial.sp.showPanel(AvastWRC.ial.sp.notifications.config.values.currentData.message);
                            sendButtonClickNotificationFeedback();                            
                        });

                        $(avastIcon).click(() => {
                            AvastWRC.ial.sp.notifications.openProductPage();
                        });

                        addRippleEffectToButtons();

                        AvastWRC.ial.sp.makeDraggable(document.getElementById(headerDrag),
                            document.getElementById(AvastWRC.ial.sp.notifications.config.notificationsContainer.standard.replace("#", "")));
                        AvastWRC.ial.sp.notifications.config.values.eventsRegistered.standard = true;
                    }
                }

                function initRedirectNotification() {
                    let redirectExtraInfo = ".a-sp-notifications-redirect-info",
                        showRedirectButton = ".a-sp-notifications-redirect-button-show",
                        closeRedirectIcon = ".a-sp-notifications-redirect-header-close-icon",
                        settingsIcon = ".a-sp-notifications-redirect-header-gear-icon",
                        headerDrag = "a-sp-notifications-redirect-header-drag",
                        avastIcon = ".a-sp-notifications-redirect-header-logo-icon",
                        redirectImg = ".a-sp-notifications-redirect-img";  

                    $(redirectImg).on("error", function(e){
                        $(this).attr('src', AvastWRC.ial.sp.data.panelData.images.redirectPlaceholderBig);
                        $(this).css("object-fit", "contain");
                    });

                    hidePanels();
                    addRippleEffectToButtons();

                    AvastWRC.ial.sp.makeDraggable(document.getElementById(headerDrag),
                        document.getElementById(AvastWRC.ial.sp.notifications.config.notificationsContainer.redirect.replace("#", "")));

                    $(avastIcon).click(() => {
                        AvastWRC.ial.sp.notifications.openProductPage();
                    });

                    $(settingsIcon).click((e) => {
                        sendSettingsNotificationFeedback();
                    });

                    $(redirectExtraInfo).click(toggleExtraRedirectInfo);

                    $(showRedirectButton).click((e) => {
                        hideElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.redirect);
                        AvastWRC.ial.sp.OfferClick(e, false);
                        sendButtonClickNotificationFeedback();
                    });

                    $(closeRedirectIcon).click((e) => {
                        hideElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.redirect);
                        sendCloseNotificationFeedback();
                    });

                    function toggleExtraRedirectInfo() {
                        let redirectExtraInfoIcon = ".a-sp-notifications-redirect-info-icon",
                            redirectExtraInfoText = ".a-sp-notifications-redirect-info-text",
                            redirectExtraInfoTextPaddingElement = ".a-sp-notifications-redirect-info-toggle-text-padding",
                            redirectExtraInfoLess = ".a-sp-notifications-redirect-info-less",
                            redirectExtraInfoMore = ".a-sp-notifications-redirect-info-more",
                            rotateClass = "a-sp-notifications-rotate";

                        rotateExtraInfoIcon();
                        toggleExtraInfoContent();

                        function rotateExtraInfoIcon() {
                            $(redirectExtraInfoIcon).toggleClass(rotateClass);
                        }

                        function toggleExtraInfoContent() {
                            $(redirectExtraInfoText).toggleClass(AvastWRC.ial.sp.notifications.config.classForHidden);
                            $(redirectExtraInfoLess).toggleClass(AvastWRC.ial.sp.notifications.config.classForHidden);
                            $(redirectExtraInfoMore).toggleClass(AvastWRC.ial.sp.notifications.config.classForHidden);
                            $(redirectExtraInfoTextPaddingElement).toggleClass(AvastWRC.ial.sp.notifications.config.classForHidden);
                        }
                    }
                }

                function initMinimizedNotification() {
                    let currentData = AvastWRC.ial.sp.notifications.config.values.currentData,
                        currentNotificationConfig = AvastWRC.ial.sp.notifications.config.messages.injected.showMinimizedNotifications;

                    // In case that notifications weren't available, it takes badge from panel
                    if (!AvastWRC.ial.sp.notifications.config.values.eventsRegistered.minimized) registerEvents();
                    replaceElements(currentNotificationConfig.replace, currentData.replace.filter((item) => Number.isInteger(item)));
                    showElement(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimized);
                    AvastWRC.ial.sp.notifications.config.values.eventsRegistered.minimized = true;

                    function registerEvents() {
                        AvastWRC.ial.sp.makeDraggable(document.getElementById(AvastWRC.ial.sp.notifications.config.notificationsContainer.minimized.replace("#", "")));
                        AvastWRC.ial.sp.BindMinPanelEvents();
                    }
                }

                function sendSettingsNotificationFeedback() {
                    let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData;

                    AvastWRC.ial.sp.feedback({
                        type: 'notifications_events',
                        action: "settings_click",
                        domain: data.domain,
                        mesageCategory: currentData.message,
                        category: currentData.category,
                        notificationType: currentData.notificationType,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || ""
                    });
                }

                function sendCloseNotificationFeedback() {
                    let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData;

                    AvastWRC.ial.sp.feedback({
                        type: 'notifications_events',
                        action: "close_click",
                        domain: data.domain,
                        mesageCategory: currentData.message,
                        category: currentData.category,
                        categoryFlag: currentData.notificationCategoryFlag,
                        notificationType: currentData.notificationType,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || ""
                    });

                    AvastWRC.ial.sp.moveExternalPanels(0);
                }

                function sendButtonClickNotificationFeedback() {
                    let data = AvastWRC.ial.sp.data, currentData = AvastWRC.ial.sp.notifications.config.values.currentData;

                    AvastWRC.ial.sp.feedback({
                        type: 'notifications_events',
                        action: "button_click",
                        mesageCategory: currentData.message,
                        category: currentData.category,
                        notificationType: currentData.notificationType,
                        domain: data.domain,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || ""
                    });
                }

                function sendShownNotificationFeedback() {
                    let data = AvastWRC.ial.sp.data,
                        currentData = AvastWRC.ial.sp.notifications.config.values.currentData,
                        defaultMessage = "notifications_events";

                    AvastWRC.ial.sp.feedback({
                        type: AvastWRC.ial.sp.notifications.config.messages.injected[currentData.message].notificationType || defaultMessage,
                        action: "shown",
                        mesageCategory: currentData.message,
                        category: currentData.category,
                        notificationType: currentData.notificationType,
                        domain: data.domain,
                        campaignId: data.campaignId,
                        showABTest: data.showABTest,
                        referrer: data.referrer || "",
                        transactionId: data.transactionId || "",
                        minimizedWithCoupons: data.couponsLength > 0
                    });
                }

                function hidePanels() {
                    let panels = {
                        min: "#asp-panel-min",
                        standard: ".a-sp-panel",
                        showToggleClass: "asp-sas-display-block",
                        hideToggleClass: "asp-sas-display-none"
                    };

                    $(panels.standard).removeClass(panels.showToggleClass).addClass(panels.hideToggleClass);
                    $(panels.min).addClass(AvastWRC.ial.sp.notifications.config.classForHidden);
                }

                function hideBar(bar) {
                    hideElement(bar);
                    AvastWRC.ial.sp.topBarElement.remove();
                }

                function addRippleEffectToButtons() {
                    for (let i = 0; i <= buttonsWithRippleEffect.length; i++) {
                        $(buttonsWithRippleEffect[i]).mousedown(rippleCommonAction);
                    }
                }

                function rippleCommonAction(e) {
                    e.preventDefault();
                    AvastWRC.ial.addRippleEffect(e, e.target.className);
                }

                function hideElement(element, classForHiding = AvastWRC.ial.sp.notifications.config.classForHidden) {
                    classForHiding ? $(element).addClass(classForHiding) : $(element).hide();
                }

                function showElement(element, classToAvoidHidden = AvastWRC.ial.sp.notifications.config.classForHidden) {
                    classToAvoidHidden ? $(element).removeClass(classToAvoidHidden) : $(element).show();
                }

                function hideElements(elements = []) {
                    for (let i = 0; i < elements.length; i++) {
                        hideElement(elements[i]);
                    }
                }

                function showElements(elements = []) {
                    for (let i = 0; i < elements.length; i++) {
                        showElement(elements[i]);
                    }
                }

                function replaceElements(elements = [], values = []) {
                    for (let i = 0; i < elements.length; i++) {
                        if (typeof elements[i] === "object") {
                            setTimeout(() => {
                                $(elements[i].el).attr(elements[i].prop, elements[i].val)
                            }, elements[i].timeout || 0)
                        } else {
                            $(elements[i]).text(values[i]);
                        }
                    }
                }

                function switchElements(elements = []) {
                    for (let i = 0; i < elements.length; i++) {
                        setTimeout(() => {
                            $(elements[i].hide).addClass(elements[i].class);
                            $(elements[i].show).removeClass(elements[i].class);
                        }, elements[i].timeout || 0)
                    }
                }
            },
            hideNotifications: function () {
                for (let key in AvastWRC.ial.sp.notifications.config.notificationsContainer) {
                    if ($(AvastWRC.ial.sp.notifications.config.notificationsContainer[key].length) &&
                        (AvastWRC.ial.sp.notifications.config.notificationsContainer[key] !== AvastWRC.ial.sp.notifications.config.notificationsContainer.panel))
                        $(AvastWRC.ial.sp.notifications.config.notificationsContainer[key]).addClass(AvastWRC.ial.sp.notifications.config.classForHidden);
                }

                AvastWRC.ial.sp.topBarElement.remove();
            },
            openProductPage: function () {
                let data = AvastWRC.ial.sp.data,
                    currentData = AvastWRC.ial.sp.notifications.config.values.currentData,
                    defaultMessage = "notifications_events";

                AvastWRC.ial.sp.feedback({
                    type: AvastWRC.ial.sp.notifications.config.messages.injected[currentData.message].notificationType || defaultMessage,
                    action: "logo_click",
                    mesageCategory: currentData.message,
                    category: currentData.category,
                    notificationType: currentData.notificationType,
                    domain: data.domain,
                    campaignId: data.campaignId,
                    showABTest: data.showABTest,
                    referrer: data.referrer || "",
                    transactionId: data.transactionId || ""
                });
            },
            config: {
                messages: {
                    injected: {
                        showOffersNotification: {
                            key: "message.showOffersNotification",
                            container: ".a-sp-offers-notification",
                            elementsToHide: [".a-sp-loading-notification"],
                            elementsToShow: [".a-sp-notifications-button"],
                            elementsToSwitch: [{
                                show: ".a-sp-offers-notification > .a-sp-offers-notification-img-animated",
                                hide: ".a-sp-offers-notification > .a-sp-offers-notification-img",
                                class: "a-sp-notification-img-hidden",
                                timeout: 1480
                            }],
                            replace: [".a-sp-notifications-button-show-amount"]
                        },
                        showOffersBarNotification: {
                            key: "message.showOffersBarNotification",
                            container: ".asp-notifications-bar-offers",
                            elementsToHide: [".a-sp-loading-notification"],
                            elementsToShow: [".a-sp-notifications-button"],
                            elementsToSwitch: [{
                                show: ".asp-notifications-bar-offers >.asp-notifications-bar-image-animated",
                                hide: ".asp-notifications-bar-offers > .asp-notifications-bar-image",
                                class: "asp-notification-bar-image-hidden",
                                timeout: 2060
                            }],
                            replace: [".asp-notifications-bar-button-badge-text"],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        showCouponsNotification: {
                            key: "message.showCouponsNotification",
                            container: ".a-sp-coupons-notification",
                            elementsToHide: [".a-sp-loading-notification"],
                            elementsToShow: [".a-sp-notifications-button"],
                            elementsToSwitch: [{
                                show: ".a-sp-coupons-notification > .a-sp-coupons-notification-img-animated",
                                hide: ".a-sp-coupons-notification > .a-sp-coupons-notification-img",
                                class: "a-sp-notification-img-hidden",
                                timeout: 1360
                            }],
                            replace: [".a-sp-notifications-button-show-amount"]
                        },
                        showCouponsBarNotification: {
                            key: "message.showCouponsBarNotification",
                            container: ".asp-notifications-bar-coupons",
                            elementsToHide: [".asp-notifications-bar-searching-deals"],
                            elementsToShow: [".asp-notifications-bar-button"],
                            elementsToSwitch: [{
                                show: ".asp-notifications-bar-coupons > .asp-notifications-bar-image-animated",
                                hide: ".asp-notifications-bar-coupons > .asp-notifications-bar-image",
                                class: "asp-notification-bar-image-hidden",
                                timeout: 1820
                            }],
                            replace: [".asp-notifications-bar-button-badge-text"],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        showOffersAndCouponsNotification: {
                            key: "message.showOffersAndCouponsNotification",
                            container: ".a-sp-offers-coupons-notification",
                            elementsToHide: [".a-sp-loading-notification"],
                            elementsToShow: [".a-sp-notifications-button"],
                            elementsToSwitch: [{
                                show: ".a-sp-offers-coupons-notification > .a-sp-offers-coupons-notification-img-animated",
                                hide: ".a-sp-offers-coupons-notification > .a-sp-offers-coupons-notification-img",
                                class: "a-sp-notification-img-hidden",
                                timeout: 1520
                            }],
                            replace: [".a-sp-notifications-button-show-amount"]
                        },
                        showOffersAndCouponsBarNotification: {
                            key: "message.showOffersAndCouponsBarNotification",
                            container: ".asp-notifications-bar-offers-and-coupons",
                            elementsToHide: [".asp-notifications-bar-searching-deals"],
                            elementsToShow: [".asp-notifications-bar-button"],
                            replace: [".asp-notifications-bar-button-badge-text"],
                            elementsToSwitch: [{
                                show: ".asp-notifications-bar-offers-and-coupons > .asp-notifications-bar-image-animated",
                                hide: ".asp-notifications-bar-offers-and-coupons > .asp-notifications-bar-image",
                                class: "asp-notification-bar-image-hidden",
                                timeout: 1980
                            }],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        showSimilarCouponsNotification: {
                            key: "message.showSimilarCouponsNotification",
                            container: ".a-sp-deals-notification",
                            elementsToHide: [".a-sp-loading-notification"],
                            elementsToShow: [".a-sp-notifications-button"],
                            elementsToSwitch: [{
                                show: ".a-sp-deals-notification > .a-sp-deals-notification-img-animated",
                                hide: ".a-sp-deals-notification > .a-sp-deals-notification-img",
                                class: "a-sp-notification-img-hidden",
                                timeout: 2240
                            }],
                            replace: [".a-sp-notifications-button-show-amount"],
                            //action: ((data) => AvastWRC.ial.sp.notifications.showNotification(data))
                        },
                        showSimilarCouponsBarNotification: {
                            key: "message.showSimilarCouponsBarNotification",
                            container: ".asp-notifications-bar-deals",
                            elementsToHide: [".asp-notifications-bar-searching-deals"],
                            elementsToShow: [".asp-notifications-bar-button"],
                            elementsToSwitch: [{
                                show: ".asp-notifications-bar-deals > .asp-notifications-bar-image-animated",
                                hide: ".asp-notifications-bar-deals > .asp-notifications-bar-image",
                                class: "asp-notification-bar-image-hidden",
                                timeout: 1980
                            }],
                            replace: [".asp-notifications-bar-button-badge-text"],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        showLoadingNotification: {
                            key: "message.showLoadingNotification",
                            container: ".a-sp-loading-notification",
                            elementsToHide: [
                                ".a-sp-offers-notification", ".a-sp-coupons-notification",
                                ".a-sp-offers-coupons-notification", ".a-sp-city-hotels-notification",
                                ".a-sp-similar-hotels-notification", ".a-sp-notifications-button",
                                "a-sp-deals-notification"
                            ],
                        },
                        showLoadingBarNotification: {
                            key: "message.showLoadingBarNotification",
                            container: ".asp-notifications-bar-searching-deals",
                            elementsToHide: [".asp-notifications-bar-button"],
                            elementsToShow: [],
                            replace: [],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        cancelLoading: {
                            key: "message.cancelLoadingNotification",
                            action: ((data) => AvastWRC.ial.sp.notifications.hideNotifications())
                        },
                        showCityHotelsNotification: {
                            key: "message.showCityHotelsNotification",
                            container: ".a-sp-city-hotels-notification",
                            elementsToHide: [".a-sp-loading-notification"],
                            elementsToShow: [".a-sp-notifications-button"],
                            elementsToSwitch: [{
                                show: ".a-sp-city-hotels-notification > .a-sp-city-hotels-notification-img-animated",
                                hide: ".a-sp-city-hotels-notification > .a-sp-city-hotels-notification-img",
                                class: "a-sp-notification-img-hidden",
                                timeout: 1800
                            }],
                            replace: [".a-sp-city-hotels-notification-text-city", ".a-sp-notifications-button-show-amount"]
                        },
                        showCityHotelsBarNotification: {
                            key: "message.showCityHotelsBarNotification",
                            container: ".asp-notifications-bar-popular-hotels",
                            elementsToHide: [".asp-notifications-bar-searching-deals"],
                            elementsToShow: [".asp-notifications-bar-button"],
                            elementsToSwitch: [{
                                show: ".asp-notifications-bar-popular-hotels > .asp-notifications-bar-image-animated",
                                hide: ".asp-notifications-bar-popular-hotels >  .asp-notifications-bar-image",
                                class: "asp-notification-bar-image-hidden",
                                timeout: 1820
                            }],
                            replace: [".asp-notifications-bar-city-text", ".asp-notifications-bar-button-badge-text"],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        showSimilarHotelsNotification: {
                            key: "message.showSimilarHotelsNotification",
                            container: ".a-sp-similar-hotels-notification",
                            elementsToHide: [".a-sp-loading-notification"],
                            elementsToShow: [".a-sp-notifications-button"],
                            elementsToSwitch: [{
                                show: ".a-sp-similar-hotels-notification > .a-sp-similar-hotels-notification-img-animated",
                                hide: ".a-sp-similar-hotels-notification > .a-sp-similar-hotels-notification-img",
                                class: "a-sp-notification-img-hidden",
                                timeout: 1800
                            }],
                            replace: [".a-sp-notifications-button-show-amount"]
                        },
                        showSimilarHotelsBarNotification: {
                            key: "message.showSimilarHotelsBarNotification",
                            container: "asp-notifications-bar-alt-hotels",
                            elementsToHide: [".a-sp-loading-notification"],
                            elementsToShow: [".a-sp-notifications-button"],
                            replace: [".asp-notifications-bar-button-badge-text"],
                            elementsToSwitch: [{
                                show: ".asp-notifications-bar-alt-hotels > .asp-notifications-bar-image-animated",
                                hide: ".asp-notifications-bar-alt-hotels > .asp-notifications-bar-image",
                                class: "asp-notification-bar-image-hidden",
                                timeout: 2980
                            }],
                            action: ((data) => AvastWRC.ial.sp.notifications.showBarNotification(data))
                        },
                        showRedirectNotification: {
                            key: "message.showRedirectNotification",
                            action: ((data) => AvastWRC.ial.sp.notifications.showRedirectNotification(data, AvastWRC.Templates.notificationRedirect, AvastWRC.ial.sp.notifications.config.notificationsType.redirect))
                        },
                        showRedirectBarNotification: {
                            key: "message.showRedirectBarNotification",
                            action: ((data) => AvastWRC.ial.sp.notifications.showRedirectNotification(data, AvastWRC.Templates.notificationRedirectBar, AvastWRC.ial.sp.notifications.config.notificationsType.barRedirect))
                        },
                        showMinimizedNotifications: {
                            key: "message.showMinimizedNotifications",
                            action: ((data) => AvastWRC.ial.sp.notifications.showMinimizedNotification(data)),
                            replace: [".asp-panel-badge-text"],
                            notificationType: "minimized_ui_shown"
                        }
                    },
                    background: {}
                },
                notificationsType: {
                    standard: "STANDARD",
                    redirect: "REDIRECT",
                    barRedirect: "BAR_REDIRECT",
                    minimized: "MINIMIZED"
                },
                notificationsContainer: {
                    standard: "#a-sp-notifications-standard",
                    redirect: "#a-sp-notifications-redirect",
                    bar: "#asp-notifications-bar",
                    redirectBar: "#asp-notifications-redirect-bar",
                    minimized: "#asp-panel-min",
                    panel: "#a-panel"
                },
                classForHidden: "a-sp-notifications-hidden",
                classForNotificationAnimation: "a-sp-notifications-animation",
                values: {
                    eventsRegistered: {
                        standard: false,
                        redirect: false,
                        barRedirect: false,
                        minimized: false
                    },
                    currentData: null,
                    bar: {
                        height: "60px"
                    }
                }
            }
        }
    };


    /* Register SafePrice Event handlers */
    AvastWRC.ial.registerEvents(function (ee) {
        ee.on('message.checkSafeShop',
            AvastWRC.ial.sp.checkSafeShop.bind(AvastWRC.ial.sp));
        // new events
        ee.on('message.createPanel',
            AvastWRC.ial.sp.createPanel.bind(AvastWRC.ial.sp));
        ee.on('message.updatePanel',
            AvastWRC.ial.sp.updatePanel.bind(AvastWRC.ial.sp));
        ee.on('message.extensionIconClicked',
            AvastWRC.ial.sp.extensionIconClicked.bind(AvastWRC.ial.sp));
        ee.on('message.applyCouponInTab',
            AvastWRC.ial.sp.applyCouponInTab.bind(AvastWRC.ial.sp));
        /*ee.on('message.removeAll',
          AvastWRC.ial.sp.removeAll.bind(AvastWRC.ial.sp));*/
        AvastWRC.ial.sp.notifications.registerEventsMessage(ee);
    });

}).call(this, $);
