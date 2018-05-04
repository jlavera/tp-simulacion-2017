/*******************************************************************************
 *
 *  avast! Online Security plugin
 *  (c) 2013 Avast Corp.
 *
 *  @author: Lucian Corlaciu
 *
 *  Background Core - cross browser
 *
 ******************************************************************************/

(function(_, EventEmitter) {

    // Extension editions
    var DEFAULT_EDITION = 0; // if no ed. determined start with AOS ed.

    var EDITION_FEATURES = [
    // 0 - AOS
        {
            applicationEvents : true, // ev. for gamification
            newUrlInfoVersion : true,
            safePrice : true,
        },
    // 1 - ABOS
        {
            applicationEvents : false, // ev. for gamification
            newUrlInfoVersion : true,
            safePrice : false,
        },
    ];

    var CORE_DEFAULT_SETTINGS = { // core defaults
        current : {
            callerId : 0,  // Not set by default
            userId : null,  // Persisted userId
        },
        features : {},
    };

    if (typeof AvastWRC == "undefined") { AvastWRC = {}; } //AVAST Online Security - namespace

    var localStorage = null; // Browser specific local storage
    var sing; // AvastWRC.bal instance - browser agnostic
    var back; // background script instance - browser specific

    var _forcedEdition = null;

    // Web Reputation
    var RATING_LEVEL = ["Undefined", "Positive", "Average", "Bad",];
    var RATING_COLOR = ["#767683","#0CB754","#F1C80B","#F5203E",];

    // Regexp matching URLs that will be enabled with avast:// protocol actions
    var AOS_URLS_ENABLED_URLS = /^http[s]?\:\/\/aos.avast.com(\:\d+)?\/upgrade(\/)?/;

    // Actions assigned to avast protocol: avast://[action]
    //  - action is in form of message to be send to the background script: bal.js
    var AOS_URLS_ACTIONS = {
        "settings" : { message: "openSettings", data : {}, }, // avast://settings -> open settings page
    };

    var SHOW_WELCOME_PAGE_RULE = function (prevMinor, currMinor) {
        // Stop showing the welcome/update screens until provided with better content
        return false;
    };

    AvastWRC.PHISHING_REDIRECT = AvastWRC.SAFE_ZONE_REDIRECT = "https://www.avast.com";
    AvastWRC.SITE_CORRECT_MSG_REDIRECT = "https://www.avast.com/sitecorrect.html";
    AvastWRC.AVAST_UPGRADE_PAGE_URL = "http://aos.avast.com/upgrade/";

    AvastWRC.CREATE_MESSAGE_BOX_TIMEOUT = 1500;

    /*
    * Definition of libraries to inject into content pages - default libs
    *  - modify using 'modifyInjectLibs'
    */
    var _injectLibs = {
        css: [
            "common/ui/css/extension.css",
        ],
        libs: [
            "common/libs/jquery-3.1.1.js",
            "common/libs/mustache.js",
            "common/libs/eventemitter2.js",
            "common/scripts/templates.js",
            "common/scripts/ial.js"
        ],
        script: "scripts/extension.js",
    };

    AvastWRC.bal = {

        EXT_AOS_ID : 0,
        EXT_ABOS_ID : 1,

        RATING_COLOR : RATING_COLOR,
	
        safePrice: false,
    
        brandingType: 0, 

        reqServices: 0x0000, // services  of UrlInfo

        _bal_modules : [], // initialized modules
        _core_modules : [], // core modules
        _bootstrap_modules : [], // bootstrap modules based on edition config
        /**
         * Register BAL module.
         * @param {Object} module to register
         */
        registerModule: function(module) {
            if (typeof module.bootstrap === "function") {
                this._bootstrap_modules.push(module);
            } else {
                this._core_modules.push(module);
            }
        },
        /**
         * EventEmitter instance to hangle background layer events.
         * @type {Object}
         */
        _ee: new EventEmitter({wildcard:true, delimiter: ".",}),
        /**
         * Register events with instance of EventEmitter.
         * @param  {Object} callback to register with instance of eventEmitter
         * @return {void}
         */
        registerEvents: function(registerCallback, thisArg) {
            if (typeof registerCallback === "function") {
                registerCallback.call(thisArg, this._ee);
            }
        },
        // TODO mean to unregister the events
        /**
         * Emit background event
         * @param {String} event name
         * @param {Object} [arg1], [arg2], [...] event arguments
         */
        emitEvent: function() {
        // delegate to event emitter
            this._ee.emit.apply(this._ee, arguments);
        },
        /**
         * browser type
         * @type {String}
         */
        browser: "",

        /**
         * Get important info about the extension running.
         */
        trace: function (log) {
            _.each(this._bal_modules, function(module) {
                if (typeof module.trace === "function") {
                    module.trace(log);
                }
            });

            console.log("> all listeners ", this._ee.listeners("*").length);
        },

        getDateAsString: function(){
            var d = new Date();
            return d.getFullYear()+ "/" + d.getMonth()+ "/"+d.getDate()+ " " + d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();
        },

        /**
         * Initialization       
         * @param  {Object} _back
         * @return {Object}
         */
        init: function(_back, locStorage, editionConfig, forceEdition) {
            if(sing){
                return sing;
            }

            _forcedEdition = forceEdition;

            EDITION_FEATURES = _.isArray(editionConfig) ?
                _.merge(EDITION_FEATURES, editionConfig) :
                _.map(EDITION_FEATURES, function (features) { return _.merge(features, editionConfig); });
                // same config for all editions applied to all features

            this.back = _back;
            localStorage = locStorage;
            sing = this;

            this.initEdition( _forcedEdition == null ? DEFAULT_EDITION : _forcedEdition );
            
            var defSettings = AvastWRC.bal.getDefaultSettings(this._core_modules);
            sing.settings = new AvastWRC.bal.troughStorage("settings", defSettings);
            /*this.settings = new AvastWRC.bal.troughStorage("settings");

			this.mergeInSettings(CORE_DEFAULT_SETTINGS);*/

            AvastWRC.getStorageAsync("InstallDate")
            .then(function(date){ 
                AvastWRC.CONFIG.InstallDate = date;
            })
            .catch(function(reason){ 
                AvastWRC.CONFIG.InstallDate = sing.getDateAsString();              
                AvastWRC.setStorage("InstallDate", AvastWRC.CONFIG.InstallDate);
            });

            AvastWRC.getStorage("AvastConfig", function(avastConfig){               
                if (typeof avastConfig !== "string") {
                    avastConfig = AvastWRC.getWindowStorage("AvastConfig");                    
                }
                if (typeof avastConfig == "string") {
                    var guids = JSON.parse(avastConfig);
                    if (guids) {
                        AvastWRC.CONFIG.GUID = guids.guid;
                        AvastWRC.CONFIG.AUID = guids.auid;
                        AvastWRC.CONFIG.UUID = guids.uuid;
                        AvastWRC.CONFIG.HWID = guids.hwid;

                        if(guids.plg_guid) {                    
                            AvastWRC.CONFIG.PLG_GUID = guids.plg_guid;
                        }
                        else {
                            if(guids.guid != null && guids.hwid != null) {
                                AvastWRC.CONFIG.PLG_GUID = AvastWRC.bal.utils.getRandomUID();
                            }
                            else if(guids.guid != null && guids.hwid == null) {
                                AvastWRC.CONFIG.PLG_GUID = guids.guid;
                                AvastWRC.CONFIG.GUID = null;
                            }                        
                        }
                        var new_guids = {
                            "guid": AvastWRC.CONFIG.GUID,
                            "plg_guid": AvastWRC.CONFIG.PLG_GUID,
                            "auid": AvastWRC.CONFIG.AUID,
                            "hwid": AvastWRC.CONFIG.HWID,
                            "uuid": AvastWRC.CONFIG.UUID,
                        };
                        AvastWRC.setStorage("AvastConfig", JSON.stringify(new_guids));
                    }
                }else{                
                    AvastWRC.CONFIG.PLG_GUID = AvastWRC.bal.utils.getRandomUID();                
                    var guids = {
                        "guid": AvastWRC.CONFIG.GUID,
                        "plg_guid": AvastWRC.CONFIG.PLG_GUID,
                        "auid": AvastWRC.CONFIG.AUID,
                        "hwid": AvastWRC.CONFIG.HWID,
                        "uuid": AvastWRC.CONFIG.UUID,
                    };
                    AvastWRC.setStorage("AvastConfig", JSON.stringify(guids));                    
                }
            });

            Q.fcall(function() {
                return this._core_modules;
            }.bind(this))
            .then(this.initModules.bind(this))
            .then(this.initModuleSettings.bind(this))             
            .then(function() {
                // Connect Avast if it listens on the machine
                return AvastWRC.local.connect(this);
            }.bind(this))
            .get("avastEdition")
            .then(this.getCurrentEdition.bind(this))
            .then(this.initEdition.bind(this))
            .then(this.bootstrapInit.bind(this))
            .then(this.initModuleSettings.bind(this))
            .then(this.initModules.bind(this))
            .then(this.afterInit.bind(this))
            .then(function(){
                if(AvastWRC.CONFIG.EXT_TYPE == AvastWRC.EXT_TYPE_SP){
                    if(AvastWRC.Utils.Burger){
                        AvastWRC.Utils.Burger.initBurger(true/*init*/,false/*sendAll*/);
                    }
                    AvastWRC.bal.sp.sendHeartbeat();
                }
            })
            .fail(function (e) {
                console.error("Error in bal.init: ", e);
            });

      
            if (_.isArray(editionConfig)) {
    	        this.safePrice = editionConfig[0].safePrice;
    	        this.brandingType = editionConfig[0].brandingType;
            }
            else {
    	        this.safePrice = editionConfig.safePrice;
    	        this.brandingType = editionConfig.brandingType;
            }
        
            /* AOSP-639, AOSP-694*/
            if (this.safePrice) {
                if(AvastWRC.getWindowStorage("landingPageShown")) {
                    AvastWRC.setStorage("landingPageShown", true);
                }
                !AvastWRC.getStorage("landingPageShown", function(result) {                    
                    if(result == null || result == false) {
                        AvastWRC.bal.openLandingPageTab(sing.brandingType);
                        if (AvastWRC.Uninstall) AvastWRC.Uninstall.setUninstallURL();
                    }
                });                
            } 

            if(AvastWRC.CONFIG.EXT_TYPE == AvastWRC.EXT_TYPE_SP_AP){
                AvastWRC.getStorage("AvastPayConfig", function(AvastPayConfig) {
                    //default value lang of the browser, it will be updated on processSafeShopOffers function with the value received from backend
                    var isGermany = (ABEK.locale.getBrowserLang().toLowerCase() == "de")?1:0;  
                    if(AvastPayConfig == null || AvastPayConfig == undefined){
                        var avastPay = {
                            checkboxChecked: (AvastWRC.CONFIG.EXT_TYPE == AvastWRC.EXT_TYPE_SP_AP)? 1 : 0,
                            germany: (ABEK.locale.getBrowserLang().toLowerCase() == "de")?1:0,
                            allowedDomains: {"goertz.de": 1,
                                            "sportScheck.com": 1,
                                            "myToys.de": 1} // {"domain":true}
                        };
                        AvastPayConfig = avastPay;
                        AvastWRC.setStorage("AvastPayConfig", AvastPayConfig);
                    }
                    else if (AvastPayConfig.germany != isGermany){
                        //the user changed the lang from the browser so we need to update it on localstorage
                        // (this need to be changed to geoIp)
                        AvastPayConfig.germany = isGermany;
                        AvastWRC.setStorage("AvastPayConfig", AvastPayConfig);
                    }                        

                }); 
            }
            return this;
        },
        initEdition : function (edition) {
            var features = EDITION_FEATURES[edition] || edition;

            AvastWRC.CONFIG.EDITION  = edition;
            AvastWRC.CONFIG.FEATURES = features;
            this.reqUrlInfoServices  = features.reqUrlInfoServices;
            AvastWRC.CONFIG.CALLERID = features.callerId;
            AvastWRC.CONFIG.EXT_TYPE = features.extType;
            AvastWRC.CONFIG.EXT_VER  = features.extVer;
            AvastWRC.CONFIG.DATA_VER = features.dataVer;
            AvastWRC.CONFIG.SHOW_NEW_VERSION = features.showNewVersion || false;
      
            return Q.fcall(function() { return edition;});
        },
        bootstrapInit : function (edition) {
            var features = EDITION_FEATURES[edition];
            var bootstrapped = _.reduce(this._bootstrap_modules, function(bModules, moduleBootstrap) {
                var module = moduleBootstrap.bootstrap(features);
                if (module) bModules.push(module);
                return bModules;
            }, [], this);
            return Q.fcall(function () { return bootstrapped; });
        },
        initModules : function (modules) {
            _.each(modules, function(module) {
                if (module) {
          // register individual modules - init and register with event emitter
                    if (typeof module.init === "function") module.init(this);
                    if (typeof module.registerModuleListeners === "function") module.registerModuleListeners(this._ee);
                    this._bal_modules.push(module);
                }
            }, this);
            return Q.fcall(function () { return modules; });
        },
        initModuleSettings : function (modules) {
            new Promise((resolve, reject) => {
                AvastWRC.getStorageAsync("settings")
               .then(function(value){
                    if(value.current.callerId < AvastWRC.CONFIG.CALLERID){
                        value.current.callerId = AvastWRC.CONFIG.CALLERID;
                    }
                    sing.settings.set(value);
                    var defSettings = AvastWRC.bal.getDefaultSettings(modules);
                    AvastWRC.bal.mergeInSettings(defSettings);
                    AvastWRC.bal.updateOldSettings();
                    return Q.fcall(function () { return modules; });
               })
               .catch(function(reason){ 
                    var storageSettings = localStorage.getItem("settings");
                    if(!storageSettings){
                        var defSettings = AvastWRC.bal.getDefaultSettings(modules);
                        if(defSettings && defSettings.current &&  defSettings.current.callerId && defSettings.current.callerId < AvastWRC.CONFIG.CALLERID){
                            defSettings.current.callerId = AvastWRC.CONFIG.CALLERID;
                        }
                        AvastWRC.bal.mergeInSettings(defSettings);                  
                    }
                    else{
                        var userSettings = JSON.parse(storageSettings);
                        if(userSettings.current.callerId < AvastWRC.CONFIG.CALLERID){
                            userSettings.current.callerId = AvastWRC.CONFIG.CALLERID;
                        }
                        sing.settings.set(userSettings);
                        delete localStorage["settings"];
                    }                    
                    AvastWRC.bal.updateOldSettings();
                    return Q.fcall(function () { return modules; });
               });
           });                   
        },
        afterInit : function () {
            _.each(this._bal_modules, function(module) {
                // after init - all modules initialized
                if (typeof module.afterInit === "function") module.afterInit();
                this._bal_modules.push(module);
            }, this);
        },
        
        /**
         * Called once the local based service get initialized.
         */
        initLocalService: function(port) {
            _.each(this._bal_modules, function(module) {
        // after init - all modules initialized
                if (typeof module.initLocalService === "function") module.initLocalService(port);
            }, this);
        },
        /**
         * Modify the inject libraries of the instance.
         * @param {Function} callback function to modify the libraries to inject.
         */
        modifyInjectLibs: function(modifyCallback) {
            if (typeof modifyCallback === "function") {
                _injectLibs = modifyCallback(_injectLibs);
            }
        },
        /**
         * Get extension definition of libraries to inject into content page.
         */
        getInjectLibs: function() {
            return _injectLibs;
        },
        /**
         * creates the settings object or updates an already present one
         * @return {void}
         */
        mergeInSettings: function(settings) {
            var newSettings = this.settings.get(),
                big, small;
            if(!newSettings){
                this.settings.set(settings);
            }else{
                for(big in settings) {
                    if(newSettings[big] === undefined){
                        newSettings[big] = settings[big];
                    }
                    else {
                        for(small in settings[big]) {
                            if (newSettings[big][small] === undefined) {
                                newSettings[big][small] = settings[big][small];
                            }
                        }
                    }
                }
            }            
            this.settings.set(newSettings);
        },
        /**
         * updates the stored settings from AvastWRC
         * @return {void}
         *
         * TODO - save and use settings in a single place
         */
        updateOldSettings: function() {
            var settings = this.settings.get();
            AvastWRC.CONFIG.COMMUNITY_IQ = settings.features.communityIQ;
            AvastWRC.CONFIG.ENABLE_SERP = settings.features.serp;
            AvastWRC.CONFIG.ENABLE_SERP_POPUP = settings.features.serpPopup;
            AvastWRC.CONFIG.ENABLE_SAS = settings.features.safeShop;
            AvastWRC.CONFIG.USERID = settings.current.userId;
        },

        getCurrentEdition : function(localAvastEdition) {
            var deferred = Q.defer();
            if (_forcedEdition == null) {
                var settings = this.settings.get();
                var storedEdition = settings.current.edition;
                if (localAvastEdition !== undefined && localAvastEdition !== null) {
                    if (!storedEdition || storedEdition !== localAvastEdition) {
                        settings.current.edition = localAvastEdition;
                        this.settings.set(settings);
                    }
                    deferred.resolve( localAvastEdition );
                } else {
                    deferred.resolve( storedEdition || DEFAULT_EDITION );
                }
            } else {
                deferred.resolve( _forcedEdition );
            }
            return deferred.promise;
        },

        /**
         * Notify the listeners about feature settings change.
         */
        featureSettingChanged: function(key, oldVal, newVal) {
            this._ee.emit("featureChanged." + key, newVal, oldVal);
            this._ee.emit("feature.changed", key, newVal, oldVal);
        },
        /**
         * Hook in listener to register feature settings and enable/disable the functionality.
         * Linstener is triggered first time upon being registered to get current value.
         * @param {String} key of the feature in sttings
         * @param {Function} listener function called with (newVal, [oldVal]), or (currentVal) on registration
         */
        hookOnFeatureChange: function(key, changeListener) {
            this._ee.on("featureChanged." + key, changeListener);
            // run listener to register current settings

            var settings = this.settings.get();
            changeListener(settings.features[key]);
        },
        /**
         * Default settings with default values
         * @return {Object}
         */
        getDefaultSettings: function(modules) {
            return _.reduce (modules,
                function(defaults, module) {
                    if (typeof module !== "undefined" 
                        && typeof module.getModuleDefaultSettings === "function") {
                        var moduleDefaults = module.getModuleDefaultSettings();
                        if (moduleDefaults) {
                            defaults = _.merge(defaults, moduleDefaults);
                        }
                    }
                    return defaults;
                },
                CORE_DEFAULT_SETTINGS
            );
        },
        getLandingPageCode: function (lang, local) {
            if (lang === "af" && local === "za") return "en-za";
            if (lang === "ar" && local === "sa") return "ar-sa";
            if (lang === "ar" && local === "ae") return "en-ae";
            if (lang === "ar") return "ar-ww";
            if (lang === "be") return "ru-ru";
            if (lang === "ca") return "es-es";
            if (lang === "cs") return "cs-cz";
            if (lang === "cy") return "en-gb";
            if (lang === "da") return "da-dk";
            if (lang === "de") return "de-de";
            if (lang === "el") return "el-gr";
            if (lang === "en" && local === "au") return "en-au";
            if (lang === "en" && local === "ca") return "en-ca";
            if (lang === "en" && local === "gb") return "en-gb";
            if (lang === "en" && local === "ph") return "en-ph";
            if (lang === "en" && local === "us") return "en-us";
            if (lang === "en" && local === "za") return "en-za";
            if (lang === "es" && local === "ar") return "es-ar";
            if (lang === "es" && local === "co") return "es-co";
            if (lang === "es" && local === "es") return "es-es";
            if (lang === "es" && local === "mx") return "es-mx";
            if (lang === "es") return "es-ww";
            if (lang === "eu") return "es-es";
            if (lang === "gu") return "en-in";
            if (lang === "fi") return "fi-fi";
            if (lang === "fo" && local === "fo") return "wn-ww";
            if (lang === "fr" && local === "be") return "fr-be";
            if (lang === "fr" && local === "ca") return "fr-ca";
            if (lang === "fr" && local === "ch") return "fr-ch";
            if (lang === "fr") return "fr-fr";
            if (lang === "gl") return "es-es";
            if (lang === "he") return "he-il";
            if (lang === "hi") return "hi-in";
            if (lang === "hu") return "hu-hu";
            if (lang === "id") return "id-id";
            if (lang === "it") return "it-it";
            if (lang === "ja") return "ja-jp";
            if (lang === "kk") return "ru-kz";
            if (lang === "ko") return "ko-kr";
            if (lang === "nb") return "no-no";
            if (lang === "nl" && local === "be") return "nl-be";
            if (lang === "nl") return "nl-nl";
            if (lang === "nn") return "no-no";
            if (lang === "ns") return "en-za";
            if (lang === "ms") return "en-my";
            if (lang === "pa") return "en-in";
            if (lang === "pl") return "pl-pl";
            if (lang === "pt" && local === "br") return "pt-br";
            if (lang === "pt") return "pt-pt";
            if (lang === "ru") return "ru-ru";
            if (lang === "se" && local === "fi") return "fi-fi";
            if (lang === "se" && local === "no") return "no-no";
            if (lang === "se" && local === "se") return "sv-se";
            if (lang === "sk") return "cs-sk";
            if (lang === "sv") return "sv-se";
            if (lang === "ta") return "en-in";
            if (lang === "te") return "en-in";
            if (lang === "tl") return "tl-ph";
            if (lang === "th") return "th-th";
            if (lang === "tr") return "tr-tr";
            if (lang === "tt") return "ru-ru";
            if (lang === "uk") return "uk-ua";
            if (lang === "vi") return "vi-vn";
            if (lang === "qu") return "es-ww";
            if (lang === "zh" && local === "tw") return "zh-tw";
            if (lang === "zh") return "zh-cn";
            if (lang === "zu" && local === "za") return "en-za";
            return "en-ww";
        },

        openLandingPageTab: function(brandingType) {
            var bLocal = ABEK.locale.getBrowserLocale().toLowerCase();
            var bLang = ABEK.locale.getBrowserLang().toLowerCase();
        
            var codePage = this.getLandingPageCode(bLang, bLocal);
            var p_pro = 43;
        
            if(brandingType == AvastWRC.BRANDING_TYPE_AVG) {
        	p_pro = 72;
            }
        
            console.log("lang:"+bLang+" local:"+bLocal+" code:"+codePage);
            //en-us lang-local

            var installedURL = "https://ipm-provider.ff.avast.com/?action=2&p_pro="+p_pro+"&p_elm=297&p_lid=" + codePage + "&p_lng=" + bLang;
            
            AvastWRC.bs.tabExistsWithUrl("completeInstallation", function(tab){                
                AvastWRC.setStorage("landingPageShown", true);
                if(tab) {                
                    AvastWRC.bs.tabRedirectAndSetActive(tab, installedURL);                
                }
                else {
                    AvastWRC.bs.openInNewTab(installedURL);
                }
            });            
        },

        openAVPageTab: function(brandingType) {
            var url = "http://www.avast.com";
            var valToMatch = "avast.com";
            
            if(brandingType == AvastWRC.BRANDING_TYPE_AVG){
                url = "http://www.avg.com";
                valToMatch = "avg.com";
            }

            
            AvastWRC.bs.tabExistsWithUrl(valToMatch, function(tab){
                if(tab) {                
                    AvastWRC.bs.tabRedirectAndSetActive(tab, url);
                }
                else {
                    AvastWRC.bs.openInNewTab(url);
                }
            });            
        },

        /**
         * Message hub - handles all the messages from the injected scripts
         * @param  {String} type
         * @param  {Object} message
         * @param  {Object} tab
         * @return {void}
         */
        commonMessageHub: function (type, data, tab) {
            if (typeof tab === "undefined") return;

            var url = tab.url || (tab.contentDocument && tab.contentDocument.location
                        ? tab.contentDocument.location.href : null);
            var host = AvastWRC.bal.getHostFromUrl(url);
            switch (type) {
           
            case "openInNewTab":
                AvastWRC.bs.openInNewTab(data.url);
                break;
            case "copyToClipboard":
                AvastWRC.bs.copyToClipboard (data.text);
                break;
            default:
                // emit messages in specific namespace
                this._ee.emit("message." + type, data, tab);
            }
        },

        createSettingsItem: function (feature, value) {
            var interm = false; // (value === -1); // ignoring intermed state
            var active = (interm) ? true : value; // treat intermed as feture is set
            return {
                name        : AvastWRC.bs.getLocalizedString("settings" + feature),
                description : AvastWRC.bs.getLocalizedString("settings" + feature + "Desc"),
                key         : feature,
                active      : active,
                enabled     : true,
                show        : true,
                intermed    : interm,
            };
        },

        /**
         * Detect pages where the extension will handle avast:// protocal URLs.
         * And it applies events to these links to trigger to extension specific functions.
         * Ie. avast://settings opens settings: .../options.html
         * @param {String} page URL
         * @param {Object} relevant tab to process the links
         */
        tabFixAosUrls: function(url, tab) {
            if (AOS_URLS_ENABLED_URLS.test(url)) {
                AvastWRC.bs.accessContent(tab, {
                    message : "fixAosUrls",
                    data: { actions : AOS_URLS_ACTIONS, },
                });
            }
        },
        
        /**
         * Temporary storage
         * @type {Object}
         */
        cache: {
            map: {},
            add: function(itemKey, itemValue, key) {
                (key ? this.map[key] : this.map)[itemKey] = itemValue;
                return itemValue;
            },
            get: function(itemKey, key) {
                return (key ? this.map[key] : this.map)[itemKey];
            },
            contains: function(itemKey, key) {
                return (key ? this.map[key] : this.map).hasOwnProperty(itemKey);
            },
            delete: function(itemKey, key) {
                delete (key ? this.map[key] : this.map)[itemKey];
            },
            reset: function(key) {
                this.map[key] = {};
            },
        },
        /**
         * Persistent storage
         * @type {Object}
         */
        storage: {
            add: function(itemKey, itemValue) {
                localStorage.setItem(itemKey, JSON.stringify(itemValue));
                return itemValue;
            },
            get: function(itemKey, key) {
                var item = localStorage.getItem(itemKey);
                try {
                    return JSON.parse(item);
                } catch (ex) {
                    return {};
                }
            }, 
            contains: function(itemKey, key) {
                return localStorage.hasOwnProperty(itemKey);
            },
            delete: function(itemKey, key) {
                delete localStorage[itemKey];
            },
        },
    /**
     * Persistent Storage wrapper
     * @param  {String} key
     * @param  {Object} initializer - in case the key is not present in localStorage
     * @return {Object} - troughStorage instance with get and set
     */
        troughStorage: function(key, initializer) {
            var tmpVal = null, tmpKey = key;
             
            return {
                get: function() {
                    return tmpVal || (tmpVal = initializer);
                },
                set: function(val) {
                    tmpVal = val;
                    AvastWRC.setStorage(tmpKey, tmpVal);
                },
            };
        },
    /**
     * Helper functions
     */
        isFirefox: function() {
            return sing.browser == "Firefox";
        },
        getBrowserName: function () {
            return sing.browser;
        },
        getHostFromUrl: function(url) {
            if (!url) {
                return undefined;
            }

            var lcUrl = url.toLowerCase();

            if (lcUrl.toLowerCase().indexOf("http") != 0 ||
                lcUrl.toLowerCase().indexOf("chrome") == 0 ||
                lcUrl.toLowerCase().indexOf("data") == 0 ||
                lcUrl.toLowerCase() == "about:newtab" ||
                lcUrl.toLowerCase() == "about:blank")
            {
                return undefined;
            }

            var match = url.match(/:\/\/(www[0-9]?\.)?(.[^/:]+)/);
            return match.length > 2 ? match[2] : undefined;
        },
        getDomainFromHost: function(host){
            return host ? host.split(".").slice(-2).join(".") : undefined;
        },
        getDomainFromUrl: function(url) {
            return AvastWRC.bal.getDomainFromHost(AvastWRC.bal.getHostFromUrl(url));
        },
        jsonToString: function(obj) {
            var s = "";
            for(var key in obj) {
                if(typeof obj[key] == "object") {
                    s += key+"<br />";
                    s += this.jsonToString(obj[key]);
                } else {
                    s += key+": "+obj[key]+"<br />";
                }
            }

            return s;
        },
        tryParseJSON: function(obj) {
            try {
                return JSON.parse(obj);
            }
            catch(e) {
                return obj;
            }
        },
        tabClosed: function(tabId, host) {
            this.cache.delete("dnt_" + tabId);
        },
        defaultErrorHandler: function(obj) {
        },
        /**
         * WebRep Common Core
         * @type {Object}
         */
        WebRep: {
            /**
             * Creates default resources for building the UI
             * @return {Object}
             */
            getDefaults: function() {
                return {
                    close  : AvastWRC.bs.getLocalImageURL("icn_close.png"),
                    btnLearn : AvastWRC.bs.getLocalizedString("sideDetails").toUpperCase(),
                    btnRate : AvastWRC.bs.getLocalizedString("sideRate").toUpperCase(),
                    btnDash : AvastWRC.bs.getLocalizedString("sideDashboard").toUpperCase(),
                    btnSettings : AvastWRC.bs.getLocalizedString("sideSettings").toUpperCase(),
                    rating : {
                        headline: AvastWRC.bs.getLocalizedString("ratingRate"),
                        footer: AvastWRC.bs.getLocalizedString("ratingNoRate"),
                        close : AvastWRC.bs.getLocalImageURL("icn_close_small.png"),
                        elements: [
                            {
                                text: AvastWRC.bs.getLocalizedString("votePositive").toUpperCase(),
                                image: AvastWRC.bs.getLocalImageURL("icnthumbsmall.png"),                                
                            },
                            {
                                text: AvastWRC.bs.getLocalizedString("voteNegative").toUpperCase(),
                                image: AvastWRC.bs.getLocalImageURL("icnthumbdownsmall.png"),                                
                            },
                        ],
                        negative: {
                            close : AvastWRC.bs.getLocalImageURL("icn_close_small.png"),
                            headline: AvastWRC.bs.getLocalizedString("ratingNegative"),
                            button: AvastWRC.bs.getLocalizedString("ratingDone").toUpperCase(),
                            elements: [
                                {
                                    text: AvastWRC.bs.getLocalizedString("pornography"),
                                    data: "pornography",
                                },
                                {
                                    text: AvastWRC.bs.getLocalizedString("violence"),
                                    data: "violence",
                                },
                                {
                                    text: AvastWRC.bs.getLocalizedString("gambling"),
                                    data: "gambling",
                                },
                                {
                                    text: AvastWRC.bs.getLocalizedString("drugs"),
                                    data: "drugs",
                                },
                                {
                                    text: AvastWRC.bs.getLocalizedString("illegal"),
                                    data: "illegal",
                                },
                                {
                                    text: AvastWRC.bs.getLocalizedString("others"),
                                    data: "others",
                                },
                            ],
                        },
                    },
                    thanks : {
                        close : AvastWRC.bs.getLocalImageURL("icn_close_small.png"),
                        image: AvastWRC.bs.getLocalImageURL("icn_checkbig.png"),
                        headline: AvastWRC.bs.getLocalizedString("thanksHeadline"),
                        message: AvastWRC.bs.getLocalizedString("thanksMessage"),
                    },
                };
            },
            /**
             * Computes  WebRep data for a specific host
             * @param  {String} host
             * @return {Object} - data to be used with mustache.js templates for building the UI
             */
            compute: function(host) {
                var wrc = AvastWRC.Cache.getNoTTL(host), color, ret = AvastWRC.bal.WebRep.getDefaults();
                if(!wrc || !wrc.values){
                    ret.icon  = AvastWRC.bs.getLocalImageURL("icn_norating_big.png");
                    ret.text  = AvastWRC.bs.getLocalizedString("ratingTextUndefined");
                    ret.color = RATING_COLOR[RATING_NONE]; //'#767683';
                    ret.close = AvastWRC.bs.getLocalImageURL("icn_close.png");
                }
                else {
                    var val = wrc.values;
                    switch(wrc.getRatingCategory()) {
                    case AvastWRC.RATING_GOOD:
                        ret.icon = AvastWRC.bs.getLocalImageURL("icn_thumbup_big.png");
                        ret.text = AvastWRC.bs.getLocalizedString("ratingTextPositive");
                        break;
                    case AvastWRC.RATING_AVERAGE:
                        ret.icon = AvastWRC.bs.getLocalImageURL("icn_thumbright_big.png");
                        ret.text = AvastWRC.bs.getLocalizedString("ratingTextAverage");
                        break;
                    case AvastWRC.RATING_BAD:
                        ret.icon = AvastWRC.bs.getLocalImageURL("icn_thumbdown_big.png");
                        ret.text = AvastWRC.bs.getLocalizedString("ratingTextBad");
                        break;
                    }

                    ret.color = RATING_COLOR[wrc.getRatingCategory()];
                    ret.details = {
                        close : AvastWRC.bs.getLocalImageURL("icn_close_small.png"),
                        headline: AvastWRC.bs.getLocalizedString("detailsHeadline"),
                        elements: [
                            {
                                text: AvastWRC.bs.getLocalizedString("detailsMalware" + ( val.block == 1 ? "Yes" : "No" )),
                                image: AvastWRC.bs.getLocalImageURL("icn_bug.png"),
                                color: val.block == 1 ? RATING_COLOR[RATING_BAD] : RATING_COLOR[RATING_GOOD],
                                title: "",
                            },
                            {
                                text: AvastWRC.bs.getLocalizedString("detailsPhishing" + ( val.phishing ? "Yes" : "No" )),
                                image: AvastWRC.bs.getLocalImageURL("icn_eye.png"),
                                color: val.phishing > 1 ? RATING_COLOR[RATING_BAD] : RATING_COLOR[RATING_GOOD], //'#F5203E' : '#0CB754',
                                title: "",
                            },
                            {
                                text: AvastWRC.bs.getLocalizedString("ratingCommunity",[AvastWRC.bs.getLocalizedString("ratingLevel" + RATING_LEVEL[wrc.getRatingCategory()]),]),
                                image: AvastWRC.bs.getLocalImageURL("icn_thumblearn.png"),
                                color: RATING_COLOR[wrc.getRatingCategory()],
                                title: val.rating,
                            },
                        ],
                    };
                }

                return ret;
            },
        },

        /* Wraps bal to register to submodule events */
        Core : {
            registerModuleListeners : function (ee) {
                // register for local Avast service
                ee.on("local.init", function(port) {
                    sing.initLocalService(port);
                });
                ee.on("local.paired", function(guid, auid, hwid, uuid) {
                    if (guid !=="" ) AvastWRC.CONFIG.GUID = guid;
                    if (auid !== "") AvastWRC.CONFIG.AUID = auid;
                    if (guid !== "") AvastWRC.CONFIG.HWID = hwid;
                    if (uuid !== "") AvastWRC.CONFIG.UUID = uuid;
                    var guids = {
                        "guid": AvastWRC.CONFIG.GUID,
                        "plg_guid": AvastWRC.CONFIG.PLG_GUID,
                        "auid": AvastWRC.CONFIG.AUID,
                        "hwid": AvastWRC.CONFIG.HWID,
                        "uuid": AvastWRC.CONFIG.UUID,
                    };
                    AvastWRC.setStorage("AvastConfig", JSON.stringify(guids));
                });
            },
        },

        /**
         * AvastWRC.bal specific utilities.
         */
        utils : {
            /**
             * Retrieve localised strings into given data object
             * based on the string ids array.
             * @param {Object} data to load the strings to
             * @param {Array} identifiers of strings to load
             * @return {Object} updated data object
             */
            loadLocalizedStrings : function (data, stringIds) {
                return _.reduce (stringIds, function(res, stringId) {
                    res[stringId] = AvastWRC.bs.getLocalizedString(stringId);
                    return res;
                }, data);
            },

            /**
             * Create local image url for given key/file map.
             * @param {Object} to add local URLs to
             * @param {Object} map key / image file to create the local URLs for
             * @return {Object} updated data object
             */
            getLocalImageURLs : function (data, imagesMap) {
                return _.reduce (imagesMap, function(res, image, key) {
                    res[key] = AvastWRC.bs.getLocalImageURL(image);
                    return res;
                }, data);
            },

            /**
            * Generate random UID.
            */
            getRandomUID : function () {
                var genericGuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
                var hex = "0123456789abcdef";
                var r = 0;
                var guid = "";
                for (var i = 0; i < genericGuid.length; i++) {
                    if (genericGuid[i] !== "-" && genericGuid[i] !== "4") {
                        r = Math.random() * 16 | 0;
                    }
                    if (genericGuid[i] === "x") {
                        guid += hex[r];
                    } else if (genericGuid[i] === "y") {
                        r &= 0x3;  //  (sample:?0??)
                        r |= 0x8;  // (sample:1???)
                        guid += hex[r];
                    } else {
                        guid += genericGuid[i];
                    }
                }
                return guid;
            },
            /**
            * Generate hash from string.
            */
            getHash(str) {
                var hash = 0;
                if (str.length === 0) return hash;
                for (var i = 0; i < str.length; i++) {
                    var char = str.charCodeAt(i);
                    hash = ((hash << 5) - hash) + char;
                    hash = hash & hash; // Convert to 32bit integer
                }
                return hash;
            },
        }, // utils

        /**
         * Set bal instance with local storage instance.
         * @param {Object} browser local storage instance
         */
        setLocalStorage : function (ls) {
            localStorage = ls;
        },

        /**
         * Check current version and compare with previous version stored.
         * If newer version detected open Avast Welcome page on avast web.
         * @param {Numeric} current extension caller Id
         */
        checkPreviousVersion : function (currentCallerId) {
            var settings = sing.settings.get();
            var previousCallerId = settings.current.callerId;
            if (previousCallerId !== currentCallerId) {
                var prevMinor = previousCallerId % 1000;
                var currMinor = currentCallerId % 1000;

                if ( SHOW_WELCOME_PAGE_RULE(prevMinor, currMinor) ) {
                    AvastWRC.bs.openInNewTab(AvastWRC.AVAST_UPGRADE_PAGE_URL + currentCallerId);
                }
                /* don't ever change what the user did
                // block DNT when updating to 7/8
                if (currMinor === 7 || currMinor === 8 || (currMinor > 8 && prevMinor < 7)) {
                    _alterDntFeaturesDefaults(settings);
                    this.featureSettingChanged("dnt", false, true);
                }*/

                // update saved callerId
                settings.current.callerId = currentCallerId;


                sing.settings.set(settings);
            }
        },

        /**
         * Stores user Id so it is available to subsequent requests and persisted in local storage.
         * @param {String} userid to store
         */
        storeUserId : function (userId) {
            var settings = sing.settings.get();
            settings.current.userId = userId;
            sing.settings.set(settings);
            sing.updateOldSettings(); // refresh settings accessible through AvastWRC
        },

    }; // AvastWRC.bal

    // Init the core module to register for event from sub-modules.
    AvastWRC.bal.registerModule(AvastWRC.bal.Core);

}).call(this, _, EventEmitter2);
/*******************************************************************************
 *  avast! Online Security plugin :: Background Layer - AOS Module
 *  (c) 2014 Avast Corp.
 ******************************************************************************/
