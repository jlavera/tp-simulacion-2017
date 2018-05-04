(function(AvastWRC, PROTO) {

  function gpbType (id, multilicity, typeFunc) {
    return {
        options: {},
        multiplicity: multilicity || PROTO.optional,
        type: typeFunc,
        id: id
    };
  }

  /* GPB Definition helper */ 
  GPBD = {
    bytes : function (id, repeated) {
      return gpbType(id, repeated, function() { return PROTO.bytes; } );
    },
    string : function (id, repeated) {
      return gpbType(id, repeated, function() { return PROTO.string; } );
    },
    bool : function (id, repeated) {
      return gpbType(id, repeated, function() { return PROTO.bool; } );
    },
    sint32 : function (id, repeated) {
      return gpbType(id, repeated, function() { return  PROTO.sint32; } );
    },
    sint64 : function (id, repeated) {
      return gpbType(id, repeated, function() { return  PROTO.sint64; } );
    },
    int32 : function (id, repeated) {
      return gpbType(id, repeated, function() { return  PROTO.int32; } );
    },
    int64 : function (id, repeated) {
      return gpbType(id, repeated, function() { return  PROTO.int64; } );
    },
    Double : function (id, repeated) {
      return gpbType(id, repeated, function() { return  PROTO.Double; } );
    },
    cType : gpbType
  };


  AvastWRC.gpb = {};

  AvastWRC.gpb.All = PROTO.Message("AvastWRC.gpb.All", {

    LocalServerRequest : PROTO.Message("AvastWRC.gpb.All.LocalServerRequest", {

      BrowserType: PROTO.Enum("AvastWRC.gpb.All.LocalServerRequest.BrowserType", {
          INVALID :0,
          IE :1,
          FIREFOX :2,
          CHROME :3,
          OPERA :4,
          SAFARI :5
      }),

      CommandType: PROTO.Enum("AvastWRC.gpb.All.LocalServerRequest.CommandType", {
          ACKNOWLEDGEMENT :1,
          SET_PROPERTY :3,
          SITECORRECT :4,
          SITECORRECT_STATISTICS :5,
          IS_SAFEZONE_AVAILABLE :6,
          SWITCH_TO_SAFEZONE :7,
          LOG_MESSAGE :9,
          GET_GUIDS :10,
          GET_PROPERTIES :11,
          IS_BANKING_SITE :12,
          IS_SAFEZONE_CUSTOM_SITE :13,
          SET_PROPERTIES : 14
      }),

      type:    GPBD.cType(1, PROTO.optional, function(){return AvastWRC.gpb.All.LocalServerRequest.CommandType;} ),
      params:  GPBD.bytes(2, PROTO.repeated),
      browser: GPBD.cType(3, PROTO.optional, function(){return AvastWRC.gpb.All.LocalServerRequest.BrowserType;} )
    }),

    LocalServerResponse : PROTO.Message("AvastWRC.gpb.All.LocalServerResponse", {
      result: GPBD.bytes(1, PROTO.repeated),
      error:  GPBD.bytes(2),
    })

  });

  /*******************************************************************************
   * UrlInfo > Identity 
   ******************************************************************************/
  AvastWRC.gpb.All.BrowserType = PROTO.Enum("AvastWRC.gpb.All.BrowserType", {
      //(also used by burger events to identify the browser type)
      CHROME : 0,
      FIREFOX : 1,
      IE : 2,
      OPERA : 3,
      SAFARI : 4,
      PRODUCTS : 5,
      VIDEO: 6,
      STOCK : 7,
      STOCK_JB : 8,
      DOLPHIN_MINI : 9,
      DOLPHIN : 10,
      SILK : 11,
      BOAT_MINI : 12,
      BOAT : 13,
      CHROME_M : 14,
      MS_EDGE : 15,
      AVAST : 16
  });

  AvastWRC.gpb.All.OS = PROTO.Enum("AvastWRC.gpb.All.OS", {
      WIN : 1,
      MAC : 2,
      LINUX : 3,
      ANDROID : 4,
      IOS : 5
  });

  AvastWRC.gpb.All.ExtensionType = PROTO.Enum("AvastWRC.gpb.All.ExtensionType", {
      //(also used by burger events to identify the extension type)
      AOS :  1,
      SP :   2,
      AOSP : 3,                  // AOS + SP
      ABOS : 4                   // Avast Business Online Security
  });

  AvastWRC.gpb.All.Identity = PROTO.Message("AvastWRC.gpb.All.Identity",{
      guid:   GPBD.bytes(1),
      uuid :  GPBD.bytes(2),
      token : GPBD.bytes(3),
      auid :  GPBD.bytes(4),
      browserType :    GPBD.cType(5, PROTO.optional, function() { return  AvastWRC.gpb.All.BrowserType; } ),
      token_verified : GPBD.sint32(6),
      ip_address :     GPBD.bytes(7),
      userid :         GPBD.bytes(8),
      browserVersion : GPBD.string(9),
      hwid :  GPBD.bytes(11)      
  });


  /*******************************************************************************
   * UrlInfo > UrlInfo
   ******************************************************************************/
  AvastWRC.gpb.All.UrlInfo = PROTO.Message("AvastWRC.gpb.All.UrlInfo",{
      webrep :   GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.WebRep; } ),
      phishing : GPBD.cType(2, PROTO.optional, function() { return AvastWRC.gpb.All.PhishingNew; } ),
      blocker :  GPBD.cType(3, PROTO.optional, function() { return AvastWRC.gpb.All.Blocker; } ),
      typo :     GPBD.cType(4, PROTO.optional, function() { return AvastWRC.gpb.All.Typo; } ),
      safeShop : GPBD.cType(5, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShop; } ),
      ajax : GPBD.cType(7, PROTO.optional, function() { return AvastWRC.gpb.All.Ajax; } )
  });

  AvastWRC.gpb.All.EventType = PROTO.Enum("AvastWRC.gpb.All.EventType",{
      CLICK : 0,
      FRESHOPEN : 1,
      REOPEN : 2,
      TABFOCUS: 3,
      SERVER_REDIRECT: 4,
      AJAX: 5,                        // captured AJAX requests
      TABCLOSE: 6,                    // special event when tab is closed
      WINDOWCLOSE: 7,                 // special event when window is closed
  });

  AvastWRC.gpb.All.EventType2 = PROTO.Enum("AvastWRC.gpb.All.EventType2",{
      NULL_EVENT: 0,
      CLICK : 1,
      FRESHOPEN : 2,
      REOPEN : 3,
      TABFOCUS: 4,
      SERVER_REDIRECT: 5,
      CLICK_SP: 6
  });

  AvastWRC.gpb.All.OriginType = PROTO.Enum("AvastWRC.gpb.All.OriginType", {
      LINK: 0,
      ADDRESSBAR: 1,
      BOOKMARK: 2,
      SEARCHWINDOW: 3,
      JAVASCRIPT: 4,
      REDIRECT: 5,
      HOMEPAGE: 6,
      RELOAD: 7,
      STEPBACK: 8,
      OTHER: 9999
  });

  AvastWRC.gpb.All.RatingLevel = PROTO.Enum("AvastWRC.gpb.All.RatingLevel", {
      GOOD: 1,
      AVERAGE: 2
  });

  AvastWRC.gpb.All.Origin = PROTO.Message("AvastWRC.gpb.All.Origin", {
      origin: GPBD.cType(1, PROTO.optional, function () { return AvastWRC.gpb.All.OriginType; }),
      hash: GPBD.int32(2)
  });

  AvastWRC.gpb.All.KeyValue = PROTO.Message("AvastWRC.gpb.All.KeyValue", {
      key: GPBD.string(1),
      value: GPBD.string(2)
  });

  /*******************************************************************************
   * UrlInfo > UrlInfoRequest
   ******************************************************************************/
  AvastWRC.gpb.All.UrlInfoRequest = PROTO.Message("AvastWRC.gpb.All.UrlInfoRequest", {

      Request : PROTO.Message("AvastWRC.gpb.All.UrlInfoRequest.Request", {
          uri:      GPBD.string(1, PROTO.repeated),
          callerid: GPBD.sint32(2),
          locale:   GPBD.string(3),
          apikey:   GPBD.bytes(4),
          identity: GPBD.cType(5, PROTO.optional, function() { return AvastWRC.gpb.All.Identity; } ),
          visited:  GPBD.bool (6),
          udpateRequest: GPBD.cType(7, PROTO.optional, function() { return AvastWRC.gpb.All.UpdateRequest; } ),
          requestedServices: GPBD.sint32(8),
          customKeyValue: GPBD.cType(9, PROTO.repeated, function () { return AvastWRC.gpb.All.KeyValue; }),
          referer :     GPBD.string(10),
          windowNum :   GPBD.sint32(11),
          tabNum :      GPBD.sint32(12),
          windowEvent : GPBD.cType(13, PROTO.optional, function(){return  AvastWRC.gpb.All.EventType;} ),
          origin:       GPBD.cType(14, PROTO.optional, function () { return AvastWRC.gpb.All.OriginType; }),
          dnl:          GPBD.bool (15),
          // fullUris: GPBD.string (16, PROTO.repeated),
          safeShop:     GPBD.int64(17),
          // -1 = opt-out,
          // 0 = opt-in, it is not in cache,
          // >0 = timestamp of the cached item
          client: GPBD.cType(18, PROTO.optional, function () { return AvastWRC.gpb.All.Client; }),
          originHash: GPBD.int32(19),
          lastOrigin: GPBD.cType(20, PROTO.optional, function () { return AvastWRC.gpb.All.Origin; }),
          clientTimestamp: GPBD.int64(21)
      }),
      Response : PROTO.Message("AvastWRC.gpb.All.UrlInfoRequest.Response", {
          urlInfo:        GPBD.cType(1, PROTO.repeated,  function() { return AvastWRC.gpb.All.UrlInfo; } ),
          updateResponse: GPBD.cType(2, PROTO.optional, function() { return AvastWRC.gpb.All.UpdateResponse; } )
      })
  });

  /*******************************************************************************
   * UrlInfo > Phishing
   ******************************************************************************/
  AvastWRC.gpb.All.PhishingNew = PROTO.Message("AvastWRC.gpb.All.PhishingNew", {
      phishing:       GPBD.sint32(1),
      phishingDomain: GPBD.sint32(2),
      ttl:            GPBD.sint32(3)
  });

  /*******************************************************************************
   * UrlInfo > Typo
   ******************************************************************************/
  AvastWRC.gpb.All.Typo = PROTO.Message("AvastWRC.gpb.All.Typo", {
      url_to:       GPBD.string(1),
      brand_domain: GPBD.string(2),
      urlInfo:      GPBD.cType(3, PROTO.optional, function(){return AvastWRC.gpb.All.UrlInfo;} ),
      is_typo:      GPBD.bool(4)
  });

  /*******************************************************************************
   * UrlInfo > WebRep
   ******************************************************************************/
  AvastWRC.gpb.All.WebRep = PROTO.Message("AvastWRC.gpb.All.WebRep", {
      rating: GPBD.sint32(1),
      weight: GPBD.sint32(2),
      ttl:    GPBD.sint32(3),
      flags:  GPBD.sint64(4),
              // bit mask:
              //    shopping = 1
              //    social = 2
              //    news = 4
              //    it = 8
              //    corporate = 16
              //    pornography = 32
              //    violence = 64
              //    gambling = 128
              //    drugs = 256
			  //    illegal = 512
			  // 	others = 1024?
			  
      rating_level: GPBD.cType(5, PROTO.optional, function () { return AvastWRC.gpb.All.RatingLevel; })
  });

  /*******************************************************************************
   * UrlInfo > SafeShop
   ******************************************************************************/
  AvastWRC.gpb.All.SafeShop = PROTO.Message("AvastWRC.gpb.All.SafeShop", {
      timestamp : GPBD.int64(1),
      regex :     GPBD.string(2),
      selector :  GPBD.string(3),
      match : 	  GPBD.bool(4)
  });

  /*******************************************************************************
   * UrlInfo > Blocker
   ******************************************************************************/
  AvastWRC.gpb.All.Blocker = PROTO.Message("AvastWRC.gpb.All.Blocker", {
      block: GPBD.sint64(1)
  });
  
  /* UrlInfo > Client */
  AvastWRC.gpb.All.Client = PROTO.Message("AvastWRC.gpb.All.Client", {
      id:             GPBD.cType(1, PROTO.optional, function(){return AvastWRC.gpb.All.AvastIdentity;} ),  // all kinds of Avast's identities
      type:           GPBD.cType(2, PROTO.optional, function(){return AvastWRC.gpb.All.Client.CType;} ),   // request's send-from source
      browserExtInfo: GPBD.cType(3, PROTO.optional, function(){return AvastWRC.gpb.All.BrowserExtInfo;} ), // browser related information
    // optional MessageClientInfo messageClientInfo = 4;
      CType: PROTO.Enum("AvastWRC.gpb.All.Client.CType", {
          TEST: 1,                   // testing requests
          AVAST: 2,                  // Avast embedded
          BROWSER_EXT: 3,            // from browser extensions
          MESSAGE: 4,                // send from Android message
          PARTNER: 5,                // third party partners.
          WEBSITE: 6                // reserved type, if we are going to deploy urlinfo service as a public online service
      })
  });
  
  /* UrlInfo > AvastIdentity */
  AvastWRC.gpb.All.AvastIdentity = PROTO.Message("AvastWRC.gpb.All.AvastIdentity", {
      guid :   GPBD.bytes(1),
      uuid :   GPBD.bytes(2),
      token :  GPBD.bytes(3),
      auid :   GPBD.bytes(4),
      userid : GPBD.bytes(5),
      hwid   : GPBD.bytes(6),
      android_advertisement_id   : GPBD.bytes(7),
      plugin_guid:   GPBD.bytes(8)
  });

  /* UrlInfo > BrowserExtInfo */
  AvastWRC.gpb.All.BrowserExtInfo = PROTO.Message("AvastWRC.gpb.All.BrowserExtInfo", {
      extensionType : GPBD.cType(1, PROTO.optional, function(){return AvastWRC.gpb.All.ExtensionType;} ),
      extensionVersion : GPBD.sint32(2),
      browserType : GPBD.cType(3, PROTO.optional, function(){return AvastWRC.gpb.All.BrowserType;} ),
      browserVersion : GPBD.string(4),
      os : GPBD.cType(5, PROTO.optional, function(){return AvastWRC.gpb.All.OS;} ),
      osVersion : GPBD.string(6),
      dataVersion : GPBD.sint32(7)
  });

  /*******************************************************************************
   * UrlInfo > Ajax
   ******************************************************************************/
  AvastWRC.gpb.All.Ajax = PROTO.Message("AvastWRC.gpb.All.Ajax", {
      collect: GPBD.bool(1)
  });

  /*******************************************************************************
   * Gamification > ApplicationEvent
   ******************************************************************************/
  AvastWRC.gpb.All.ApplicationEvent = PROTO.Message('AvastWRC.gpb.All.ApplicationEvent',{
    identity : GPBD.cType(1, PROTO.required, function() { return AvastWRC.gpb.All.ApplicationIdentity; } ),
    event :    GPBD.cType(2, PROTO.required, function() { return AvastWRC.gpb.All.GeneratedEvent; } ),
    source :   GPBD.cType(3, PROTO.required, function() { return AvastWRC.gpb.All.ApplicationEvent.Source; } ),
    productInfomation : GPBD.cType(4, PROTO.optional, function() { return AvastWRC.gpb.All.ProductInfomation; } ),

    Source : PROTO.Enum("AvastWRC.gpb.All.ApplicationEvent.Source", {
      BROWSER_PLUGIN : 8
    })
  });

  /*******************************************************************************
   * Gamification > ApplicationIdentity
   ******************************************************************************/
  AvastWRC.gpb.All.ApplicationIdentity = PROTO.Message('AvastWRC.gpb.All.ApplicationIdentity', {
    type : GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.ApplicationIdentity.ApplicationIdentityType; }),
    uuid : GPBD.string(2),
    auid : GPBD.string(6),
    hwid : GPBD.string(8),
    guid : GPBD.string(9),

    ApplicationIdentityType: PROTO.Enum('AvastWRC.gpb.All.ApplicationIdentity.ApplicationIdentityType', {
      HW_IDENTITY : 7 //Contains hardwareId, guid auid, uuid
    })
  });

  /*******************************************************************************
   * Gamification > GeneratedEvent
   ******************************************************************************/
  AvastWRC.gpb.All.GeneratedEvent = PROTO.Message('AvastWRC.gpb.All.GeneratedEvent',{
    eventType: GPBD.int32 (1, PROTO.repeated),
    eventTime: GPBD.sint64(2, PROTO.required),
    params :   GPBD.cType (3, PROTO.repeated, function() { return AvastWRC.gpb.All.GeneratedEvent.GeneratedEventParam; } ),

    GeneratedEventParam : PROTO.Message('AvastWRC.gpb.All.GeneratedEvent.GeneratedEventParam', {
      paramName: GPBD.string(1, PROTO.required),
      value:     GPBD.string(2)
    })
  });

  /*******************************************************************************
   * Gamification > ProductInformation
   ******************************************************************************/
  AvastWRC.gpb.All.ProductInformation = PROTO.Message('AvastWRC.gpb.All.ProductInformation', {
    code :               GPBD.string(1, PROTO.repeated),
    version :            GPBD.bytes(2),
    platform :           GPBD.cType(3, PROTO.optional, function() { return AvastWRC.gpb.All.ProductInformation.Platform; } ),
    plaformVersion :     GPBD.string(4),
    otherSpecification : GPBD.bytes(5),

    Platform: PROTO.Enum('AvastWRC.gpb.All.ProductInformation.Platform', {
      WIN : 1,
      OSX : 2,
      IOS : 3,
      LINUX : 4,
      ANDROID : 5
    })
  });

  AvastWRC.gpb.All.GamificationResponse = PROTO.Message('AvastWRC.gpb.All.GamificationResponse', {
    status: GPBD.int32(1)
  });

