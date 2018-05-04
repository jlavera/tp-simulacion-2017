/*******************************************************************************
 *
 *  avast! Safeprice
 *  (c) 2013 Avast Corp.
 *
 *  User settings functions to be used on the poppup and settings page
 *
 ******************************************************************************/

(function ($) {

	if (typeof AvastWRC == 'undefined') { AvastWRC = {}; }
	/**
	 * attaches all the DOM event handlers
	 * @return {void}
	 */
	AvastWRC.USettings = AvastWRC.USettings || {

		originalSettings: null,

		bind: function (data, originalSettings, tab) {
			AvastWRC.USettings.originalSettings = data.poppupSettings;
			AvastWRC.USettings.data = data;
			AvastWRC.USettings.tab = tab || {};

			AvastWRC.USettings.bindTitleEvents();			

			$("#avast-sas-popup-settings-close").click(function (e) {
				AvastWRC.USettings.ResetSettings(e, AvastWRC.USettings.data);
			});

			$("#avast-sas-popup-settings-cancel").click(function (e) {
				AvastWRC.USettings.ResetSettings(e, AvastWRC.USettings.data);
			});

			$("#sp-menu-notifications").click(function (e) {
				AvastWRC.USettings.SelectMenu(e, AvastWRC.USettings.data);
			});
			$("#sp-menu-help").click(function (e) {
				AvastWRC.USettings.SelectMenu(e, AvastWRC.USettings.data);
			});
			$("#sp-menu-customList").click(function (e) {
				AvastWRC.USettings.SelectMenu(e, AvastWRC.USettings.data);
			});

			$("#avast-sas-p-a-box-1").click(function (e) {
				AvastWRC.USettings.SelectOfferOptions(e, AvastWRC.USettings.data);
			});
			$("#avast-sas-p-a-box-2").click(function (e) {
				AvastWRC.USettings.SelectOfferOptions(e, AvastWRC.USettings.data);
			});
			$("#avast-sas-p-a-box-3").click(function (e) {
				AvastWRC.USettings.SelectOfferOptions(e, AvastWRC.USettings.data);
			});
			$("#avast-sas-p-g-box-1").click(function (e) {
				AvastWRC.USettings.SelectOfferOptions(e, AvastWRC.USettings.data);
			});

			$("#include-eShop-offers >").click(function (e) {
				AvastWRC.USettings.SelectOfferIncOptions(e, AvastWRC.USettings.data);
			});
			$("#include-accommodations-offers >").click(function (e) {
				AvastWRC.USettings.SelectOfferIncOptions(e, AvastWRC.USettings.data);
			});

			$("#avast-sas-p-a-box-4").click(function (e) {
				AvastWRC.USettings.SelectCouponsOptions(e, AvastWRC.USettings.data);
			});
			$("#avast-sas-p-a-box-5").click(function (e) {
				AvastWRC.USettings.SelectCouponsOptions(e, AvastWRC.USettings.data);
			});
			$("#avast-sas-p-g-box-2").click(function (e) {
				AvastWRC.USettings.SelectCouponsOptions(e, AvastWRC.USettings.data);
			});
			$("#avast-sas-p-a-box-6").click(function (e) {
				AvastWRC.USettings.SelectOthersOptions(e, AvastWRC.USettings.data);
			});

			$("#add-site-button-to-box").click(function (e) {
				AvastWRC.USettings.ShowAddSiteBox(e, AvastWRC.USettings.data);
			});

			$("#add-site-add").click(function (e) {
				AvastWRC.USettings.AddSite(e, AvastWRC.USettings.data);
			});
			$(".avast-sas-p-cl-box-element-close").click(function (e) {
				AvastWRC.USettings.RemoveSite(e, AvastWRC.USettings.data);
			});
			$("#add-site-cancel").click(function (e) {
				AvastWRC.USettings.ShowAddButton(e, AvastWRC.USettings.data);
			});

			$("#avast-sas-poppup-settings-save").click(function (e) {
				AvastWRC.USettings.SaveNewSettings(e, AvastWRC.USettings.data);
			});

			$(".asp-faqs-span").click(function (e) {
				AvastWRC.USettings.FAQsClick(e, AvastWRC.USettings.data);
			});

			$("#avast-sas-poppup-settings-save").mousedown(function (e) {
				e.preventDefault();
				AvastWRC.USettings.addRippleEffect(e, e.target.className);
			});

			$("#avast-sas-poppup-settings-save").hover(function (e) {
				e.preventDefault();
				$('#avast-sas-poppup-settings-save').removeClass('avast-sas-glowing');
			}, function(e) {
				e.preventDefault();
				if (data.poppupSettingsNew.menuOpt.notifications.settingsChanged
						|| data.poppupSettingsNew.menuOpt.customList.settingsChanged
						|| data.poppupSettingsNew.menuOpt.defaultMenuChanged) {
					$('#avast-sas-poppup-settings-save').addClass('avast-sas-glowing');
				}
			});

			$("#avast-sas-popup-settings-cancel").mousedown(function (e) {
				e.preventDefault();
				AvastWRC.USettings.addRippleEffect(e, e.target.className, "#f1f1f8");
			});
		},

		bindTitleEvents: function(){
			$('.avast-sas-middle-item-notifications').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.avast-sas-middle-item-custom-list').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.avast-sas-middle-item-help').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.avast-sas-radio-button-desc').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.avast-sas-radio-button-option-desc').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.avast-sas-check-box-desc').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.avast-sas-p-cl-title').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
			$('.avast-sas-help-title-desc').bind('mouseenter', function(e){
				AvastWRC.USettings.showTitle(e, AvastWRC.USettings.data);
			});
		},

		showTitle: function(e, data){
			var $this = $(e);
			$this[0].target.title = $this[0].target.innerText;
		},

		HoverSpecial: {
			active: false,
			timeoutId: null,
			hideOnTimeout: function () {
				$(".avast-sas-special-hover-box").removeClass("avast-sas-display-block");
				AvastWRC.USettings.HoverSpecial.timeoutId = null;
				AvastWRC.USettings.HoverSpecial.active = false;
			},	
			hoverIn: function (e) {
				if (AvastWRC.USettings.HoverSpecial.timeoutId) {
					clearTimeout(AvastWRC.USettings.HoverSpecial.timeoutId);
					AvastWRC.USettings.HoverSpecial.timeoutId = null;
				} else {
					var rect = e.target.getBoundingClientRect();
					var offset = $(".avast-sas-special-hover-box").offset();
					var left = e.pageX -137 - document.body.scrollLeft;
					$(".avast-sas-special-hover-box")[0].style.setProperty("left", left + "px", "important");
					$(".avast-sas-special-hover-box").addClass("avast-sas-display-block");
					AvastWRC.USettings.HoverSpecial.active = true;
				}
			},	
			hoverOut: function  (e) {
				if (!AvastWRC.USettings.HoverSpecial.timeoutId && AvastWRC.USettings.HoverSpecial.active) {
					AvastWRC.USettings.HoverSpecial.timeoutId = setTimeout(AvastWRC.USettings.HoverSpecial.hideOnTimeout, 200);
				}
			}
		},

		addRippleEffect: function (e, buttonClassName, rippleColor) {
			var bgColor = rippleColor;
			if(!bgColor){
				bgColor = "#034c1d";
			}
			if (!buttonClassName) return false;
			var target = e.target;
			var rect = target.getBoundingClientRect();
			var ripple = document.createElement('div');
			var max = Math.floor(Math.max(rect.width, rect.height) / 2);
			ripple.style.setProperty("height", max + "px", "important");
			ripple.style.setProperty("width", max + "px", "important");
			ripple.className = 'avast-sas-ripple-settings';
			target.appendChild(ripple);
			ripple.style.setProperty("zIndex", "-1", "important");
			var top = e.pageY - rect.top - ripple.offsetHeight / 2 - document.body.scrollTop;
			var left = e.pageX - rect.left - ripple.offsetWidth / 2 - document.body.scrollLeft;
			ripple.style.setProperty("top", top + "px", "important");
			ripple.style.setProperty("left", left + "px", "important");
			ripple.style.setProperty("background-color", bgColor, "important");
			$('.avast-sas-ripple-settings').addClass("animate");

			setTimeout(() => {
					$(".avast-sas-ripple-settings").remove()
			}, 3000)

			return false;
		},

		Close: function(data){

			AvastWRC.USettings.UnbindSettingsEvents();
			
			AvastWRC.USettings.feedback({
				type: 'settings_page',
				action: 'close_settings'
			});

			window.close();			
    	},
		
		UnbindSettingsEvents: function () {
			$("#avast-sas-popup-settings-close").unbind("click", AvastWRC.USettings.ResetSettings);
			$("#avast-sas-popup-settings-cancel").unbind("click", AvastWRC.USettings.ResetSettings);

			$("#sp-menu-notifications").unbind("click", AvastWRC.USettings.SelectMenu);
			$("#sp-menu-help").unbind("click", AvastWRC.USettings.SelectMenu);
			$("#sp-menu-customList").unbind("click", AvastWRC.USettings.SelectMenu);

			$("#avast-sas-p-a-box-1").unbind("click", AvastWRC.USettings.SelectOfferOptions);
			$("#avast-sas-p-a-box-2").unbind("click", AvastWRC.USettings.SelectOfferOptions);
			$("#avast-sas-p-a-box-3").unbind("click", AvastWRC.USettings.SelectOfferOptions);
			$("#avast-sas-p-g-box-1").unbind("click", AvastWRC.USettings.SelectOfferOptions);

			$("#avast-sas-p-a-box-6").unbind("click", AvastWRC.USettings.SelectOthersOptions);

			$("#include-eShop-offers").unbind("click", AvastWRC.USettings.SelectOfferIncOptions);
			$("#include-accommodations-offers").unbind("click", AvastWRC.USettings.SelectOfferIncOptions);

			$("#avast-sas-p-a-box-4").unbind("click", AvastWRC.USettings.SelectCouponsOptions);
			$("#avast-sas-p-a-box-5").unbind("click", AvastWRC.USettings.SelectCouponsOptions);
			$("#avast-sas-p-g-box-2").unbind("click", AvastWRC.USettings.SelectCouponsOptions);

			$("#add-site-button-to-box").unbind("click", AvastWRC.USettings.ShowAddSiteBox);

			$("#add-site-add").unbind("click", AvastWRC.USettings.AddSite);
			$(".avast-sas-p-cl-box-element-close").unbind("click", AvastWRC.USettings.RemoveSite);
			$("#add-site-cancel").unbind("click", AvastWRC.USettings.ShowAddButton);

			$("#avast-sas-poppup-settings-save").unbind("click", AvastWRC.USettings.SaveNewSettings);

			$(".asp-faqs-span").unbind("click", AvastWRC.USettings.FAQsClick);

			$("#avast-sas-poppup-settings-save").unbind("mousedown", AvastWRC.USettings.addRippleEffect);
			$("#avast-sas-popup-settings-cancel").unbind("mousedown", AvastWRC.USettings.addRippleEffect);
		},

		FAQsClick: function(e, data){
			AvastWRC.USettings.feedback({
				type: 'settings_page',
				action: 'faqs_clicked',
				domain: data.domain || "",
				campaignId: data.campaignId,
				showABTest: data.showABTest,
				referrer: data.referrer || "",
			});
		},

		ResetSettings: function (e, data) {
			e.preventDefault();
			var defaultSettings = AvastWRC.USettings.originalSettings;
			if (data.poppupSettingsNew.menuOpt.defaultMenuChanged == true) {
				data.poppupSettingsNew.menuOpt.defaultMenuChanged = false;
				data.poppupSettings.menuOpt.defaultMenuChanged = false;
				if(data.poppupSettingsNew.menuOpt.notifications.selected){
					AvastWRC.USettings.originalSettings.menuOpt.notifications.selected = true;
					AvastWRC.USettings.originalSettings.menuOpt.help.selected = false;
					AvastWRC.USettings.originalSettings.menuOpt.customList.selected = false;

					data.poppupSettings.menuOpt.notifications.selected = true;
					data.poppupSettings.menuOpt.help.selected = false;
					data.poppupSettings.menuOpt.customList.selected = false;

					data.poppupSettingsNew.menuOpt.notifications.selected = true;
					data.poppupSettingsNew.menuOpt.help.selected = false;
					data.poppupSettingsNew.menuOpt.customList.selected = false;
				}
				else if(data.poppupSettingsNew.menuOpt.help.selected){
					AvastWRC.USettings.originalSettings.menuOpt.notifications.selected = false;
					AvastWRC.USettings.originalSettings.menuOpt.help.selected = true;
					AvastWRC.USettings.originalSettings.menuOpt.customList.selected = false;

					data.poppupSettings.menuOpt.notifications.selected = false;
					data.poppupSettings.menuOpt.help.selected = true;
					data.poppupSettings.menuOpt.customList.selected = false;

					data.poppupSettingsNew.menuOpt.notifications.selected = false;
					data.poppupSettingsNew.menuOpt.help.selected = true;
					data.poppupSettingsNew.menuOpt.customList.selected = false;
				}
				else if(data.poppupSettingsNew.menuOpt.customList.selected){
					AvastWRC.USettings.menuOpt.notifications.selected = false;
					AvastWRC.USettings.menuOpt.help.selected = false;
					AvastWRC.USettings.menuOpt.customList.selected = true;

					data.poppupSettings.menuOpt.notifications.selected = false;
					data.poppupSettings.menuOpt.help.selected = false;
					data.poppupSettings.menuOpt.customList.selected = true;

					data.poppupSettingsNew.menuOpt.notifications.selected = false;
					data.poppupSettingsNew.menuOpt.help.selected = false;
					data.poppupSettingsNew.menuOpt.customList.selected = true;
				}
				AvastWRC.USettings.feedback({
					type: 'settings_page',
					action: 'save-new-menu-selection',
					domain: data.domain || "",
					campaignId: data.campaignId,
					showABTest: data.showABTest,
					referrer: data.referrer || "",
					newSettings: data.poppupSettingsNew.menuOpt,
					ispoppupSettings: data.ispoppupSettings
				});
			}
			if (data.poppupSettingsNew.menuOpt.notifications.settingsChanged){
				data.poppupSettingsNew.menuOpt.notifications.settingsChanged = false;
				data.poppupSettings.menuOpt.notifications.settingsChanged = false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.settingsChanged = false;

				if(defaultSettings.menuOpt.notifications.offers.item1Selected){
					data.poppupSettings.menuOpt.notifications.offers.item1Selected = true;
					data.poppupSettings.menuOpt.notifications.offers.item2Selected = false;
					data.poppupSettings.menuOpt.notifications.offers.item3Selected = false;
					data.poppupSettings.menuOpt.notifications.offers.item4Selected = false;
					
					data.poppupSettingsNew.menuOpt.notifications.offers.item1Selected = true;
					data.poppupSettingsNew.menuOpt.notifications.offers.item2Selected = false;
					data.poppupSettingsNew.menuOpt.notifications.offers.item3Selected = false;
					data.poppupSettingsNew.menuOpt.notifications.offers.item4Selected = false;
				}
				else if(defaultSettings.menuOpt.notifications.offers.item2Selected){
					data.poppupSettings.menuOpt.notifications.offers.item1Selected = false;
					data.poppupSettings.menuOpt.notifications.offers.item2Selected = true;
					data.poppupSettings.menuOpt.notifications.offers.item3Selected = false;
					data.poppupSettings.menuOpt.notifications.offers.item4Selected = false;
					
					data.poppupSettingsNew.menuOpt.notifications.offers.item1Selected = false;
					data.poppupSettingsNew.menuOpt.notifications.offers.item2Selected = true;
					data.poppupSettingsNew.menuOpt.notifications.offers.item3Selected = false;
					data.poppupSettingsNew.menuOpt.notifications.offers.item4Selected = false;
				}
				else if(defaultSettings.menuOpt.notifications.offers.item3Selected){
					data.poppupSettings.menuOpt.notifications.offers.item1Selected = false;
					data.poppupSettings.menuOpt.notifications.offers.item2Selected = false;
					data.poppupSettings.menuOpt.notifications.offers.item3Selected = true;
					data.poppupSettings.menuOpt.notifications.offers.item4Selected = true;
					
					data.poppupSettingsNew.menuOpt.notifications.offers.item1Selected = false;
					data.poppupSettingsNew.menuOpt.notifications.offers.item2Selected = false;
					data.poppupSettingsNew.menuOpt.notifications.offers.item3Selected = true;
					data.poppupSettingsNew.menuOpt.notifications.offers.item4Selected = true;
				}
				if(defaultSettings.menuOpt.notifications.offers.include.eShop){
					data.poppupSettings.menuOpt.notifications.offers.include.eShop = true;
					data.poppupSettingsNew.menuOpt.notifications.offers.include.eShop = true;
				}
				if(defaultSettings.menuOpt.notifications.offers.include.accommodations){
					data.poppupSettings.menuOpt.notifications.offers.include.accommodations = true;
					data.poppupSettingsNew.menuOpt.notifications.offers.include.accommodations = true;
				}				
				if(defaultSettings.menuOpt.notifications.coupons.item1Selected){
					data.poppupSettings.menuOpt.notifications.coupons.item1Selected = true;
					data.poppupSettings.menuOpt.notifications.coupons.item2Selected = false;
					data.poppupSettings.menuOpt.notifications.coupons.item3Selected = false;
					
					data.poppupSettingsNew.menuOpt.notifications.coupons.item1Selected = true;
					data.poppupSettingsNew.menuOpt.notifications.coupons.item2Selected = false;
					data.poppupSettingsNew.menuOpt.notifications.coupons.item3Selected = false;
				}
				else if(defaultSettings.menuOpt.notifications.coupons.item2Selected){
					data.poppupSettings.menuOpt.notifications.coupons.item1Selected = false;
					data.poppupSettings.menuOpt.notifications.coupons.item2Selected = true;
					data.poppupSettings.menuOpt.notifications.coupons.item3Selected = false;
					
					data.poppupSettingsNew.menuOpt.notifications.coupons.item1Selected = false;
					data.poppupSettingsNew.menuOpt.notifications.coupons.item2Selected = true;
					data.poppupSettingsNew.menuOpt.notifications.coupons.item3Selected = false;
				}
			}
			if (data.poppupSettingsNew.menuOpt.customList.settingsChanged) {
				//reset all elements
				data.poppupSettingsNew.menuOpt.customList.whiteList = defaultSettings.menuOpt.customList.whiteList.slice(0);
				data.poppupSettings.menuOpt.customList.whiteList = defaultSettings.menuOpt.customList.whiteList.slice(0);
			}
			AvastWRC.USettings.Close(data);
		},

		SelectMenu: function (e, data) {
			e.preventDefault();
			console.log("SelectMenu");
			if (e.target.id.indexOf("notifications") != -1) {
				$('#sp-menu-notifications').removeClass('avast-sas-middle-item-notifications').addClass('avast-sas-middle-item-notifications-selected');
				$('#sp-menu-help').removeClass('avast-sas-middle-item-help-selected').addClass('avast-sas-middle-item-help');
				$('#sp-menu-customList').removeClass('avast-sas-middle-item-custom-list-selected').addClass('avast-sas-middle-item-custom-list');

				$('#sp-panel-notifications-options').addClass('avast-sas-display-grid');
				$('#sp-panel-help-options').removeClass('avast-sas-display-grid');
				$('#sp-panel-customList-options').removeClass('avast-sas-display-grid');

				data.poppupSettingsNew.menuOpt.notifications.selected = true;
				data.poppupSettingsNew.menuOpt.help.selected = false;
				data.poppupSettingsNew.menuOpt.customList.selected = false;

			}
			else if (e.target.id.indexOf("help") != -1) {
				$('#sp-menu-notifications').removeClass('avast-sas-middle-item-notifications-selected').addClass('avast-sas-middle-item-notifications');
				$('#sp-menu-help').removeClass('avast-sas-middle-item-help').addClass('avast-sas-middle-item-help-selected');
				$('#sp-menu-customList').removeClass('avast-sas-middle-item-custom-list-selected').addClass('avast-sas-middle-item-custom-list');

				$('#sp-panel-help-options').addClass('avast-sas-display-grid');
				$('#sp-panel-notifications-options').removeClass('avast-sas-display-grid');
				$('#sp-panel-customList-options').removeClass('avast-sas-display-grid');

				data.poppupSettingsNew.menuOpt.help.selected = true;
				data.poppupSettingsNew.menuOpt.customList.selected = false;
				data.poppupSettingsNew.menuOpt.notifications.selected = false;
			}
			else if (e.target.id.indexOf("customList") != -1) {
				$('#sp-menu-notifications').removeClass('avast-sas-middle-item-notifications-selected').addClass('avast-sas-middle-item-notifications');
				$('#sp-menu-help').removeClass('avast-sas-middle-item-help-selected').addClass('avast-sas-middle-item-help');
				$('#sp-menu-customList').removeClass('avast-sas-middle-item-custom-list').addClass('avast-sas-middle-item-custom-list-selected');

				$('#sp-panel-customList-options').addClass('avast-sas-display-grid');
				$('#sp-panel-help-options').removeClass('avast-sas-display-grid');
				$('#sp-panel-notifications-options').removeClass('avast-sas-display-grid');

				data.poppupSettingsNew.menuOpt.customList.selected = true;
				data.poppupSettingsNew.menuOpt.help.selected = false;
				data.poppupSettingsNew.menuOpt.notifications.selected = false;

			}
			if (data.poppupSettings.menuOpt.notifications.selected == data.poppupSettingsNew.menuOpt.notifications.selected
				&& data.poppupSettings.menuOpt.help.selected == data.poppupSettingsNew.menuOpt.help.selected
				&& data.poppupSettings.menuOpt.customList.selected == data.poppupSettingsNew.menuOpt.customList.selected) {
				data.poppupSettingsNew.menuOpt.defaultMenuChanged = false;
				console.log("SelectMenu changed to default");
			}
			else /*something changed here*/ {
				data.poppupSettings.menuOpt.notifications.selected = data.poppupSettingsNew.menuOpt.notifications.selected;
				data.poppupSettings.menuOpt.help.selected = data.poppupSettingsNew.menuOpt.help.selected;
				data.poppupSettings.menuOpt.customList.selected = data.poppupSettingsNew.menuOpt.customList.selected;
				AvastWRC.USettings.feedback({
					type: 'settings_page',
					action: 'save-new-menu-selection',
					domain: data.domain || "",
					campaignId: data.campaignId,
					showABTest: data.showABTest,
					referrer: data.referrer || "",
					newSettings: data.poppupSettingsNew.menuOpt,
					ispoppupSettings: data.ispoppupSettings
				});
				console.log("SelectMenu changed");
			}
		},

		SelectGeneralOptions: function (e, data) {
			console.log("SelectGeneralOptions");
			if (e.target.id.indexOf("box-1") != -1 || e.currentTarget.id.indexOf("box-1") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.item1Selected = true;
				data.poppupSettingsNew.menuOpt.notifications.item2Selected = false;

				$('#avast-sas-p-g-box-1').removeClass('avast-sas-p-g-box-1').addClass('avast-sas-p-g-box-1-selected');
				$('#avast-sas-p-g-box-2').removeClass('avast-sas-p-g-box-2-selected').addClass('avast-sas-p-g-box-2');
			}
			else if (e.target.id.indexOf("box-2") != -1 || e.currentTarget.id.indexOf("box-2") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.item2Selected = true;
				data.poppupSettingsNew.menuOpt.notifications.item1Selected = false;

				$('#avast-sas-p-g-box-2').removeClass('avast-sas-p-g-box-2').addClass('avast-sas-p-g-box-2-selected');
				$('#avast-sas-p-g-box-1').removeClass('avast-sas-p-g-box-1-selected').addClass('avast-sas-p-g-box-1');
			}
			if (data.poppupSettings.menuOpt.notifications.item1Selected == data.poppupSettingsNew.menuOpt.notifications.item1Selected
				&& data.poppupSettings.menuOpt.notifications.item2Selected == data.poppupSettingsNew.menuOpt.notifications.item2Selected) {
				data.poppupSettingsNew.menuOpt.notifications.settingsChanged = false;
				console.log("SelectGeneralOptions changed to default");
				$('#avast-sas-poppup-settings-save').removeClass('avast-sas-glowing');
			}
			else/*something changed here*/ {
				data.poppupSettingsNew.menuOpt.notifications.settingsChanged = true;
				console.log("SelectGeneralOptions changed");
				$('#avast-sas-poppup-settings-save').addClass('avast-sas-glowing');
			}
		},

		AdvancedOptionsChanges: function (e, data) {
			if (data.poppupSettings.menuOpt.notifications.offers.item1Selected == data.poppupSettingsNew.menuOpt.notifications.offers.item1Selected
				&& data.poppupSettings.menuOpt.notifications.offers.item2Selected == data.poppupSettingsNew.menuOpt.notifications.offers.item2Selected
				&& data.poppupSettings.menuOpt.notifications.offers.item3Selected == data.poppupSettingsNew.menuOpt.notifications.offers.item3Selected
				&& data.poppupSettings.menuOpt.notifications.offers.include.eShop == data.poppupSettingsNew.menuOpt.notifications.offers.include.eShop
				&& data.poppupSettings.menuOpt.notifications.offers.include.accommodations == data.poppupSettingsNew.menuOpt.notifications.offers.include.accommodations
				&& data.poppupSettings.menuOpt.notifications.offers.include.special == data.poppupSettingsNew.menuOpt.notifications.offers.include.special
				&& data.poppupSettings.menuOpt.notifications.coupons.item1Selected == data.poppupSettingsNew.menuOpt.notifications.coupons.item1Selected
				&& data.poppupSettings.menuOpt.notifications.coupons.item2Selected == data.poppupSettingsNew.menuOpt.notifications.coupons.item2Selected
				&& data.poppupSettings.menuOpt.notifications.others.item1Selected == data.poppupSettingsNew.menuOpt.notifications.others.item1Selected) {
				data.poppupSettingsNew.menuOpt.notifications.settingsChanged = false;
				console.log("AdvancedOptionsChanges changed to default or never changed");
				$('#avast-sas-poppup-settings-save').removeClass('avast-sas-glowing');
			}
			else/*something changed here*/ {
				data.poppupSettingsNew.menuOpt.notifications.settingsChanged = true;
				console.log("AdvancedOptionsChanges changed");
				$('#avast-sas-poppup-settings-save').addClass('avast-sas-glowing');
			}
		},

		SelectOfferOptions: function (e, data) {
			console.log("SelectOfferOptions");
			if (e.target.id.indexOf("p-a-box-1") != -1 || e.currentTarget.id.indexOf("p-a-box-1") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.offers.item1Selected = true;
				data.poppupSettingsNew.menuOpt.notifications.offers.item2Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.item3Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.item4Selected = false;

				$('#avast-sas-p-a-box-1').removeClass('avast-sas-p-a-box-1').addClass('avast-sas-p-a-box-1-selected');
				$('#avast-sas-p-a-box-2').removeClass('avast-sas-p-a-box-2-selected').addClass('avast-sas-p-a-box-2');
				$('#avast-sas-p-a-box-3').removeClass('avast-sas-p-a-box-3-selected').addClass('avast-sas-p-a-box-3');
				$('#avast-sas-p-g-box-1').removeClass('avast-sas-p-g-box-1-selected').addClass('avast-sas-p-g-box-1');
			}
			else if (e.target.id.indexOf("p-a-box-2") != -1 || e.currentTarget.id.indexOf("p-a-box-2") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.offers.item1Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.item2Selected = true;
				data.poppupSettingsNew.menuOpt.notifications.offers.item3Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.item4Selected = false;

				$('#avast-sas-p-a-box-1').removeClass('avast-sas-p-a-box-1-selected').addClass('avast-sas-p-a-box-1');
				$('#avast-sas-p-a-box-2').removeClass('avast-sas-p-a-box-2').addClass('avast-sas-p-a-box-2-selected');
				$('#avast-sas-p-a-box-3').removeClass('avast-sas-p-a-box-3-selected').addClass('avast-sas-p-a-box-3');
				$('#avast-sas-p-g-box-1').removeClass('avast-sas-p-g-box-1-selected').addClass('avast-sas-p-g-box-1');
			}
			else if (e.target.id.indexOf("p-a-box-3") != -1 || e.currentTarget.id.indexOf("p-a-box-3") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.offers.item1Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.item2Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.item3Selected = true;
				data.poppupSettingsNew.menuOpt.notifications.offers.item4Selected = false;

				$('#avast-sas-p-a-box-1').removeClass('avast-sas-p-a-box-1-selected').addClass('avast-sas-p-a-box-1');
				$('#avast-sas-p-a-box-2').removeClass('avast-sas-p-a-box-2-selected').addClass('avast-sas-p-a-box-2');
				$('#avast-sas-p-a-box-3').removeClass('avast-sas-p-a-box-3').addClass('avast-sas-p-a-box-3-selected');
				$('#avast-sas-p-g-box-1').removeClass('avast-sas-p-g-box-1-selected').addClass('avast-sas-p-g-box-1');
			}
			else if (e.target.id.indexOf("p-g-box-1") != -1 || e.currentTarget.id.indexOf("p-g-box-1") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.offers.item1Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.item2Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.item3Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.offers.item4Selected = true;

				$('#avast-sas-p-a-box-1').removeClass('avast-sas-p-a-box-1-selected').addClass('avast-sas-p-a-box-1');
				$('#avast-sas-p-a-box-2').removeClass('avast-sas-p-a-box-2-selected').addClass('avast-sas-p-a-box-2');
				$('#avast-sas-p-a-box-3').removeClass('avast-sas-p-a-box-3-selected').addClass('avast-sas-p-a-box-3');
				$('#avast-sas-p-g-box-1').removeClass('avast-sas-p-g-box-1').addClass('avast-sas-p-g-box-1-selected');
			}
			AvastWRC.USettings.AdvancedOptionsChanges(e, data);
		},

		SelectCouponsOptions: function (e, data) {
			console.log("SelectCouponsOptions");
			if (e.target.id.indexOf("p-a-box-4") != -1 || e.currentTarget.id.indexOf("p-a-box-4") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.coupons.item1Selected = true;
				data.poppupSettingsNew.menuOpt.notifications.coupons.item2Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.coupons.item3Selected = false;

				$('#avast-sas-p-a-box-4').removeClass('avast-sas-p-a-box-4').addClass('avast-sas-p-a-box-4-selected');
				$('#avast-sas-p-a-box-5').removeClass('avast-sas-p-a-box-5-selected').addClass('avast-sas-p-a-box-5');
				$('#avast-sas-p-g-box-2').removeClass('avast-sas-p-g-box-2-selected').addClass('avast-sas-p-g-box-2');
			}
			else if (e.target.id.indexOf("p-a-box-5") != -1 || e.currentTarget.id.indexOf("p-a-box-5") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.coupons.item1Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.coupons.item2Selected = true;
				data.poppupSettingsNew.menuOpt.notifications.coupons.item3Selected = false;

				$('#avast-sas-p-a-box-4').removeClass('avast-sas-p-a-box-4-selected').addClass('avast-sas-p-a-box-4');
				$('#avast-sas-p-a-box-5').removeClass('avast-sas-p-a-box-5').addClass('avast-sas-p-a-box-5-selected');
				$('#avast-sas-p-g-box-2').removeClass('avast-sas-p-g-box-2-selected').addClass('avast-sas-p-g-box-2');

			}
			else if (e.target.id.indexOf("p-g-box-2") != -1 || e.currentTarget.id.indexOf("p-g-box-2") != -1) {
				data.poppupSettingsNew.menuOpt.notifications.coupons.item1Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.coupons.item2Selected = false;
				data.poppupSettingsNew.menuOpt.notifications.coupons.item3Selected = true;

				$('#avast-sas-p-a-box-4').removeClass('avast-sas-p-a-box-4-selected').addClass('avast-sas-p-a-box-4');
				$('#avast-sas-p-a-box-5').removeClass('avast-sas-p-a-box-5-selected').addClass('avast-sas-p-a-box-5');
				$('#avast-sas-p-g-box-2').removeClass('avast-sas-p-g-box-2').addClass('avast-sas-p-g-box-2-selected');
				
			}
			AvastWRC.USettings.AdvancedOptionsChanges(e, data);
		},

		SelectOfferIncOptions: function (e, data) {
			console.log("SelectOfferIncOptions");
			if (e.target.id.indexOf("include-eShop-offers") != -1 || e.currentTarget.parentElement.id.indexOf("include-eShop-offers") != -1) {
				if (data.poppupSettingsNew.menuOpt.notifications.offers.include.eShop) {
					data.poppupSettingsNew.menuOpt.notifications.offers.include.eShop = false;
					$('#include-eShop-offers-checkbox').attr("src", data.poppupSettings.images.checkbox);
				} else {
					data.poppupSettingsNew.menuOpt.notifications.offers.include.eShop = true;
					$('#include-eShop-offers-checkbox').attr("src", data.poppupSettings.images.checkboxChecked);
				}
			}
			else if (e.target.id.indexOf("include-accommodations-offers") != -1 || e.currentTarget.parentElement.id.indexOf("include-accommodations-offers") != -1) {
				if (data.poppupSettingsNew.menuOpt.notifications.offers.include.accommodations) {
					data.poppupSettingsNew.menuOpt.notifications.offers.include.accommodations = false;
					$('#include-accommodations-offers-checkbox').attr("src", data.poppupSettings.images.checkbox);
				} else {
					data.poppupSettingsNew.menuOpt.notifications.offers.include.accommodations = true;
					$('#include-accommodations-offers-checkbox').attr("src", data.poppupSettings.images.checkboxChecked);
				}
			}
			AvastWRC.USettings.AdvancedOptionsChanges(e, data);
		},
		SelectOthersOptions: function (e, data) {
			console.log("SelectOthersOptions");
			if (e.target.id.indexOf("p-a-box-6") != -1 || e.currentTarget.id.indexOf("p-a-box-6") != -1) {
				if (data.poppupSettingsNew.menuOpt.notifications.others.item1Selected) {
					data.poppupSettingsNew.menuOpt.notifications.others.item1Selected = false;
					$('#include-others-checkbox').attr("src", data.poppupSettings.images.checkbox);
				} else {
					data.poppupSettingsNew.menuOpt.notifications.others.item1Selected = true;
					$('#include-others-checkbox').attr("src", data.poppupSettings.images.checkboxChecked);
				}
			}
			
			AvastWRC.USettings.AdvancedOptionsChanges(e, data);
		},

		getDomainFromUrl: function (url){
			function getHostFromUrl(url) {
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
			}
			function getDomainFromHost(host){
				return host ? host.split(".").slice(-2).join(".") : undefined;
			}

			return getDomainFromHost(getHostFromUrl(url));
		}, 
		ShowAddSiteBox: function (e, data) {
			e.preventDefault();
			$('#add-site-button-to-box').removeClass('avast-sas-display-block');
			$('#add-site-box').addClass('avast-sas-display-block');
			$('.avast-sas-p-cl-add-site-text').keypress(function (e) {
				var key = e.which;
				if(key == 13) { //13 enter key
				AvastWRC.USettings.AddSite(e,AvastWRC.USettings.data);
				   return false;  
				}
			});
			$('.avast-sas-p-cl-add-site-text').bind('copy paste', function (e) {
				e.preventDefault();
				var val = e.originalEvent.clipboardData.getData('text/plain');
				var domain = "";
				if(val){
					domain = AvastWRC.USettings.getDomainFromUrl(val);
				}
				if(domain){
					$('.avast-sas-p-cl-add-site-text').val(domain);
				}else{
					$('.avast-sas-p-cl-add-site-text').val(val);
				}
			});
			$("#new-site-name").focus();
		},

		AddSite: function (e, data) {
			var site = $(".avast-sas-p-cl-add-site-text")[0].value.toLowerCase();
			site = site.replace(/↵/g, "");
			site = site.replace(" ", "");
			function checkList(item) {
				return ((item.indexOf(site) != -1) || (site.indexOf(item) != -1));
			}
			if (!site || site == "") {
				AvastWRC.USettings.ShowAddButton(e, data);
			}
			else if (data.poppupSettingsNew.menuOpt.customList.whiteList.findIndex(checkList) == -1) {
				data.poppupSettingsNew.menuOpt.customList.whiteList.push(site);
				data.poppupSettingsNew.menuOpt.customList.settingsChanged = true;
				$('.avast-sas-p-cl-sites-box').append(
					Mustache.render(AvastWRC.Templates.whiteListElement,
						{ site: site, icon: data.poppupSettings.images.erase }));
				$(".avast-sas-p-cl-box-element-close").unbind("click", AvastWRC.USettings.RemoveSite);
				$(".avast-sas-p-cl-box-element-close").click(function (e) {
					AvastWRC.USettings.RemoveSite(e, data);
				});
				$('#avast-sas-poppup-settings-save').addClass('avast-sas-glowing');
				AvastWRC.USettings.ShowAddButton(e, data);
			}
			AvastWRC.USettings.ShowAddButton(e, data);
		},

		RemoveSite: function (e, data) {
			var site = e.currentTarget.parentElement.firstElementChild.innerText.toLowerCase();
			site = site.replace(/↵/g, "");
			site = site.replace(" ", "");
			function checkList(item) {
				return (item.indexOf(site) != -1);
			}
			var index = data.poppupSettingsNew.menuOpt.customList.whiteList.findIndex(checkList);
			if (index != -1) {
				data.poppupSettingsNew.menuOpt.customList.whiteList.splice(index, 1);
				data.poppupSettingsNew.menuOpt.customList.settingsChanged = true;
				var parent = document.getElementsByClassName('avast-sas-p-cl-sites-box');
				var elem = e.currentTarget.parentElement;
				parent[0].removeChild(elem);
				$('#avast-sas-poppup-settings-save').addClass('avast-sas-glowing');
			}
			AvastWRC.USettings.ShowAddButton(e, data);
		},

		ShowAddButton: function (e, data) {
			$(".avast-sas-p-cl-add-site-text")[0].value = "";
			$('.avast-sas-p-cl-add-site-text').unbind('copy paste');
			$('#add-site-button-to-box').addClass('avast-sas-display-block');
			$('#add-site-box').removeClass('avast-sas-display-block');
		},

		SaveNewSettings: function (e, data) {
			e.preventDefault();
			var eventSent = false;
			if (data.poppupSettingsNew.menuOpt.notifications.settingsChanged) {
				data.poppupSettings.menuOpt.notifications.offers.item1Selected = data.poppupSettingsNew.menuOpt.notifications.offers.item1Selected ? true : false;
				data.poppupSettings.menuOpt.notifications.offers.item2Selected = data.poppupSettingsNew.menuOpt.notifications.offers.item2Selected ? true : false;
				data.poppupSettings.menuOpt.notifications.offers.item3Selected = data.poppupSettingsNew.menuOpt.notifications.offers.item3Selected ? true : false;
				data.poppupSettings.menuOpt.notifications.offers.item4Selected = data.poppupSettingsNew.menuOpt.notifications.offers.item4Selected ? true : false;
				data.poppupSettings.menuOpt.notifications.offers.include.eShop = data.poppupSettingsNew.menuOpt.notifications.offers.include.eShop ? true : false;
				data.poppupSettings.menuOpt.notifications.offers.include.accommodations = data.poppupSettingsNew.menuOpt.notifications.offers.include.accommodations ? true : false;
				data.poppupSettings.menuOpt.notifications.coupons.item1Selected = data.poppupSettingsNew.menuOpt.notifications.coupons.item1Selected ? true : false;
				data.poppupSettings.menuOpt.notifications.coupons.item2Selected = data.poppupSettingsNew.menuOpt.notifications.coupons.item2Selected ? true : false;
				data.poppupSettings.menuOpt.notifications.coupons.item3Selected = data.poppupSettingsNew.menuOpt.notifications.coupons.item3Selected ? true : false;
				
				AvastWRC.USettings.originalSettings.menuOpt.notifications.offers.item1Selected = data.poppupSettingsNew.menuOpt.notifications.offers.item1Selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.offers.item2Selected = data.poppupSettingsNew.menuOpt.notifications.offers.item2Selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.offers.item3Selected = data.poppupSettingsNew.menuOpt.notifications.offers.item3Selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.offers.item4Selected = data.poppupSettingsNew.menuOpt.notifications.offers.item4Selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.offers.include.eShop = data.poppupSettingsNew.menuOpt.notifications.offers.include.eShop ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.offers.include.accommodations = data.poppupSettingsNew.menuOpt.notifications.offers.include.accommodations ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.coupons.item1Selected = data.poppupSettingsNew.menuOpt.notifications.coupons.item1Selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.coupons.item2Selected = data.poppupSettingsNew.menuOpt.notifications.coupons.item2Selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.coupons.item3Selected = data.poppupSettingsNew.menuOpt.notifications.coupons.item3Selected ? true : false;

			}
			if (data.poppupSettingsNew.menuOpt.customList.settingsChanged) {
				data.poppupSettings.menuOpt.customList.whiteList = data.poppupSettingsNew.menuOpt.customList.whiteList.slice();
				AvastWRC.USettings.originalSettings.menuOpt.customList.whiteList = data.poppupSettingsNew.menuOpt.customList.whiteList.slice();
				data.poppupSettings.menuOpt.customList.whiteList.sort();
				AvastWRC.USettings.originalSettings.menuOpt.customList.whiteList.sort();
			}
			if (data.poppupSettingsNew.menuOpt.defaultMenuChanged) {
				data.poppupSettings.menuOpt.notifications.selected = data.poppupSettingsNew.menuOpt.notifications.selected ? true : false;
				data.poppupSettings.menuOpt.help.selected = data.poppupSettingsNew.menuOpt.help.selected ? true : false;
				data.poppupSettings.menuOpt.customList.selected = data.poppupSettingsNew.menuOpt.customList.selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.notifications.selected = data.poppupSettingsNew.menuOpt.notifications.selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.help.selected = data.poppupSettingsNew.menuOpt.help.selected ? true : false;
				AvastWRC.USettings.originalSettings.menuOpt.customList.selected = data.poppupSettingsNew.menuOpt.customList.selected ? true : false;
			}

			if (data.poppupSettingsNew.menuOpt.notifications.settingsChanged
				|| data.poppupSettingsNew.menuOpt.customList.settingsChanged
				|| data.poppupSettingsNew.menuOpt.defaultMenuChanged) {

				var customListChanged = data.poppupSettingsNew.menuOpt.customList.settingsChanged;

				AvastWRC.USettings.feedback({
					type: 'settings_page',
					action: 'save-settings',
					domain: data.domain || "",
					campaignId: data.campaignId,
					showABTest: data.showABTest,
					referrer: data.referrer || "",
					newSettings: data.poppupSettingsNew.menuOpt,
					customListChanged: customListChanged,
					ispoppupSettings: data.ispoppupSettings
				});
				eventSent = true;

				data.poppupSettingsNew.menuOpt.defaultMenuChanged = false;
				data.poppupSettingsNew.menuOpt.notifications.settingsChanged = false;
				data.poppupSettingsNew.menuOpt.help.settingsChanged = false;
				data.poppupSettingsNew.menuOpt.customList.settingsChanged = false;

				$('#avast-sas-poppup-settings-save').removeClass('avast-sas-glowing');
				
			}
			AvastWRC.USettings.Close(data);
			console.log("SaveNewSettings save settings data");
		},

		feedback: function (data) {
			var data = data || {};
            data.message = 'safeShopFeedback';
			data.tab = AvastWRC.USettings.tab;
            chrome.runtime.sendMessage(data);
		}
	};

	AvastWRC.USettings = AvastWRC.USettings;

}).call(this, $);
