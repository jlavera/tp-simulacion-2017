/*******************************************************************************
 *  avast! browsers extensions
 *  (c) 2012-2014 Avast Corp.
 *
 *******************************************************************************
 *
 *  Background Browser Specific - Core Chrome Extensions functionality
 *
 ******************************************************************************/

(function (_) {


    var bal = null; //AvastWRC.bal instance - browser agnostic

    var hostInTab = [];
    var scriptInTab = [];
    var url_map = new Map();
    var ajax_map = new Map();

    /**
     * User has change from tab to tab or updated an url in the tab
     *
     * @param  {String} url    Site url loaded into the tab
     * @param  {Object} tab    Tab object reference
     * @param  {String} change Status of the tab (loading or undefined)
     * @param  {AvastWRC.gpb.All.EventType} event Represents event that was fired
     * @return {void}
     */
    function urlInfoChange(url, tab, change, event) {
        if (AvastWRC.CONFIG.ENABLE_WEBREP_CONTROL) {
            var urlDetails = [url];

            if (tab.id) {
                urlDetails = {
                    url: url,
                    referer: AvastWRC.TabReqCache.get(tab.id, "referer"),
                    tabNum: tab.id,
                    windowNum: tab.windowId,
                    reqServices: bal.reqUrlInfoServices,
                    tabUpdated: event,
                    originHash: AvastWRC.bal.utils.getHash(url + tab.id + tab.windowId),
                    origin: AvastWRC.TabReqCache.get(tab.id, "origin"),
                    customKeyValue: AvastWRC.Queue.get("pageTitle")
                };
            }

            urlDetails.reqServices |= 0x0100;

            // perform urlinfo
            AvastWRC.get(urlDetails, function (res) {
                var domain = AvastWRC.bal.getDomainFromUrl(url);
                AvastWRC.bal.emitEvent("urlInfo.response", url, res[0], tab, event);
                
                if(res[0].values.ajax) {
                    AvastWRC.TabReqCache.set(domain, "isAjax", res[0].values.ajax.collect);
                    //Caching Ajax result
                    ajax_map.set(AvastWRC.bal.getDomainFromUrl(url), res[0].values.ajax.collect);
                }
                else {
                    AvastWRC.TabReqCache.set(domain, "isAjax", "notSet");
                }
            });
        }
        if (event && AvastWRC.bal.DNT && AvastWRC.bal.DNT.initTab) {
            AvastWRC.bal.DNT.initTab(tab.id);
        }
    }

    /**
     * User updates URL  in the browser (clicking a link, etc.) Question: why is it also triggered for unloaded tabs
     *
     * @param  {Number} tabId      Tab Identification
     * @param  {Object} changeInfo state of loading {status : "loading | complete", url: "http://..."}  - url property appears only with status == "loading"
     * @param  {Object} tab        Tab properties
     * @return {void}
     */
    function onTabUpdated(tabId, changeInfo, tab) {
        AvastWRC.bs.tabExists.call(this, tabId, function () {
            // ignore unsuported tab urls like chrome://, about: and chrome.google.com/webstore - these are banned by google.
            // and disable the browser extension for those tabs
            if (!AvastWRC.bs.checkUrl(tab.url)) {
                AvastWRC.bal.emitEvent("control.hide", tabId);
                AvastWRC.bal.emitEvent("control.hide", tabId);
                return;
            }

            //enable the browser extension
            AvastWRC.bal.emitEvent("control.show", tabId);

            var host = bal.getHostFromUrl(tab.url);

            var isFirefox = AvastWRC.Utils.getBrowserInfo().isFirefox();

            switch(changeInfo.status)
            {
                case 'loading': 
                    AvastWRC.TabReqCache.set(tab.id, "timer", Date.now());
                    /*
                        Firefox - creates two changeInfo objects, we only want the one with url to send request
                    */
                    if(isFirefox && changeInfo.url) {
                        console.log("FireFox onTabUpdated() status: " + changeInfo.status);                        
                        urlInfoChange(tab.url, tab, changeInfo.status, true); 
                    }
                    
                    // Others browsers creates only one changeInfo object
                    if(!isFirefox)
                    {
                        console.log("Not FireFox onTabUpdated() status: " + changeInfo.status);
                        urlInfoChange(tab.url, tab, changeInfo.status, true);
                    }

                    if (host) {
                        delete scriptInTab[tab.id];
                    }
                break;

                case 'complete':
                    var timer = Date.now() - AvastWRC.TabReqCache.get(tab.id, "timer");
                    console.log("onTabUpdated()  status: " + changeInfo.status + " time " + timer);

                    if (hostInTab[tabId] === undefined) {
                        urlInfoChange(tab.url, tab, changeInfo.status, true);
                    }
                    AvastWRC.bal.emitEvent("page.complete", tabId, tab, tab.url);
                    
                break;

                default:
                break;
            }

            url_map.set(tabId, tab.url);

            if (host) {
                hostInTab[tabId] = host;
            }
        });
    }

    /**
     * User changes tab focus
     *
     * @param  {Object} tab        Tab object
     * @return {void}
     */
    function onActivated(activeInfo) {
        AvastWRC.bs.tabExists.call(this, activeInfo.tabId, function () {
            if (AvastWRC.EXT_TYPE_SP) return;

            chrome.tabs.get(activeInfo.tabId, function (tab) {
                // ignore unsuported tab urls like chrome://, about: and chrome.google.com/webstore - these are banned by google.	            
                if (!AvastWRC.bs.checkUrl(tab.url)) {
                    AvastWRC.bal.emitEvent("control.hide", activeInfo.tabId);
                    return;
                }
                //enable the browser extension
                AvastWRC.bal.emitEvent("control.show", activeInfo.tabId);

                // only one state in onActivated event - complete
                urlInfoChange(tab.url, tab, "complete", false);
            });
        });
    }

    function onRedirect(info) {
        AvastWRC.bs.tabExists.call(this, info.tabId, function () {
            chrome.tabs.get(info.tabId, function (tab) {
                // ignore unsuported tab urls like chrome://, about: and chrome.google.com/webstore - these are banned by google.	            
                if (!AvastWRC.bs.checkUrl(tab.url)) {
                    AvastWRC.bal.emitEvent("control.hide", info.tabId);
                    AvastWRC.bal.emitEvent("control.showText", tab.id);
                    return;
                }
                AvastWRC.bal.emitEvent("control.show", info.tabId);
                console.log(info.statusCode + " Initiator: " + info.initiator +  " REDIRECT from " + info.url + " to " + info.redirectUrl);


                var couponInTabsToShow = AvastWRC.UtilsCache.get("coupons_tabs_to_show", tab.id);
                if(couponInTabsToShow){
                    couponInTabsToShow.toBeShownIn[info.redirectUrl] = true;
                    AvastWRC.UtilsCache.set("coupons_tabs_to_show", tab.id, couponInTabsToShow);
                    
                    if(info.initiator == undefined && (couponInTabsToShow.toBeShownIn && !couponInTabsToShow.toBeShownIn[info.url])){
                        console.log("Remove here the coupon url: " + info.url + "urlto" + info.redirectUrl);
                        AvastWRC.UtilsCache.remove("coupons_tabs_to_show", tab.id);
                    }
                }
                
                urlInfoChange(info.url, tab, null, AvastWRC.gpb.All.EventType.SERVER_REDIRECT);
            });
        });
    }

	/**
     * User clic SP icon when it is on hide mode
     *
     * @param  {Object} tab        Tab object
     * @return {void}
     */
    function onClicked(tab){
        AvastWRC.bs.tabExists.call(this, tab.id, function () {
            // ignore unsuported tab urls like chrome://, about: and chrome.google.com/webstore - these are banned by google.
            // and disable the browser extension for those tabs
            if (!AvastWRC.bs.checkUrl(tab.url)) {
                AvastWRC.bal.emitEvent("control.hide", tab.id);
                AvastWRC.bal.emitEvent("control.showText", tab.id);
                return;
            }

            var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
            
            if(cachedData){
                if(!cachedData.panelData) {
                    cachedData.panelData = AvastWRC.bal.sp.panelData;
                }
                cachedData.iconClicked = 1;
                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);
                AvastWRC.bs.accessContent(tab, {
                    message: "extensionIconClicked",
                    data: cachedData,
                });	
            }
            else{
                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", {iconClicked: 1});
                urlInfoChange(tab.url, tab, false, false);
                AvastWRC.bal.emitEvent("page.complete", tab.id, tab, tab.url);
            }
            
            var eventDetails = {
                clientInfo: AvastWRC.Utils.getClientInfo((AvastWRC.Shepherd) ? AvastWRC.Shepherd.getCampaing().campaignId : "default"),
                url: tab.url,
                eventType: "EXTENSION_ICON",
                type: "CLICKED_CTA",
                offer: null,
                offerType: ""
            };
            eventDetails.clientInfo.referer = AvastWRC.TabReqCache.get(tab.id,"referer");
            console.log(eventDetails);
            (AvastWRC.Burger != undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails) : console.log("no burger lib");
        });
    }

    /**
     * Forwards all the messages to the browser agnostic core
     */
    function messageHub(request, sender, reply) {
        (request.message === "control.onClicked") ? onClicked(request.tab) : (sender.tab) ? bal.commonMessageHub(request.message, request, sender.tab) : bal.commonMessageHub(request.message, request, request.tab);
    }

    /**
     * Injects all the needed scripts to a tab and sends a message
     */
    function accessContent(tab, data) {
        var tab = tab, data = data;
        if (!scriptInTab[tab.id]) {
            let options = {
                tab: tab,
                callback: function () {
                    scriptInTab[tab.id] = true;
                    sendAccessContentMessage(tab, data);                    
                }
            };
            AvastWRC.bs.inject(_.extend(options, AvastWRC.bal.getInjectLibs()));
        } else {
            sendAccessContentMessage(tab, data);
        }

        function sendAccessContentMessage(tab, data){
            let afiliateDomain = AvastWRC.bal.sp.isAnAffiliateDomain(tab, false);
            if((afiliateDomain && data.message.indexOf("applyCouponInTab") != -1) || !afiliateDomain){
                console.log("message: " + data.message + " affiliate domain: "+afiliateDomain);
                AvastWRC.bs.messageTab(tab, data);
            }            
        }
    }

    /*****************************************************************************
     * bs - override the common browser function with ext. specific
     ****************************************************************************/
    _.extend(AvastWRC.bs,
        {
            accessContent: accessContent,

            getLocalStorage(key, callback) {
                chrome.storage.local.get(key, function (result) {
                    if (typeof result === "object" && result[key]) {
                        callback(result[key]);
                    }
                    else {
                        callback(null);
                    }
                });
                return;
            },

            setLocalStorage(key, data) {
                var storage = {};
                storage[key] = data;
                chrome.storage.local.set(storage);
            }

        });

    /*****************************************************************************
     * bs.aos - browser specific AOS functionality
     ****************************************************************************/
    AvastWRC.bs.core = AvastWRC.bs.core || {};
    _.extend(AvastWRC.bs.core, // Browser specific
        {
            /**
             * Function called on BAL initialization to initialize the module.
             */
            init: function (balInst) {
                bal = balInst;

                chrome.tabs.onUpdated.addListener(onTabUpdated);
                chrome.tabs.onActivated.addListener(onActivated);
                chrome.tabs.onRemoved.addListener(AvastWRC.onTabRemoved);

                // chrome.webNavigation might also be an option, but it has a bug that affects google search result page: https://bugs.chromium.org/p/chromium/issues/detail?id=115138
                chrome.webRequest.onBeforeRedirect.addListener(onRedirect, { urls: ["http://*/*", "https://*/*"], types: ["main_frame"] });

                //clic on SP icon
                balInst.registerEvents(function (ee) {
                    ee.on("control.onClicked", onClicked);
                });

                chrome.runtime.onMessage.addListener(messageHub);

                chrome.webRequest.onSendHeaders.addListener(
                    AvastWRC.onSendHeaders,
                    { urls: ["http://*/*", "https://*/*"] },
                    ["requestHeaders"]
                );
            },
            /* Register SafePrice Event handlers */
            registerModuleListeners: function (ee) {

            }
        }); // AvastWRC.bs.aos

    AvastWRC.bal.registerModule(AvastWRC.bs.core);
}).call(this, _);
/*******************************************************************************
 *  avast! browsers extensions
 *  (c) 2012-2014 Avast Corp.
 *
 *  Background Browser Specific - AOS specific - module for stadalone execution
 *
 ******************************************************************************/