(function (_) {

    var RETRIEVE_AVAST_SETTINGS_THROTLE = 20 * 1000;
    var AVAST_DNL_PROPERTY = "PropertyDataSharing";

    var _bal = null;
    var _oldGui = false;

    if (typeof AvastWRC === "undefined" || typeof AvastWRC.bal === "undefined") {
        console.error("AvastWRC.bal instance not initialised to add SafePrice component");
        return;
    } else if (typeof AvastWRC.bal.aos !== "undefined") {
        return;
    }

    /**
   * Alter the DNT defaults to force the DNT optin. - set false
   */
    function _alterDntFeaturesDefaults (settings) {
        _(["dntSocial","dntAdTracking","dntWebAnalytics","dntOthers",]).each(
      function(key) {settings.features[key] = false;}
    );
        settings.features["dnt"] = true;
    }

    AvastWRC.bal.aos = AvastWRC.bal.aos || {

        init: function (balInst) {
            _bal = balInst;

            balInst.hookOnFeatureChange("communityIQ", function (enabled) {
                AvastWRC.local.setProperties([AVAST_DNL_PROPERTY,], [enabled ? "1" : "0",]);
            }.bind(balInst));
        },

        /**
     * Message hub - handles all the messages from the injected scripts
     * @param  {String} type
     * @param  {Object} message
     * @param  {Object} tab
     * @return {void}
     */
        commonMessageHubAos: function (type, data, tab) {
            if (typeof tab === "undefined") return;

            var url = tab.url || (tab.contentDocument && tab.contentDocument.location
                ? tab.contentDocument.location.href : null);
            var host = AvastWRC.bal.getHostFromUrl(url);
            switch (type) {
            case "initMe":
                    //if needed
                break;
            case "unload":
                    //if needed
                break;
            case "DNTstate":
                AvastWRC.bal.DNT.setWhiteList(data.type, data.ids, host, data.allow);
                break;
            case "userVote":
                var v =
                    {
                        uri: data.url,
                        vote: {
                            rating: data.rating,
                            flags: data.flags,
                        },
                    };

                AvastWRC.setVote(data.url, v);
                break;
            case "messageBoxFeedback":
                var settings = AvastWRC.bal.settings.get();
                switch (data.type) {
                case "siteCorrect":
                    var onBeforeReq = AvastWRC.TabReqCache.get(tab.id, "onBeforeReq");
                    onBeforeReq.blocked = false;
                    onBeforeReq.ok = data.ok;
                    AvastWRC.TabReqCache.set(tab.id, "onBeforeReq", onBeforeReq);


                    settings.siteCorrect.declined[data.url_from] = data.ok;
                    if (data.ok) {
                                //AvastWRC.bs.tabRedirect(tab, data.url_to);

                        if (data.auto) {
                            settings.features.siteCorrectAuto = true;
                        }

                                // make domain trackable
                        AvastWRC.bal.emitEvent("message.setDomainTrackable", { host: data.brand, });
                    }
                    AvastWRC.bal.settings.set(settings);

                            //TODO - notify backend about the user selection
                    AvastWRC.bal.aos.SC.reportTypoAccounting(data,
                                data.ok ? AvastWRC.bal.aos.SC.SC_MANUAL_REDIRECT :
                                    AvastWRC.bal.aos.SC.SC_MANUAL_REFUSED
                            );

                    setTimeout(function () {
                        var sc_status = AvastWRC.TabReqCache.get(tab.id, "sc_status");
                        var scdata = sc_status.scdata;
                        if (sc_status == undefined || scdata == undefined) return;
                        var onBeforeReq = AvastWRC.TabReqCache.get(tab.id, "onBeforeReq");
                        if (onBeforeReq == undefined) return;
                        if (onBeforeReq.ok) {
                            if (scdata.url_to != undefined && scdata.brand_domain != undefined) {
                                AvastWRC.bs.tabRedirect(tab, scdata.url_to);

                                delete (sc_status.scdata);
                                AvastWRC.TabReqCache.set(tab.id, "sc_status", sc_status);
                            }

                        } else {
                            if (scdata.url != undefined) {
                                AvastWRC.bs.tabRedirect(tab, scdata.url);

                                delete (sc_status.scdata);
                                AvastWRC.TabReqCache.set(tab.id, "sc_status", sc_status);
                            }
                        }
                    }, 1000);
                    break;
                case "phishing":
                case "malware":
                    if (data.ok) {
                        AvastWRC.bs.tabRedirect(tab, data.safety_url);
                    } else {
                        settings.phishing.trusted[data.url_from] = true;
                        AvastWRC.bal.settings.set(settings);
                    }
                    break;
                default:
                    AvastWRC.bal.emitEvent("message.messageBoxFeedback." + data.type, data, tab);
                }
                break;
            case "openSettings": // open settings page        	
                var optionsPage = AvastWRC.bs.getLocalResourceURL("options.html");
                AvastWRC.bs.openInNewTab(optionsPage);
                break;
            case "closeSettings":
                var lastTabId = AvastWRC.bal.cache.get("lastActivTabId");
                AvastWRC.bs.tabExists.call(this, lastTabId, function () {
                    AvastWRC.bs.setActiveTab(lastTabId);
                });
                AvastWRC.bs.closeTab(tab);
                break;
            case "resetSettings": // fallthrough !!!
                if (data.list === undefined) {
                    var newSettings = AvastWRC.bal.getDefaultSettings(this);
                    var oldSettings = AvastWRC.bal.settings.get();
                    if (oldSettings != "undefined" && oldSettings.current != "undefined") {
                        newSettings.current = oldSettings.current;
                    }
                    _alterDntFeaturesDefaults(newSettings);
                    AvastWRC.bal.settings.set(newSettings);
                    AvastWRC.bal.updateOldSettings();
                    AvastWRC.bal.featureSettingChanged("dnt", false, true);
                }
                else {
                    var def = AvastWRC.bal.getDefaultSettings(),
                        current = AvastWRC.bal.settings.get();

                    for (var feature in data.list) {
                        var key = data.list[feature];
                        if (current.features[key] !== def.features[key]) {
                            AvastWRC.bal.featureSettingChanged(key, current.features[key], def.features[key]);
                        }
                        current.features[key] = def.features[key];
                    }
                    AvastWRC.bal.settings.set(current);
                }
            case "getSettingList":
                var ret = {
                    message: "settingList",
                    data: {
                        title: AvastWRC.bs.getLocalizedString("title"),
                        save: AvastWRC.bs.getLocalizedString("settingsSave"),
                        reset: AvastWRC.bs.getLocalizedString("settingsReset"),
                        list: [],
                    },
                };

                var settings = AvastWRC.bal.settings.get();

                for (var feature in settings.features) {
                    var val = settings.features[feature];
                    var item = AvastWRC.bal.createSettingsItem(feature, val);

                        // Hide an obsolete setting. Will be reenabled by the SP module only
                        // in case the SP module is really registered and active.
                    if (feature === "safeShop") {
                        item.show = false;
                    }
                    if (feature === "safeZone" && item.active == false) {
                        continue;
                    }

                    _.each(AvastWRC.bal._bal_modules, function (module) {
                        if (typeof module.modifySettingsItem === "function") {
                            item = module.modifySettingsItem(feature, val, item);
                        }
                    }, this);

                    if (item.show) { ret.data.list.push(item); }
                }

                AvastWRC.bal.back.messageTab(tab, ret);
                break;
            case "saveSettings":
                var settings = AvastWRC.bal.settings.get();

                for (var feature in data.list) {
                    var f = data.list[feature];
                    var o = settings.features[f.key];
                    settings.features[f.key] = f.active;
                    if (o !== f.active) {
                        if (settings.dntAutoBlock && o) {
                            settings.dntAutoBlock = f.active;
                        }
                        wl = AvastWRC.bal.DNT.whiteList.get();
                        var cat = f.key.substring(3, f.key.length);
                        for (var host in wl) {
                            if (host != "trk") {
                                wl[host] = wl[host] || {};
                                if (wl[host][cat] && wl[host][cat] != undefined) wl[host][cat] = f.active;

                                    /*// individual tracker 
                                    for(var trkId in wl.trk[host]){
                                    wl.trk[host][trkId] = f.active;
                                    }			*/
                            }
                        }
                        AvastWRC.bal.DNT.whiteList.set(wl);

                        AvastWRC.bal.featureSettingChanged(f.key, o, f.active);
                    }
                }
                AvastWRC.bal.updateOldSettings();
                AvastWRC.bal.settings.set(settings);
                break;
            default:
                // emit messages in specific namespace
                AvastWRC.bal.emitEvent("message." + type, data, tab);
            }
        },

        SC: {
            /**
             * SiteCorrect handler
             * @param  {String} url
             * @param  {Object} rating - JSON value of URL Info
             * @param  {Object} tab
             * @return {[type]}
             */
            tabSiteCorrect: function (url, rating, tab) {
                var self = this;
                var features = AvastWRC.bal.settings.get().features;
                var redirectId = AvastWRC.bal.utils.getRandomUID();

                if (features.siteCorrect && rating.values.is_typo) {
                    if (features.siteCorrectAuto) {
                        AvastWRC.bs.tabRedirect(tab, rating.values.url_to);
                        AvastWRC.bal.aos.SC.reportTypoAccounting({
                            redirect_id: redirectId, url_from: url,
                            url_to: rating.values.url_to, brand: rating.values.brand_domain,
                        },
                            AvastWRC.bal.aos.SC.SC_AUTOMATIC_REDIRECT);
                        _bal.emitEvent("siteCorrect.redirect.auto", url, rating.values.url_to, rating.values.brand_domain);
                    } else {
                        // browser specific
                        var dec = AvastWRC.bal.settings.get().siteCorrect.declined;
                        if (dec == undefined || dec[url] == undefined || dec[url] == true) {
                            var onBeforeReq = AvastWRC.TabReqCache.get(tab.id, "onBeforeReq");
                            onBeforeReq = {
                                blocked: true,
                                ok: false,
                            };
                            AvastWRC.TabReqCache.set(tab.id, "onBeforeReq", onBeforeReq);
                            var tabId = AvastWRC.bs.getTabId(tab);
                            var data = {
                                redirect_id: redirectId,
                                url: url,
                                url_to: rating.values.url_to,
                                brand_domain: rating.values.brand_domain,
                            };

                            AvastWRC.bs.accessContent(tab, AvastWRC.bal.aos.SC.getSiteCorrectViewData(data));
                            AvastWRC.bal.aos.SC.messageBoxRequested(tabId, data, function (tabId) {
                                // when no message on retry redirect to default page
                                self.siteCorrectTabRedirect(tab, tabId);
                            });
                        }
                    }
                }
            },

            siteCorrectTabRedirect: function (tab, tabId) {
                AvastWRC.bs.tabRedirect(tab, AvastWRC.SITE_CORRECT_MSG_REDIRECT);
                var onBeforeReq = AvastWRC.TabReqCache.get(tabId, "onBeforeReq");
                onBeforeReq = {
                    blocked: false,
                    ok: false,
                };
                AvastWRC.TabReqCache.set(tabId, "onBeforeReq", onBeforeReq);
            },

            /**
             * Requested SiteCorrect message box. Set state and initiate request timeout
             *  to trigger redirect and retry.
             * @param {int} tabId where the SC message was requested.
             * @param {Object} data of the sitecorrect notification
             * @param {Function} retryCallback function to call when redirect and retry required
             **/
            messageBoxRequested: function (tabId, data, retryCallback) {
                var sc_status = AvastWRC.TabReqCache.get(tabId, "sc_status") || {};
                sc_status.state = "requested";
                sc_status.scdata = data;
                sc_status.timer = setTimeout(function () {
                    var sc_status = AvastWRC.TabReqCache.get(tabId, "sc_status");
                    if ("requested" === sc_status.state && retryCallback) {
                        sc_status.state = "retry";
                        AvastWRC.TabReqCache.set(tabId, "sc_status", sc_status);
                        retryCallback(tabId);
                    }
                },
                    AvastWRC.CREATE_MESSAGE_BOX_TIMEOUT);
                AvastWRC.TabReqCache.set(tabId, "sc_status", sc_status);
            },

            /**
             * Message box was rendered. Method clears timeout to redirect and retry.
             * @param {int} tabId where message box was rendered
             */
            messageBoxRendered: function (data, tab) {
                if ("siteCorrect" === data.type) {
                    var tabId = AvastWRC.bs.getTabId(tab);
                    var sc_status = AvastWRC.TabReqCache.get(tabId, "sc_status") || {};
                    var scdata = sc_status.scdata;
                    _bal.emitEvent("siteCorrect.message.open", scdata.url, scdata.url_to, scdata.brand_domain);
                    sc_status.state = "rendered";
                    if (sc_status.timer) {
                        clearTimeout(sc_status.timer);
                        delete (sc_status.timer);
                    }
                    //delete(sc_status.scdata);
                    AvastWRC.TabReqCache.set(tabId, "sc_status", sc_status);
                }

            },

            /**
             * Check to be called when page loaded. Function checks if some
             *  SiteCorrect message is pending on redirect and attampts to display it.
             * @param (int) tabId for which to check if messae is not pending
             * @param (Object) tab to display the message in
             */
            checkIsRetryRequested: function (tabId, tab) {
                var sc_status = AvastWRC.TabReqCache.get(tabId, "sc_status");
                if (sc_status && "retry" === sc_status.state && sc_status.scdata) {
                    AvastWRC.bs.accessContent(tab,
                        AvastWRC.bal.aos.SC.getSiteCorrectViewData(sc_status.scdata, false));
                }
            },

            /**
             * Constructs data for SiteCorrect message box template. Accepts following data:
             *    data.url - site corrected URL
             *    data.url_to - url to navigate to (typically through clickthrough link)
             *    data.brand_domain - correct brand domain to display
             * @param {Object} data for the SiteCorrect message
             * @param {boolean} (Optional) disable ignore option in dialog when set true
             */
            getSiteCorrectViewData: function (data, disable_ignore) {
                return {
                    message: "showMessageBox",
                    data: {
                        type: "siteCorrect",
                        redirect_id: data.redirect_id,
                        url: data.url_to,
                        url_from: data.url,
                        brand: data.brand_domain,
                        status: "ok",
                        image: AvastWRC.bs.getLocalResourceURL("/common/ui/icons/arrow-right.png"),
                        logo: AvastWRC.bs.getLocalResourceURL("/common/ui/icons/logo.png"),
                        //background: AvastWRC.bs.getLocalImageURL('img_bg.jpg'),
                        strings: {
                            type: AvastWRC.bs.getLocalizedString("sitecorrectHeadline"),
                            header: AvastWRC.bs.getLocalizedString("sitecorrectMean", [data.brand_domain,]),
                            message: AvastWRC.bs.getLocalizedString("sitecorrectText"),
                            extra: AvastWRC.bs.getLocalizedString("sitecorrectAuto"),
                            action_ok: AvastWRC.bs.getLocalizedString("sitecorrectYes"),
                            action_ignore: disable_ignore ? null : AvastWRC.bs.getLocalizedString("sitecorrectNo", [AvastWRC.bal.getHostFromUrl(data.url),]),
                        },
                        isOldGui: _oldGui,
                    },
                };
            },

            /**
             * Report typo action to the typo accounting backend.
             * @param {Object} details of the SiteCorrect redirect
             * @param {int} id of the action performed
             */
            reportTypoAccounting: function (details, action) {
                var report = {
                    redirectId: details.redirect_id,
                    urlFrom: details.url_from,
                    urlTo: details.url_to,
                    brandDomain: details.brand,
                    flags: action,
                };
                new AvastWRC.Query.TypoSquattingAccounting(report);
            },
            SC_MANUAL_REDIRECT: 0x000C,
            SC_MANUAL_REFUSED: 0x0004,
            SC_AUTOMATIC_REDIRECT: 0x0008,
            SC_TAKE_BACK_REDIRECT: 0x0005,
        }, // AvastWRC.bal.aos.SC

        /**
         * Returns a safe url to redirect to
         * @param url
         */
        getSafePageUrl(){
            return AvastWRC.PHISHING_REDIRECT;
        },

        /**
         * Phishing handler
         * @param  {String} url
         * @param  {Object} rating - JSON value of URL Info
         * @param  {Object} tab
         * @return {[type]}
         */
        tabPhishing: function (url, rating, tab) {
            let features = AvastWRC.bal.settings.get().features;
            if (features.phishing) { //phishing and malware
                let message = {
                    message: "showMessageBox",
                    data: {
                        url: rating.values.url_to,
                        url_from: url,
                        brand: rating.values.brand_domain,
                        status: "error", //'attention',
                        image: AvastWRC.bs.getLocalResourceURL("/common/ui/icons/error.png"),
                        logo: AvastWRC.bs.getLocalResourceURL("/common/ui/icons/logo.png"),
                        isOldGui: _oldGui,
                    },
                };

                if (AvastWRC.bal.settings.get().phishing.trusted[url] !== true && rating.getPhishing() > 1) { //phishing
                    _.extend(message.data, {
                        type: "phishing",
                        warning: (rating.getPhishing() > 1) ? AvastWRC.Warning.get(url) : false,
                        safety_url: this.getSafePageUrl() || AvastWRC.PHISHING_REDIRECT,
                        strings: {
                            header: AvastWRC.bs.getLocalizedString("phishingWarning"),
                            message: AvastWRC.bs.getLocalizedString("phishingPhishingSite"),
                            inputwarning: AvastWRC.bs.getLocalizedString("phishingCreditNumber"),
                            action_ignore: AvastWRC.bs.getLocalizedString("phishingTrust"),
                            action_ok: AvastWRC.bs.getLocalizedString("phishingBack"),
                            action_close: AvastWRC.bs.getLocalizedString("phishingClose")
                        },
                        phishing: AvastWRC.bs.getLocalResourceURL("common/ui/icons/what-is-phishing.png"),
                        phishingDesc: AvastWRC.bs.getLocalizedString("phishingDesc"),
                    });
                    _bal.emitEvent("security.phishing.open", url, tab.id);
                    AvastWRC.bs.accessContent(tab, message);
                } else if (rating.values.block === 1) { //malware
                    _.extend(message.data, {
                        type: "malware",
                        safety_url: this.getSafePageUrl() || AvastWRC.PHISHING_REDIRECT,
                        strings: {
                            header: AvastWRC.bs.getLocalizedString("phishingWarning"),
                            message: AvastWRC.bs.getLocalizedString("malwareSite"),
                            inputwarning: AvastWRC.bs.getLocalizedString("phishingCreditNumber"),
                            action_ignore: "",
                            action_ok: AvastWRC.bs.getLocalizedString("phishingBack"),
                            action_close: AvastWRC.bs.getLocalizedString("phishingClose"),
                        }
                    });
                    _bal.emitEvent("security.malware.open", url, tab.id);
                    AvastWRC.bs.accessContent(tab, message);
                }
            }
        },

        // ---------------------- Register AOS with BAL core -----------------------
        /* Register AOS Event handlers */
        registerModuleListeners: function (ee) {
            ee.on("urlInfo.response", AvastWRC.bal.aos.SC.tabSiteCorrect.bind(AvastWRC.bal.aos.SC));
            ee.on("urlInfo.response", AvastWRC.bal.aos.tabPhishing.bind(AvastWRC.bal.aos));
            ee.on("urlInfo.response", _.throttle(this.retrieveAvastSettings.bind(this), RETRIEVE_AVAST_SETTINGS_THROTLE));
            ee.on("message.messageBoxOpened", AvastWRC.bal.aos.SC.messageBoxRendered);
            /* Enable domain to be tracked */
            ee.on("message.setDomainTrackable", function (e) {
                var dwl = _bal.DNT.domainWhiteList.get();
                dwl[e.host] = (new Date()).getTime();
                _bal.DNT.domainWhiteList.set(dwl);
            });

            // Communication with Content, after recieving request for rules, we ask Shepherd and send them rules
            ee.on("message.serpRules", function (data, tab) {
                if(AvastWRC.Shepherd && AvastWRC.Shepherd.getSerpRule(data.value))
                {
                    // sending data back to CS
                    AvastWRC.bs.accessContent(tab, {
                        message: 'serpRules',
                        data: {
                            value: AvastWRC.Shepherd.getSerpRule(data.value)
                        }
                    });
                }
            });

            // We get result from content, sending it to Backend
            /* deactiavted because of AOSP-974
            ee.on("message.serpResults", function (data, tab) {
                {
                    var serpDetails = {
                        url: tab.url,
                        tabNum: tab.id,
                        windowNum: tab.windowId,
                        reqServices: 0,
                        customKeyValue: data.value
                    };
    
                    AvastWRC.get(serpDetails, function (res) {});
                }
            });
            */
    
            ee.on("request.setUserVote", function (url, ratingPossitive, flags) {
                var v =
                    {
                        uri: data.url,
                        vote: {
                            rating: data.rating,
                            flags: data.flags,
                        },
                    };

                AvastWRC.setVote(data.url, v);
                _bal.emitEvent("userVote.set", data.url, data.rating);
            });
            ee.on("page.complete", function (tabId, tab, url) {
                _bal.aos.SC.checkIsRetryRequested(tabId, tab);
            });
            ee.on("request.setUserVoteDetails", function () {

            });
        },

        /**
         * Return AOS related default settings.
         */
        getModuleDefaultSettings: function () {
            return {
                siteCorrect: {
                    declined: {},
                },
                safeZone: {
                    declined: {},
                },
                phishing: {
                    trusted: {},
                },
                features: {
                    //webRep         : true,
                    //webRepTooltips : true,
                    phishing: true,
                    dnt: true,
                    dntSocial: false,
                    dntAdTracking: false,
                    dntWebAnalytics: false,
                    dntOthers: false,
                    siteCorrect: true,
                    siteCorrectAuto: false,
                    safeZone: true,
                    communityIQ: true,
                    serp: true,
                    serpPopup: true,
                    dntAutoBlock: false,
                },
            };
        },

        retrieveAvastSettings: function () {
            var prop = AVAST_DNL_PROPERTY,
                settings = AvastWRC.bal.settings.get(),
                currDnl = settings.features.communityIQ;
            AvastWRC.local.getProperties([prop,], function (value) {
                var avastDnl;
                if (value && value.length > 0) {
                    avastDnl = (value[0] == "1");
                    if (avastDnl != currDnl) {
                        settings.features.communityIQ = avastDnl;
                        AvastWRC.bal.settings.set(settings);
                    }
                }
            });
        },

    };

    AvastWRC.bal.registerModule(AvastWRC.bal.aos);

}).call(this, _);


