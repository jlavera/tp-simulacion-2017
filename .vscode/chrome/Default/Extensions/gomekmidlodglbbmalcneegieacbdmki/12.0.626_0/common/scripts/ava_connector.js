/************************************************
 * ava_connector.js - connect with myAvast code.
 ***********************************************/
(function(window) {
  var avaRegex = /http[s]?\:\/\/(?:[\w\-]+\.)*avast\.com(?:\/|$)/i;
  if (avaRegex.test(window.document.location.href)) {
    window.addEventListener("message", function(event) {
      if (event.source != window) return;
      var d = event.data;
      if (d && avaRegex.test(event.origin) && !/aos:{3}.*/gi.test(d)) {
        switch (d) {
          case "fusion:::pair":
            window.postMessage("aos:::pair","*");
            break;
          default:
        }
      }
    }, false);
  }
}).call(this, window);
