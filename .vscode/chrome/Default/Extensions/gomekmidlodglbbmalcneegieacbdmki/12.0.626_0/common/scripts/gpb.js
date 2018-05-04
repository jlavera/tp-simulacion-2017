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

  /*******************************************************************************
   * Vote
   ******************************************************************************/
  AvastWRC.gpb.All.Vote = PROTO.Message("AvastWRC.gpb.All.Vote",{
      rating: GPBD.sint32(1),
      flags:  GPBD.int64(2),
  });

  /*******************************************************************************
   * Vote - PutVoteRequest
   ******************************************************************************/
  AvastWRC.gpb.All.PutVoteRequest = PROTO.Message("AvastWRC.gpb.All.PutVoteRequest",{
      identity: GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.Identity; } ),
      uri:      GPBD.string(2), 
      vote:     GPBD.cType(3, PROTO.optional, function() { return AvastWRC.gpb.All.Vote; } ),
      ttl:      GPBD.sint32(4),
  });

/*******************************************************************************
 * Typo Accounting - TypoSquattingRequest
 ******************************************************************************/
  AvastWRC.gpb.All.TypoSquattingRequest = PROTO.Message("AvastWRC.gpb.All.TypoSquattingRequest", {
      guid:        GPBD.string(1),
      auid:        GPBD.string(2),
      urlFrom:     GPBD.string(3),
      urlTo:       GPBD.string(4),
      redirectId:  GPBD.string(5),
      flags:       GPBD.bytes(6),
      brandDomain: GPBD.string(7),
      localeUsed:  GPBD.string(8),
      localeSupported: GPBD.string(10),
      platform: GPBD.cType(9, PROTO.optional, function() { return AvastWRC.gpb.All.TypoSquattingRequest.Platform; } ),
      browser: GPBD.cType(11, PROTO.optional, function() { return AvastWRC.gpb.All.TypoSquattingRequest.BrowserType; } ),
      version: GPBD.sint32(14),

      Platform: PROTO.Enum("AvastWRC.gpb.All.TypoSquattingRequest.Platform",{
          Invalid : 0,
          Windows : 1,
          Mac : 2,
          Android : 3,
          Linux : 4,
      }),
      BrowserType: PROTO.Enum("AvastWRC.gpb.All.TypoSquattingRequest.BrowserType",{
          INVALID : 0,
          IE : 1,
          FIREFOX : 2,
          CHROME : 3,
          OPERA : 4,
          SAFARI : 5,
      }),
  });

  /*******************************************************************************
   * Typo Accounting - TypoSquattingResponse
   ******************************************************************************/
  AvastWRC.gpb.All.TypoSquattingResponse = PROTO.Message("AvastWRC.gpb.All.TypoSquattingResponse", {
      status: GPBD.cType(1, PROTO.optional, function() { return AvastWRC.gpb.All.TypoSquattingResponse.ResponseStatus; } ),
    
      ResponseStatus: PROTO.Enum("AvastWRC.gpb.All.TypoSquattingResponse.ResponseStatus", {
          SUCCESS : 1,
          FAILURE : 2,
      }),
  });

  /*******************************************************************************
   * UrlInfo > UpdateRequest
   ******************************************************************************/
  AvastWRC.gpb.All.RuleUpdateRequest = PROTO.Message("AvastWRC.gpb.All.RuleUpdateRequest",{
      rulesVersion: GPBD.string(1),
      identity: GPBD.cType(2, PROTO.optional, function() { return AvastWRC.gpb.All.Identity; } ),
      callerId: GPBD.sint64(3),
  });

  /*******************************************************************************
   * UrlInfo > UpdateResponse
   ******************************************************************************/
  AvastWRC.gpb.All.RuleUpdateResponse = PROTO.Message("AvastWRC.gpb.All.RuleUpdateResponse",{
      version:    GPBD.string(1),
      ttl:        GPBD.int32(2),
      colorRules: GPBD.cType(3, PROTO.repeated, function() { return AvastWRC.gpb.All.ColorRule; } ),
      dntRules:   GPBD.cType(4, PROTO.repeated, function() { return AvastWRC.gpb.All.DNTRule; } ),
      hintRules:  GPBD.cType(5, PROTO.repeated, function() { return AvastWRC.gpb.All.HintRule; } ),
      userid :    GPBD.string(6),
  });

  /*******************************************************************************
   * UrlInfo > Rule
   ******************************************************************************/
  AvastWRC.gpb.All.ColorRule = PROTO.Message("AvastWRC.gpb.All.ColorRule",{
      domain: GPBD.string(1),
      url:    GPBD.string(2),
      selector: GPBD.string(3),
      css:    GPBD.string(4),
      urlExtractor: GPBD.string(5), // extractor for Yahoo search result, which are wrapped links.
  });

  AvastWRC.gpb.All.DNTRule = PROTO.Message("AvastWRC.gpb.All.DNTRule",{
      Category: PROTO.Enum("AvastWRC.gpb.All.DNTRule.Category",{
          OTHERS :0,
          WEB_ANALYTICS :1,
          WEB_TOOLS :2,
          AD_TRACKING :3,
          AD_ANALYTICS :4,
          AD_DELIVERY :5,
          SOCIAL_BUTTONS :11,
          SOCIAL_LOGIN :12,
          SOCIAL_WIDGET :13,
      }),

      id: GPBD.int32(1),
      name: GPBD.string(2),
      category: GPBD.cType(3, PROTO.optional, function() { return AvastWRC.gpb.All.DNTRule.Category; } ),
      pattern:     GPBD.string(4),
      active:      GPBD.bool(5),
      replacement: GPBD.string(6),
      settings:    GPBD.string(7, PROTO.repeated),
      domains:     GPBD.string(8, PROTO.repeated),
  });

  AvastWRC.gpb.All.HintRule = PROTO.Message("AvastWRC.gpb.All.HintRule",{
      domain:    GPBD.string(1),
      url:       GPBD.string(2),
      content:   GPBD.string(3),
      frequency: GPBD.sint32(4),
  });

}).call(this, AvastWRC, AvastWRC.PROTO);