(function (_) {
    /*******************************************************************************
     *
     *  AvastWRC Rules
     *
     *  @author: Ondrej Masek
     *
     ******************************************************************************/

    AvastWRC.Rules = {
        /**
         * Initialize rules class
         * @return {Object} Self reference
         */
        init: function () {
            this.restore();
            this.load();
            return this;
        },
        /**
         * Default / Current rules version (timestamp)
         * @type {Number}
         */
        rulesVersion: 100817143230073,
        /**
         * Download new updates for rules
         * @return {[type]} [description]
         */
        load: function () {
            var self = this;
            new AvastWRC.Query.Rules({
                rulesVersion: this.rulesVersion,
                callback: function (rules) {
                    self.setRules(rules);
                    AvastWRC.bal.DNT.processDNTrules(rules);

                    // persist userid
                    if (!AvastWRC.CONFIG.USERID && rules.userid) {
                        AvastWRC.bal.storeUserId(rules.userid);
                    }
                },
            });
        },
        /**
         * Individual rules stored localy while the browser is running
         * @type {Object}
         */
        rules: {},
        /**
         * Restore rules and rulesVeriosn from cache
         * @return {void}
         */
        restore: function () {
            // TODO: load rules from cache and update rulesVersion property
            //var version  = (this.rulesVersion) ? this.rulesVersion : 100817143230073;
            var self = this;
            var version = AvastWRC.getStorage("urlRulesVersion", function (version) {
                if (typeof version === "string") {
                    self.rulesVersion = version;
                }
            });

            AvastWRC.getStorage("urlRules", function (rules) {
                if (typeof rules === "string") {
                    self.rules = JSON.parse(rules);
                }
            });
        },
        /**
         * Save all the rules currently stored locally to cache
         * @return {void}
         */
        save: function () {
            AvastWRC.setStorage("urlRules", JSON.stringify(this.rules));
            AvastWRC.setStorage("urlRulesVersion", this.rulesVersion);
        },
        /**
         * Parse incoming rules, store them locally and automatically save new versions to cache
         * @param {[type]} rules [description]
         */
        setRules: function (rules) {
            this.rulesVersion = rules.version;
            

            for (var c = 0; c < rules.colorRules.length; c++) {
                var color = rules.colorRules[c].values_;
                this.rules[color.domain] = {
                    url: color.url,
                    style: color.selector,
                    urlExtractor: color.urlExtractor,
                };

                console.log(color.domain);
                if(color.domain === 'bing.com')
                {
                    console.log('JarkoinRules');
                    this.rules[color.domain].jarkorules = { jakpan: "your rule"}; 
                }
            }

            
            this.save();
        },
        /**
         * Get a individual rule based on the regexp defined in the rule
         * @param  {String} url Url of the site
         * @return {Object}     Rule object (flase if no applicable rule was found)
         */
        get: function (url) {
            for (var domain in this.rules) {
                if (this.rules[domain] && this.rules[domain].url && url.search(this.rules[domain].url) > -1) {
                    return this.rules[domain];
                }
            }
            return false;
        },
    };

    AvastWRC.bal.registerModule(AvastWRC.Rules);

    /*******************************************************************************
     *
     *  AvastWRC Warning rules
     *
     ******************************************************************************/
    AvastWRC.Warning = {
        /**
         * Restore data form cache
         * @return {void}
         */
        init: function () {
            var self = this;
            AvastWRC.getStorage(AvastWRC.DEFAULTS.CACHE.WARNING, function (domains) {
                if (typeof domains === "string") {
                    self.domains = JSON.parse(domains);
                }
            });
        },
        /**
         * Save data to cache
         * @return {void}
         */
        save: function () {
            AvastWRC.setStorage(AvastWRC.DEFAULTS.CACHE.WARNING, JSON.stringify(this.domains));
        },
        /**
         * Get Warning status for url - if none set, return true
         * @param  {String} url Domain
         * @return {Bool}          Should we show phishing warning for this domain
         */
        get: function (url) {
            var domain = AvastWRC.Utils.getDomain(url);
            if (this.domains[domain] === false) return this.domains[domain];
            return true;
        },
        /**
         * Set Warning
         * @param {String} url Set warning status for url
         * @param {Bool} value  [description]
         */
        set: function (url, value) {
            var domain = AvastWRC.Utils.getDomain(url);
            this.domains[domain] = value;
            this.save();
        },
        /**
         * Temp domains storage
         * @type {Object}
         */
        domains: {},

    };

    AvastWRC.bal.registerModule(AvastWRC.Warning);
}).call(this, _);
/*******************************************************************************
 *  avast! Online Security plugin ::: Do Nt Track Module
 *  (c) 2013-2014 Avast Corp.
 ******************************************************************************/

