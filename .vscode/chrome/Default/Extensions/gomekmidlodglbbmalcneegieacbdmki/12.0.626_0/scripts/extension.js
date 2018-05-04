/*******************************************************************************
 *
 *  avast! Online Security plugin
 *  (c) 2013 Avast Corp.
 *
 *  @author: Lucian Corlaciu
 *
 *  Injected specifics - Google Chrome
 *
 ******************************************************************************/

(function() {

  if (typeof AvastWRC == 'undefined') { AvastWRC = {}; }

  //avoid multiple injections
  if(AvastWRC.bs === undefined){
    var ial = null; //AvastWRC.ial instance - browser agnostic
    AvastWRC.bs = {
      init: function() {
        ial = AvastWRC.ial.init(this);
        chrome.runtime.onMessage.addListener(
          function(request, sender, sendResponse) {
            ial.messageHub(request.message, request.data);
          });
      },
      messageHandler: function(functionName, data) {
        data = data || {};
        data.message = functionName;
        chrome.runtime.sendMessage(data);
      },
      getLocalImageURL: function(file) {
        return chrome.extension.getURL('common/ui/icons/'+ file);
      },
      getLocalResourceURL: function(file) {
        return chrome.extension.getURL(file);
      },
      triggerSettingsPage: function() {
        this.messageHandler('openSettings', {}); // open new tab from the background page
      },
    };

    AvastWRC.bs.init();
  }

}).call(this);

$.noConflict(true);
