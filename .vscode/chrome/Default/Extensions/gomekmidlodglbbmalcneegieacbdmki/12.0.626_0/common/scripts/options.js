/*******************************************************************************
 *
 *  avast! Online Security plugin
 *  (c) 2013 Avast Corp.
 *
 *  @author: Lucian Corlaciu
 *
 *  Options page - cross browser
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
        this.bs.messageHandler('getSettingList');
        return this;
    },
    /**
     * handles all the messages from the background script
     * @param  {String} message
     * @param  {Object} data
     * @return {void}
     */
    messageHub: function(message,data) {
      if(message == 'settingList') {
        this.settings = data;
        this.createDOM();
      }
    },
    /**
     * Creates the UI using JSON data and a mustache.js template
     * @param  {Object} data generated in the background script
     * @return {void}
     */
    createDOM: function(data) {
      $('.settings')
        .html(Mustache.render(AvastWRC.Templates.settings, this.settings));

      AvastWRC.opt.attachHandlers();
    },
    /**
     * attaches all the DOM event handlers
     * @return {void}
     */
    attachHandlers: function() {
      $('.checkbox')
        .filter(function() {return !$(this).parent().hasClass('item-disabled');})
        .click(function(){
          var el = $(this);

          el.removeClass('checkbox-intermed');
          el.toggleClass('checkbox-checked');

          if(AvastWRC.opt.cascadeClick(el)) {
            AvastWRC.opt.saveState();
          }

        });

      $('#close')
        .click(function(){
            AvastWRC.opt.bs.messageHandler("closeSettings");
          });

      $('#reset')
        .click(function(){
          AvastWRC.opt.bs.messageHandler('resetSettings');
        });
    },
    /**
     * Cascades an user click from a feature to all its subfeatures and vice-versa
     * @param  {HTMLElement} el clicked element
     * @return {void}
     */
    cascadeClick: function(el) {
      var $item = el.parent(),
          active = el.hasClass('checkbox-checked'),
          isSubFeature = $item.hasClass('sub-feature');

      if(isSubFeature){
        if(active){
          var prev = $item.prevAll();
          for(var p=0; p < prev.length; p++) {
            var $subEl = $(prev[p]);
            if( !$subEl.hasClass('sub-feature')) {
              $subEl.find('.checkbox').addClass('checkbox-checked');
              break;
            }
          }
        }
        // else if(el.data('key').indexOf('dnt') == 0) {
        //   var dnts = $(".checkbox[data-key*='dnt']"), checked = 0;

        //   for(var i=0; i<dnts.length; i++) {
        //     if($(dnts[i]).hasClass('checkbox-checked')) {
        //       checked++;
        //     }
        //   }

        //   if(checked == 1) { //only big one
        //     $(".checkbox[data-key='dnt']").removeClass('checkbox-checked');
        //   }
        // }
      }
      else {
        if(!active) {
          var next = $item.nextAll();
          for(var p=0; p < next.length; p++) {
            var $subEl = $(next[p]);
            if($subEl.hasClass('sub-feature')) {
              $subEl.find('.checkbox').removeClass('checkbox-checked');
            } else {
              break;
            }
          }
        } //else if(el.data('key') == 'dnt') {
        //   AvastWRC.opt.bs.messageHandler('resetSettings', {list: ['dnt','dntSocial','dntAdTracking','dntWebAnalytics','dntOthers']});
        //   return false;
        // }
      }

      return true;
    },
    /**
     * Saves the settings state at each change
     * @return {void}
     */
    saveState: function() {
      var elements = $('.checkbox');
      for(var e = 0; e < elements.length; e++ )
      {
        var $el = $(elements[e]),
            settings = AvastWRC.opt.settings.list;
        for(var k =0; k<settings.length; k++) {
          if(settings[k].key == $el.data('key')) {
            if(!$el.hasClass('checkbox-intermed')) {
              settings[k].active = $el.hasClass('checkbox-checked');
            }
            break;
          }
        }
      }

      AvastWRC.opt.bs.messageHandler('saveSettings', AvastWRC.opt.settings);
    }
  };

  // options script pretends to be a regular injected script
  AvastWRC.ial = AvastWRC.opt;

}).call(this, $);