(function (AvastWRC, _) {

    var SUPPORTED_TRACKER_TYPES = ['Others', 'WebAnalytics', 'AdTracking', 'Social'];

    var sing = null; // bal singleton

    /*
     * Shared function determining if tracker should be/is blocked.
     * @param wl - DNT whitelist definition enabling/disabling DNT for categorie and individual tracker
     * @param host - host trackers are detected on
     * @param trackerId - tracker identifier
     * @param trackerCat - tracker category
     * @param features - features settings
     * @return true to block the tracker
     */
    function isBlocked(wl, host, trackerId, trackerCat, features) {
        var exTracker, exCategory, catSetting, settings = AvastWRC.bal.settings.get();
        if (settings.dntAutoBlock !== undefined && settings.dntAutoBlock)
            return settings.dntAutoBlock;
        // undefined - no exception, true - tracker must NOT BE used on this host, false - tracker must BE used on this host
        catSetting = features['dnt' + trackerCat];
        exCategory = wl[host] === undefined ? undefined : wl[host][trackerCat];
        exTracker = wl.trk[host] === undefined ? undefined : wl.trk[host][trackerId];
        if (catSetting !== undefined && exCategory !== undefined && catSetting && catSetting !== exCategory) {
            return catSetting;
        }
        if (exTracker !== undefined) {
            return exTracker;
        }
        return catSetting;
    }

    function setDntFeatures(dntVal, categoriesVal) {
        var settings = AvastWRC.bal.settings.get();
        var features = settings.features;
        var dntOld = features.dnt;
        features.dnt = dntVal;
        settings.dntAutoBlock = categoriesVal;
        _.each(SUPPORTED_TRACKER_TYPES, function (type) {
            var featureKey = 'dnt' + type;
            var featureOldVal = features[featureKey];
            features[featureKey] = categoriesVal;
            sing.featureSettingChanged(featureKey, featureOldVal, categoriesVal);
        });
        if (dntOld !== dntVal) sing.featureSettingChanged('dnt', dntOld, dntVal);
        settings.features = features;
        AvastWRC.bal.settings.set(settings);
    }

    /**
     * Do Not Track Core
     * @type {Object}
     */
    AvastWRC.bal.DNT = AvastWRC.bal.DNT || {
        /**
         * key used for storage
         * @type {String}
         */
        _KEY: 'dnt',
        /**
         * Associate arrays keyd by host domain for domain specific rules.
         * @type {Object}
         */
        domainTrackers: {},
        /**
         * Array of rules based on regex pattern only, no specific host domain.
         * @type {Array}
         */
        patternTrackers: [],
        /**
         * Tracker type
         * @type {Array}
         */
        trkrType: SUPPORTED_TRACKER_TYPES, //empty array -> dynamic handling
        /**
         * DNT list update interval
         * @type {Numeric}
         *
         * TODO - DNT list update is handled in the same time with the Color Rules update
         */
        //updateInterval: 12*60*60*1e3, // 12h
        init: function (balInst) {
            sing = balInst;

            if (!sing.cache.contains(this._KEY))
                sing.cache.add(this._KEY, {});

            this.trackers = new sing.troughStorage('trackers', {});
            this.whiteList = new sing.troughStorage('whiteList', {});
            this.domainWhiteList = new sing.troughStorage('domainWhiteList', {});

            var storageTeackers = AvastWRC.bal.storage.get("trackers");
            if (storageTeackers) {
                this.trackers.set(storageTeackers);
                AvastWRC.bal.storage.delete("trackers");
            }
            var storageWL = AvastWRC.bal.storage.get("whiteList");
            if (storageWL) {
                this.whiteList.set(storageWL);
                AvastWRC.bal.storage.delete("whiteList");
            }
            var storageDomWL = AvastWRC.bal.storage.get("domainWhiteList");
            if (storageDomWL) {
                this.domainWhiteList.set(storageDomWL);
                AvastWRC.bal.storage.delete("domainWhiteList");
            }

            var wl = this.whiteList.get();
            if (wl.trk === undefined) {
                wl.trk = {};
                this.whiteList.set(wl);
            }

            sing.DNT.updateDetectionRules(sing.DNT.trackers.get());
        },

        registerModuleListeners: function (ee) {
            ee.on('request.dnt_enable', function (status) {
                var settings = AvastWRC.bal.settings.get();
                settings.features.dnt = status;
                AvastWRC.bal.settings.set(settings);
            });

            ee.on('request.search', function (search_data) {
                var url = AvastWRC.getWTUSearchURL() + search_data;
                AvastWRC.bs.openInNewTab(url);
            });

            ee.on('request.dntWhitelist', function (category, trkIds, host, block) {
                /* block = true - tracker disabled(green) - blocked to load
                *                false - tracker enabled(red) - allowed to load */

                var settings = AvastWRC.bal.settings.get();
                if (settings.dntAutoBlock) {
                    block = false;
                }

                wl = sing.DNT.whiteList.get();

                // tracker category
                if (category !== undefined) {
                    wl[host] = wl[host] || {};
                    wl[host][category] = block;
                    //todo: update dnt category... 
                    var featureKey = 'dnt' + category;
                    var featureOldVal = settings.features[featureKey];

                    if (featureOldVal !== block) {
                        sing.featureSettingChanged(featureKey, featureOldVal, block);
                    }

                    settings.features[featureKey] = block;
                    AvastWRC.bal.settings.set(settings);
                }

                wl.trk[host] = wl.trk[host] || {};

                // individual tracker
                if (_.isArray(trkIds))
                    _.each(trkIds, function (trkId) { wl.trk[host][trkId] = block; });
                else
                    wl.trk[host][trkIds] = block;

                sing.DNT.whiteList.set(wl);

                sing.emitEvent('dnt.trackers.updated', category, trkIds, host, block);
            });

            ee.on('request.dnt.activate', function () {
                setDntFeatures(true, true);
                sing.emitEvent('dnt.activated');
            });
            ee.on('request.dnt.block', function () {
                setDntFeatures(true, false);
                sing.emitEvent('dnt.blocked');
            });

        },
        /**
         * Category mapping from backend
         * @param  {Numeric} catID
         * @return {String}
         */
        getCategory: function (catID) {
            switch (catID) {
            case 0: return 'Others';
            case 1: return 'WebAnalytics';
            case 2: return 'Others';
            case 3:
            case 4:
            case 5: return 'AdTracking';
            case 11:
            case 12:
            case 13: return 'Social';
            default: return 'Others';
            }
        },
        /**
         * processes the rules fetched from the backend
         * @param  {Object} rules - GPB decoded
         * @return {void}
         */
        processDNTrules: function (rules) {
            var trackers = sing.DNT.trackers.get() || [],
                wl = sing.DNT.whiteList.get();
            for (var r = 0; r < rules.dntRules.length; r++) {
                var trk = rules.dntRules[r].values_;
                if (trk.name === undefined) { // tracker deleted
                    delete trackers[trk.id];
                }
                else {
                    for (var set = 0; set < trk.settings.length; set++) { //specific tracker settings
                        var host = trk.settings[set];
                        wl.trk[host] = wl.trk[host] || {};
                        if (wl.trk[host][trk.id] == undefined) { //dont change a prior setting -> might be user setting
                            wl.trk[host][trk.id] = false;
                        }
                    }
                    delete trk.settings;

                    trk.category = sing.DNT.getCategory(trk.category);
                    trackers[trk.id] = trk;
                }
            }
            sing.DNT.whiteList.set(wl);
            sing.DNT.trackers.set(trackers);
            sing.DNT.updateDetectionRules(trackers);
        },
        /**
         * Generates the data stractures used to match specific trackers.
         *  Strored in: ...DNT.domainTrackers and ...DNT.patternTrackers
         * @param  {Array} trackers
         * @return {void}
         */
        updateDetectionRules: function (trackers) {
            var domainTrackers = {},
                patternTrackers = [],
                dnt = sing.DNT, wl = dnt.whiteList.get(),
                domainTrackersCnt = 0;

            _.forIn(trackers, function (item) {
                if (item && item.active) {
                    var domains = item.domains;
                    if (domains && domains.length > 0) {
                        _.forEach(domains, function (domain) {
                            var dTrackers = domainTrackers[domain];
                            if (!dTrackers) {
                                dTrackers = { domainTracker: null, patternTrackers: [] };
                                domainTrackers[domain] = dTrackers;
                            }
                            if (item.pattern && item.pattern.length > 0) {
                                dTrackers.patternTrackers.push(item);
                            } else {
                                dTrackers.domainTracker = item;
                            }
                            domainTrackersCnt++;
                        });
                    } else if (item.pattern && item.pattern.length > 0) {
                        patternTrackers.push(item);
                    }

                    if (dnt.trkrType.indexOf(item.category) === -1) {
                        dnt.trkrType.push(item.category);
                    }
                }
            });
            dnt.domainTrackers = domainTrackers;
            dnt.patternTrackers = patternTrackers;
        },

        /**
         * Initializes cache for a specific tab or host
         * @param  {String} identifier
         * @return {void}
         */
        initTab: function (identifier) { //host in FF, tabId in Chrome and Safari
            var init = {};
            for (var i in sing.DNT.trkrType)
                init[sing.DNT.trkrType[i]] = [];
            sing.cache.add('dnt_' + identifier, init, this._KEY);
        },
        /**
         * Gets data for a specific tab or host
         * @param  {String} identifier
         * @return {Object} DNT data
         */
        getTab: function (identifier) { //host in FF
            if (!sing.cache.contains('dnt_' + identifier, sing.DNT._KEY)) {
                this.initTab(identifier);
            }

            return sing.cache.get('dnt_' + identifier, sing.DNT._KEY);
        },
        /**
         * Clean all collected tab data.
         */
        resetAllTabs: function () {
            sing.cache.reset(sing.DNT._KEY);
        },
        /**
         * Whitelist method for DNT
         * @param {String} category
         * @param {Array} trkIds
         * @param {String} host
         * @param {Boolean} allow
         *                true - tracker disabled(green) - blocked to load
         *                false - tracker enabled(red) - allowed to load
         */
        setWhiteList: function (category, trkIds, host, allow) {
            var del = true,
                wl = sing.DNT.whiteList.get();

            // tracker category
            if (category !== undefined) {
                wl[host] = wl[host] || {};
                wl[host][category] = allow;
            }

            // individual tracker
            for (var trk in trkIds) {
                wl.trk[host] = wl.trk[host] || {};
                wl.trk[host][trkIds[trk]] = allow;
            }
            sing.DNT.whiteList.set(wl);
        },
        /**
         * Helper function for the tests, calling RegExp.test
         * @param  {String}  url
         * @param  {Array}  trk
         * @return {Boolean} true - if is in pattern
         */
        callRegExp: function (trk, url) {
            return RegExp(trk.pattern).test(url);
        },
        /**
         * Assesses if the url of the request needs to be blocked or not on the host.
         *  This is the core of the DNT functionality.
         *  Tries to match an specific url to a tracker company
         *    - optimized by parsing host domain of the request and matching the rules
         *      by the domain first.
         *  It is the most computing intensive code. It needs to be as fast as possible.
         *   While optimized using the host domain matching still has to be carefully considered.
         * @param  {String}  url
         * @param  {String}  host
         * @param  {String}  tabId
         * @return {Boolean} true - if URL is tracking and should be blocked
         */
        isTracking: function (url, host, tab) {
            var ret = false; // true = block, false = dont block
            var tabId = typeof tab === 'object' ? tab.id : tab;

            url = url.toLowerCase();
            var urlHost = AvastWRC.bal.getHostFromUrl(url);

            if (urlHost && urlHost !== host) { // do not check resources from same host
                var tracker = null;
                var dnt = sing.DNT.getTab(tabId || host);

                //resolve domain specific trackers
                var dTracker = sing.DNT.domainTrackers[AvastWRC.bal.getDomainFromHost(urlHost)];
                if (dTracker) {

                    // match domain specific patterns
                    tracker = _.find(dTracker.patternTrackers,
                        function (trk) { return AvastWRC.bal.DNT.callRegExp(trk, url); }
                    );

                    // use domain only tracker
                    if (!tracker) {
                        tracker = dTracker.domainTracker;
                    }
                }

                // try to resolve pattern only tracker
                if (!tracker) {
                    tracker = _.find(sing.DNT.patternTrackers,
                        function (trk) { return AvastWRC.bal.DNT.callRegExp(trk, url); }
                    );
                }

                // tracker found
                if (tracker) {
                    var wl = sing.DNT.whiteList.get(),
                        isDomainTracked = (sing.DNT.domainWhiteList.get()[host] !== undefined),
                        features = AvastWRC.bal.settings.get().features,
                        exTracker, exCategory;
                    //, exCategory;

                    dnt[tracker.category].push(tracker.id);

                    // badge modification - implementation cannot be blocking
                    AvastWRC.bal.emitEvent('badgeInfoUpdated', tab, host, sing.DNT.computeTotal.bind(this));

                    if (!isDomainTracked) {
                        ret = isBlocked(wl, host, tracker.id, tracker.category, features);
                    }
                }
            }
            AvastWRC.bal.emitEvent('badgeInfoUpdated', tab, host, sing.DNT.computeTotal.bind(this));
            return ret;
        },
        /**
         * Returns the state for a specific category
         * @param  {Object} wl
         * @param  {String} host
         * @param  {String} cat
         * @param  {Object} features - settings
         * @return {Boolean}
         */
        getCategoryState: function (wl, host, cat, features) {
            var ACTIVE = 1, DISABLED = 0, settings = AvastWRC.bal.settings.get(),

                exCategory = wl[host] === undefined ? undefined : wl[host][cat];
            if (settings.dntAutoBlock !== undefined && settings.dntAutoBlock)
                return ACTIVE;

            if (exCategory === undefined || (features['dnt' + cat] && features['dnt' + cat] != exCategory)) {

                return features['dnt' + cat] == true ? ACTIVE : DISABLED;

            }
            else {
                return exCategory ? ACTIVE : DISABLED;

            }
        },
        /**
         * Generates DNT data for building the UI for a specific tab or host
         * @param  {String} identifier
         * @param  {String} host
         * @return {Object}
         */
        compute: function (identifier, host) {
            var dnt = this.getTab(identifier),
                trackers = sing.DNT.trackers.get(),
                state, features = AvastWRC.bal.settings.get().features;

            if (dnt && host) {
                var ret = {
                    name: 'Do Not Track',
                    elements: []
                };

                for (var i = sing.DNT.trkrType.length - 1; i >= 0; i--)
                    ret.elements.push({
                        type: sing.DNT.trkrType[i],
                        type_desc: AvastWRC.bs.getLocalizedString('dnt' + sing.DNT.trkrType[i] + 'Networks'),
                        /*positions : ['left','right','right'],
                        strings   : [AvastWRC.bs.getLocalizedString('dntAllowed'), AvastWRC.bs.getLocalizedString('dntBlocked'), AvastWRC.bs.getLocalizedString('dntBlocked')],
                        wrappers  : [AvastWRC.bs.getLocalImageURL('switcher_redbg.png'), AvastWRC.bs.getLocalImageURL('switcher_greenbg.png'), AvastWRC.bs.getLocalImageURL('switcher_orangebg.png')],
                        switchers : [AvastWRC.bs.getLocalImageURL('switcher_dotred.png'), AvastWRC.bs.getLocalImageURL('switcher_dotgreen.png'), AvastWRC.bs.getLocalImageURL('switcher_dotorange.png')],
                        symbols   : [AvastWRC.bs.getLocalImageURL('icn_check.png'),AvastWRC.bs.getLocalImageURL('icn_check.png'),AvastWRC.bs.getLocalImageURL('icn_exclamationmark.png')],*/
                    });
                host = host.replace('www.', ''); //extra safety
                var wl = sing.DNT.whiteList.get(),
                    dwl = sing.DNT.domainWhiteList.get(),
                    isDomainTracked = (dwl[host] !== undefined),
                    tot = 0;

                for (var i = 0; i < ret.elements.length; i++) {
                    var item = ret.elements[i], actives = 0;
                    var networks = frequency(dnt[item.type]);

                    item.elements = [];
                    for (var net in networks) {
                        var on = isDomainTracked ? false :
                            wl.trk[host] !== undefined && wl.trk[host][networks[net]] !== undefined ? wl.trk[host][networks[net]] : features['dnt' + item.type];

                        item.elements.push({
                            name: trackers[networks[net]].name,
                            active: on,
                            disabled: wl[host] && (wl[host][item.type] == true) ? true : false,
                            type: item.type,
                            id: networks[net]
                        });

                        actives += on ? 1 : 0;
                    }

                    tot += item.number = networks.length;
                    item.state = isDomainTracked ? 0 : sing.DNT.getCategoryState(wl, host, item.type, features);

                    if (actives > 0 && actives < item.number) {
                        item.state = 2;
                    }

                    item.wrapper = item.wrappers[item.state];
                    item.symbol = item.symbols[item.state];
                    item.switcher = item.switchers[item.state];
                    item.text = item.type_desc + ' ' + item.strings[item.state];
                    item.position = item.positions[item.state];
                }

                ret.headline = AvastWRC.bs.getLocalizedString('dntHeadline', [tot]);

                return ret;
            }
            else {
                return '';
            }
        },

        /**
         * Provide DNT stats for given tabId and host. In structure
         *  {
         *    tabI: ,
             host: ,
            active: ,
            stat: {actives: , total: },
            groups: [
                {
                type: ,
                type_desc_key: ,
                activeTrackers: ,
                totalTrackers: ,
                active: ,
                trackers: [
                    {
                    id: ,
                    name: ,
                    active: ,
                    disabled: ,
                    type:
                    }, ...
                ]
                },...
            ]
        *  }
        */
        getUIData: function (tabId, host) {
            var dnt = this.getTab(tabId),
                trackers = sing.DNT.trackers.get(),
                features = AvastWRC.bal.settings.get().features,
                dntAutoBlock = AvastWRC.bal.settings.get().dntAutoBlock;

            var wl = sing.DNT.whiteList.get(),
                dwl = sing.DNT.domainWhiteList.get(),
                isDomainTracked = (dwl[host] !== undefined),
                wlHost = wl.trk[host],
                isHostOn = (wlHost !== undefined),
                tot = 0;

            host = host.replace('www.', ''); //extra safety

            var trackerGroups = _.map(sing.DNT.trkrType, function (trkrType) {
                var networks = frequency(dnt[trkrType]),
                    typeFeature = features['dnt' + trkrType];

                var trackersFound = _.map(networks, function (netId, net) {
                    // var on = isDomainTracked ? false :
                    //     isHostOn && wlHost[netId] !== undefined ? wlHost[netId] : typeFeature;
                    var on = isDomainTracked ? false : isBlocked(wl, host, netId, trkrType, features);
                    return { id: netId, name: trackers[netId].name, active: on, disabled: false, type: trkrType };
                });

                var total = trackersFound.length;
                var actives = _(trackersFound).filter('active').size();
                // var state = (actives > 0 && actives < total) ? 2 :
                //   (isDomainTracked ? 0 : sing.DNT.getCategoryState(wl, host, trkrType, features));

                return {
                    type: trkrType,
                    type_desc_key: 'dnt' + trkrType + 'Networks',
                    activeTrackers: actives,
                    //state: state,
                    active: (isDomainTracked ? false : sing.DNT.getCategoryState(wl, host, trkrType, features) > 0),
                    totalTrackers: total,
                    trackers: trackersFound,
                    featureEnabled: typeFeature
                };
            });

            var stat = _.reduce(trackerGroups, function (stat, group) {
                stat.actives += group.activeTrackers;
                stat.total += group.totalTrackers;
                return stat;
            }, { actives: 0, total: 0 });

            var someFeatureEnabled = _.some(trackerGroups, function (tracker) { return tracker.featureEnabled; });

            return {
                tabId: tabId,
                host: host,
                enabled: features.dnt,
                active: dntAutoBlock,//features.dnt && someFeatureEnabled,
                stat: stat,
                groups: _(trackerGroups).reverse().value()
            };
        },

        /**
         * Computes the total and the state of an tab/host to be used for badge refresh
         * @param  {String} identifier
         * @param  {String} host
         * @return {Object}
         *              {
         *               @text  {String}
         *               @color {String}
         *               }
         *
         * TODO - as this can be quite computing intensive, some optimization is advised
         */
        computeTotal: function (identifier, host) {
            var dnt = this.getTab(identifier);
            if (dnt && host) {
                var tot = 0, cat, active_categories = 0, actives, totActiveTrackers = 0, networks, state,
                    categories = sing.DNT.trkrType,
                    wl = sing.DNT.whiteList.get(),
                    dwl = sing.DNT.domainWhiteList.get(),
                    features = AvastWRC.bal.settings.get().features,
                    isYellow = false,
                    isDomainTracked = (dwl[host] !== undefined);

                for (var i = categories.length - 1; i >= 0; i--) {
                    cat = categories[i], networks = frequency(dnt[cat]), actives = 0;

                    for (var net in networks) {
                        //var on = wl.trk[host] !== undefined && wl.trk[host][networks[net]] !== undefined ? wl.trk[host][networks[net]] : features['dnt' + cat];
                        var on = isBlocked(wl, host, networks[net], cat, features);
                        actives += on ? 1 : 0;
                    }

                    tot += networks.length;
                    totActiveTrackers += networks.length - actives;
                    state = sing.DNT.getCategoryState(wl, host, cat, features);

                    if (networks.length > 0 && actives < networks.length) {
                        isYellow = true;
                    }

                    // color: green - all green, red - all red, yellow - rest
                    active_categories += state == 1 ? 1 : 0;
                }

                return {
                    text: tot.toString(), // totActiveTrackers.toString(), //
                    color: AvastWRC.bal.RATING_COLOR[tot == 0 ? 0 : (tot == totActiveTrackers ? 3 : (totActiveTrackers < tot && totActiveTrackers != 0 ? 2 : 1))]
                };
            }
            else {
                return null;
            }
        },
        /* Trace module details */
        trace: function (log) {
            log('--- bal.dnt ---');
            var thisCache = sing.cache.map[this._KEY];
            var stat = _.reduce(thisCache, function (stat, val, key) {
                stat.cached++;
                if (/^dnt_/.test(key)) {
                    stat.tabs++;
                    stat.trackers += _.reduce(val, function (sum, trkArray) { return sum + trkArray.length; }, 0);
                }
                return stat;
            }, { cached: 0, tabs: 0, trackers: 0 });
            log(stat);
        }
    };

    function frequency(input) {
        var i = 0, ax, count, item, a1 = input.slice(0);
        while (i < a1.length) {
            count = 1;
            item = a1[i];
            ax = i + 1;
            while (ax < a1.length && (ax = a1.indexOf(item, ax)) != -1) {
                count += 1;
                a1.splice(ax, 1);
            }
            //a1[i]+= ' - '+count + ' time' + (count==1?'':'s');
            ++i;
        }
        return a1;
    }

    AvastWRC.bal.registerModule(AvastWRC.bal.DNT);
}).call(this, AvastWRC, _);