(function(AvastWRC, chrome, _) {

  function show (tabId) {
    chrome.browserAction.enable(tabId);
  }

  function hide (tabId) {
    chrome.browserAction.disable(tabId);
  }

  function showText (tabId, text, bgcolor) {
    chrome.browserAction.setBadgeText({
      tabId: tabId,
      text: text || ""
    });

    if (bgcolor) {
      chrome.browserAction.setBadgeBackgroundColor({
        tabId: tabId,
        color: bgcolor
      });
    }
  }

  function setTitle (tabId, title) {
    chrome.browserAction.setTitle({
      tabId: tabId,
      title: title || ""
    });
  }

  function setIcon (tabId, iconPath) {
    chrome.browserAction.setIcon({
      tabId: tabId,
      path: iconPath
    }, function (){
      if (chrome.runtime.lastError) {
        console.log("LOG: "+chrome.runtime.lastError.message);
    }});
  }

  AvastWRC.bs.icon = AvastWRC.bs.icon || {};
   _.extend(AvastWRC.bs.icon, // Browser specific
    {
      /**
       * Function called on BAL initialization to initialize the module.
       */
      init: function (balInst) {

        balInst.registerEvents(function (ee) {
          ee.on("control.show", show);
          ee.on("control.hide", hide);
          ee.on("control.showText", showText);
          ee.on("control.setTitle", setTitle);
          ee.on("control.setIcon", setIcon);
        });

        chrome.browserAction.onClicked.addListener(function (tab) {
          balInst.emitEvent("control.onClicked", tab);
        });

    },

  });

  AvastWRC.bal.registerModule(AvastWRC.bs.icon);

}).call(this, AvastWRC, chrome, _);

