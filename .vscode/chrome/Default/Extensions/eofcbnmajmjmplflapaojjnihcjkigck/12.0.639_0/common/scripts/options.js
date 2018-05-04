/*******************************************************************************
 *
 *  avast! Safeprice
 *  (c) 2013 Avast Corp.
 *
 *  Options page - cross browser
 * 
 * If some bug is corrected on the settings poppup needs to be corrected also on the settigns.js file
 *
 ******************************************************************************/

(function($) {

  if (typeof AvastWRC == 'undefined') { AvastWRC = {}; }

  AvastWRC.opt = AvastWRC.opt || {
    /**
     * Initialization
     * @param  {Object} _bs Instance of browser specifics
     * @return {Object}     Instance of browser agnostic
     */
    init: function(_bs) {
        this.bs = _bs;
        this.USettings = AvastWRC.USettings;
        var self = this;
        this.getCurrentTab().then(function (tab) {
          console.log("init");
          self.shown = false;
          self.received = false;
          self.USettings = AvastWRC.USettings;
          self.tab = tab;
 
          var dataMsg = {
            type: 'settings_page', 
            action: 'get_user_settings',
            tab: tab,
            message: "safeShopFeedback"
          };

          AvastWRC.opt.messageHandler(dataMsg);
          return self;
      });
    },

    getCurrentTab: function() {
      return new Promise((resolve, reject) => {
          chrome.tabs.query({
              active: true, currentWindow: true
          }, function (tabs) {
              resolve(tabs[0]);
          });
      });
    },

    messageHandler: function(data){
      chrome.runtime.sendMessage(data);
    },

    /**
     * handles all the messages from the background script
     * @param  {String} message
     * @param  {Object} data
     * @return {void}
     */
    messageHub: function(message, data) {      
      if(message == 'user_settings') {        
        if(this.received){
          console.log("received -> return");
          return;
        }
        console.log("user settings received" + JSON.stringify(data));
        this.settings = data;
        this.originalSettings = data.poppupSettings;
        if(data.isFirefox){
          this.received = true;
        }
        this.createDOM(data);
      }
    },
    /**
     * Creates the UI using JSON data and a mustache.js template
     * @param  {Object} data generated in the background script
     * @return {void}
     */
    createDOM: function(data) {
      if(data){
        this.settings = data;
      }

      if(this.shown){
        console.log("was shown -> return");
        return;
      }
      if($(".avast-sas-settings-page").length > 0)$(".avast-sas-settings-page").remove();
      $('.avast-sas').prepend(Mustache.render(AvastWRC.Templates.safeShopSettingsPopup, this.settings));

      document.title = (this.settings.avastBranding) ? this.settings.poppupSettings.strings.spSettingsPageTitleAvast : this.settings.poppupSettings.strings.spSettingsPageTitleAvg;
  
      AvastWRC.opt.USettings.bind(data, AvastWRC.opt.tab);

      $('.avast-sas-settings-page').addClass('avast-sas-display-block');
      
      if(data.isFirefox){
        this.shown = true;
        console.log("was shown -> SET TRUE");
      }
      var dataMsg = {
        type: 'settings_page', 
        action: 'settings_shown',
        tab: AvastWRC.opt.tab,
        message: "safeShopFeedback"
      };

      AvastWRC.opt.messageHandler(dataMsg);
    },
  };
  
  document.addEventListener('DOMContentLoaded', AvastWRC.opt.init());

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    AvastWRC.opt.messageHub(request.message, request.data);
  });

}).call(this, $);