(function(AvastWRC, _) {

    var APPLICATION_EVENT_INTERVAL = 7/*D*/*24*60*60*1000;

    var _bal = null;

    AvastWRC.bal.aos.AppEvents = AvastWRC.bal.aos.AppEvents || {
      /**
       * Initialize module. 
       */
      init: function (balInst) {
        _bal = balInst;
      },

      /**
       * Send application event for A. gamification to be triggered as extension start. 
       */
      onLocalPaired : function (guid, auid, hwid, uuid) {
        var settings = _bal.settings.get();
        var now = Date.now();
        var lastSent = settings.current.lastApplicationEventSent;
        
        if (lastSent + APPLICATION_EVENT_INTERVAL < now) {
          
          new AvastWRC.Query.ApplicationEvent({ eventType : [8, 1] });
          
          settings = _bal.settings.get();
          settings.current.lastApplicationEventSent = now;
          _bal.settings.set(settings);
        }
      },

      /*registerModuleListeners: function(ee) {
        ee.on('local.paired', AvastWRC.bal.aos.AppEvents.onLocalPaired.bind(AvastWRC.bal.aos.AppEvents));
      },*/

      getModuleDefaultSettings: function() {
        return {
          current : {
            lastApplicationEventSent : 0
          }
        };
      }

    };

    AvastWRC.bal.registerEvents(function(ee) {
      ee.on('local.paired', AvastWRC.bal.aos.AppEvents.onLocalPaired.bind(AvastWRC.bal.aos.AppEvents));
    });
    //return AvastWRC.bal.aos.AppEvents;
    AvastWRC.bal.registerModule(AvastWRC.bal.aos.AppEvents);

}).call(this, AvastWRC, _);
/** AOS Google analytics module */