/*******************************************************************************
 *  Background Browser Specific - SafePrice Chrome Extensions functionality
 ******************************************************************************/

(function(_) {
  
  AvastWRC.bs.SP = AvastWRC.bs.SP || {};
  _.extend(AvastWRC.bs.SP, // Browser specific
  {
    /**
     * Function called on BAL initialization to initialize the module.
     */
    init: function (balInst) {
      balInst.modifyInjectLibs( function(injectLibs) {
          injectLibs.libs.push('common/libs/csl.parser.js'); // add Ciuvo parsing lib
          injectLibs.libs.push('common/libs/cpg.parser.js'); // add Comprigo parsing lib
          return injectLibs;
        }
      );
    }
  }); // AvastWRC.bs.aos

  AvastWRC.bal.registerModule(AvastWRC.bs.SP);
}).call(this, _);

/*******************************************************************************
 *  avast! browsers extensions
 *  (c) 2012-2014 Avast Corp.
 *
 *  Background Browser Specific - AOS specific - module for stadalone execution
 *
 ******************************************************************************/

(function(AvastWRC, chrome, _) {

AvastWRC.bs.SP.sa = AvastWRC.bs.SP.sa || {};

  var EDITIONS_CONFIG = // same config for all editions
    { 
      extType: AvastWRC.EXT_TYPE_SP,
      callerId: 8020,
      reqUrlInfoServices: 0x0040, // SP only
       extVer: 15, dataVer: 15,
      safePrice : true, // SP module always enabled
      brandingType: AvastWRC.BRANDING_TYPE_AVAST,
      showNewVersion: true
    };

  _.extend(AvastWRC.bs.SP.sa, // Browser specific
  {
    /**
     * Function called on BAL initialization to initialize the module.
     */
    init: function (balInst) {
      chrome.runtime.onMessageExternal.addListener (
        function(request, sender, sendResponse) {
          switch(request.msg) {
            case 'init':
              sendResponse({});
              break;
            default:

          }
        }
      );

      // Obtain userId
      var settings = balInst.settings.get();
      var userid = settings.current.userId;
      if (!userid || userid.length <= 0 ) {
        AvastWRC.Query.getServerUserId(function(userid) {
          balInst.storeUserId(userid);
        });
      }
    }
  }); // AvastWRC.bs.SP.sa

  AvastWRC.bal.registerModule(AvastWRC.bs.SP.sa);

  AvastWRC.init(EDITIONS_CONFIG.callerId); // initialize the avastwrc modules
  // Start background page initilizing BAL core
  AvastWRC.bal.init(AvastWRC.bs, localStorage, EDITIONS_CONFIG);

}).call(this, AvastWRC, chrome, _);