(function(PROTO) {

/*******************************************************************************
 * > SafeShopOffer (also used by burger events if we do a change here we need 
 *                  to update also burger lib and burger project)
 ******************************************************************************/
    AvastWRC.gpb.All.SafeShopOffer = PROTO.Message("AvastWRC.gpb.All.SafeShopOffer",{
        /**********************************************************************/
        /* message ClientInfo                                                 */
        /**********************************************************************/
        ClientInfo: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.ClientInfo",{
            Client: PROTO.Enum("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.Client",{
                AVAST : 0,
                AVG : 1,
            }),

            Browser: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.Browser",{
                type: GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.Browser.BrowserType;}), // same values as on UrlInfo-> BrowserType
                version: GPBD.string(2, PROTO.optional),
                language: GPBD.string(3, PROTO.optional),

                BrowserType: PROTO.Enum("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.Browser.BrowserType",{
                    CHROME: 0,
                    FIREFOX: 1,
                    IE: 2,
                    OPERA: 3,
                    SAFARI: 4,
                    MS_EDGE: 5,
                    AVAST: 6
                })
            }),

            Extension: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.Extension",{		
                type: GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.Extension.ExtensionType;}), // same values as on UrlInfo ExtensionType
                version: GPBD.string(2, PROTO.optional),

                ExtensionType: PROTO.Enum("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.Extension.ExtensionType",{
                    SP: 0, // SafePrice multiprovider extension
                    SPAP: 1 // SafePrice multiprovider together with AvastPay
                })
            }),	

            UserSettings: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings",{
                show_automatic: GPBD.bool(1, PROTO.optional), // same values as on UrlInfo ExtensionType
                advanced: GPBD.cType(2, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced;}),
                custom_list: GPBD.string(3, PROTO.repeated),
                
                Advanced: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced",{
                    offers_configs: GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.OffersConfigs;}),
                    coupons_configs: GPBD.cType(2, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.CouponsConfigs;}),
                    redirect_configs: GPBD.cType(2, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.RedirectConfigs;}),

                    OffersConfigs: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.OffersConfigs",{
                        offer_limit: GPBD.int32(1,PROTO.optional),
                        include_flag: GPBD.int32(2,PROTO.optional), //  bit mask:
                                                                    //  eShop = 1
                                                                    //  accommodation = 2
                                                                    //  special = 4
                        offers_visibility: GPBD.cType(3, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.OffersConfigs.OffersVisibility;}),

                        OffersVisibility: PROTO.Enum("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.OffersConfigs.OffersVisibility",{
                            SHOW_ALL_OFFERS: 0,
                            SHOW_BETTER_THAN_ORIGINAL_PRICE: 1,
                            USE_OFFER_LIMIT: 2,
                            DO_NOT_SHOW: 3,
                        }),
                    }),
                    CouponsConfigs: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.CouponsConfigs",{
                        coupons_visibility: GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.CouponsConfigs.CouponsVisibility;}),
                        include_flag: GPBD.int32(2,PROTO.optional), //  bit mask:
                                                                    //  eShop = 1
                                                                    //  accommodation = 2
                                                                    //  special = 4
                        CouponsVisibility: PROTO.Enum("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.CouponsConfigs.CouponsVisibility",{
                            SHOW_ALWAYS: 0,
                            SHOW_ON_FIRST_VISIT: 1,
                            DO_NOT_NOTIFY: 2
                        }),
                    }),
                    RedirectConfigs: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.RedirectConfigs",{
                        redirect_visibility: GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.CouponsConfigs.OthersVisibility;}),
                        
                        RedirectVisibility: PROTO.Enum("AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings.Advanced.RedirectConfigs.RedirectVisibility",{
                            SHOW_ALWAYS: 0,
                            DO_NOT_NOTIFY: 1
                        }),
                    }),
                }),
            }),	

            language:               GPBD.string(1, PROTO.optional),
            referer:                GPBD.string(2, PROTO.optional), 
            extension_guid:         GPBD.string(3, PROTO.optional),
            browser:                GPBD.cType(4, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.Browser;}),     
            extension:              GPBD.cType(5, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.Extension;}),
            client:                 GPBD.cType(6, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.Client;}),
            guid:                   GPBD.string(7, PROTO.optional),
            campaign_id:            GPBD.string(8, PROTO.optional),
            user_settings:          GPBD.cType(9, PROTO.optional, function() {return AvastWRC.gpb.All.SafeShopOffer.ClientInfo.UserSettings}),
            transaction_id:         GPBD.string(10, PROTO.optional)
        }),
        /**********************************************************************/
        /* OfferCategory                                                      */
        /**********************************************************************/
        OfferCategory: PROTO.Enum("AvastWRC.gpb.All.SafeShopOffer.OfferCategory",{//Type of offers we support(Product, Accommodation, Voucher or any combination of them)
            OFFER: 0, 
            COUPON: 1
        }),
        /**********************************************************************/
        /* Vocher                                                             */
        /**********************************************************************/
        Voucher : PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.Voucher",{
            VoucherType: PROTO.Enum("AvastWRC.gpb.All.SafeShopOffer.Voucher.VoucherType",{
                GENERAL: 0,
                PRODUCT: 1,
                ACCOMMODATION: 2,
                SIMILAR: 3,
            }),
            title:             GPBD.string(1, PROTO.optional),
            category :         GPBD.string(2, PROTO.optional),
            url :              GPBD.string(3, PROTO.optional),
            affiliate :        GPBD.string(4, PROTO.optional),
            value :            GPBD.string(5, PROTO.optional),
            expire_date :      GPBD.string(6, PROTO.optional),
            code :             GPBD.string(7, PROTO.optional),
            text :             GPBD.string(8, PROTO.optional),
            free_shipping :    GPBD.bool(9, PROTO.optional),
            type:              GPBD.cType(10, PROTO.optional, function(){return AvastWRC.gpb.All.SafeShopOffer.Voucher.VoucherType;}) 
        }), 
        /**********************************************************************/
        /* Redirect                                                           */
        /**********************************************************************/
        Redirect : PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.Redirect",{
            title:             GPBD.string(1, PROTO.optional),
            url :              GPBD.string(2, PROTO.optional),
            image:             GPBD.string(3, PROTO.optional),
            formatted_price:   GPBD.string(4, PROTO.optional),
            availability:      GPBD.string(5, PROTO.optional),
            button_text:       GPBD.string(6, PROTO.optional),
            info_text:         GPBD.string(7, PROTO.optional)            
        }), 
        /**********************************************************************/
        /* Endpoint: /domainInfo  */
        /**********************************************************************/
        DomainInfoRequest: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.DomainInfoRequest",{
            client_info:            GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo;}),
            url:                    GPBD.string(2, PROTO.optional)         

        }),

        DomainInfoResponse: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.DomainInfoResponse",{
            ProviderSpecificResult: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.DomainInfoResponse.ProviderSpecificResult",{
                provider_id:            GPBD.string(1, PROTO.optional),
                provider_name:          GPBD.string(2, PROTO.optional),         
                category:               GPBD.cType(3, PROTO.repeated, function() { return AvastWRC.gpb.All.SafeShopOffer.OfferCategory;}),
                scraper_script:         GPBD.string(4, PROTO.optional), 
            }),

            VoucherResponse : PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.DomainInfoResponse.VoucherResponse",{                
                provider_id:            GPBD.string(1, PROTO.optional),
                provider_name:          GPBD.string(2, PROTO.optional),
                voucher:                GPBD.cType(3, PROTO.repeated, function(){return AvastWRC.gpb.All.SafeShopOffer.Voucher;}) 
            }),

            RedirectResponse : PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.DomainInfoResponse.RedirectResponse",{
                provider_id:            GPBD.string(1, PROTO.optional),
                provider_name:          GPBD.string(2, PROTO.optional),
                redirect :              GPBD.cType(3, PROTO.repeated, function(){return AvastWRC.gpb.All.SafeShopOffer.Redirect;})
            }),

            provider_specific_result:   GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.DomainInfoResponse.ProviderSpecificResult;}),
            ui_adaption_rule:           GPBD.string(2, PROTO.repeated),
            country:                    GPBD.string(3, PROTO.optional),
            voucher:                    GPBD.cType(4, PROTO.optional, function(){return AvastWRC.gpb.All.SafeShopOffer.DomainInfoResponse.VoucherResponse;}),
            redirect:                   GPBD.cType(5, PROTO.optional, function(){return AvastWRC.gpb.All.SafeShopOffer.DomainInfoResponse.RedirectResponse;})
        }),
        /**********************************************************************/
        /* Endpoint: /offers                                                  */
        /**********************************************************************/
        OfferRequest : PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.OfferRequest",{
            BarState: PROTO.Enum("AvastWRC.gpb.All.SafeShopOffer.OfferRequest.BarState",{
                HIDDEN: 0, //the SP bar is hidden (it will be only shown if the user click on the extension icon and we make the request "manual")
                SHOWED: 1  //the bar will shown always
            }),	

            url:                    GPBD.string(1, PROTO.optional),
            query:                  GPBD.string(2, PROTO.optional),
            client_info:            GPBD.cType(3, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.ClientInfo;}),
            provider_id:            GPBD.string(4, PROTO.optional),
            category:               GPBD.cType(5, PROTO.repeated, function() { return AvastWRC.gpb.All.SafeShopOffer.OfferCategory;}),
            state:                  GPBD.cType(6, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.OfferRequest.BarState;}),
            explicit_request:       GPBD.bool(7,PROTO.optional)
        }),

        OfferResponse : PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.OfferResponse",{

            GeneralOffer: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.OfferResponse.GeneralOffer",{
                title:              GPBD.string(1, PROTO.optional),
                price:              GPBD.Double(2, PROTO.optional),
                formatted_price:    GPBD.string(3, PROTO.optional),
                url:                GPBD.string(4, PROTO.optional),
                affiliate:          GPBD.string(5, PROTO.optional),
                //recommended:        GPBD.bool(6, PROTO.optional),
                image:              GPBD.string(7, PROTO.optional),
            }),

            Product: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.OfferResponse.Product",{
                offer:             GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.OfferResponse.GeneralOffer;}),
                availability:      GPBD.string(2,PROTO.optional),
                availability_code: GPBD.string(3,PROTO.optional), 
                saving:            GPBD.string(4,PROTO.optional),  
                shipping:          GPBD.string(5,PROTO.optional),
            }),

            Accommodation: PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.OfferResponse.Accommodation",{
                AccommodationType: PROTO.Enum("AvastWRC.gpb.All.SafeShopOffer.OfferResponse.Accommodation.AccommodationType",{
                    UNKNOWN: 0,
                    HOTEL: 1,
                    CITY_HOTEL: 2,
                    SIMILAR_HOTEL: 3 
                }),	
                offer:             GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.OfferResponse.GeneralOffer;}),
                priority:          GPBD.int32(2,PROTO.optional),
                address:           GPBD.string(3,PROTO.optional), 
                stars:             GPBD.int32(4, PROTO.optional),  
                additional_fees:   GPBD.bool(5, PROTO.optional),
                price_netto:       GPBD.Double(6, PROTO.optional),
                saving:            GPBD.string(7, PROTO.optional),
                type:              GPBD.cType(8, PROTO.optional, function(){ return AvastWRC.gpb.All.SafeShopOffer.OfferResponse.Accommodation.AccommodationType;}),
                stars_precise:     GPBD.Double(9, PROTO.optional),
                city:              GPBD.string(10, PROTO.optional)

            }),
            Query : PROTO.Message("AvastWRC.gpb.All.SafeShopOffer.OfferResponse.Query",{
                price:             GPBD.Double(1, PROTO.optional),
                formatted_price:   GPBD.string(2, PROTO.optional),
            }), 

            product:                 GPBD.cType(1, PROTO.repeated, function() { return AvastWRC.gpb.All.SafeShopOffer.OfferResponse.Product;}),
            voucher:                 GPBD.cType(2, PROTO.repeated, function() { return AvastWRC.gpb.All.SafeShopOffer.OfferResponse.Voucher;}), // DEPRECATED AOSP-976
            accommodation:           GPBD.cType(3, PROTO.repeated, function() { return AvastWRC.gpb.All.SafeShopOffer.OfferResponse.Accommodation;}),
            query:                   GPBD.cType(4, PROTO.optional, function() { return AvastWRC.gpb.All.SafeShopOffer.OfferResponse.Query;}),
            show_offer_notification: GPBD.bool(5, PROTO.optional)
                       
        })
    });

}).call(this, AvastWRC.PROTO);

}).call(this, AvastWRC, AvastWRC.PROTO);