// initiate GA
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-57172043-1']);
//_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js'; //'https://ssl.google-analytics.com/u/ga_debug.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();


(function(AvastWRC, _) {

  var EVENTS_TO_REPORT = [
    'request.dntWhitelist',
    'request.dnt.activate',
    'request.dnt.block',
    'mainPanel.opened',
    'mainPanel.closed'
  ];


  function registerListener (eventName) {
    this.on(eventName, function() {
      var evArr = Array.prototype.slice.call(arguments);
      Array.prototype.unshift.call(evArr, '_trackEvent', eventName);
       _gaq.push(evArr);
    });
  }

  AvastWRC.bal.GA = AvastWRC.bal.GA || {};
  _.extend(AvastWRC.bal.GA, // Browser specific
  {
    /**
     * Function called on BAL initialization to initialize the module.
     */
    init: function (balInst) {
      _gaq.push(['_setCustomVar',1, 'gaUserId', AvastWRC.CONFIG.GUID,1]);
      //_gaq.push(['_trackEvent', 'extension', 'aos.open']);
    },

    registerModuleListeners: function(ee) {
      // category, action, label, value, non-interaction
      ee.on('request.dntWhitelist', function (category, trkIds, host, block) {
		var settings = AvastWRC.bal.settings.get();
		if(settings.dntAutoBlock){
			block = false;
		}  
		
		wl = AvastWRC.bal.DNT.whiteList.get();
		wl[host] = wl[host] || {};
		if(wl[host]["category"] &&  wl[host]["category"]!= undefined) wl[host]["category"] = block;
	    AvastWRC.bal.DNT.whiteList.set(wl);
		
        if (category) {
		  //featureKey += category;
          _gaq.push(['_trackEvent', 'dnt.control', block ? 'block.' + category : 'allow.' + category, host]);
        } else {
          _gaq.push(['_trackEvent', 'dnt.control', block ? 'block.tracker' : 'allow.tracker', host, trkIds]);
        }		

      });
      ee.on('request.dnt.activate', function (url) {
		var host = AvastWRC.bal.getHostFromUrl(url),
        wl = AvastWRC.bal.DNT.whiteList.get();
		wl[host] = wl[host] || {};
		var SUPPORTED_TRACKER_TYPES = ['Others', 'WebAnalytics','AdTracking','Social'];
		_.each(SUPPORTED_TRACKER_TYPES, function (type) {
		  if(wl[host][type] &&  wl[host][type]!= undefined) wl[host][type] = true;
		})
		// individual tracker
		for(var trkId in wl.trk[host]){
		  wl.trk[host][trkId] = true;
		}
	    AvastWRC.bal.DNT.whiteList.set(wl);
		_gaq.push(['_trackEvent', 'dnt.control', 'allow.dnt', host]);
		_gaq.push(['_trackEvent', 'dnt.control', 'allow.dntSocial', host]);
		_gaq.push(['_trackEvent', 'dnt.control', 'allow.dntAdTracking', host]);
		_gaq.push(['_trackEvent', 'dnt.control', 'allow.dntWebAnalytics', host]);
		_gaq.push(['_trackEvent', 'dnt.control', 'allow.dntOthers', host]);
      });
      ee.on('request.dnt.block', function (url) {
		var host = AvastWRC.bal.getHostFromUrl(url),
        wl = AvastWRC.bal.DNT.whiteList.get();
		wl[host] = wl[host] || {};
		var SUPPORTED_TRACKER_TYPES = ['Others', 'WebAnalytics','AdTracking','Social'];
		_.each(SUPPORTED_TRACKER_TYPES, function (type) {
		  if(wl[host][type] &&  wl[host][type]!= undefined) wl[host][type] = false;
		})
		// individual tracker
		for(var trkId in wl.trk[host]){
		  wl.trk[host][trkId] = false;
		}
	    AvastWRC.bal.DNT.whiteList.set(wl);
		_gaq.push(['_trackEvent', 'dnt.control', 'block.dnt', host]);
		_gaq.push(['_trackEvent', 'dnt.control', 'block.dntSocial', host]);
		_gaq.push(['_trackEvent', 'dnt.control', 'block.dntAdTracking', host]);
		_gaq.push(['_trackEvent', 'dnt.control', 'block.dntWebAnalytics', host]);
		_gaq.push(['_trackEvent', 'dnt.control', 'block.dntOthers', host]);
      });
      ee.on('webrep.voted', function(url, rating, rating_flags) {
        var rate = rating > 0 ? 'positive' : (rating_flags ? 'negative_details' : 'negative');
        _gaq.push(['_trackEvent', 'webrep', 'voted.'+rate,  url]);
      });
      ee.on('request.open.home', function(url) {
        _gaq.push(['_trackEvent', 'links', 'open.home',  url]);
      });
      ee.on('siteCorrect.redirect.auto', function(url, url_to, brand_domain) {
        _gaq.push(['_trackEvent', 'siteCorrect', 'redirect.auto',  url]);
      });
      ee.on('siteCorrect.message.open', function(url, url_to, brand_domain) {
        _gaq.push(['_trackPageview', '/AOS/sitecorrect']);
        _gaq.push(['_trackEvent', 'siteCorrect', 'message.open',  url]);
      });
      ee.on('security.phishing.open', function(url) {
        _gaq.push(['_trackPageview', '/AOS/phishing']);
        _gaq.push(['_trackEvent', 'security', 'phishing.open', url]);
      });
      ee.on('security.bad_rating.open', function(url) {
        _gaq.push(['_trackPageview', '/AOS/bad_rating']);
        _gaq.push(['_trackEvent', 'security', 'bad_rating.open', url]);
      });
      ee.on('security.malware.open', function(url) {
        _gaq.push(['_trackPageview', '/AOS/malware']);
        _gaq.push(['_trackEvent', 'security', 'malware.open', url]);
      });
      ee.on('mainPanel.opened', function(tab) {
    	  AvastWRC.bal.cache.add("lastActivTabId", tab.id);
        _gaq.push(['_trackPageview', '/AOS/main-panel']);
        _gaq.push(['_trackEvent', 'gui', 'mainPanel.open', tab.url]);
      });
      ee.on('feature.changed', function(key, newVal, oldVal) {
        _gaq.push(['_trackEvent', 'settings', key, newVal ? 'on' : 'off']);
      });
      ee.on('request.open.settings', function(url) {
        _gaq.push(['_trackPageview', '/AOS/settings']);
        _gaq.push(['_trackEvent', 'settings', 'open',  url]);
      });
    }

  }); // AvastWRC.bs.aos

  AvastWRC.bal.registerModule(AvastWRC.bal.GA);
  

}).call(this, AvastWRC, _);
/**
 * Search results checking and highlighting
 */

