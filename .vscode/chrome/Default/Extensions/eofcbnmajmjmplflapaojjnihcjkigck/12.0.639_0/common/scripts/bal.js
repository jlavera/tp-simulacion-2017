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
    var _forcedEdition = null;

    // Regexp matching URLs that will be enabled with avast:// protocol actions
    var AOS_URLS_ENABLED_URLS = /^http[s]?\:\/\/aos.avast.com(\:\d+)?\/upgrade(\/)?/;

    // Actions assigned to avast protocol: avast://[action]
    //  - action is in form of message to be send to the background script: bal.js
    var AOS_URLS_ACTIONS = {
        "settings" : { message: "openSettings", data : {}, }, // avast://settings -> open settings page
    };


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
                if (AvastWRC.Utils.Burger) {
                    AvastWRC.Utils.Burger.initBurger(true/*init*/, false/*sendAll*/);
                }
                AvastWRC.bal.sp.sendHeartbeat();
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
                    console.log("landingPage from localstorage: " + result);
                    if (result == null || result === false) {
                        AvastWRC.bal.openLandingPageTab();
                        AvastWRC.setStorage(AvastWRC.bal.config.installationVersionLocalStorageKey, AvastWRC.bs.getVersion());
                        if (AvastWRC.Uninstall) AvastWRC.Uninstall.setUninstallURL();
                    } else {
                        console.log("openUpdateProductPage to be call")
                        AvastWRC.bal.openUpdateProductPage();
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
                    AvastWRC.bal.updateOldUserSettings();
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
                        AvastWRC.bal.updateOldUserSettings();                
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
        updateOldUserSettings: function(){
            var settings = this.settings.get();
            var newSettings = settings.userSPPoppupSettings;
            if(!newSettings || !newSettings.help || !newSettings.notifications)return;
           
            if(newSettings.advanced){
                if(newSettings.advanced.selected){
                    newSettings.help.selected = false;
                    newSettings.notifications.selected = true;
                    newSettings.customList.selected = false;
                }
                if(newSettings.general){
                    newSettings.notifications.offers.item1Selected = (newSettings.advanced.offers.item1Selected && !newSettings.general.item2Selected) ? true : false;
                    newSettings.notifications.offers.item2Selected = (newSettings.advanced.offers.item2Selected && !newSettings.general.item2Selected) ? true : false;
                    newSettings.notifications.offers.item3Selected = (newSettings.advanced.offers.item3Selected && !newSettings.general.item2Selected) ? true : false;
                    newSettings.notifications.coupons.item1Selected = (newSettings.advanced.coupons.item1Selected && !newSettings.general.item2Selected) ? true : false;
                    newSettings.notifications.coupons.item2Selected = (newSettings.advanced.coupons.item2Selected && !newSettings.general.item2Selected) ? true : false;
                }
                newSettings.notifications.offers.include.eShop = newSettings.advanced.offers.include.eShop ? true : false;
                newSettings.notifications.offers.include.accommodations = newSettings.advanced.offers.include.accommodations ? true : false;
                newSettings.notifications.others.item1Selected = newSettings.advanced.offers.include.special ? true : false;
            }
            if(newSettings.customList && newSettings.customList.selected){
                    newSettings.help.selected = false;
                    newSettings.notifications.selected = false;
                    newSettings.customList.selected = true;
            }
            if (newSettings.general){
                if(newSettings.general.selected){
                    newSettings.help.selected = true;
                    newSettings.notifications.selected = false;
                    newSettings.customList.selected = false;
                }
                newSettings.notifications.offers.item4Selected = (newSettings.general.item2Selected) ? true : false;
                newSettings.notifications.coupons.item3Selected = newSettings.general.item2Selected ? true : false;
            }

            delete newSettings.general;
            delete newSettings.advanced;
            settings.userSPPoppupSettings = newSettings;
            console.log("newSettings")
            console.log(settings)
            this.settings.set(settings);
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

        getLandingPageURL: function () {
            let brandingSpecifics = {
                brandingType: "avast",
                contain: "/lp-safeprice-welcome-new"
            };

            if(AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVG){
                brandingSpecifics = {
                    brandingType: "avg",
                    contain: "/welcome/safeprice-new"
                };
            }

            return { url: `https://${brandingSpecifics.brandingType}.com${brandingSpecifics.contain}`,
                    contain: brandingSpecifics.contain
                }

        },

        openLandingPageTab: function () {            
            let urlData = AvastWRC.bal.getLandingPageURL();

            AvastWRC.bs.tabExistsWithUrl(urlData.contain, function (tab) {
                AvastWRC.setStorage("landingPageShown", true);

                if (tab) {
                    AvastWRC.bs.tabRedirectAndSetActive(tab, urlData.url);
                } else {
                    AvastWRC.bs.openInNewTab(urlData.url);
                }
            });            
        },

        getFAQsUrl: function(){
            var bLocal = ABEK.locale.getBrowserLocale().toLowerCase();
            var bLang = ABEK.locale.getBrowserLang().toLowerCase();

            let brandingSpecifics = {
                brandingType: "avast",
                contain: "support.avast.com",
                pPro: 43,
                pElem: 202,
                pScr: "61"
            };

            if(AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVG){
                brandingSpecifics = {
                    brandingType: "avg",
                    contain: "/welcome/safeprice-new",
                    pPro: 72,
                    pElem: 334,
                    pScr: "AVG-SafePrice-Frequently-Asked-Questions"
                };
            }
            var data = { url: `https://ipm-provider.ff.avast.com/?action=2&p_pro=${brandingSpecifics.pPro}&p_elm=${brandingSpecifics.pElem}&p_lng=${bLang}&p_scr=${brandingSpecifics.pScr}`,
                contain: brandingSpecifics.contain
            }
            console.log(data);
            return data;
        },

        openFAQsPageTab: function() {
            let urlData = AvastWRC.bal.getFAQsUrl();

            AvastWRC.bs.tabExistsWithUrl(urlData.contain, function (tab) {
                if (tab) {
                    AvastWRC.bs.tabRedirectAndSetActive(tab, urlData.url);
                } else {
                    AvastWRC.bs.openInNewTab(urlData.url);
                }
            });     
                  
        },

        openUpdateProductPage: function () {
            console.log("openUpdateProductPage called");
            var config = {
                localStorageKey: "updatePageShownIn",
                link: `https://www.${AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "avast" : "avg"}.com/lp-safeprice-update`,
                contain: "lp-safeprice-update"
            };

            getInstalledVersion()
                .then(function (installedVersion) {
                    console.log("after getInstalledVersion");
                    var currentVersion = AvastWRC.bs.getVersion();
                    var storageVersion = (installedVersion) ? installedVersion.split(".") : "12.0.0".split(".");
                    var actualVersion = currentVersion.split(".");
                    console.log("after getInstalledVersion: storageVersion: " + storageVersion + " actualVersion: " + actualVersion);
                    if(storageVersion[0] < actualVersion[0] || storageVersion[1] < actualVersion[1] || storageVersion[2] < actualVersion[2] ){
                        console.log("after getInstalledVersion: actualVersion: " + storageVersion + " actualVersion: " + actualVersion);
                        AvastWRC.getStorage(config.localStorageKey, function (value) {
                            console.log("after getInstalledVersion: updatePageShownIn: " + value);
                            
                            if (value && value === currentVersion) return;
                            AvastWRC.bs.tabExistsWithUrl(config.contain, function (tab) {
                                if (tab) {
                                    AvastWRC.bs.tabRedirectAndSetActive(tab, config.link);
                                } else {
                                    AvastWRC.bs.openInNewTab(config.link);
                                }
                                AvastWRC.setStorage(config.localStorageKey, currentVersion);
                                AvastWRC.setStorage(AvastWRC.bal.config.installationVersionLocalStorageKey, currentVersion);
                            });
                        });
                    }
                    
                });

            function getInstalledVersion() {
                return new Promise((resolve, reject) => {
                    AvastWRC.getStorage(AvastWRC.bal.config.installationVersionLocalStorageKey, function (value) {
                        resolve(value);
                    });
                });
            }
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
        /**
         * WebRep Common Core
         * @type {Object}
         */
        WebRep: {
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
         * Stores user Id so it is available to subsequent requests and persisted in local storage.
         * @param {String} userid to store
         */
        storeUserId : function (userId) {
            var settings = sing.settings.get();
            settings.current.userId = userId;
            sing.settings.set(settings);
            sing.updateOldSettings(); // refresh settings accessible through AvastWRC
        },

        config: {
            installationVersionLocalStorageKey: "installedVersion"
        }
    }; // AvastWRC.bal

    // Init the core module to register for event from sub-modules.
    AvastWRC.bal.registerModule(AvastWRC.bal.Core);

}).call(this, _, EventEmitter2);
/*******************************************************************************
 *  avast! Online Security plugin
 *  (c) 2014 Avast Corp.
 *
 *  Background Layer - SafePrice
 ******************************************************************************/

(function(AvastWRC, _) {

    // Hide time for SafeShop settings - 24hs
    var SAFESHOP_HIDE_TIMEOUT = 24 * 60 * 60 * 1000;
    var SAFESHOP_CLOSE_TIMEOUT = 6 * 60 * 60 * 1000;

    var _safeShopInTab = {};
    var _onBoardingPageInTab = false;
    var _showRateWindowInTab = false;
    var _showRecruitmentInTab = false;
    var _showCouponsOnce = [];

    (function(definition) {
        AvastWRC.bal.registerModule({
            bootstrap: function() {
                return definition();
            }
        });


    })(function() {

        AvastWRC.bal.sp = _.extend(AvastWRC.bal.SP || {}, {
            panelData: {
                strings: AvastWRC.bal.utils.loadLocalizedStrings({},["spOffersTab",
                    "spCouponsTab",
                    "spOthersTab", 
                    "spAdditionalFees", 
                    "spShippingLabel", 
                    "spGetCouponCode", 
                    "spApply", 
                    "spCopyAtCheckOut", 
                    "spCouponApplied", 
                    "spCouponsSelectedText",
                    "spCouponsAvailableText", 
                    "spCouponsSelected",
                    "spNothingFoundCoupons",
                    "spNothingFoundOffers",
                    "spNothingFoundOthers",
                    "sasCouponCodeCopied",
                    "spCouponsExpiration",
                    "spCouponsMinOrderValue",
                    "spCityHotelNotificationMessage",
                    "spSimilarHotelsMessage", 
                    "spNotificationRedirectShowLessMessage",
                    "spNotificationRedirectShowMoreMessage"
                ]),
                images: AvastWRC.bal.utils.getLocalImageURLs({}, {
                    logo: "logo-safeprice-48.png",
                    close: "close-icon-copy-8.png",
                    min: "minimise-icon.png",
                    settings: "settings-icon.png",
                    placeholder: "sp-offer-image-placeholder.png",
                    redirectPlaceholder: "finance.png",
                    redirectPlaceholderBig: "finance-big.png",
                    nothingFound: "Anim-emoji.gif",
                    dashedLine: "dashed-line.png"
                }),
                redirect: {
                    strings:  AvastWRC.bal.utils.loadLocalizedStrings({},["spShowNotificationRedirectMessage", "spNotificationRedirectShowRedirectMessage","spNotificationRedirectShowMoreMessage", "spNotificationRedirectShowLessMessage",]),
                    images: AvastWRC.bal.utils.getLocalImageURLs({}, {
                        shape: "shape.png",
                    }),
                },
                notifications: {templateData: AvastWRC.NotificationsManager.getTemplateData()}
            },
            
            isDomainInSettingsWhiteList: function(url){
                var settings = AvastWRC.bal.settings.get();
                var urlDomain = AvastWRC.bal.getDomainFromUrl(url);

                var poppupSettings = settings.userSPPoppupSettings;
                function checkList(item) {
                    return ((item.indexOf(urlDomain) != -1) || (urlDomain.indexOf(item) != -1));
                }

                if (poppupSettings && poppupSettings.customList && poppupSettings.customList.whiteList.length > 0 && poppupSettings.customList.whiteList.findIndex(checkList) != -1) {
                    return true;
                }
                return false;
            },


            getProviderInfo: function(data) {
                var showABTest =  data.showABTest;
                var campaignId =  data.campaignId;
                var transactionId = data.transactionId;
                var urlDomain = AvastWRC.bal.getDomainFromUrl(data.url);

                var queryOptions = {
                    url: data.url,
                    tab: data.tab,
                    showABTest: showABTest,
                    campaignId:campaignId,
                    referrer: data.referrer,
                    transactionId: transactionId,
                    callback: function(domainInfoResponse) {
                        AvastWRC.bal.sp.panelData.topBarRules = AvastWRC.Shepherd.getUIAdaptionRule(urlDomain);
                        AvastWRC.bs.accessContent(data.tab, {
                            message: "createPanel",
                            data: AvastWRC.bal.sp.panelData,
                        });
                        var timer = 0;
                        var cachedTimer = AvastWRC.TabReqCache.get(data.tab.id, "timer");

                        if (cachedTimer != null) timer = Date.now() - cachedTimer;

                        console.log("getProviderInfo() time " + timer);
                        _safeShopInTab[data.tab.id] = domainInfoResponse;
                        _safeShopInTab[data.tab.id].url = data.tab.url;
                        _safeShopInTab[data.tab.id].showABTest = showABTest;
                        _safeShopInTab[data.tab.id].campaignId = campaignId;
                        _safeShopInTab[data.tab.id].transactionId = transactionId;
                        _safeShopInTab[data.tab.id].activeTab = "";
                        _safeShopInTab[data.tab.id].csl = domainInfoResponse.selector ? JSON.parse(domainInfoResponse.selector) : null,
                        _safeShopInTab[data.tab.id].tabId = data.tab.id,
                        _safeShopInTab[data.tab.id].urlDomain = urlDomain;
                        _safeShopInTab[data.tab.id].panelData = AvastWRC.bal.sp.panelData;
                        _safeShopInTab[data.tab.id].minimizedNotifications = AvastWRC.NotificationsManager.notificationsAreMinimized();
                        _safeShopInTab[data.tab.id].isDomainInSettingsWhiteList = AvastWRC.bal.sp.isDomainInSettingsWhiteList(data.tab.url);
                        _safeShopInTab[data.tab.id].referrer = AvastWRC.TabReqCache.get(data.tab.id, 'referer');
                        console.log("referrer: (domainInfo)"+ data.referrer);
                        _safeShopInTab[data.tab.id].transactionFinished = false;

                        var cachedData = AvastWRC.TabReqCache.get(data.tab.id, 'safePriceInTab');
                        _safeShopInTab[data.tab.id].iconClicked = (cachedData && cachedData.iconClicked) ? cachedData.iconClicked : 0;
                        
                        AvastWRC.TabReqCache.set(data.tab.id, 'safePriceInTab', _safeShopInTab[data.tab.id]);

                        if(domainInfoResponse.firstRequestTotalLength > 0 ){
                            AvastWRC.bal.sp.processSafeShopCoupons(data.tab, _safeShopInTab[data.tab.id]);
                        }

                        if (!_safeShopInTab[data.tab.id].onlyFirstRequest) {
                            if (_safeShopInTab[data.tab.id]) {
                                _safeShopInTab[data.tab.id].count = 0;
                                if (timer < 50) {
                                    setTimeout(function(tab, url, selector) {
                                        AvastWRC.bal.sp.tabSafeShopCheck(tab.id, tab, url, _safeShopInTab[tab.id]);
                                    }, 50, data.tab, data.url, _safeShopInTab[data.tab.id]);
                                } else {
                                    AvastWRC.bal.sp.tabSafeShopCheck(data.tab.id, data.tab, data.url, _safeShopInTab[data.tab.id]);
                                }
                            }
                        }
                    }
                };
                new AvastWRC.Query.SafeShopDomainInfo(queryOptions); //query Avast SafeShopDomainInfo Proxy
            },

            siteNameIsContainedOnCurrentURL: function (url, urlToBeContained) {
                console.log("MerchantURL: url: " + url + " urlToBeContained: "+ urlToBeContained);
                let urlDomain = AvastWRC.bal.getDomainFromUrl(url);
                let urlToBeContainedDomain = AvastWRC.bal.getDomainFromUrl(urlToBeContained);

                if(urlDomain.indexOf(urlToBeContainedDomain.split(".")[0]) != -1 ){
                    console.log("couponinTab: initial domain in final domain")
                    return true;
                } else if(urlDomain.indexOf(urlToBeContainedDomain.split(".")[0]) != -1 ){
                    console.log("couponinTab: initial domain in final domain")
                    return true;
                }else 
                    return false;
            },

            onUrlInfoResponse: function(url, response, tab, tabUpdate) {
                AvastWRC.bal.sp.setDisableIcon(tab);

                var couponInTabsToShow = AvastWRC.UtilsCache.get("coupons_tabs_to_show", tab.id);
                if(couponInTabsToShow && couponInTabsToShow.coupons && !couponInTabsToShow.coupons[0].coupon_code
                    && (couponInTabsToShow.toBeShownIn[tab.url]  || AvastWRC.bal.sp.siteNameIsContainedOnCurrentURL(tab.url, couponInTabsToShow.merchantURL))){
                    console.log("onUrlInfoResponse couponTab show " + JSON.stringify(couponInTabsToShow));

                    AvastWRC.bs.accessContent(couponInTabsToShow.tab, {
                        message: "applyCouponInTab",
                        data: couponInTabsToShow,
                    });

                    console.log(couponInTabsToShow.toBeShownIn);
                    AvastWRC.UtilsCache.set("coupons_tabs_to_show", tab.id, couponInTabsToShow);
                    return;
                }

                if (AvastWRC.bal.sp.isAnAffiliateDomain(tab, tabUpdate)){
                    return;  // It avoids to start process on affiliate domains
                } 

                if (!response || !response.values || !response.values.safeShop){
                    console.log("no safeShop value for: " +url);
                    return;
                }
                if ((response.values.safeShop.match || response.values.safeShop.selector || response.values.safeShop.regex || response.values.safeShop.timestamp)
                    && (AvastWRC.bal.sp.isSafeShopUrl(url))) {
                    
                    var cmp = { showABTest: false,
                        campaignId: "default"};
    
                    if(AvastWRC.Shepherd){
                        cmp = AvastWRC.Shepherd.getCampaing();
                    }

                    // this is a shop domain start process to get coupons and offers
                    // generate an uuid to recognize the requests process
                    var transactionId = AvastWRC.bal.utils.getRandomUID();
                    var data = {
                        url: url,
                        tab: tab,
                        showABTest: cmp.showABTest,
                        campaignId: cmp.campaignId,
                        referrer: AvastWRC.TabReqCache.get(tab.id,"referer"),
                        transactionId: transactionId
                    };

                    AvastWRC.bal.sp.getProviderInfo(data);
                    //this is a shop domain we support
                    var eventDetails = 	{
                        clientInfo: AvastWRC.Utils.getClientInfo(data.campaignId),
                        url: tab.url,
                        eventType: "",
                        offer: null,
                        offerType: ""
                    };		
                    eventDetails.clientInfo.referer = AvastWRC.TabReqCache.get(tab.id,"referer");
                    eventDetails.clientInfo.transaction_id = transactionId;
                    eventDetails.eventType = "SAFE_SHOP_DOMAIN_VISITED";
                    (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                   
                }
            },

            onPageComplete: function(tabId, tab, url) {
                /*if (_safeShopInTab[tabId]) {
                    var timer = Date.now() - AvastWRC.TabReqCache.get(tab.id, "timer");
                    console.log("onPageComplete() time " + timer);
                    _safeShopInTab[tab.id].count =5;
                    this.tabSafeShopCheck(tabId, tab, url, _safeShopInTab[tabId]);
                }*/
                var couponInTabsToRemove = AvastWRC.UtilsCache.get("coupons_tabs_to_remove", tab.id);
                if(couponInTabsToRemove && couponInTabsToRemove.coupon && couponInTabsToRemove.coupon.coupon_code){
                    console.log("couponTab page complete removed " + JSON.stringify(couponInTabsToRemove));
                    AvastWRC.bs.closeTab(tab);
                        AvastWRC.UtilsCache.remove("coupons_tabs_to_remove", tab.id);
                }
                var couponInTabsToShow = AvastWRC.UtilsCache.get("coupons_tabs_to_show", tab.id);
                if(couponInTabsToShow && couponInTabsToShow.coupons && !couponInTabsToShow.coupons[0].coupon_code
                    && (couponInTabsToShow.toBeShownIn[tab.url]  || AvastWRC.bal.sp.siteNameIsContainedOnCurrentURL(tab.url, couponInTabsToShow.merchantURL))){
                    console.log("couponTab show " + JSON.stringify(couponInTabsToShow));

                    AvastWRC.bs.accessContent(couponInTabsToShow.tab, {
                        message: "applyCouponInTab",
                        data: couponInTabsToShow,
                    });
                    
                    console.log(couponInTabsToShow.toBeShownIn);
                    AvastWRC.UtilsCache.set("coupons_tabs_to_show", tab.id, couponInTabsToShow);
                }
            },

            /**
             * Initiate page data check when safeShop selector received.
             * @param {String} page URL
             * @param {Object} urlInfo response
             * @param {Object} relevant tab to run the check
             */
            tabSafeShopCheck: function(tabId, tab, url, safeShopData) {
                if (!_safeShopInTab[tab.id]) {
                    return;
                }
                if(_safeShopInTab[tab.id].count > 5) {
                    delete _safeShopInTab[tab.id]
                    return;
                }
                _safeShopInTab[tab.id].count++;

                if (safeShopData && safeShopData.providerId){
                    var data = {
                        message: "checkSafeShop",
                        data: _safeShopInTab[tab.id]
                    };

                    var timer = Date.now() - AvastWRC.TabReqCache.get(tab.id, "timer");
                    console.log("tabSafeShopCheck() time " + timer);
                    AvastWRC.bs.accessContent(tab, data);
                }
            },

            safeShopOffersFound: function(data, tab) {
                if (!_safeShopInTab[tab.id]) {
                    return;
                }

                var safeShop = _safeShopInTab[tab.id];

                var repeatScan = 0; //if we parse the site to early we have no data, so parse again

                switch (safeShop.providerId) {
                    case "ciuvo":
                       if (data.scan.name === "RequireError" && safeShop && safeShop.count < 5) {
                           repeatScan = 1;
                       }
                       break;
                    case 'comprigo':
                        if (data.scan.error == true && safeShop && safeShop.count < 5) {
                            repeatScan = 1;
                        }
                        break;
                    //TODO add new providers here
                }
                if (repeatScan) {
                    console.log("safeShopOffersFound(): " + data.scan.name + " provider: " + safeShop.providerId);

                    if (!AvastWRC.bal.sp.isSafeShopUrl(tab.url)) {
                        return;
                    }

                    var url = safeShop.url;
                    var count = safeShop.count * 100;
                    setTimeout(function(tab, url, safeShop) {
                        AvastWRC.bal.sp.tabSafeShopCheck(tab.id, tab, url, safeShop);
                    }, count, tab, url, safeShop);
                    return;
                }

                delete _safeShopInTab[tab.id];
                this.processSafeShopOffers(tab, data, function(tab, data) {
                    AvastWRC.bs.accessContent(tab, {
                        message: "updatePanel",
                        data: data,
                    });
                });
            },

            isSafeShopUrl(url) {
                var domain = AvastWRC.bal.getDomainFromUrl(url);
                if (domain.indexOf("google") != -1 &&
                    url.indexOf("shop") == -1) {
                    return false;
                }
                return true;
            },

            getUserSettings: function(){
                var poppupSettings = {};
                poppupSettings.menuOpt = AvastWRC.bal.settings.get().userSPPoppupSettings;
                poppupSettings.autotrigger = false;
                poppupSettings.menuOpt.customList.newSite = [];
                poppupSettings.menuOpt.customList.removeSite = [];
                poppupSettings.images = AvastWRC.bal.utils.getLocalImageURLs({}, {
                    logo: "sp-settings-logo.png",
                    close: "sp-settings-close.png",
                    add: "sp-settings-add.png",
                    erase: "sp-settings-erase.png",
                    checkbox: "checkbox-unchecked.png",
                    checkboxChecked: "checkbox-checked.png",
                    
                });
                poppupSettings.strings = AvastWRC.bal.utils.loadLocalizedStrings({},[
                    "spSettingsPageTitleAvast",
                    "spSettingsPageTitleAvg",
                    "spSettingsTabNotifications",
                    "spSettingsTabNotificationsOffers",
                    "spSettingsTabNotificationsOffersShowAll",
                    "spSettingsTabNotificationsOffersBetter",
                    "spSettingsTabNotificationsOffersBetterThanLimit",
                    "spSettingsTabNotificationsOffersHideAll",
                    "spSettingsTabNotificationsOffersHideAllDesc",
                    "spSettingsPageAdvancedItemInclude",
                    "spSettingsPageAdvancedItemIncludeEShop",
                    "spSettingsPageAdvancedItemIncludeAccomm",
                    "spSettingsTabNotificationsCoupons",
                    "spSettingsTabNotificationsCouponsShowAll",
                    "spSettingsTabNotificationsCouponsShowOnce",
                    "spSettingsTabNotificationsCouponsHide",
                    "spSettingsTabNotificationsCouponsHideDesc",
                    "spSettingsPageAdvancedItemIncludeEShop",
                    "spSettingsPageAdvancedItemIncludeAccomm",
                    "spSettingsTabNotificationsOthers",
                    "spSettingsTabNotificationsOthersDesc",                    
                    "spSettingsPageCustomList",
                    "spSettingsPageCustomListTitle",
                    "spSettingsPageCustomListTitleDesc",
                    "spSettingsPageCustomListItemAddSite",                    
                    "spSettingsPageCustomListItemAdd",
                    "spSettingsPageHelp",
                    "spSettingsPageHelpNotificationsTitle",
                    "spSettingsPageHelpNotificationsTitleDesc",
                    "spSettingsPageHelpOffersTitle",
                    "spSettingsPageHelpOffersTitleDesc",
                    "spSettingsPageHelpCouponsTitle",
                    "spSettingsPageHelpCouponsTitleDesc",
                    "spSettingsPageHelpOthersTitle",
                    "spSettingsPageHelpOthersTitleDesc",
                    "spSettingsPageHelpFAQsTitle",
                    "spSettingsPageCancel",
                    "spSettingsPageSave",
                    "sasHintSettings"]);
                poppupSettings.strings.spSettingsTabNotifications = poppupSettings.strings.spSettingsTabNotifications.toUpperCase();
                poppupSettings.strings.spSettingsPageCustomList = poppupSettings.strings.spSettingsPageCustomList.toUpperCase();
                poppupSettings.strings.spSettingsPageHelp = poppupSettings.strings.spSettingsPageHelp.toUpperCase();
                poppupSettings.strings.spSettingsPageCancel = poppupSettings.strings.spSettingsPageCancel.toUpperCase();
                poppupSettings.strings.spSettingsPageSave = poppupSettings.strings.spSettingsPageSave.toUpperCase();
                poppupSettings.strings.spSettingsPageCustomListItemAddSite = poppupSettings.strings.spSettingsPageCustomListItemAddSite.toUpperCase();
                poppupSettings.strings.spSettingsPageCustomListItemAdd = poppupSettings.strings.spSettingsPageCustomListItemAdd.toUpperCase();
				var whiteList = _(poppupSettings.menuOpt.customList.whiteList) ||[];
                poppupSettings.menuOpt.customList.whiteList = whiteList.valueOf();
                return poppupSettings;
            },

            prepareOptionsData: function(){
                var cmp = { showABTest: false,
                    campaignId: "default"};

                if(AvastWRC.Shepherd){
                    cmp = AvastWRC.Shepherd.getCampaing();
                }
                var poppupSettings = AvastWRC.bal.sp.getUserSettings();
                var settingsData = {
                    message: "user_settings",
                    data: {
                        poppupSettings: poppupSettings,
                        poppupSettingsNew: JSON.parse(JSON.stringify(poppupSettings)),
                        updateBar: false,
                        avastBranding: AvastWRC.bal.brandingType == undefined || AvastWRC.bal.brandingType == AvastWRC.BRANDING_TYPE_AVAST ? true : false,
                        campaignId: cmp.campaignId,
                        isFirefox: AvastWRC.Utils.getBrowserInfo().isFirefox(),
                        isChrome: AvastWRC.Utils.getBrowserInfo().isChrome(),
                        isEdge: AvastWRC.Utils.getBrowserInfo().isEdge(),
                        isOpera: AvastWRC.Utils.getBrowserInfo().isOpera(),
                        isSafari: AvastWRC.Utils.getBrowserInfo().isSafari(),
                        isAvast: AvastWRC.Utils.getBrowserInfo().isAvast(),
                        ispoppupSettings: false
                    },
                };
                return settingsData;
            },

            openSettignsPage: function(){
                if(AvastWRC.Utils.getBrowserInfo().isEdge()){
                    var optionsPage = AvastWRC.bs.getLocalResourceURL("options.html");
                    AvastWRC.bs.openInNewTab(optionsPage);
                }
                else {
                    AvastWRC.bal.back.openOptions();
                }  
            },

            safeShopFeedback: function(data, tab) {
                var settings = AvastWRC.bal.settings.get();
                var cmpId = data.campaignId;
                if(cmpId == "" || !cmpId){
                    cmpId = AvastWRC.Shepherd.getCampaing().campaignId;
                }
                var eventDetails = 	{
                    clientInfo: AvastWRC.Utils.getClientInfo(cmpId),
                    url: tab.url,
                    eventType: "",
                    offer: null,
                    offerCategory: ""
                };			
                eventDetails.clientInfo.referer = data.referrer || "";		
                eventDetails.clientInfo.transaction_id = data.transactionId || "";
                console.log("Feedback:" );
                console.log(data);
                switch (data.type) {
                    case "coupon_tab":
                        var couponInTabsToRemove = AvastWRC.UtilsCache.get("coupons_tabs_to_remove", tab.id);
                        if(couponInTabsToRemove && couponInTabsToRemove.coupon && couponInTabsToRemove.coupon.coupon_code){
                            console.log("couponTab removed " + JSON.stringify(couponInTabsToRemove));
                            AvastWRC.bs.closeTab(tab);
                            AvastWRC.UtilsCache.remove("coupons_tabs_to_remove", tab.id);
                        }
                        var couponInTabsToShow = AvastWRC.UtilsCache.get("coupons_tabs_to_show", tab.id);
                        if(couponInTabsToShow && couponInTabsToShow.coupons && !couponInTabsToShow.coupons[0].coupon_code
                            && (couponInTabsToShow.toBeShownIn[tab.url]  || AvastWRC.bal.sp.siteNameIsContainedOnCurrentURL(tab.url, couponInTabsToShow.merchantURL))){
                            console.log("couponTab show " + JSON.stringify(couponInTabsToShow));

                            AvastWRC.bs.accessContent(couponInTabsToShow.tab, {
                                message: "applyCouponInTab",
                                data: couponInTabsToShow,
                            });

                            console.log(couponInTabsToShow.toBeShownIn);
                            AvastWRC.UtilsCache.set("coupons_tabs_to_show", tab.id, couponInTabsToShow);
                        }
                        break;
                    case "offer_click":
                        // open URL in new tab
                        settings.features.usage.clicks = settings.features.usage.clicks + 1;
                        AvastWRC.bal.settings.set(settings);
                        eventDetails.offer = data.offer;
                        eventDetails.offerCategory = data.offerCategory;
                        eventDetails.providerId = data.providerId;
                        eventDetails.query = data.query;
                        eventDetails.offerQuery = data.offerQuery;
                        eventDetails.bestOffer = data.bestOffer;
                        eventDetails.eventType = "OFFER_PICKED";
                        eventDetails.clickType = data.which;
                        eventDetails.panelClick = data.panelClick;
                        eventDetails.offer.listPosition = data.positionInList;
                        eventDetails.offer.showOffersNotification = data.showOffersNotification;
                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");

                        if(data.which == 2){
                            AvastWRC.bs.openInNewTabInactive(data.url);
                        }else if (data.which != 3){
                            AvastWRC.bs.openInNewTab(data.url);
                        } 
                        break;
                    case "coupon_click":
                        // 1. Send burger
                        // 2. Open the link in a new tab, wait for the redirects to finish (return to original domain) increase the number of clicks
                        // 3. Insert new Bar with coupon_code and coupon_text
                        
                        AvastWRC.UtilsCache.set("active_coupons", data.coupon.url, data.coupon);
                        eventDetails.offer = data.coupon;
                        eventDetails.offerCategory = "VOUCHER";
                        eventDetails.providerId = data.providerId;
                        eventDetails.query = data.query;
                        eventDetails.offerQuery = data.offerQuery;
                        eventDetails.bestOffer = data.bestOffer;
                        eventDetails.eventType = "OFFER_PICKED";
                        eventDetails.clickType = data.which;
                        eventDetails.panelClick = data.panelClick;
                        eventDetails.offer.listPosition = data.positionInList;
                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");

                        settings.features.usage.clicks = settings.features.usage.clicks + 1;
                        AvastWRC.bal.settings.set(settings);

                        if(eventDetails.offer.coupon_code){
                            AvastWRC.bs.openInNewTabInactive(data.url, function(newTab) {
                                AvastWRC.UtilsCache.set("coupons_tabs_to_remove", newTab.id, {tab: newTab, coupon: eventDetails.offer});

                            });
                        }
                        else{
                            AvastWRC.bs.openInNewTab(data.url, function(newTab) {
                                if(eventDetails.offer.type != 3 /*3 is similar coupon, just open the tab*/){
                                    var couponInTabInfo =  {}; // data for other messages
                                    couponInTabInfo.panelData = AvastWRC.bal.sp.panelData; //data for the panel container 
                                    couponInTabInfo.tab = newTab;
                                    var coupon = [];
                                    coupon.push(eventDetails.offer);
                                    coupon.selected = true;
                                    couponInTabInfo.coupons = _(coupon).valueOf() || _([]);;
                                    couponInTabInfo.couponsLength = 1;
                                    couponInTabInfo.vouchersSelected = true;
                                    couponInTabInfo.vouchersAvailable = false;
                                    couponInTabInfo.vouchersSelectedCounter = 1;
                                    couponInTabInfo.vouchersCounterBig = false;
                                    couponInTabInfo.merchantURL = eventDetails.url;
                                    couponInTabInfo.toBeShownIn = [];
                                    couponInTabInfo.toBeShownIn[eventDetails.offer.url] = true;
                                    AvastWRC.UtilsCache.set("coupons_tabs_to_show", newTab.id, couponInTabInfo);
                                }
                            });
                        }

                        break;
                    case "main_ui_event":
                        eventDetails.eventType = "MAIN_UI";
                        switch (data.action) {
                            case "shown":
                                eventDetails.type = "SHOWN";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";

                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "close_click":
                                eventDetails.type = "CLICKED_X";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";

                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "minimize_click":
                                AvastWRC.NotificationsManager.setMinimized(true);
                                eventDetails.type = "CLICKED_MINIMIZE";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "settings_click":
                                AvastWRC.bal.sp.openSettignsPage();
                                eventDetails.type = "CLICKED_SETTINGS";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "logo_click":
                                AvastWRC.bal.openLandingPageTab();
                                eventDetails.type = "CLICKED_LOGO";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "offers_tab_click":
                                eventDetails.type = "CLICKED_OFFERS_TAB";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "coupons_tab_click":
                                eventDetails.type = "CLICKED_COUPONS_TAB";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "others_tab_click":
                                eventDetails.type = "CLICKED_OTHERS_TAB";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "dragged":
                                eventDetails.type = "DRAGGED";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                        }
                        break;
                    case "notifications_events":
                        eventDetails.eventType = data.notificationType;
                        switch (data.action) {
                            case "button_click":
                                eventDetails.type = "CLICKED_CTA";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "close_click":
                                eventDetails.type = "CLICKED_X";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                //AvastWRC.NotificationsManager.disableNotificationsForDomain(AvastWRC.bal.getDomainFromUrl(tab.url));
                                AvastWRC.NotificationsManager.disableCategoryForDomain(AvastWRC.bal.getDomainFromUrl(tab.url), data.categoryFlag || 0);
                                break;
                            case "settings_click":                                
                                eventDetails.type = "CLICKED_SETTINGS";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                AvastWRC.bal.sp.openSettignsPage();
                                break;
                            case "shown":
                                eventDetails.type = "SHOWN";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                if (eventDetails.category === "COUPONS") AvastWRC.NotificationsManager.disableCouponsForDomain(data.domain || AvastWRC.bal.getDomainFromUrl(tab.url));
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "logo_click":
                                AvastWRC.bal.openLandingPageTab();
                                eventDetails.type = "CLICKED_LOGO";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "dragged":
                                eventDetails.type = "DRAGGED";
                                eventDetails.category = data.category || "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                        }
                        console.log("Feedback Notifications: " + eventDetails);
                        console.log(eventDetails);
                        break;
                    case "minimized_ui_clicked":
                        eventDetails.eventType = "NOTIFICATIONS_MINIMIZED";
                        eventDetails.type = "CLICKED_CTA";
                        eventDetails.category = "UNKNOWN_CATEGORY";
                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                        break;
                    case "minimized_ui_shown":
                        if (data.minimizedWithCoupons) AvastWRC.NotificationsManager.disableCouponsForDomain(data.domain || AvastWRC.bal.getDomainFromUrl(tab.url));
                        eventDetails.eventType = "NOTIFICATIONS_MINIMIZED";
                        eventDetails.type = "SHOWN";
                        eventDetails.category = "UNKNOWN_CATEGORY";
                        if (eventDetails.category === "COUPONS") AvastWRC.NotificationsManager.disableCouponsForDomain(data.domain || AvastWRC.bal.getDomainFromUrl(tab.url));
                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                        break;
                    case "minimized_ui_dragged":
                        if (data.minimizedWithCoupons) AvastWRC.NotificationsManager.disableCouponsForDomain(data.domain || AvastWRC.bal.getDomainFromUrl(tab.url));
                        eventDetails.eventType = "NOTIFICATIONS_MINIMIZED";
                        eventDetails.type = "DRAGGED";
                        eventDetails.category = "UNKNOWN_CATEGORY";
                        (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                        break;
                    case "reset_icon_click":
                        var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
                        if(cachedData){
                            cachedData.iconClicked = 0;
                            AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);
                        }
                        break;
                    case "settings_page":
                        switch (data.action) {
                            case "get_user_settings":
                                var settingsData = AvastWRC.bal.sp.prepareOptionsData();
                                AvastWRC.bal.back.messageTab(tab, settingsData);
                                break;
                            case "settings_shown":
                                eventDetails.eventType = "SETTINGS_EVENTS";
                                eventDetails.type = "SHOWN";
                                eventDetails.category = "UNKNOWN_CATEGORY";
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                break;
                            case "close_settings":
                                if(AvastWRC.Utils.getBrowserInfo().isFirefox() || AvastWRC.Utils.getBrowserInfo().isEdge()){
                                    AvastWRC.bs.closeTab(tab);
                                }
                                break;
                            case "save-new-menu-selection":
                                settings.userSPPoppupSettings = data.newSettings;
                                AvastWRC.bal.settings.set(settings);
                                if(data.newSettings.help.selected)
                                {
                                    eventDetails.eventType = "SETTINGS_EVENTS";
                                    eventDetails.type = "CLICKED_HELP";
                                    eventDetails.category = "UNKNOWN_CATEGORY";
                                    (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                }
                                console.log("settings popup: save menu selection");
                                break;
                            case "save-settings":
                                eventDetails.eventType = "SAVE_SETTINGS";
                                eventDetails.newSettings = AvastWRC.Utils.buildUserSettingsMessage(data.newSettings);
                                settings.userSPPoppupSettings = data.newSettings;
                                AvastWRC.bal.settings.set(settings);
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                console.log("settings popup: save button click");
                                break;
                            case "faqs_clicked": 
                                eventDetails.eventType = "SETTINGS_EVENTS";
                                eventDetails.type = "CLICKED_FAQS";
                                eventDetails.category = "UNKNOWN_CATEGORY";
                                var brandingType = AvastWRC.bal.brandingType;
                                AvastWRC.bal.openFAQsPageTab();
                                (AvastWRC.Burger != undefined)? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                                console.log("settings popup: save button click");
                                break;
                        }
                        AvastWRC.bal.settings.set(settings);
                    break;
                }
            },

            badgeHighlighted: function(id, url, transactionId){
                var eventDetails = {
                    clientInfo: AvastWRC.Utils.getClientInfo((AvastWRC.Shepherd) ? AvastWRC.Shepherd.getCampaing().campaignId : "default"),
                    url: url,
                    eventType: "EXTENSION_ICON",
                    type: "HIGHLIGHTED",
                    offer: null,
                    offerType: ""
                };
                eventDetails.clientInfo.referer = AvastWRC.TabReqCache.get(id,"referer");
                eventDetails.clientInfo.transaction_id = transactionId;
                console.log(eventDetails);
                (AvastWRC.Burger != undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails) : console.log("no burger lib");
            },
            /**
             * Process safeShop offers returned for given tab.
             * @param {Object} tab to execute the SafeShop for
             * @param {Object} safeShop data retrieved
             * @param {Function} callback function to receive the prcessed data
             */
            processSafeShopOffers: function(tab, data, callback) {
                var tab = tab;

                var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");

                var barState = 1;
                //commented cause only the notifications are going to be hidden but not the offers
                /*if(AvastWRC.bal.sp.isBarHiddenOnDomain(data.url)){
                    barState = 0 // hidden
                }*/

                var queryOptions = {
                    url: data.url,
                    query: data.scan,
                    providerId: data.providerId,
                    category: data.category,
                    state: barState,
                    explicit_request: cachedData.iconClicked,
                    showABTest: cachedData.showABTest,
                    campaignId: cachedData.campaignId,
                    referrer: cachedData.referrer,
                    transactionId: cachedData.transactionId,
                    callback: function(offersResponse) {
                        if ((!offersResponse || offersResponse.secondRequestTotalLength === 0)
                                && (data.firstRequestTotalLength === 0)){
                            if (cachedData.iconClicked == 1) {
                                cachedData.iconClicked = 0;
                                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);
                            }
                            // TODO: remove all our data on ial
                            return;
                        }

                        cachedData.minimizedNotifications = AvastWRC.NotificationsManager.notificationsAreMinimized();

                        var detailsToClosed = {
                            offerNumber: offersResponse.secondRequestTotalLength + data.firstRequestTotalLength,
                            closed: 0
                        };

                        AvastWRC.bal.sp.setBadge(tab.id, detailsToClosed.offerNumber.toString(), !AvastWRC.NotificationsManager.notificationsAvailable(data));

                        if(!AvastWRC.NotificationsManager.notificationsAvailable(data)){
                            //send event badge
                            AvastWRC.bal.sp.badgeHighlighted(tab.id, tab.url, cachedData.transactionId);
                        }

                        cachedData.offerQuery = offersResponse.query;

                        cachedData.products = _(offersResponse.products).valueOf();
                        cachedData.accommodations = _(offersResponse.accommodations).valueOf();
                        cachedData.hotelsPriceComp =  _(offersResponse.hotelsPriceComp).valueOf();
                        cachedData.hotelsCity =  _(offersResponse.hotelsCity).valueOf();
                        cachedData.hotelsSimilar =  _(offersResponse.hotelsSimilar).valueOf();
                        cachedData.secondRequestTotalLength = offersResponse.secondRequestTotalLength;
                        cachedData.producstLength = offersResponse.producstLength;
                        cachedData.accommodationsLength = offersResponse.accommodationsLength;
                        cachedData.priceComparisonLength = offersResponse.priceComparisonLength;
                        cachedData.cityHotelLength = offersResponse.cityHotelLength;
                        cachedData.similarHoteLength = offersResponse.similarHoteLength;
                        cachedData.avastBranding = AvastWRC.bal.brandingType == undefined || AvastWRC.bal.brandingType == AvastWRC.BRANDING_TYPE_AVAST ? true : false;
                        cachedData.offersToBeShown = cachedData.offerToBeShown ? cachedData.offerToBeShown : (offersResponse.secondRequestTotalLength > 0) ? true : false;
                        cachedData.couponsToBeShown = cachedData.couponToBeShown ? cachedData.couponToBeShown : data.couponsLength > 0 ? true : false;
                        cachedData.othersToBeShown = cachedData.othersToBeShown ? cachedData.othersToBeShown : (data.redirectLength > 0 || data.similarCouponsValue > 0 ) ? true : false;
                        cachedData.detailsToClosed = detailsToClosed;
                        cachedData.scan = data.scan;
                        cachedData.showOffersNotification = offersResponse.showOffersNotification;
                        cachedData.cityName = offersResponse.cityName;
                        cachedData.transactionFinished = true;
                        AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);
                        AvastWRC.bal.sp.setActiveIcon(tab);
                        console.log("-----------cachdata------------");
                        console.log(cachedData);
                        console.log("-----------cachdata------------");
                        callback(tab, cachedData);

                        if (!cachedData.iconClicked) {
                            AvastWRC.NotificationsManager.resolveOffersNotification(tab, _.extend(data, cachedData));
                        }
                    }
                };

                new AvastWRC.Query.SafeShopOffer(queryOptions); // query Avast Offers Proxy

            }, // processSafeShopOffers

            /**
             * Process safeShop coupons returned for given tab.
             * @param {Object} tab to execute the SafeShop for
             * @param {Object} safeShop data retrieved
             * @param {Function} callback function to receive the prcessed data
             */
            processSafeShopCoupons: function(tab, data) {
                var tab = tab;

                var cachedData = AvastWRC.TabReqCache.get(tab.id, "safePriceInTab");
                
                var detailsToClosed = {
                    offerNumber: data.firstRequestTotalLength,
                    closed: 0
                };

                AvastWRC.bal.sp.setBadge(tab.id, detailsToClosed.offerNumber.toString(), !AvastWRC.NotificationsManager.notificationsAvailable(data));

                if(!AvastWRC.NotificationsManager.notificationsAvailable(data)){
                    //send event badge
                    AvastWRC.bal.sp.badgeHighlighted(tab.id, tab.url, cachedData.transactionId);
                }

                cachedData.minimizedNotifications = AvastWRC.NotificationsManager.notificationsAreMinimized();
                
                cachedData.redirect = _(data.redirects).valueOf() || _([]);
                cachedData.coupons = _(data.vouchers).valueOf() || _([]);
                cachedData.similarCoupons = _(data.similarvouchers).valueOf() || _([]);
                cachedData.couponsLength = data.couponsLength;
                cachedData.redirectLength = data.redirectLength;
                cachedData.similarCouponsValue = data.similarCouponsValue;
                cachedData.firstRequestTotalLength = data.firstRequestTotalLength;
                cachedData.offersToBeShown = false;
                cachedData.couponsToBeShown = cachedData.couponToBeShown ? cachedData.couponToBeShown : (data.vouchersLength > 0) ? true : false;
                cachedData.othersToBeShown = cachedData.othersToBeShown ? cachedData.othersToBeShown : (data.redirectsLength > 0 || data.similarCouponsValue > 0)  ? true : false;
                cachedData.detailsToClosed = detailsToClosed;

                AvastWRC.bal.sp.setActiveIcon(tab);
                if (!cachedData.iconClicked) {
                    AvastWRC.NotificationsManager.resolveCouponsNotify(tab, cachedData); 
                }

                if(cachedData.onlyFirstRequest){
                    cachedData.transactionFinished = true;
                }

                AvastWRC.TabReqCache.set(tab.id, "safePriceInTab", cachedData);

                AvastWRC.bs.accessContent(tab, {
                    message: "updatePanel",
                    data: cachedData,
                });

            },

            /* Register SafePrice Event handlers */
            registerModuleListeners: function(ee) {
                ee.on("urlInfo.response", AvastWRC.bal.sp.onUrlInfoResponse.bind(AvastWRC.bal.sp));
                ee.on("page.complete", AvastWRC.bal.sp.onPageComplete.bind(AvastWRC.bal.sp));
                ee.on("message.safeShopFeedback", AvastWRC.bal.sp.safeShopFeedback.bind(AvastWRC.bal.sp));
                ee.on("message.safeShopOffersFound", AvastWRC.bal.sp.safeShopOffersFound.bind(AvastWRC.bal.sp));
            },

            /**
             * Return SafePrice related default settings.
             */
            getModuleDefaultSettings: function() {
                return {
                    safeShop: {
                        noCouponDomains: {}, // {"domain":true}
                        hideDomains: {}, // {"domain":timeout}
                        hideAll: 0, // hide until
                        iconClicked: 0, // to know if the SP icon was clicked
                        closedByUser: []
                            /*{"url":{offerNumber: (number of offers we have), closed: (1 if closed)}} 
								reason: if the user intentionallity closed the bar we show on the badge 
                                the nummer of offers we have for that url (on clic of the icon the bar will appear again)*/
                    },
                    features: {
                        safeShop: -1, // NEW (-1), true = opt-in (default), false = opt-out
                        onBoardingPage: {
                            first: false,
                            second: false,
                            third: false,
                        },
                        usage: {
                            clicks: -1,
                            lastDay: -1
                        }
                    },
                    userSPPoppupSettings: {
                        help: {
                            selected: true,
                            settingsChanged: false,
                        },
                        notifications: {
                            selected: false,
                            settingsChanged: false,
                            offers: {
                                item1Selected: true,// show always
                                item2Selected: false,// show better than the original price
                                item3Selected: false,// show seving 10% min
                                item4Selected: false,// hidde

                                include: {
                                    eShop: true,
                                    accommodations: true
                                }
                            },
                            coupons: {
                                item1Selected: false, // show always
                                item2Selected: true, // show once
                                item3Selected: false, // hide notifications
                            },
                            others: {
                                item1Selected: true, // show always
                            }
                        },
                        customList: {
                            selected: false,
                            showAddButton: true,
                            settingsChanged: false,
                            whiteList: []
                        },
                        defaultMenuChanged: false
                    }
                };
            },
            badgeAnimationTimer1: null,
            badgeAnimationTimer2: null,
            setBadge: function (tabID, badge, animation = true, color) {
                if(AvastWRC.bal.sp.badgeAnimationTimer1){
                    clearTimeout(AvastWRC.bal.sp.badgeAnimationTimer1);
                }
                if(AvastWRC.bal.sp.badgeAnimationTimer2){
                    clearTimeout(AvastWRC.bal.sp.badgeAnimationTimer2);
                }
                let animationConfig = AvastWRC.Shepherd.getIconBlinkAnimationConfig();
                AvastWRC.bal.sp.currentBadge[tabID] = badge;
                animation ? setBadgeWithAnimation(tabID, badge) : setBadge(tabID, badge, color || animationConfig.color);

                function setBadgeWithAnimation(tabID, badge) {
                    let milliseconds = 0;

                    for (let i = 0; i <= animationConfig.times; i++) {
                        AvastWRC.bal.sp.badgeAnimationTimer1 = setAnimationTimeout(tabID, badge, animationConfig.color, milliseconds);
                        if (i === animationConfig.times - 1) return;
                        AvastWRC.bal.sp.badgeAnimationTimer2 = setAnimationTimeout(tabID, "", animationConfig.color, milliseconds + animationConfig.milliseconds);
                        milliseconds += animationConfig.milliseconds * 2;
                    }
                }

                function setAnimationTimeout(tabID, badge, color, milliseconds) {
                    var timer = setTimeout(function () {
                        setBadge(tabID, badge, color);
                    }, milliseconds);
                    return timer;
                }

                function setBadge(tabID, badge, color) {
                    AvastWRC.bal.emitEvent("control.showText", tabID, badge, color);
                }
            },

            /*Send heartbeat each 16H -> 57600 sec*/
            sendHeartbeat: function () {
                AvastWRC.getStorageAsync("HeartBeat")
                .then(function(date){
                    var now = parseInt(new Date().getTime())/1000;
                    if(date &&  date < now){
                        var eventDetails = 	{
                            clientInfo: AvastWRC.Utils.getClientInfo((AvastWRC.Shepherd) ? AvastWRC.Shepherd.getCampaing().campaignId : "default"),
                            url: "",
                            eventType: "HEARTBEAT",
                            offer: null,
                            offerType: ""
                        };
                        (AvastWRC.Burger != undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                        var ttl = 57600;
                        if(AvastWRC.Shepherd){
                            ttl = AvastWRC.Shepherd.getHeartbeat();
                        }
                        var newDate = now + parseInt(ttl);
                        AvastWRC.setStorage("HeartBeat", newDate);
                        console.log("HEARTBEAT sent on then eventDetails: " + JSON.stringify(eventDetails) + "date: " + date + "now: " + now + "newDate: " + newDate);
                    }
                    if (AvastWRC.Uninstall) AvastWRC.Uninstall.setUninstallURL();
                    console.log("HEARTBEAT on then not sent date: " + date + "now: " + now);
                })
                .catch(function(reason){
                    var ttl = 57600; //16h
                        if(AvastWRC.Shepherd){
                            ttl = AvastWRC.Shepherd.getHeartbeat();
                        }
                    // date will be now + ttl min 16h
                    var date = parseInt(new Date().getTime())/1000 + parseInt(ttl);
                    AvastWRC.setStorage("HeartBeat", date);
                    var eventDetails = 	{
                        clientInfo: AvastWRC.Utils.getClientInfo((AvastWRC.Shepherd) ? AvastWRC.Shepherd.getCampaing().campaignId : "default"),
                        url: "",
                        eventType: "HEARTBEAT",
                        offer: null,
                        offerType: ""
                    };
                    (AvastWRC.Burger != undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails):console.log("no burger lib");
                    if (AvastWRC.Uninstall) AvastWRC.Uninstall.setUninstallURL();
                    console.log("HEARTBEAT sent on catch eventDetails: " + JSON.stringify(eventDetails) + "date: " + date);
                });
            },
            isAnAffiliateDomain: function (tab, sendAffiliateDomainEvent = true) {
                let isAnAffiliateDomain = (AvastWRC.bs.ciuvoASdetector && AvastWRC.bs.ciuvoASdetector.isAffiliateSource(tab.id, false))
                    || (AvastWRC.bs.comprigoASdetector && AvastWRC.bs.comprigoASdetector.isBolcked(tab.url));

                if (isAnAffiliateDomain && sendAffiliateDomainEvent) emitAFSRCMatchBurgerEvent(tab);

                return isAnAffiliateDomain;

                function emitAFSRCMatchBurgerEvent(tab) {
                    const AFFILIATE_MATCHING_KEY = "AFFILIATE_MATCHING";

                    let eventDetails = {
                        clientInfo: AvastWRC.Utils.getClientInfo((AvastWRC.Shepherd) ? AvastWRC.Shepherd.getCampaing().campaignId : "default"),
                        url: `${tab.url + (tab.url.indexOf("?") < 0 ? "?" : "")}&${AFFILIATE_MATCHING_KEY}=${AvastWRC.bs.ciuvoASdetector.isAffiliateSource(tab.id, false) ? "CIUVO" : "COMPRIGO"}`,
                        offer: null,
                        offerType: "",
                        eventType: "AFSRC_MATCHING"
                    };

                    eventDetails.clientInfo.referer = AvastWRC.TabReqCache.get(tab.id, "referer");
                    (AvastWRC.Burger !== undefined) ? AvastWRC.Burger.emitEvent("burger.newEvent", eventDetails) : console.log("no burger lib");
                    console.log("afsrc=1 detected, standing down");
                }
            },
            setIcon: function (tab, icon) {
                AvastWRC.bal.emitEvent("control.setIcon", tab.id, icon);
            },
            setActiveIcon: function (tab) {
                AvastWRC.bal.sp.setIcon(tab, AvastWRC.bal.sp.config.icons.active);
            },
            setDisableIcon: function (tab) {
                AvastWRC.bal.sp.setIcon(tab, AvastWRC.bal.sp.config.icons.disable);
            },
            currentBadge: {},
            config: {
                icons: {
                    disable: "common/ui/icons/logo-safeprice-gray.png",
                    active: "common/ui/icons/logo-safeprice-128.png"
                }
            }

        }); // SP
        AvastWRC.Utils.Burger.initBurger(true/*init*/,false/*sendAll*/);

        AvastWRC.bal.sp.sendHeartbeat();

        //send heartbeat each 16H (milisecond 57600000) or the ttl from shepherd
        setInterval(function() {
            AvastWRC.bal.sp.sendHeartbeat();
        }, AvastWRC.Shepherd ? AvastWRC.Shepherd.getHeartbeat()*1000 : 57600*1000);


        
        AvastWRC.bal.registerEvents(function(ee) {
            ee.on("urlInfo.response", AvastWRC.bal.sp.onUrlInfoResponse.bind(AvastWRC.bal.sp));
            ee.on("page.complete", AvastWRC.bal.sp.onPageComplete.bind(AvastWRC.bal.sp));
            ee.on("message.safeShopFeedback", AvastWRC.bal.sp.safeShopFeedback.bind(AvastWRC.bal.sp));
            ee.on("message.safeShopOffersFound", AvastWRC.bal.sp.safeShopOffersFound.bind(AvastWRC.bal.sp));
        });

        AvastWRC.bal.registerModule(AvastWRC.bal.sp);

        return AvastWRC.bal.sp;
    });


}).call(this, AvastWRC, _);
/* globals chrome, XMLHttpRequest, self */

class ASDetector {
    
    constructor (blockref) {
    	this.pastEvents = {};
        this.listeners = [];
        this.blockref = blockref || [ new RegExp('\.*&afsrc=1|\\?afsrc=1'),
            new RegExp('.*jdoqocy.com'),
            new RegExp('.*tkqlhce.com'),
            new RegExp('.*dpbolvw.net'),
            new RegExp('.*anrdoezrs.net'),
            new RegExp('.*kqzyfj.com'),
            new RegExp('.*linksynergy\.com'),
            new RegExp('.*linksynergy\.onlineshoes\.com'),
            new RegExp('.*linksynergy\.walmart\.com'),
            new RegExp('.*savings\.com'),
            new RegExp('.*affiliate\.rakuten\.com'),
        ];
        this.ciuvo_rex = [new RegExp('.*ciuvo\.com'), new RegExp('.*localhost:8002')];
        
        this.NEW_EVENT_THRESHOLD_TIME = 800;
        this.TAB_EVENT_EXPIRATION_TIME = 10 * 1000;
        this.SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
        this.TAB_EVENT_EXPIRATION_TIME = this.SESSION_TIMEOUT + 10 * 1000; // 10 seconds
    }
    
    /**
     * Add a new navigation event of the tab's main frame.
     * 
     * @param tabId
     *            the tabId for this navigation event (required)
     * @param url
     *            the url for this navigation event (required)
     * @param requestId
     *            the request-id if available. It helps recognizing multiple
     *            urls which actually belong to one navigation event because
     *            of redirects. (optional)
     * @param timestamp
     *            the timestamp in ms of the navigation event. It is usefull
     *            for recognizing events which belong together (optional).
     * @param main_page_changed
     *            only used in firefox because there a workaround to recognize main-page changes
     *            is needed
     * @returns true if the current chain of navigation events has been
     *          marked as affiliate source. False otherwise.
     */
    onNavigationEvent (tabId, url, requestId, timestamp, main_page_changed) {
        timestamp = timestamp || Date.now();

        var lastEvent = this.getLastEvent(tabId);
        var newEvent = this.isNewEvent(lastEvent, url, requestId, timestamp, main_page_changed);

        // update timestamp & hostname
        lastEvent.timestamp = timestamp;
        lastEvent.hostname = AvastWRC.bal.getHostFromUrl(url);
        lastEvent.isFromCiuvo = this.isCiuvoEvent(url);

        if (lastEvent.isFromCiuvo) {
            // ignore afsrc if ciuvo itself triggered the coupon-click
            lastEvent.isAfsrc = false;
        } else if (!lastEvent.isAfsrc) {
            lastEvent.isAfsrc = this.ifAfsrcEvent(url);
        }

        return lastEvent.isAfsrc;
    }

    /**
     * Whether the event originated with an clickout from ciuvo
     */
    isCiuvoEvent(url) {
        for (var i = 0; i < this.ciuvo_rex.length; ++i) {
            if (this.ciuvo_rex[i].exec(url)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Whether the event originated with an clickout from another affiliate source
     */
    ifAfsrcEvent(url) {
        for (var i = 0; i < this.blockref.length; i++) {
            if (this.blockref[i].exec(url)) {
                return true;
            }
        }
        return false;
    }

    /**
     * @returns dictionary
     */
    getSessionBlockList() {
        var sbl = window.localStorage.getItem("__ciuvo__afsrc__sbl");

        if (sbl && typeof sbl === "string") {
            sbl = JSON.parse(sbl);
        }

        if (!sbl || typeof sbl !== "object") {
            // recover gracefully
            sbl = {};
            this.storeSessionBlockList(sbl);
        }

        return sbl;
    }

    /**
     * @param sbl
     *          dictionary
     */
    storeSessionBlockList(sbl) {
        window.localStorage.setItem("__ciuvo__afsrc__sbl", JSON.stringify(sbl));
    }

    /**
     * @param hostname
     *          the hostname of the request
     */
    addToSessionBlockList(hostname) {
        var blockList = this.getSessionBlockList();
        blockList[hostname] = Date.now();
        this.storeSessionBlockList(blockList);
    }

    /**
     * @param hostname
     *          the hostname of the request
     * @returns true
     *         if it is on the blocklist, resets session timestamp
     **/
    isOnSessionBlockList(hostname) {
        var blockList = this.getSessionBlockList(),
            timestamp = blockList[hostname];

        if (!timestamp) {
            // "The host <" + hostname + "> is not on session block list."
            return false;
        }

        var now_ts = Date.now();

        if (timestamp + this.SESSION_TIMEOUT > now_ts) {
            // "The host <" + hostname + "> is on session block list."
            return true;
        }

        // cleanup expired timestamp
        delete blockList[hostname];
        this.storeSessionBlockList(blockList);
        return false;
    }

    /**
     * decide whether it is a new event or not
     * @param lastEvent
     *            the last Event recorded for this tab
     * @param url
     *            the url for this navigation event (required)
     * @param requestId
     *            the request-id if available. It helps recognizing multiple
     *            urls which actually belong to one navigation event because
     *            of redirects. (optional)
     * @param timestamp
     *            the timestamp in ms of the navigation event. It is usefull
     *            for recognizing events which belong together (optional).
     * @param main_page_changed
     *            only used in firefox because there a workaround to recognize main-page changes
     *            is needed
     * @returns true if this is a new navigation event or part of the same clickout
     **/
    isNewEvent(lastEvent, url, requestId, timestamp, main_page_changed) {

        // try to detect if this is a new navigation event
        if (typeof requestId !== 'undefined') {
            if (requestId == lastEvent.requestId) {
                    return false;
            }
        }

        // those damn JS redirects make requestId unreliable
        var delta = timestamp - lastEvent.timestamp;
        if (delta < this.NEW_EVENT_THRESHOLD_TIME) {
           return false;
        }

        if (lastEvent.isAfsrc)  {
            if (main_page_changed !== undefined)  {
                if (!main_page_changed) {
                        return false;
                }
            } else if ((AvastWRC.bal.getHostFromUrl(url) === lastEvent.hostname) && this.ifAfsrcEvent(url)) {
                // still on the same event
                    return false;
            }
        }

        // create a new event if one has been detected
        lastEvent.isAfsrc = false;
        lastEvent.isFromCiuvo = false;
        lastEvent.requestId = requestId;

        return true;
    }

    /**
     * be nice, clean up a bit after ourselves
     */
    cleanupExpiredTabs () {
        	 now = Date.now();
        for ( var tabId in this.pastEvents) {
            if (this.pastEvents.hasOwnProperty(tabId)) {
                var event = this.pastEvents[tabId];
                if ((now - event.timestamp) > this.TAB_EVENT_EXPIRATION_TIME) {
                    delete this.pastEvents[tabId];
                }
            }
        }
    }

    /**
     * @param tabId
     *            the tab's id
     * @returns the last navigation event or an empty one
     */
    getLastEvent (tabId) {
        	 var lastEvent = this.pastEvents[tabId];
        if (typeof lastEvent === 'undefined') {
            lastEvent = {
                isAfsrc : false,
                requestId : undefined,
                isFromCiuvo : false,
                timestamp : 0,
                hostname: undefined
            };
            this.pastEvents[tabId] = lastEvent;
        }
        return lastEvent;
    }

    /**
     * @param tabId the id of the tab to be checked for the affiliate source
     * @param cleanup will clear the affiliate source flag since displays are allowed
     *          on subsequent requests
     * @returns true if the current chain of navigation events has been
     *          marked as affiliate source. False otherwise.
     */
    isAffiliateSource (tabId, cleanup) {
        var lastEvent = this.getLastEvent(tabId);

        // add hostname to session blocklist / check if it is on one
        if (lastEvent.isAfsrc) {
            this.addToSessionBlockList(lastEvent.hostname);
        } else if (this.isOnSessionBlockList(lastEvent.hostname)) {
           return true;
        }

        if (cleanup) {
            this.cleanupExpiredTabs();
        }

        return lastEvent.isAfsrc;
    }
}

AvastWRC.bs.ciuvoASdetector = AvastWRC.bs.ciuvoASdetector || new ASDetector();
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
                    rules.campaignId = rules.abtests.test_id+rules.abtests.variant_id;
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
 *  AvastWRC Shepherd specifics for SP
 * 
 ********************************************************************************/
(function(_,Shepherd) {

    _.extend(Shepherd,{
        /**
         * Get a individual rule based on the regexp defined in the rule
         * @param  {String} url Url of the site
         * @return {Object}     Rule object (default topBarRules object if no applicable rule was found)
         */
        getUIAdaptionRule: function (url) {
            if(!this.isValidTtl()){
                this.load();
            }

            if(!this.rules || !this.rules.BarUISpecifics) return null;

            var topBarRules = {
                rulesToApply: 0,
                specifics: []
            };

            var ui_specifics = (this.rules.BarUISpecifics.Configs) ? this.rules.BarUISpecifics.Configs : [];
            for (var i = 0; i < ui_specifics.length; i++) {
                if (RegExp(ui_specifics[i].domainPattern).test(url)) {
                    ui_specifics[i].styles.forEach(function(node) {
                        if (AvastWRC.Utils.getBrowserInfo().getBrowser() === node.browser || node.browser === "ALL") {
                            if(node.specifics instanceof Array){
                                node.specifics.forEach(function(specific) {
                                    if(specific.styleName && specific.styleProperty){
                                        topBarRules.specifics.push({
                                            styleName: specific.styleName,
                                            styleProperty: specific.styleProperty,
                                            computedStyle: specific.computedStyle ? specific.computedStyle : null,
                                            dynamicValue: specific.dynamicValue ? specific.dynamicValue : null,
                                            dynamicOldValue: specific.dynamicOldValue ? specific.dynamicOldValue : ""
                                        });
                                        topBarRules.rulesToApply = specific.rulesToApply;
                                    }
                                });
                            }else {
                                var specific = node.specifics;
                                if(specific.styleName && specific.styleProperty){
                                    topBarRules.specifics.push({
                                        styleName: specific.styleName,
                                        styleProperty: specific.styleProperty,
                                        computedStyle: specific.computedStyle ? specific.computedStyle : null,
                                        dynamicValue: specific.dynamicValue ? specific.dynamicValue : null,
                                        dynamicOldValue: specific.dynamicOldValue ? specific.dynamicOldValue : ""
                                    });
                                    topBarRules.rulesToApply = specific.rulesToApply;
                                }                               
                            }                            
                        }
                    });
                }
            }
            return topBarRules;
        },
        /**
         * ObcompaingId 
         * @param  {String} url Url of the site
         * @return {Object}     Rule object (default topBarRules object if no applicable rule was found)
         */
        getCampaing: function () {
            if(!this.isValidTtl()){
                this.load();
            }
            return {
                campaignId: (this.rules && this.rules.campaignId) ? this.rules.campaignId : "default",
                showABTest: (this.rules && this.rules.showABTest) ? this.rules.showABTest : false
            };           
        },

        setOnBoardingPageDefaults: function (resetAll){
            var settings = AvastWRC.bal.settings.get(); 
            if(resetAll || settings.features.usage.lastDay == -1){
                settings.features.onBoardingPage.first = (this.rules.onBoardingPage.Configs.first) ? this.getExpirationTime(this.rules.onBoardingPage.Configs.first) : true;
                settings.features.onBoardingPage.second =  (this.rules.onBoardingPage.Configs.second) ? this.getExpirationTime(this.rules.onBoardingPage.Configs.second) : true;
                settings.features.onBoardingPage.third =  (this.rules.onBoardingPage.Configs.third) ? this.getExpirationTime(this.rules.onBoardingPage.Configs.third) : true;
                settings.features.usage.lastDay = (this.rules.onBoardingPage.Configs.days) ? this.getExpirationTime(this.rules.onBoardingPage.Configs.days*86400) : -1;
                settings.features.usage.clicks = 0;
            }

            AvastWRC.bal.settings.set(settings);
        },

        showOnboardingPage: function () {
            if(!this.isValidTtl()){
                this.load();
                this.setOnBoardingPageDefaults(false);
            }

            if(!this.rules || !this.rules.onBoardingPage) return null;

            var settings = AvastWRC.bal.settings.get(); 

            if (settings.features.safeShop === -1){               
                return true;
            }
            else{
                var now = parseInt(new Date().getTime())/1000;
                if(settings.features.usage.lastDay == -1) {
                    this.setOnBoardingPageDefaults(true);
                }
                else if(settings.features.usage.lastDay < now){
                    if(settings.features.usage.clicks <= this.rules.onBoardingPage.Configs.minClicks){
                        if((settings.features.onBoardingPage.first != true && (settings.features.onBoardingPage.first && settings.features.onBoardingPage.first < now))
                            ||(settings.features.onBoardingPage.second != true &&  (settings.features.onBoardingPage.second && settings.features.onBoardingPage.second < now))
                            ||(settings.features.onBoardingPage.third != true &&   (settings.features.onBoardingPage.third && settings.features.onBoardingPage.third < now))){
                            return true;
                        }
                    }
                }
                return false;
            }
            return false;
        },

        onboardingPageShown: function () {
            if(!this.rules || !this.rules.onBoardingPage) return null;

            var settings = AvastWRC.bal.settings.get(); 

            if (settings.features.safeShop === -1){
                settings.features.safeShop = true;
                AvastWRC.bal.settings.set(settings);
            }
            else{
                var now = parseInt(new Date().getTime())/1000;   
                if(settings.features.usage.lastDay == -1) {
                    this.setOnBoardingPageDefaults(true);
                }       
                else if(settings.features.usage.lastDay < now){
                    if(settings.features.usage.clicks <= this.rules.onBoardingPage.Configs.minClicks){
                        if(settings.features.onBoardingPage.first != true && (settings.features.onBoardingPage.first && settings.features.onBoardingPage.first < now)){
                            settings.features.onBoardingPage.first = true;
                            AvastWRC.bal.settings.set(settings);
                        }
                        else if(settings.features.onBoardingPage.second != true &&  (settings.features.onBoardingPage.second && settings.features.onBoardingPage.second < now)){
                            settings.features.onBoardingPage.second = true;
                            AvastWRC.bal.settings.set(settings);
                        }
                        else if(settings.features.onBoardingPage.third != true &&   (settings.features.onBoardingPage.third && settings.features.onBoardingPage.third < now)){
                            settings.features.onBoardingPage.third = true;
                            this.setOnBoardingPageDefaults(true);
                        }
                    }                   
                }
            }
        },

        getPowerUserConfig: function () {
            if(!this.isValidTtl()){
                this.load();
            }
            if(!this.rules || !this.rules.powerUser) return null;
            return this.rules.powerUser.Configs;
        },

        getIconBlinkAnimationConfig: function () {
            return this.rules && this.rules.spIconAnimation && this.rules.spIconAnimation.Configs ? this.rules.spIconAnimation.Configs : {
                icon: "common/ui/icons/logo-safeprice-128.png",
                color: AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "#0CB754" : "#556688",
                times: 4,
                milliseconds: 230
            };
        },

		getHeartbeat: function () {
            if(!this.isValidTtl()){
                this.load();
            }
        
            if(!this.rules || !this.rules.heartbeat) return 57600; // 16h
            return (this.rules.heartbeat.ttl) ? this.rules.heartbeat.ttl : 57600;
        },

        getRecruitmentConfig: function () {
            return this.rules && this.rules.recruitment ? this.rules.recruitment.Configs : null;
        },

        getNotificationsConfig: function () {
            return this.rules && this.rules.notifications && this.rules.notifications.configs || false;
        }
    });
}).call(this, _, AvastWRC.Shepherd);

/*******************************************************************************
 *
 *  ende AvastWRC Shepherd
 */

/*******************************************************************************
 *
 *  AvastWRC Yes/No
 *
 ********************************************************************************/
(function (AvastWRC, _) {
    AvastWRC.YesNo = {
        init: function () {
            if (!(this.currentLanguageIsSupported() && this.rating[AvastWRC.Utils.getBrowserInfo().getBrowser()])) {
                this.setValue(0);
            } else {
                this.updateStoredValue();
            }
        },
        updateStoredValue: function () {
            let self = this;

            self.getValue().then((value) => {
                if (!value || (value && !value.value)) {
                    self.loadValue();
                    console.log("YesNo-> load value called");
                }else  if (value.value){
                    self.powerUserData = value;
                    self.powerUserData.ttl = this.getnewTtl(this.maxTtl);
                    AvastWRC.setStorage(self.keyName, JSON.stringify(self.powerUserData));
                    console.log("YesNo-> load value called but keep value=true from localstorage");            
                }
            });
        },
        getValue: function () {
            return new Promise((resolve, reject) => {
                AvastWRC.getStorage(this.keyName, function (value) {
                    resolve(JSON.parse(value));
                });
            });
        },
        isValidTtl: function (ttl) {
            var now = parseInt(new Date().getTime())/1000;
            return (ttl > now);
        },
        getnewTtl: function(ttl){
            var expireTime = parseInt(new Date().getTime())/1000 + parseInt(ttl);
            return expireTime;
        },
        loadValue: function () {
            let self = this;
            let serverCalls = [self.requestValueToServer(AvastWRC.CONFIG.GUID), self.requestValueToServer(AvastWRC.CONFIG.PLG_GUID)];

            Promise.all(serverCalls).then((serverCallResults) => self.setValue(Math.max(...serverCallResults)));
        },
        getTimesToShow: function () {
            var powerUserTtl = {};
            if(AvastWRC.Shepherd){
                powerUserTtl = AvastWRC.Shepherd.getPowerUserConfig();
            }
            var ttl = {
                first: (powerUserTtl && powerUserTtl.first) ? this.getnewTtl(powerUserTtl.first) : this.getnewTtl(1),
                second: (powerUserTtl && powerUserTtl.second) ? this.getnewTtl(powerUserTtl.second): true,
                third: (powerUserTtl && powerUserTtl.third) ? this.getnewTtl(powerUserTtl.third) : true,
            }
            return ttl;   
        },
        setValue: function (value) {
            let self = this;
            var defaultValue = {
                value: (value) ? true : false ,
                ttl: this.getnewTtl(this.maxTtl),
                userHasBeenAsked: false,
                userRejected: 0,
                timesToShow: self.getTimesToShow()
            };
            if(self.powerUserData && self.powerUserData.value){
                if(self.powerUserData.userHasBeenAsked){
                    defaultValue.value = false;
                }
                else if(self.powerUserData.userRejected && self.powerUserData.userRejected < 3){
                    defaultValue.value = true;
                    defaultValue.timesToShow = self.powerUserData.timesToShow;
                }
            }
            AvastWRC.setStorage(self.keyName, JSON.stringify(defaultValue));
            self.powerUserData = defaultValue;
            console.log(self.keyName + " has been updated");
        },
        requestValueToServer: function (id) {
            let self = this;

            return new Promise((resolve, reject) => {
                if (!id) resolve(false);

                AvastWRC.Query.YesNo.get().then((value) => resolve(value)).catch((error) => {
                    reject(false);
                    console.log("Error on updating " + self.keyName, error);
                });
            });
        },
        isUserLogged: function () {
            return new Promise((resolve, reject) => {
                let loggedResolution = this.rating[AvastWRC.Utils.getBrowserInfo().getBrowser()].loggedResolution;
                if (!loggedResolution) resolve(false);

                chrome.cookies.get({url: loggedResolution.domain, name: loggedResolution.key}, function (cookie) {
                    resolve(cookie);
                });
            });
        },
        isPowerUser: function () {
            if(!this.powerUserData.value || this.powerUserData.userHasBeenAsked || !this.isUserLogged()) return false;
            var now =  new Date().getTime();
            if(this.powerUserData.timesToShow.first != true && this.powerUserData.timesToShow.first < now
                || this.powerUserData.timesToShow.second != true && this.powerUserData.timesToShow.second < now
                || this.powerUserData.timesToShow.third != true && this.powerUserData.timesToShow.third < now) 
                return true;
            return false;
        },
        userHasBeenAsked: function () {
            let self = this;

            AvastWRC.getStorage(this.keyName, function (value) {
                let newValue = JSON.parse(value);
                newValue.userHasBeenAsked = true;
                newValue.timesToShow.first = true;
                newValue.timesToShow.second = true;
                newValue.timesToShow.third = true;
                newValue.userRejected = 3;
                self.powerUserData = newValue;
                AvastWRC.setStorage(self.keyName, JSON.stringify(newValue));
            });            
        },
        userReject: function () {
            let self = this;
            var now = new Date().getTime();
            AvastWRC.getStorage(this.keyName, function (value) {
                let newValue = JSON.parse(value);
                if(newValue.userRejected < 3){
                    if(self.powerUserData.timesToShow.first != true && self.powerUserData.timesToShow.first < now){
                        newValue.timesToShow.first = true;
                    }
                    else if(self.powerUserData.timesToShow.second != true && self.powerUserData.timesToShow.second < now){
                        newValue.timesToShow.second = true;
                    }
                    else if(self.powerUserData.timesToShow.third != true && self.powerUserData.timesToShow.third < now){
                        newValue.timesToShow.third = true;
                        newValue.userHasBeenAsked = true;
                    }
                    newValue.userRejected = newValue.userRejected + 1;
                    self.powerUserData = newValue;
                    AvastWRC.setStorage(self.keyName, JSON.stringify(newValue));
                }else{
                    newValue.userHasBeenAsked = true;
                    newValue.timesToShow.first = true;
                    newValue.timesToShow.second = true;
                    newValue.timesToShow.third = true;
                    newValue.userRejected = 3;
                    self.powerUserData = newValue;
                    AvastWRC.setStorage(self.keyName, JSON.stringify(newValue));
                }              
            });            
        },
        getRatingLink: function () {
            return this.rating[AvastWRC.Utils.getBrowserInfo().getBrowser()] && this.rating[AvastWRC.Utils.getBrowserInfo().getBrowser()].rateLinks[AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "AVAST" : "AVG"]
                .replace(new RegExp('__BROWSER_LANGUAGE__', 'g'), ABEK.locale.getBrowserLang());
        },
        currentLanguageIsSupported: function () {
            return this.ratingLanguagesSupported.indexOf(ABEK.locale.getBrowserLang()) >= 0;
        },
        getCurrentValue: function () {
          return !!this.powerUserData.value;
        },
        keyName: "YesNo",
        maxTtl: 86400,
        rating: {
            "CHROME": {
                rateLinks: {
                    "AVG": "https://chrome.google.com/webstore/detail/avg-safeprice/mbckjcfnjmoiinpgddefodcighgikkgn/reviews?hl=__BROWSER_LANGUAGE__",
                    "AVAST": "https://chrome.google.com/webstore/detail/avast-safeprice/eofcbnmajmjmplflapaojjnihcjkigck/reviews?hl=__BROWSER_LANGUAGE__"
                },
                loggedResolution: {
                    "domain": "https://accounts.google.com",
                    "key": "LSID"
                }
            },
            "FIREFOX": {
                rateLinks: {
                    "AVG": "https://addons.mozilla.org/__BROWSER_LANGUAGE__/firefox/addon/avg-safeprice/reviews/add",
                    "AVAST": "https://addons.mozilla.org/__BROWSER_LANGUAGE__/firefox/addon/avast-sp/reviews/add"
                },
                loggedResolution: {
                    "domain": "https://addons.mozilla.org",
                    "key": "api_auth_token"
                }
            },
            "OPERA": {
                rateLinks: {
                    "AVG": false,
                    "AVAST": "https://auth.opera.com/account/login?return_url=https://addons.opera.com/__BROWSER_LANGUAGE__/extensions/details/avast-safeprice/?display=__BROWSER_LANGUAGE__&service=addons"
                },
                loggedResolution: {
                    "domain": "https://addons.opera.com",
                    "key": "sessionid"
                }
            }
        },
        ratingLanguagesSupported: ["en", "fr", "de", "ru", "pt", "es"],
        powerUserData: {}
    };

    AvastWRC.bal.registerModule(AvastWRC.YesNo);

}).call(this, AvastWRC, _);

/*******************************************************************************
 *
 *  AvastWRC Uninstall Service
 *
 ********************************************************************************/
(function (AvastWRC, _) {
    AvastWRC.Uninstall = {
        setUninstallURL: function () {
            chrome.runtime.setUninstallURL(this.getUninstallURL(), function () {
                console.log("UninstallURL has been updated");
            });
        },
        getUninstallDataParameters: function () {
            return {
                action: this.config.defaultURLParameters.action,
                p_pro: this.config.defaultURLParameters.p_pro[AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "AVAST" : "AVG"],
                p_elm: this.config.defaultURLParameters.p_elm,
                p_lng: ABEK.locale.getBrowserLang(),
                p_lid: AvastWRC.bal.getLandingPageCode(ABEK.locale.getBrowserLang(), ABEK.locale.getBrowserLocale()),
                p_hid: AvastWRC.CONFIG.GUID || AvastWRC.CONFIG.PLG_GUID,
                p_eguid: AvastWRC.CONFIG.PLG_GUID,
                p_its: this.installationDateToMilliseconds(AvastWRC.CONFIG.InstallDate),
                p_cmp: AvastWRC.Shepherd.getCampaing().campaignId,
                p_vep: AvastWRC.CONFIG.VERSION.split(".")[0],
                p_ves: AvastWRC.CONFIG.VERSION.split(".")[1],
                p_vbd: AvastWRC.CONFIG.VERSION.split(".")[2]
            };
        },
        getUninstallURL: function () {
            let uninstallDataParameters = this.getUninstallDataParameters(), uninstallURL = "";

            for (let key in uninstallDataParameters) {
                uninstallURL = `${uninstallURL}&${key}=${uninstallDataParameters[key]}`;
            }

            return `${this.config.uninstallURL.replace("_LANG_", AvastWRC.bal.getLandingPageCode(ABEK.locale.getBrowserLang(), ABEK.locale.getBrowserLocale()))}${uninstallURL}`.replace("?&", "?");
        },
        /*
            @installationDate: input format 2018/0/22 16:22:14, output in milliseconds
         */
        installationDateToMilliseconds: function (installationDate) {
            let date = installationDate.split(" ")[0], time = installationDate.split(" ")[1];
            return (new Date(`${date.split("/")[0]}/${parseInt(date.split("/")[1]) + 1}/${date.split("/")[2]} ${time}`).getTime()).toString();
        },
        config: {
            uninstallURL: `https://ipm-provider.ff.${AvastWRC.bal.brandingType === AvastWRC.BRANDING_TYPE_AVAST ? "avast" : "avg"}.com:443/?`,
            defaultURLParameters: {
                action: 2,
                p_pro: {
                    AVAST: 43,
                    AVG: 72
                },
                p_elm: 298
            }
        }
    };

}).call(this, AvastWRC, _);

/*******************************************************************************
 *
 *  AvastWRC Recruitment
 *
 ********************************************************************************/
(function (AvastWRC, _) {
    AvastWRC.Recruitment = {
        init: function () {
            let self = this;

            AvastWRC.getStorage(self.config.localStorageKeyName, function (storedValue) {
                self.setStatus(storedValue);
                self.config.recruitmentConfig = AvastWRC.Shepherd.getRecruitmentConfig() || self.config.recruitmentConfig;
            });
        },
        isEnabled: function (country) {
            return this.recruitmentFeatureIsEnabled()
                && !this.userHasBeenAsked()
                && this.countryIsSupported(country)
                && this.currentLanguageIsSupported()
                && this.isPowerUser();
        },
        setStatus: function (value) {
            this.askedForRecruitment = value || false;

            AvastWRC.setStorage(this.config.localStorageKeyName, this.askedForRecruitment);
        },
        countryIsSupported: function (country) {
            return this.config.recruitmentConfig.supportedCountries.indexOf(country.toUpperCase()) >= 0;
        },
        currentLanguageIsSupported: function () {
            return this.config.recruitmentConfig.supportedLanguages.indexOf(ABEK.locale.getBrowserLang()) >= 0
        },
        getRecruitmentPage: function () {
            return this.config.recruitmentConfig.url;
        },
        userHasBeenAsked: function () {
          return this.askedForRecruitment;
        },
        recruitmentFeatureIsEnabled: function () {
            if (!this.config.recruitmentConfig) this.config.recruitmentConfig = AvastWRC.getRecruitmentConfig();

            return !!this.config.recruitmentConfig.state;
        },
        isPowerUser: function () {
            return AvastWRC.YesNo.getCurrentValue();
        },
        config: {
            localStorageKeyName: "__ASKED_FOR_RECRUITMENT__",
            recruitmentConfig: {
                supportedCountries: [],
                supportedLanguages: []
            }
        },
        askedForRecruitment: false
    };

    AvastWRC.bal.registerModule(AvastWRC.Recruitment);
}).call(this, AvastWRC, _);

/*******************************************************************************
 *
 *  AvastWRC Notifications Manager Service
 *
 ********************************************************************************/
(function (AvastWRC, _) {
    AvastWRC.NotificationsManager = {
        init: function () {
            let self = this;

            AvastWRC.getStorage(this.config.localStorageKey, function (data) {
                if (data) self.config.values = JSON.parse(data);
                self.config.serverConfig = self.getNotificationsConfig();
            });

        },
        getNotificationsConfig: function () {
            return AvastWRC.Shepherd.getNotificationsConfig() || this.config.serverConfig;
        },
        resolveCouponsNotify: function (tab, data) {
            this.resolve(this.resolvers.coupons, data)(tab, data);
        },
        resolveOffersNotification: function (tab, data) {
            this.resolve(this.resolvers.offers, data)(tab, data);
        },
        notifyCoupons: function (tab, data) {
            let message = this.getNotificationMessage(this.config.messages.injected.showCouponsNotification);

            AvastWRC.bs.accessContent(tab, {
                message: message,
                data: {
                    message: message,
                    replace: [data.detailsToClosed.offerNumber],
                    category: this.config.messages.injected.showCouponsNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showCouponsNotification.notificationCategoryFlag,
                    notificationType: this.getNotificationType(this.config.messages.injected.showCouponsNotification, message)
                }
            });
        },
        notifyOffers: function (tab, data) {
            let message = this.getNotificationMessage(this.config.messages.injected.showOffersNotification);

            AvastWRC.bs.accessContent(tab, {
                message: message,
                data: {
                    message: message,
                    replace: [data.detailsToClosed.offerNumber],
                    category: this.config.messages.injected.showOffersNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showOffersNotification.notificationCategoryFlag,                    
                    notificationType: this.getNotificationType(this.config.messages.injected.showOffersNotification, message)
                }
            });
        },
        notifyCouponsAndOffers: function (tab, data) {
            let message = this.getNotificationMessage(this.config.messages.injected.showOffersAndCouponsNotification);

            AvastWRC.bs.accessContent(tab, {
                message: message,
                data: {
                    message: message,
                    replace: [data.detailsToClosed.offerNumber],
                    category: this.config.messages.injected.showOffersAndCouponsNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showOffersAndCouponsNotification.notificationCategoryFlag,                    
                    notificationType: this.getNotificationType(this.config.messages.injected.showOffersAndCouponsNotification, message)
                }
            });
        },
        notifySimilarCoupons: function (tab, data) {
            let message = this.getNotificationMessage(this.config.messages.injected.showSimilarCouponsNotification);

            AvastWRC.bs.accessContent(tab, {
                message: message,
                data: {
                    message: message,
                    replace: [data.similarCouponsValue, data.similarCoupons[0].url],
                    category: this.config.messages.injected.showSimilarCouponsNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showSimilarCouponsNotification.notificationCategoryFlag,                    
                    notificationType: this.getNotificationType(this.config.messages.injected.showSimilarCouponsNotification, message)
                }
            });
        },
        notifyLoading: function (tab, data) {
            let message = this.getNotificationMessage(this.config.messages.injected.showLoadingNotification);

            AvastWRC.bs.accessContent(tab, {
                message: message,
                data: {
                    message: message,
                    category: this.config.messages.injected.showLoadingNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showLoadingNotification.notificationCategoryFlag,
                    notificationType: this.getNotificationType(this.config.messages.injected.showLoadingNotification, message)
                }
            });
            this.config.onlyInMemoryValues.loadingActive[data.urlDomain] = true;
        },
        cancelLoading: function (tab, data) {
            if (this.config.onlyInMemoryValues.loadingActive[data.urlDomain]) {
                this.config.onlyInMemoryValues.loadingActive[data.urlDomain] = false;
                let message = AvastWRC.NotificationsManager.config.messages.injected.cancelLoadingNotification;

                AvastWRC.bs.accessContent(tab, {
                    message: message,
                    data: {
                        message: message,
                    }
                });

                AvastWRC.bal.sp.setBadge(tab.id, data.detailsToClosed.offerNumber.toString(), true);
                //send event badge
                AvastWRC.bal.sp.badgeHighlighted(tab.id, tab.url, data.transactionId);

            }
        },
        blinkIcon: function (tab, data) {
            console.log("blinkIcon no notifications available")
            AvastWRC.bal.sp.setBadge(tab.id, data.detailsToClosed.offerNumber.toString(), true);
            //send event badge
            AvastWRC.bal.sp.badgeHighlighted(tab.id, tab.url, data.transactionId);
        },
        notifyCityHotels: function (tab, data) {
            let message = this.getNotificationMessage(this.config.messages.injected.showCityHotelsNotification);

            AvastWRC.bs.accessContent(tab, {
                message: message,
                data: {
                    message: message,
                    replace: [data.cityName, data.detailsToClosed.offerNumber],
                    category: this.config.messages.injected.showCityHotelsNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showCityHotelsNotification.notificationCategoryFlag,
                    notificationType: this.getNotificationType(this.config.messages.injected.showCityHotelsNotification, message)
                }
            });
        },
        notifySimilarHotels: function (tab, data) {
            let message = this.getNotificationMessage(this.config.messages.injected.showSimilarHotelsNotification);

            AvastWRC.bs.accessContent(tab, {
                message: message,
                data: {
                    message: message,
                    replace: [data.detailsToClosed.offerNumber],
                    category: this.config.messages.injected.showSimilarHotelsNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showSimilarHotelsNotification.notificationCategoryFlag,
                    notificationType: this.getNotificationType(this.config.messages.injected.showSimilarHotelsNotification, message)
                }
            });
        },
        notifyRedirect: function (tab, data) {
            let message = this.getNotificationMessage(this.config.messages.injected.showRedirectNotification);

            AvastWRC.bs.accessContent(tab, {
                message: message,
                data: _.extend(this.addNotifyData(data, message), {
                    category: this.config.messages.injected.showRedirectNotification.notificationCategory,
                    notificationCategoryFlag: this.config.messages.injected.showRedirectNotification.notificationCategoryFlag,                    
                    notificationType: this.getNotificationType(this.config.messages.injected.showRedirectNotification, message),
                    replace: [1]
                })
            });
        },
        getTemplateData: function () {
            return {
                strings: AvastWRC.bal.utils.loadLocalizedStrings({}, this.config.template.strings),
                images: AvastWRC.bal.utils.getLocalImageURLs({}, this.config.template.images),
                animations: AvastWRC.bal.utils.getLocalImageURLs({}, this.config.template.animations)
            };
        },
        addNotifyData: function (originalData, message) {
            let originalDataCopy = JSON.parse(JSON.stringify(originalData));
            originalDataCopy.templateData = {
                strings: AvastWRC.bal.utils.loadLocalizedStrings({}, this.config.template.strings),
                images: AvastWRC.bal.utils.getLocalImageURLs({}, this.config.template.images)
            };

            originalDataCopy.message = message;

            return originalDataCopy;

        },
        isTimeForRedirect: function (data) {
            let currentTimeInMilliseconds = (new Date()).getTime(),
                redirectUrl = data.redirect[0].url,
                redirectTTLIsValid = (currentTimeInMilliseconds - this.getTTLForRedirectUrl(redirectUrl)) >= (this.config.serverConfig.redirectTTL * 1000);
            console.log("referrer: "+ data.referrer);
            if (redirectTTLIsValid) this.updateRedirectTTL(redirectUrl, currentTimeInMilliseconds);

            return redirectTTLIsValid;
        },
        getTTLForRedirectUrl: function (domain) {
            return this.config.values.redirectTTL[domain] || 0;
        },
        updateRedirectTTL: function (url, dateInMilliseconds) {
            this.config.values.redirectTTL[url] = dateInMilliseconds;
            this.cleanRedirectUrlTTl();
            this.saveValues();
        },
        cleanRedirectUrlTTl: function () {
            let currentTimeInMilliseconds = (new Date()).getTime();

            for (let key in  this.config.values.redirectTTL) {
                if ((currentTimeInMilliseconds - this.config.values.redirectTTL[key]) >= (this.config.serverConfig.redirectTTL * 1000)) delete this.config.values.redirectTTL[key];
            }
        },
        saveValues: function () {
            AvastWRC.setStorage(this.config.localStorageKey, JSON.stringify(this.config.values));
        },
        resolve: function (resolvers, data) {
            let notifier = resolveRecursive(resolvers, data);

            return notifier.found ? notifier.action() : (() => undefined);

            function resolveRecursive(resolvers, data, feedback = {found: false}) {
                for (let key in resolvers) {
                    if (feedback.found) return feedback;

                    if (resolvers[key].resolver()(data)) {
                        if (!resolvers[key].resolvers) {
                            return {
                                found: true,
                                action: resolvers[key].action
                            };
                        } else {
                            feedback = resolveRecursive(resolvers[key].resolvers, data);
                        }
                    }
                }

                return feedback;
            }
        },
        disableNotificationsForDomain: function (domain) {
            if (this.config.onlyInMemoryValues.domainsBlackList.indexOf(domain) < 0) this.config.onlyInMemoryValues.domainsBlackList.push(domain);
        },
        disableCategoryForDomain: function (domain, cateogry) {
            var cateogryFlag = this.config.onlyInMemoryValues.categoriesBlackListedOnDomain[domain] || 0;

            this.config.onlyInMemoryValues.categoriesBlackListedOnDomain[domain] = cateogryFlag + cateogry;
        },
        isCategoryAvailableForDomain: function (domain, cateogry) {
            var cateogryFlag = this.config.onlyInMemoryValues.categoriesBlackListedOnDomain[domain] || 0;
            
            if( (cateogryFlag & cateogry) == cateogry){
                
                console.log("Blocked category: " + cateogry + " Returned: notAvailableForDomain");
                return false;

            }else{
                console.log("Not blocked category: " + cateogry + " Returned: availableForDomain");                
                return true;
            }
        },
        disableCouponsForDomain: function (domain) {
            if (!AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.coupons.item2Selected) {
                this.config.values.domainsWhereCouponsHaveBeenShowed = [];
            } else {
                if (this.config.values.domainsWhereCouponsHaveBeenShowed.indexOf(domain) < 0) this.config.values.domainsWhereCouponsHaveBeenShowed.push(domain)
            }

            this.saveValues();
        },
        couponHaveBeenShowedInDomain: function (data) {
            return (!AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.coupons.item2Selected)
                || (this.config.values.domainsWhereCouponsHaveBeenShowed.indexOf(data.urlDomain || AvastWRC.bal.getDomainFromUrl(data.url)) >= 0);
        },
        barNotificationsAreEnabled: function () {
            return this.config.serverConfig.notificationType.bar;
        },
        getNotificationMessage: function (messageKey) {
            if (this.notificationsAreMinimized()) {
                return AvastWRC.NotificationsManager.config.messages.injected.showMinimizedNotifications;
            } else if (this.barNotificationsAreEnabled()) {
                return messageKey.bar;
            } else {
                return messageKey.standard;
            }
        },
        notificationsAreMinimized: function () {
            return this.config.serverConfig.notificationType.minimized || this.config.onlyInMemoryValues.minimized;
        },
        notificationsAvailable: function (data = {}) {
            return (AvastWRC.NotificationsManager.config.onlyInMemoryValues.domainsBlackList.indexOf(data.urlDomain || AvastWRC.bal.getDomainFromUrl(data.url)) < 0)
                && (!AvastWRC.NotificationsManager.config.serverConfig.notificationType.none) && !data.isDomainInSettingsWhiteList;
        },
        setMinimized: function (value) {
            this.config.onlyInMemoryValues.minimized = value;
        },
        getNotificationType: function (element, message) {
            return element.standard === message ? this.config.notificationType.standard : this.config.notificationType.bar;
        },
        resolvers: {
            coupons: {
                notificationsAvailable: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.notificationsAvailable),
                    resolvers: {
                        redirectIsAvailable: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.redirectIsAvailable),
                            resolvers: {
                                isRedirect: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isRedirect),
                                    action: (() => AvastWRC.NotificationsManager.notifyRedirect.bind(AvastWRC.NotificationsManager))
                                },
                            }
                        },
                        couponsAreAvailable: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.couponsAreAvailable),
                            resolvers: {
                                isOnlyCoupons: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isOnlyCoupons),
                                    action: (() => AvastWRC.NotificationsManager.notifyCoupons.bind(AvastWRC.NotificationsManager))
                                },
                                isSimilarCoupon: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isOnlySimilarCoupon),
                                    action: (() => AvastWRC.NotificationsManager.notifySimilarCoupons.bind(AvastWRC.NotificationsManager))
                                },
                                isNotMinimized: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.notificationsAreNotMinimized),
                                    resolvers: {
                                        isLoading: {
                                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isLoading),
                                            action: (() => AvastWRC.NotificationsManager.notifyLoading.bind(AvastWRC.NotificationsManager))
                                        }
                                    }
                                },
                            }
                        }
                    }
                },
            },
            offers: {
                notificationsAvailable: {
                    resolver: (() => AvastWRC.NotificationsManager.resolvers.notificationsAvailable),
                    resolvers: {
                        offersAreAvailable: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.offersAreAvailable),
                            resolvers: {
                                isProductsOrAccommodations: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isProductsOrAccommodations),
                                    resolvers: {
                                        couponsAreAvailable: {
                                            resolver: (() => AvastWRC.NotificationsManager.resolvers.couponsAreAvailable),
                                            resolvers: {
                                                isCoupons: {
                                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isCouponsAndOffers),
                                                    action: (() => AvastWRC.NotificationsManager.notifyCouponsAndOffers.bind(AvastWRC.NotificationsManager))
                                                }
                                            }
                                        },
                                        isProducts: {
                                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isProductsPriceComparison),
                                            action: (() => AvastWRC.NotificationsManager.notifyOffers.bind(AvastWRC.NotificationsManager))
                                        },
                                        isHotelsPriceComparison: {
                                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isHotelsPriceComparison),
                                            action: (() => AvastWRC.NotificationsManager.notifyOffers.bind(AvastWRC.NotificationsManager))
                                        },
                                        isCityHotel: {
                                            resolver: (() => AvastWRC.NotificationsManager.resolvers.isCityHotel),
                                            action: (() => AvastWRC.NotificationsManager.notifyCityHotels.bind(AvastWRC.NotificationsManager))
                                        },
                                        isSimilarHotels: {
                                            resolver: (() => AvastWRC.NotificationsManager.resolvers.hotelsSimilar),
                                            action: (() => AvastWRC.NotificationsManager.notifySimilarHotels.bind(AvastWRC.NotificationsManager))
                                        }
                                    }
                                }
                            }
                        },
                        couponsAreAvailable: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.couponsAreAvailable),
                            resolvers: {
                                isCoupons: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isOnlyCouponsAfterOffersRequest),
                                    action: (() => AvastWRC.NotificationsManager.notifyCoupons.bind(AvastWRC.NotificationsManager))
                                },
                                isSimilarCoupon: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.isSimilarCoupon),
                                    action: (() => AvastWRC.NotificationsManager.notifySimilarCoupons.bind(AvastWRC.NotificationsManager))
                                },
                                cancelLoading: {
                                    resolver: (() => AvastWRC.NotificationsManager.resolvers.cancelLoading),
                                    action: (() => AvastWRC.NotificationsManager.cancelLoading.bind(AvastWRC.NotificationsManager))
                                }
                            }                            
                        },
                        blinkIcon: {
                            resolver: (() => AvastWRC.NotificationsManager.resolvers.blinkIcon),
                            action: (() => AvastWRC.NotificationsManager.blinkIcon.bind(AvastWRC.NotificationsManager))
                        }                 
                    }
                },
            },
            isRedirect: function (data) {
                return data && data.redirectLength && AvastWRC.NotificationsManager.isTimeForRedirect(data);
            },
            isOnlyCoupons: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showCouponsNotification.notificationCategoryFlag;
                return AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag) 
                    && data.onlyFirstRequest && AvastWRC.NotificationsManager.resolvers.isCoupons(data);
            },
            isOnlyCouponsAfterOffersRequest: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showCouponsNotification.notificationCategoryFlag;
                return AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag) 
                    && AvastWRC.NotificationsManager.resolvers.isCoupons(data);
            },
            isCoupons: function (data) {
                return data && data.couponsLength;
            },
            isCouponsAndOffers: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showOffersAndCouponsNotification.notificationCategoryFlag;
                return AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag) 
                    && AvastWRC.NotificationsManager.resolvers.isCoupons(data) && AvastWRC.NotificationsManager.resolvers.isProductsOrAccommodations(data)
            },
            isLoading: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showLoadingNotification.notificationCategoryFlag;
                return AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag) 
                    && data && data.couponsLength;
            },
            cancelLoading: function(data){
                return AvastWRC.NotificationsManager.config.onlyInMemoryValues.loadingActive[data.urlDomain];
            },
            blinkIcon : function(data){
                return true;
            },
            isProducts: function (data) {
                return  data && data.producstLength;
            },
            isProductsPriceComparison: function (data){
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showOffersNotification.notificationCategoryFlag;
                return AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag) 
                    && AvastWRC.NotificationsManager.resolvers.isProducts(data);
            },
            isAccommodations: function (data) {
                return data && data.accommodationsLength;
            },
            isProductsOrAccommodations: function (data) {
                return AvastWRC.NotificationsManager.resolvers.isProducts(data) || AvastWRC.NotificationsManager.resolvers.isAccommodations(data);
            },
            isCityHotel: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showCityHotelsNotification.notificationCategoryFlag;
                return AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag) 
                    && data && data.cityHotelLength && data.cityName;
            },
            notificationsAvailable: function (data) {
                return AvastWRC.NotificationsManager.notificationsAvailable(data);
            },
            couponsAreAvailable: function (data) {
                return (AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.coupons.item1Selected)
                    || !(AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.coupons.item3Selected || AvastWRC.NotificationsManager.couponHaveBeenShowedInDomain(data));
            },
            isOnlySimilarCoupon: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showSimilarCouponsNotification.notificationCategoryFlag;
                return AvastWRC.NotificationsManager.resolvers.isSimilarCoupon(data) && data.onlyFirstRequest;
            },
            isSimilarCoupon: function (data) {
                var categoryFlagForSimilarCoupons = AvastWRC.NotificationsManager.config.messages.injected.showSimilarCouponsNotification.notificationCategoryFlag;
                var categoryFlagForCoupons = AvastWRC.NotificationsManager.config.messages.injected.showCouponsNotification.notificationCategoryFlag;
                return AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlagForSimilarCoupons) 
                    && (AvastWRC.NotificationsManager.resolvers.couponsAreAvailable(data)
                    && (!AvastWRC.NotificationsManager.resolvers.isCoupons(data) || !AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlagForCoupons))
                    && (data && data.similarCouponsValue));
            },
            offersAreAvailable: function (data) {
                return data.showOffersNotification;
            },
            redirectIsAvailable: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showRedirectNotification.notificationCategoryFlag;
                return AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag) 
                    && AvastWRC.bal.settings.get().userSPPoppupSettings.notifications.others.item1Selected;
            },
            notificationsAreNotMinimized: function (data) {
                return !AvastWRC.NotificationsManager.notificationsAreMinimized();
            },
            isHotelsPriceComparison: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showOffersNotification.notificationCategoryFlag;
                return AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag) 
                    && data && data.priceComparisonLength;
            },
            hotelsSimilar: function (data) {
                var categoryFlag = AvastWRC.NotificationsManager.config.messages.injected.showSimilarHotelsNotification.notificationCategoryFlag;
                return AvastWRC.NotificationsManager.isCategoryAvailableForDomain(data.urlDomain, categoryFlag) 
                    && data && data.similarHoteLength;
            }
        },
        config: {
            messages: {
                background: {},
                injected: {
                    showOffersNotification: {
                        standard: "showOffersNotification",
                        bar: "showOffersBarNotification",
                        notificationCategory: "OFFERS",
                        notificationCategoryFlag: 2 // bitmask value
                    },
                    showCouponsNotification: {
                        standard: "showCouponsNotification",
                        bar: "showCouponsBarNotification",
                        notificationCategory: "COUPONS",
                        notificationCategoryFlag: 4 // bitmask value
                    },
                    showOffersAndCouponsNotification: {
                        standard: "showOffersAndCouponsNotification",
                        bar: "showOffersAndCouponsBarNotification",
                        notificationCategory: "OFFERS_AND_COUPONS",
                        notificationCategoryFlag: 8 // bitmask value
                    },
                    showSimilarCouponsNotification: {
                        standard: "showSimilarCouponsNotification",
                        bar: "showSimilarCouponsBarNotification",
                        notificationCategory: "SIMILAR_COUPONS",
                        notificationCategoryFlag: 16 // bitmask value
                    },
                    showLoadingNotification: {
                        standard: "showLoadingNotification",
                        bar: "showLoadingBarNotification",
                        notificationCategory: "DEAL_SEARCH",
                        notificationCategoryFlag: 32 // bitmask value
                    },
                    showRedirectNotification: {
                        standard: "showRedirectNotification",
                        bar: "showRedirectBarNotification",
                        notificationCategory: "SPECIAL_DEALS",
                        notificationCategoryFlag: 64 // bitmask value
                    },
                    showCityHotelsNotification: {
                        standard: "showCityHotelsNotification",
                        bar: "showCityHotelsBarNotification",
                        notificationCategory: "POPULAR_HOTELS",
                        notificationCategoryFlag: 128 // bitmask value
                    },
                    showSimilarHotelsNotification: {
                        standard: "showSimilarHotelsNotification",
                        bar: "showSimilarHotelsBarNotification",
                        notificationCategory: "ALTERNATIVE_HOTELS",
                        notificationCategoryFlag: 256 // bitmask value
                    },
                    showMinimizedNotifications: "showMinimizedNotifications",
                    cancelLoadingNotification: "cancelLoadingNotification"
                }
            },
            template: {
                strings: [
                    "spLoadingNotificationMessage", "spCouponsNotificationMessage",
                    "spBetterOffersNotificationMessage", "spOffersAndCouponsNotificationMessage",
                    "spBetterSpecialDealsNotificationMessage", "spShowNotificationMessage",
                    "spShowNotificationRedirectMessage", "spNotificationRedirectShowRedirectMessage",
                    "spNotificationRedirectShowMoreMessage", "spNotificationRedirectShowLessMessage",
                    "spLoadingNotificationDescriptionMessage", "spCityHotelNotificationMessage",
                    "spSimilarHotelsNotificationMessage", "spBetterOffersNotificationBarMessage",
                    "spBetterSpecialDealsNotificationBarMessage"
                ],
                images: {
                    loadingGIF: "Anim-loading.gif",
                    loadingNotificationLogo: "logo-safeprice-48.png",
                    loadingNotificationGear: "settings-icon.png",
                    loadingNotificationClose: "close-icon-copy-8.png",
                    shape: "shape.png",
                    hotelsPanel: "Hotels-Vertical.gif",
                    couponsPanel: "Coupons-Vertical.gif",
                    moreOffersPanel: "Offers-Vertical.gif",
                    offersAndCouponsPanel: "Offers-Coupons-Vertical.gif",
                    specialDealsPanel: "Special-Vertical.gif",
                    hotelsBar: "Hotels-Horizontal.gif",
                    couponsBar: "Coupons-Horizontal.gif",
                    offersAndCouponsBar: "Deals-Coupons-Horizontal.gif",
                    specialDealsBar: "Special-Deals-Horizontal.gif",
                    searching: "Anim-Search-Horizontal.gif",
                    info: "icon-info.png",
                    arrow: "arrow.png",
                    moreOffersBar: "Deals-Horizontal.gif"
                },
                animations: {
                    couponsPanel: "Anim-Coupons-Vertical.gif",
                    betterOffersPanel: "Anim-Offers-Vertical.gif",
                    offersAndCouponsPanel: "Anim-Offers-Coupons-Vertical.gif",
                    specialDealsPanel: "Anim-Special-Vertical.gif",
                    hotelsPanel: "Anim-Hotels-Vertical.gif",
                    moreOffersBar: "Anim-Deals-Horizontal.gif",
                    hotelsBar: "Anim-Hotels-Horizontal.gif",
                    couponsBar: "Anim-Coupons-Horizontal.gif",
                    offersAndCouponsBar: "Anim-Deals-Coupons-Horizontal.gif",
                    specialDealsBar: "Anim-Special-Deals-Horizontal.gif",
                }
            },
            values: {
                redirectTTL: {},
                domainsWhereCouponsHaveBeenShowed: []
            },
            serverConfig: {
                notificationType: {
                    standard: true,
                    bar: false,
                    minimized: false,
                    none: false
                },
                redirectTTL: 864000
            },
            onlyInMemoryValues: {
                domainsBlackList: [],
                categoriesBlackListedOnDomain: [],
                minimized: false,
                loadingActive: []
            },
            notifications: {
                minimized: false
            },
            localStorageKey: "__NOTIFICATIONS__",
            notificationType: {
                standard: "NOTIFICATIONS",
                bar: "NOTIFICATIONS_BAR"
            }
        }
    };

    AvastWRC.bal.registerModule(AvastWRC.NotificationsManager);
}).call(this, AvastWRC, _);

    var browserAppBase = {};
    browserAppBase.blockedShops = {};
    browserAppBase.cj = {};

    /* 
    list of CJ domains which we use to detect CJ redirects
    */
    browserAppBase.cj.domains = {
        "anrdoezrs.net": 1,
        "kqzyfj.com": 1,
        "jdoqocy.com": 1,
        "tkqlhce.com": 1,
        "dpbolvw.net": 1
    };

    /* 
    object which we use to keep track of CJ redirect chain
    */
    browserAppBase.cj.redirectColl = {};

    /* 
    object which we use to ignore CJ redirects coming from comprigo domains
     ***IF CJ REDIRECT COMES FROM COMPRIGO DOMAIN, WE MUST NOT BLOCK COUPONS FORTHAT SHOP*** 
     if we didn't have this, extension would block itself from displaying couponson a shop 
     when user clicks on a coupon in extension
     */
    browserAppBase.cj.redirectIgnore = {};

    /* 
    here we track CJ redirect chain first, we are interested in catching redirect 
    from one of CJ domains from our list above when that happens we keep track of further 
    redirects by keeping redirect chain in memory until final redirect
    */

    chrome.webRequest.onBeforeRedirect.addListener(function (details) {
        // URL which is doing redirect, without protocol
        var currentURI = details.url.replace(/^https?:/i, '');
        // URL to which redirect is being made, without protocol
        var rdURI = details.redirectUrl.replace(/^https?:/i, '');
        // remove redirect from ignore list if it has been placed there earlier
        if (browserAppBase.cj.redirectIgnore[currentURI]) {
            delete browserAppBase.cj.redirectIgnore[currentURI];
            return;    
        }
        // if URL which is doing redirect should be tracked, replace it with next URL which should be tracked
        if (browserAppBase.cj.redirectColl[currentURI]) {
            delete browserAppBase.cj.redirectColl[currentURI];
            browserAppBase.cj.redirectColl[rdURI] = 1;
            return;    
        }

        // split URL which is doing redirect into parts to get protocol and domain
        var urlSplit = details.url.split('/');

        // ignore non-HTTP(s) URLs
        if (!(urlSplit[0] === 'http:' || urlSplit[0] === 'https:')) {
            return;    
        }

        // split domain into parts
        var domainSplit = urlSplit[2].split('.');

        /*     
        check if domain contains "comprigo"     
        this is where we detect if redirect is coming from comprigo domain 
        */

        if (domainSplit.indexOf('comprigo') > -1) {
            // split URL to which redirect is being made
            var rdUrlSplit = details.redirectUrl.split('/');
            // ignore non-HTTP(s) URLs
            if (!(rdUrlSplit[0] === 'http:' || rdUrlSplit[0] === 'https:')) {
                return;
            }

            /* 
            detect if domain to which redirect is being made is CJ domain
            if so, put it to ignore list as it's CJ redirect coming fromcomprigo        
            */
    
            var rdDomainSplit = rdUrlSplit[2].split('.');

            while (rdDomainSplit.length > 1) {
                if (browserAppBase.cj.domains[rdDomainSplit.join('.')]) {
                    browserAppBase.cj.redirectIgnore[rdURI] = 1;
                    break;            
                } else {
                    rdDomainSplit.splice(0, 1);            
                }        
            }
            return;    
        }

        /* 
        detect if domain to which redirect is being made is CJ domain
        if so, add URL to which redirect is being made to redirectColl in order to 
        catch next redirect from that URL    
        */
        
        while (domainSplit.length > 1) {
            if (browserAppBase.cj.domains[domainSplit.join('.')]) {
                browserAppBase.cj.redirectColl[rdURI] = 1;
                break;        
            } else {            
                domainSplit.splice(0, 1);        
            }    
        }

    }, { urls: ["<all_urls>"] });

    // here we detect final page where user lands as it doesn't produce redirects so it's not caught by previous code
    chrome.webRequest.onResponseStarted.addListener(function (details) {
        var currentURI = details.url.replace(/^https?:/i, '');
            // check if response is coming from tracked redirect
        if (browserAppBase.cj.redirectColl[currentURI]) {
                // prevent redirects from being detected as final landing pages
            var finalURL = true;
            for (var hInt = 0; hInt < details.responseHeaders.length; hInt++) {
                if (/location/im.test(details.responseHeaders[hInt].name)) {                
                    finalURL = false;
                    break;            
                }        
            }
                /*         
                if this is final landing page of redirect, add it to blocked shops container         
                ++ when a user goes to some website, first, extension must check if domain of that website is in blocked shops list         
                ++ if so, extension should not function on that website         
                ++ further, shop should be removed from the list after 24h (thatcode is not implemented here)        
                */
            if (finalURL) {
                delete browserAppBase.cj.redirectColl[currentURI];
                var domainToBlock = currentURI.split('/')[2];            
                browserAppBase.blockedShops[domainToBlock] = Date.now();      
            }    
        }
    }, { 
        urls: ["<all_urls>"] 
    }, ['responseHeaders']);

    AvastWRC.bs.comprigoASdetector ={
        isBolcked(url) {
            var currentURI = url.replace(/^https?:/i, '');
            currentURI = currentURI.split('/')[2]; 
            var date = browserAppBase.blockedShops[currentURI];
            if(date){
                if(date){
                    return true;
                }
                else {
                    delete browserAppBase.blockedShops[url];
                    return false;
                }
            }
            return false;
            
        }
    }; 

