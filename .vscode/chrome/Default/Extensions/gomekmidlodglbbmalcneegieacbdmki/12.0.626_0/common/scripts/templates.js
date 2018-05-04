/*******************************************************************************
 *  avast! Online Security plugin - Mustache.js HTML Templates - cross browser
 *  (c) 2014 Avast Corp.
 ******************************************************************************/

var AvastWRC = AvastWRC || {};


AvastWRC.Templates = {
  /**
   * Process templates declaration and append templates to container
   */
  add: function (declaration) {
    function addPart(acc, part) {
      if (part instanceof Array) {
        for (var i = 0; i < part.length; i++) {
          addPart(acc, part[i]);
        }
      } else if (part instanceof Object) {
        // reference within declaration
        if (part.temp) {
          var temp = declaration[part.temp] || AvastWRC.Templates[part.temp];
          addPart(acc, (part.sect !== undefined) ? temp[part.sect] : temp);
        }
      } else {
        acc.push(part);
      }
    }

    for (var temp in declaration) {
      var parts = [];
      addPart(parts, declaration[temp]);
      this[temp] = parts.join('\n');
    }
  }
};

/*-------------------------------- AOS Templates -----------------------------*/
AvastWRC.Templates.add(
{ // --- Templates Declaration
  /**
   * Settings page
   */
  settings: [
    "<div class='settings-title'>{{title}}</div>",
    "{{#list}}",
	  "{{#description}}",
		  "<div class='item {{^name}}sub-feature{{/name}} {{^enabled}}item-disabled{{/enabled}}' >",
			"<div class='checkbox {{#active}}checkbox-checked{{/active}} {{#intermed}}checkbox-intermed{{/intermed}}' data-key='{{key}}' ></div>",
			"<div class='name' >",
			  "{{name}}",
			"</div>",
			"<div class='description'>",
			  "{{description}}",
			"</div>",
		  "</div>",
	  "{{/description}}",
    "{{/list}}",
    "<div class='buttons'>",
      "<button id='close' class='button blue'>{{save}}</button>",
      "<button id='reset' class='button'>{{reset}}</button>",
    "</div>"
  ],
  /**
   * Template UI for top bar use by SafeZone
   */
  topBar: [
    "<div class='avast-extension-topbar-promo'>",
      "<div class='avast-extension-topbar'>",
        "<div class='avast-extension-topbar-logo-container'><img class='avast-extension-topbar-icon' src='{{icon}}'></div>",
        "<div class='avast-extension-topbar-text-principal'>{{text}}</div>", 
        "<div class='tb-b-reopen' id='avast-browser-reopen'>",
          "<label class='tb-b-r-text'>{{buttonText}}</label>",
        "</div>",
        "<div class='tb-b-info' id='avast-browser-info'>",
          "<img class='avast-extension-topbar-button-info-image' src='{{iconInfo}}'>",
        "</div>",
        "<div class='tb-b-basic' id='avast-browser-hide'>",
          "<div class='avast-browser-hide-background'>",
            "<img class='avast-browser-hide-img' src='{{iconCross}}'>",
          "</div>",
        "</div>",
        "<div class='tb-b-basic' id='avast-browser-never'>",
          "<div class='avast-browser-never-content'>",
            "<img class='avast-browser-never-icon noDisplay' src='{{filledCheckbox}}'>",
            "<div class='avast-browser-never-icon avast-browser-never-icon-checkbox'></div>{{declineText}}",
          "</label>",
        "</div>",
      "</div>", 
      "<div id='infoHoverDiv'>",
        "<div class='topbar-info-arrow' id='avast-arrow'></div>",
        "<div class='topbar-info-container' id='avast-container' >",	
          "<p class='toolbar-text'>{{{infoText}}}</p>",
        "</div>",
      "</div>",
      "<div id='neverHoverDiv'>",        
        "<div class='topbar-never-container' id='avast-never-container' >",	
          "<div class='topbar-never-close' id='avast-never-close'>X</div>",
          "<div class='topbar-never-icon' id='avast-never-icon' style='background-image: url({{neverLight}}) !important;'></div>",		
          "<div class='never-text-title'>{{neverTitle}}</div>",	
          "<div class='separator'></div>",
          "<div class='never-text-msg'>{{neverMsg1}}</div>",
          "<div class='never-text-msg'>{{neverMsg2}}</div>",
          "<div class='topbar-never-button' id='avast-btn-ok-reopen'>",
            "<label class='tb-b-r-text'>{{neverButton}}</label>",
          "</div>",
          "<div class='topbar-never-link' id='avast-link-close-forever'>{{neverLink}}</div>",
          "<div class='separator'></div>",
        "</div>",
      "</div>",
    "</div>"
  ],
  /**
   * Sidebar header and main container
   * Creates the WebRep UI on the top of the sidebar and the footer
   */
  header: [
  "<div class='avast_os_ext_header' style='background-color:{{color}}'>",
      "<div class='avast_os_ext_close' style='background-image:url({{close}})'></div>",
      "<div class='avast_os_ext_header_icon' style='background-image:url({{icon}})'>",
      "</div>",
      "<div class='avast_os_ext_header_text' >",
        "{{text}}",
      "</div>",
      "<div class='avast_os_ext_header_message' >",
        "{{message}}",
      "</div>",
      "<div class='avast_os_ext_header_buttons' >",
        "<div class='avast_os_ext_header_button_left' >{{btnLearn}}</div>",
        "<div class='avast_os_ext_header_button_right' >{{btnRate}}</div>",
      "</div>",
  "</div>",
  "<div class='avast_os_ext_middle_wrapper'  style='background: url({{logo}})' >",
    "<div class='avast_os_ext_middle'></div>",
  "</div>",
  "<div class='avast_os_ext_bottom'>",
    "<div class='avast_os_ext_footer'>",
      "<div class='avast_os_ext_full'>",
        "{{btnSettings}}",
      "</div>",
    "</div>",
  "</div>"
  ],
  /**
   * Template UI for DNT feature
   */
  dnt: [
    "<div class='avast_os_ext_headline' >",
        "{{headline}}",
    "</div>",
    "{{#elements}}",
      "<div class='avast_os_ext_dnt_group' data-type='{{type}}'>",
        "<div class='avast_os_ext_dnt_group_left' data-type='{{type_desc}}' data-strings='{{strings}}' title='{{text}}'>",
          "{{text}}",
        "</div>",
        "<div class='avast_os_ext_dnt_group_right' >",
          "<div class='avast_os_ext_dnt_group_right_wrapper' style='background-image:url({{wrapper}})' >",
            "<div class='avast_os_ext_dnt_group_right_text' style='background-image:url({{symbol}});' >",
              //"&#x2713;",
            "</div>",
            "<div class='avast_os_ext_dnt_group_right_text'>",
              "{{number}}",
            "</div>",
            "<div class='avast_os_ext_dnt_group_switcher' data-type='{{type}}' style='background-image:url({{switcher}}); {{position}}:-1px;'>",
            "</div>",
          "</div>",
        "</div>",
      "</div>",
      "<div class='avast_os_ext_dnt_companies' data-type='{{type}}'>",
        "<div class='avast_os_ext_dnt_arrow' style='left:245px; background-color: #f4f4f4 !important; '></div>",
        "{{#elements}}",
          "<div class='avast_os_ext_dnt_company' >",
            "<div class='avast_os_ext_dnt_company_name' >",
              "{{name}}",
            "</div>",
            "<div class='avast_os_ext_dnt_company_icon ",
                "avast_os_ext_{{#active}}green{{/active}}{{^active}}red{{/active}}_bubble_switch ",
                "{{#disabled}}avast_os_ext_grey_bubble_switch{{/disabled}}'",
                "data-type='{{type}}' data-trk-id='{{id}}' >",
              "<div class='avast_os_ext_dnt_company_icon_switch'></div>",
            "</div>",
          "</div>",
        "{{/elements}}",
      "</div>",
    "{{/elements}}",
  ],
  /**
   * Template UI for Rating/Voting - WebRep
   */
  rating: [
    "<div class='avast_os_ext_close' style='background-image:url({{close}})'></div>",
    "<div class='avast_os_ext_dnt_arrow' style='left:200px'></div>",
    "<div class='avast_os_ext_headline' >",
        "{{headline}}",
    "</div>",
    "{{#elements}}",
      "<div class='avast_os_ext_rating_group' style='background-color:{{color_left}}' >",
        "<div class='avast_os_ext_rating_group_left' title='{{title}}' ",
          "style='background-image:url({{image}}); background-color:{{color}}; ' ></div>",
        "<div class='avast_os_ext_rating_group_right' >",
          "{{text}}",
        "</div>",
      "</div>",
    "{{/elements}}",
    "<div class='avast_os_ext_item_footer' >",
        "{{footer}}",
    "</div>",
  ],
  /**
   * Template UI for extra details on Rating/Voting
   */
  ratingExtra: [
    "<div class='avast_os_ext_close' style='background-image:url({{close}})'></div>",
    "<div class='avast_os_ext_headline' >",
        "{{headline}}",
    "</div>",
    "{{#elements}}",
      "<div class='avast_os_ext_rating_extra_group' >",
        "<div class='avast_os_ext_rating_extra_group_left' data-flag='{{data}}'></div>",
        "<div class='avast_os_ext_rating_extra_group_right' >",
          "{{text}}",
        "</div>",
      "</div>",
    "{{/elements}}",
    "<div class='avast_os_ext_item_button' >",
        "{{button}}",
    "</div>",
  ],
  /**
   * Template UI for WebRep details - Learn More
   */
  details: [
    "<div class='avast_os_ext_close' style='background-image:url({{close}})'></div>",
    "<div class='avast_os_ext_dnt_arrow' style='left:75px'></div>",
    "<div class='avast_os_ext_headline' >",
        "{{headline}}",
    "</div>",
    "{{#elements}}",
      "<div class='avast_os_ext_details_group' >",
        "<div class='avast_os_ext_details_group_left' >",
          "{{text}}",
        "</div>",
        "<div class='avast_os_ext_details_group_right' title='{{title}}' ",
          "style='background-image:url({{image}}); background-color:{{color}}; ' ></div>",
      "</div>",
    "{{/elements}}",
  ],
  /**
   * Template UI for thanks message
   */
  thanks: [
    "<div class='avast_os_ext_close' style='background-image:url({{close}})'></div>",
    "<div class='avast_os_ext_middle_icon' style='background-image:url({{image}})'></div>",
    "<div class='avast_os_ext_headline' >",
      "{{headline}}",
      "<div class='avast_os_ext_headline_message' >",
        "{{message}}",
      "</div>",
    "</div>",
  ],
  /**
   * Template UI for all the message boxes - SiteCorrect, Phishing, Malware, Credit Card Warning
   */
  messageBox: [
    '<div id="aos-inpage" class="aos aos-overlay aos-injected">',
      '<div class="aos-modal">',
        '<header class="aos-section aos-footer aos-logo">',
          '<h2>',
            '<a href="http://www.avast.com" class="aos-logo" target="_blank">',
              '<span class="aos-logo-img" style="background-image: url({{logo}})"></span>',
              '<span class="aos-logo-text">Online Security</span>',
            '</a>',
          '</h2>',
        '</header>',
        '<section class="aos-section aos-section-noborder aos-section-{{status}} aos-text">',
          '<i class="aos-i aos-i-modal" style="background-image:url({{image}})"></i>',
          '<h1 id="avast-title">{{strings.header}}</h1>',
          '<p id="avast-body" class="aos-text-p-large">{{strings.message}}',
			'{{#phishing}}',
				'<img id="phishingImg" class="phishingImg" src="{{phishing}}"></img>',
				'<div id="phishHoverDiv" style="position: relative">',
					'<div id="phishcontainer" class="aos-tooltip">',
						'<div class="aos-tooltip-arrow"></div>',
						'<div id="phishRatingtext" class="aos-tooltip-text">{{phishingDesc}}</div>',
					'</div>',
				'</div>',
			 '{{/phishing}}',
		  '</p>',
        '</section>',
        '<section class="aos-section">',
          '<a href="" id="avast-action-proceed" class="aos-button aos-button-primary">{{strings.action_ok}}</a>',
          '<br>',
          '<a href="" id="avast-action-ignore" class="aos-link-black">{{strings.action_ignore}}</a>',
        '</section>',
        '{{#strings.extra}}',
        '<section class="aos-section aos-section-grey">',
          '<div  id="avast-extra" class="aos-form">',
            '<label><input type="checkbox" id="avast-extra-checkbox">{{strings.extra}}</label>',
          '</div>',
        '</section>',
        '{{/strings.extra}}',
      '</div>',
    '</div>'
  ],
  messageBoxOld: [
  "<div id='aos-inpage' class='avast-overlay' style='background: url({{background}})'>",
    "<div id='avast-inpage-box' class='avast-status-{{status}}'>",
      "<div class='avast-logo' style='background: url({{logo}})' ></div>",
      "<div id='avast-header' style='background-image:url({{image}})'></div>",
      "<div id='avast-title'>",
        "{{strings.header }}",
      "</div>",
    "<div id='avast-body'><p>{{strings.message}}</p>",
    "{{#strings.extra}}",
      "<div id='avast-extra'>",
          "<input type='checkbox' id='avast-extra-checkbox'></input>",
          "{{strings.extra }}",
      "</div>",
    "{{/strings.extra}}",
    "<div id='avast-actions'>",
      "<div id='avast-action-ignore'>{{strings.action_ignore}}</div>",
      "<div id='avast-action-proceed' class='avast-button",
        "{{^strings.action_ignore}} avast-action-proceed-only{{/strings.action_ignore}}'",
      ">{{strings.action_ok}}</div>",
    "</div>",
  "</div>"],

  /**
   * SERP hover template.
   */
  hover : [
    '<div id="wrccontainer" style="background: {{color}} url({{icon}})">',
      '<div id="wrcratingtext">{{rating}}</div>',
      '<div class="wrclogo"></div>',
    '</div>'
  ]
});