(function(AvastWRC, _) {

  const SMALL_IMAGE_RATING = ['serp-none.png', 'serp-ok.png', 'serp-attention.png', 'serp-error.png'];
  const ICON = ['unknown.png', 'ok.png', 'attention.png', 'error.png'];
  const RATING = ['noRating', 'ratingTextPositive', 'ratingTextAverage', 'ratingTextBad'];
  var linkcache = [];

  function getImageURL(img) {
    return AvastWRC.bs.getLocalResourceURL('common/ui/icons/' + img);
  }   
 
  AvastWRC.bal.search = _.extend(AvastWRC.bal.Search || {}, {
    registerModuleListeners: function(ee) {
      ee.on('message.checkLinks', AvastWRC.bal.search.onCheckLinks.bind(AvastWRC.bal.search.onCheckLinks));
    },

    onCheckLinks: function(data, tab) {
      console.log('got request to check links:', data.links.map(function (link) { return link.url; }));
      var rule = AvastWRC.Rules.get(tab.url);
      if(rule.urlExtractor) {
          for(var i=0; i < data.links.length; i++) {
              var url = data.links[i].url;
              var decoded_url = decodeURIComponent(url);        		
              var matches_array = decoded_url.match(rule.urlExtractor);     
              if(matches_array != null && matches_array.length > 1) {
                  linkcache[matches_array[1]] = data.links[i].url;
                  data.links[i].url = matches_array[1];	 			
              }
          }
 	    }
      
      AvastWRC.get(data.links, function(result) {
    	  for(var i=0; i < result.length; i++){
    		  var fullUrl = linkcache[result[i].url];
    		  if(fullUrl) result[i].url = fullUrl;
    	  }
        AvastWRC.bs.accessContent(tab, {
          message: 'checkLinksResult',
          data: {
            result: result.map(function(r) { return { url: r.url, rating: r.getRatingCategory() }; }),
            showPopup: AvastWRC.CONFIG.ENABLE_SERP_POPUP,
            ratingTexts: RATING.map(AvastWRC.bs.getLocalizedString),
            ratingIcons: ICON.map(getImageURL),
            rules: rule
          }
        });
      });
    },

    checkSearch: function(tab) {
      var rule = AvastWRC.Rules.get(tab.url);
      console.log('checking search for:', !!rule, tab.id, tab.url);

      if (!rule) return;

      var style = [['wrcx',0],['wrc0',0],['wrc1',1],['wrc2',2],['wrc3',3]].map(function(def) {
        return rule.style
          .replace(/WRCN/g, def[0])
          .replace(/IMAGE/g, getImageURL(SMALL_IMAGE_RATING[def[1]]));
      }).concat([
        '#wrcHoverDiv .aos-tooltip-logo-img { background-image: url(' + getImageURL('logo-white.png') + '); }',
        '#wrcHoverDiv .aos-tooltip-attention .aos-tooltip-logo-img { background-image: url(' + getImageURL('logo-dark.png') + '); }'
      ]).join('\n');

      AvastWRC.bs.accessContent(tab, {
        message: 'checkLinks',
        data: {
          style: style
        }
      });
    }
  });
  AvastWRC.bal.registerEvents(function(ee) {
    ee.on('message.checkLinks', AvastWRC.bal.search.onCheckLinks.bind(AvastWRC.bal.search.onCheckLinks));
  });
  AvastWRC.bal.registerModule(AvastWRC.bal.search);
  
}).call(this, AvastWRC, _);

/*******************************************************************************
     *
     *  AvastWRC Shepherd
     * 
     ********************************************************************************/
(function (AvastWRC, _) {
    AvastWRC.Shepherd = {
        /**
         * Initialize rules class
         * @return {Object} Self reference
         */
        init: function () {
            var self = this;
            self.restore(function(rules){
                if(!rules.isValidTtl()){
                    rules.load();
                }
                return rules;
            });
        },
        /**
         * Default / Current rules version (timestamp)
         * @type {Number}
         */
        rules : {
            expireTime: 170926000000000,
            showABTest: false,
        },
        
        /**
         * Restore rules from cache
         * @return {void}
         */
        restore: function (callback) {
            // TODO: load rules from cache and return true if still valid
            var self = this;

            AvastWRC.getStorage("Shepherd", function (rules) {
                self.rules = JSON.parse(rules);
                console.log("Shepherd -> Restored: " + JSON.stringify(self.rules));
                callback(self);
            });

        },

        /**
         * Download all the rules and configurations from the server
         * @return {void}
         */
        load: function () {
            var self = this;
            new AvastWRC.Query.Shepherd(function (rules,ttl) {
                if(self.rules && self.rules.abtests && self.rules.abtests.variant_id && self.rules.abtests.variant_id !=  rules.abtests.variant_id){
                   // the test variant changed, we need to update all tags to remove the old styles
                    AvastWRC.bs.updateAllTabs();
                }                
                rules.expireTime = self.getExpirationTime(ttl);
                if(!rules.abtests.variant_id){
                    rules.showABTest = false;
                    rules.campaignId = "default";
                }else{
                    rules.campaignId = rules.abtests.test_id+"_"+rules.abtests.variant_id;
                    rules.showABTest = rules.abtests.variant_id == "v2" ? true : false;
                }
                self.rules = rules;
                console.log("Shepherd-> Response before being saved: "+ JSON.stringify(rules));
                self.save();
            },function(error){
                console.log("Shepherd-> Response error: "+ error);
                rules = {
                    expireTime: self.getExpirationTime(86400),
                    showABTest: (self.rules && self.rules.showABTest) ? self.rules.showABTest : false,
                    campaignId: (self.rules && self.rules.campaignId) ? self.rules.campaignId : "default",
                    BarUISpecifics: (self.rules && self.rules.BarUISpecifics) ? self.rules.BarUISpecifics : null //not downloaded and not in cache (null)
                };
                self.rules = rules;
                self.save();
            });
        },

        /**
         * Generate the new expiration time based on ttl
         * @return expiration time 
         */
        getExpirationTime: function(ttl){
            var expireTime = parseInt(new Date().getTime())/1000 + parseInt(ttl);
            return expireTime;
        },

        /**
         * Return if the Ttl is still valid
         * @return true if still valid otherwise false
         */
        isValidTtl : function(){
            var now = parseInt(new Date().getTime())/1000;
            if(this.rules && this.rules.expireTime)
                return (this.rules.expireTime > now);
            else return false;
        },
        
        /**
         * Save all the rules currently stored locally to cache
         * @return {void}
         */
        save: function () {
            AvastWRC.setStorage("Shepherd", JSON.stringify(this.rules));
        },
    };

    AvastWRC.bal.registerModule(AvastWRC.Shepherd);

}).call(this, AvastWRC, _);
/*******************************************************************************
 *
 *  AvastWRC Shepherd specifics for AOS
 * 
 ********************************************************************************/
/**
 * "dbResults": {
        "SERPRules": [
            {
                "domain": "google.com",
                "usecases": [
                    {"usecase": "aa", "selector": ".bb"},
                    {"usecase": "xx", "selector": ".yy", "urlSelector": ".zz"},
                ],
                "allSelectors": "xx"
            },
            .
            .
            .
 */

(function(_,Shepherd) {
    
        _.extend(Shepherd,{
            /**
             * Get a individual rule based on the regexp defined in the rule
             * @param  {String} domain domain of the serp
             * @return {Object} Serp rule {"domain": "xx", "usecases": [{"usecase": "xx", "selector": ".xx"}], "allSelectors": "xx";
            */

            getSerpRule: function (domain) {
                if(!this.isValidTtl()){
                    this.load();
                }
    
                if(!this.rules) return null;
                if(this.rules && !this.rules.dbResults) return null;
    
                var serpRules = (this.rules.dbResults.SERPRules) ? this.rules.dbResults.SERPRules : [];

                for (var serpRule of serpRules)
                {
                    if(serpRule.domain === domain)
                    {
                        return serpRule;
                    }
                }
            }
                
        });
    
    }).call(this, _, AvastWRC.Shepherd);
    
    /*******************************************************************************
     *
     *  ende AvastWRC Shepherd
     * 
     ********************************************************************************/
/*******************************************************************************
 *  avast! browsers extensions
 *  (c) 2012-2014 Avast Corp.
 *
 *  Background Browser Specific - AOS specific - module for stadalone execution
 *
 ******************************************************************************/

(function(AvastWRC) {

    var config = { // instance configuration - extension settings independent
        safezoneAvailable: false, // safeZone unavailable unless reported by Avast
    };

    AvastWRC.bal.aos.SZ = AvastWRC.bal.aos.SZ || {
        initLocalService: function (port) {
            if (AvastWRC.CONFIG.LOCAL_ENABLED)
                AvastWRC.local.isSafeZoneAvailable()
                    .then(function (result) {
                        var settings = AvastWRC.bal.settings.get();
                        var safezoneAvailable = (AvastWRC.PROTO.decodeUTF8(result.values_.result[0]) == "yes");

                        config.safezoneAvailable = safezoneAvailable;

                        AvastWRC.bal.settings.set(settings);
                    })
                    .done();
        },
        tabSafeZone: function (url, urlInfoResp, tab) {
            if (AvastWRC.CONFIG.LOCAL_ENABLED
                && config.safezoneAvailable
                && AvastWRC.bal.settings.get().features.safeZone
                && AvastWRC.CONFIG.EXT_TYPE != AvastWRC.EXT_TYPE_WTU) {
                this.safeZoneCheck(url, tab, "IS_BANKING_SITE");
            }
        },
        safeZoneCheck: function (url, tab, type) {
            var settings = AvastWRC.bal.settings.get();
            var host = AvastWRC.bal.getHostFromUrl(url);
            //AOSP-580 hereinafter we block the promotions of an specific type (Thomas Salomon)
            if (AvastWRC.Utils.getProperties(settings, "safeZone", "declined", type) != undefined &&
                AvastWRC.Utils.getProperties(settings, "safeZone", "declined", type)) return;
            //let that too in case the user have some host declined
            if (!AvastWRC.Utils.getProperties(settings, "safeZone", "declined", host) &&
                !AvastWRC.TabReqCache.get(AvastWRC.bs.getTabId(tab), "safeZone_close_" + host)) {
                new AvastWRC.Query.Avast({
                    type: type,
                    value: url,
                    callback: function (result) {
                        if (AvastWRC.PROTO.decodeUTF8(result.result[0]) == "yes") {
                            this.tabSafeZoneShow(url, tab, type);
                        } else if (type == "IS_BANKING_SITE") {
                            this.safeZoneCheck(url, tab, "IS_SAFEZONE_CUSTOM_SITE");
                        }
                    }.bind(this),
                });
            }
        },
        tabSafeZoneShow: function (url, tab, type) {
            var textMsg = (type == "IS_BANKING_SITE") ? AvastWRC.bs.getLocalizedString("aosSafeZoneMsgDescBank4") : (type == "IS_VIDEO_DOWNLOADER") ? AvastWRC.bs.getLocalizedString("aosSafeZoneMsgDescVideo") : (type == "IS_SHOPPING_SITE") ? AvastWRC.bs.getLocalizedString("aosSafeZoneMsgDescShopping") : (type == "IS_AD_TRACKER") ? AvastWRC.bs.getLocalizedString("aosSafeZoneMsgDescAds") : "";
            var buttonText = (type == "IS_BANKING_SITE") ? AvastWRC.bs.getLocalizedString("aosSafeZoneButtonMsgYes4") : (type == "IS_VIDEO_DOWNLOADER" || type == "IS_SHOPPING_SITE" || type == "IS_AD_TRACKER") ? AvastWRC.bs.getLocalizedString("aosSafeZoneButtonMsgOpen") : "";

            var data = {
                message: "showTopBar",
                data: {
                    icon: AvastWRC.bs.getLocalImageURL(AvastWRC.CONFIG.EXT_TYPE === AvastWRC.EXT_TYPE_AOS_SZ ? "icon-warning.png" : "icon-avast.png"),
                    iconInfo: AvastWRC.bs.getLocalImageURL("icon-info.png"),
                    iconCross: AvastWRC.bs.getLocalImageURL("icon-cross.png"),
                    emptyCheckbox: AvastWRC.bs.getLocalImageURL("checkbox-1.png"),
                    filledCheckbox: AvastWRC.bs.getLocalImageURL("checkbox-2.png"),
                    text: textMsg,
                    buttonText: buttonText,
                    hide: AvastWRC.bs.getLocalizedString("aosSafeZoneButtonMsgNotNow").toUpperCase(),
                    declineText: AvastWRC.bs.getLocalizedString("aosSafeZoneMsgDontShow2"),
                    infoText: AvastWRC.bs.getLocalizedString("aosBankModeName") + AvastWRC.bs.getLocalizedString(AvastWRC.CONFIG.EXT_TYPE === AvastWRC.EXT_TYPE_AOS_SZ ? "aosBankModeInfoMessageAvastBrowser" : "aosBankModeInfoMsgNonAvastBrowserUser"),
                    neverLight: AvastWRC.bs.getLocalImageURL("orange-light.png"),
                    neverTitle: AvastWRC.bs.getLocalizedString("aosSafeZoneNeverTitle"),
                    neverMsg1: AvastWRC.bs.getLocalizedString("aosSafeZoneNeverMsg1"),
                    neverMsg2: AvastWRC.bs.getLocalizedString("aosSafeZoneNeverMsg2"),
                    neverButton: AvastWRC.bs.getLocalizedString("aosSafeZoneNeverButton"),
                    neverLink: AvastWRC.bs.getLocalizedString("aosSafeZoneNeverLink")
                },
            };
            AvastWRC.TabReqCache.set(AvastWRC.bs.getTabId(tab), "safeZone_promo_type", type);
            AvastWRC.bs.accessContent(tab, data);
        },

        switchToSafeZone: function (url) {
            new AvastWRC.Query.Avast({
                type: "SWITCH_TO_SAFEZONE",
                value: url,
                callback: function (result) {
                    //TODO: handle negative response
                },
            });
        },

        modifySettingsItem: function (feature, value, item) {
            if (feature === "safeZone") {
                item.enabled = config.safezoneAvailable;
                item.show = AvastWRC.Utils.getBrowserInfo().isWindows();
            }
            return item;
        },

        registerModuleListeners: function (ee) {
            ee.on("urlInfo.response", AvastWRC.bal.aos.SZ.tabSafeZone.bind(AvastWRC.bal.aos.SZ));
            ee.on("message.messageBoxFeedback.safeZone", function (data, tab) {
                if (data.ok) {
                    //AvastWRC.bs.tabRedirect(tab, AvastWRC.SAFE_ZONE_REDIRECT);
                    this.switchToSafeZone(data.url_from);
                } else {
                    var host = AvastWRC.bal.getHostFromUrl(data.url_from);
                    var settings = AvastWRC.bal.settings.get();
                    if (data.decline) {
                        AvastWRC.Utils.setProperties(settings, "safeZone", "declined", host, true);
                        AvastWRC.bal.settings.set(settings);
                        AvastWRC.TabReqCache.set(AvastWRC.bs.getTabId(tab), "safeZone_close_" + host, true);
                    } else {
                        var promoType = AvastWRC.TabReqCache.get(AvastWRC.bs.getTabId(tab), "safeZone_promo_type");

                        AvastWRC.Utils.setProperties(settings, "safeZone", "declined", promoType, true);
                        AvastWRC.bal.settings.set(settings);
                    }
                }
            }.bind(AvastWRC.bal.aos.SZ));
        },

    };

    AvastWRC.bal.registerModule(AvastWRC.bal.aos.SZ);

}).call(this, AvastWRC);
