(function(_, AvastWRC, EventEmitter) {
	
	var PROTO = AvastWRC.PROTO;

	if(typeof(PROTO) === 'undefined') PROTO = {};

	var Burger = {	
		GLOBAL: {
			RECORD_PROTOVERSION: 15, 
			IDENTITY_GUID: "",
			PRODUCT_CODE: 93, //https://cml.avast.com/display/FF/Avast+Analytics+Product+Code
			PRODUCT_VARIANT: null, //Avast or AVG variant of safeprice: Avast = 0 AVG = 1
			PRODUCT_VERSION: "",
			PRODUCT_INTERNALVERSION: "",
			PRODUCT_PLATAFORM: 0,
			PRODUCT_PLATAFORMVERSION: "",
			INIT_ME_CALLED: false, //to know if we have all we need to send to burger
			ENV: 0
		},
		Gpb : {},				  
		Collection: {
			events: {
				BATCH_MAX_MESSAGES: 20,
			}
		},
		Query: {}
	};

	Burger.initGlobalData = function(_data, _sendAll){
		var data = _data;
		var sendAll = _sendAll;
		Burger.GLOBAL.ENV = AvastWRC.getWindowStorage("server_burger") || AvastWRC.getWindowStorage("server") || 0;
		Burger.Collection.events.BATCH_MAX_MESSAGES = AvastWRC.getWindowStorage("max_burger_messages") || 20;
		if (Burger.GLOBAL.INIT_ME_CALLED){						
			Burger.mergeGlobalData(data);
		}else{
			Burger.GLOBAL.IDENTITY_GUID = data.guid;
			Burger.GLOBAL.PRODUCT_VARIANT = data.variant;
			Burger.GLOBAL.PRODUCT_VERSION = data.version;
			Burger.GLOBAL.PRODUCT_INTERNALVERSION = data.internal_version;
			Burger.GLOBAL.PRODUCT_PLATAFORM = data.platform;
			Burger.GLOBAL.PRODUCT_PLATAFORMVERSION = data.platform_version;
			Burger.GLOBAL.INIT_ME_CALLED = true;
			//console.log("initGlobalData: " + JSON.stringify(Burger.GLOBAL));
		}

		Burger.Storage.getValue("BE")
		.then(function(value){
			if (!value) {
				Burger.Collection.events.eventList = [];
				console.log("BURGER-> no value in localstorage");
			}else  if (value){				
				Burger.Collection.events.eventList = JSON.parse(value);
				console.log("BURGER-> " + Burger.Collection.events.eventList.length + " events restored from localstorage");
			}
			AvastWRC.Burger.emitEvent("burger.sendAll", sendAll);
		})
		.catch(function(reason){
			Burger.Collection.events.eventList = Burger.Collection.events.eventList || [];
			console.log("BURGER-> empty or error on load from localstorage");
			AvastWRC.Burger.emitEvent("burger.sendAll", sendAll);
		});
	};			

	Burger.mergeGlobalData = function(data){
		//console.log("before mergeGlobalData: " + JSON.stringify(Burger.GLOBAL));
		if (Burger.GLOBAL.IDENTITY_GUID != data.guid) Burger.GLOBAL.IDENTITY_GUID = data.guid;
		if(Burger.GLOBAL.PRODUCT_VARIANT != data.variant) Burger.GLOBAL.PRODUCT_VARIANT = data.variant;
		if(Burger.GLOBAL.PRODUCT_VERSION != data.version) Burger.GLOBAL.PRODUCT_VERSION = data.version;
		if(Burger.GLOBAL.PRODUCT_INTERNALVERSION != data.internal_version) Burger.GLOBAL.PRODUCT_INTERNALVERSION = data.internal_version;
		if(Burger.GLOBAL.PRODUCT_PLATAFORM != data.platform) Burger.GLOBAL.PRODUCT_PLATAFORM = data.platform;
		if(Burger.GLOBAL.PRODUCT_PLATAFORMVERSION != data.platform_version) Burger.GLOBAL.PRODUCT_PLATAFORMVERSION = data.platform_version;
		//console.log("after mergeGlobalData: " + JSON.stringify(Burger.GLOBAL));
	};  
	/**
	* Fuction to define Gpb type
	*/
	Burger.Gpb.GpbType = function(id, multilicity, typeFunc) {
		return {
			options: {},
			multiplicity: multilicity || PROTO.optional,
			type: typeFunc,
			id: id
		};
	},

	/* Gpb Definition helper */ 
	_.extend(Burger.Gpb, {
		GPBD : {
			bytes: function(id, repeated) {
				return Burger.Gpb.GpbType(id, repeated, function() { return PROTO.bytes; } );
			},
			string: function(id, repeated) {
				return Burger.Gpb.GpbType(id, repeated, function() { return PROTO.string; } );
			},
			bool: function(id, repeated) {
				return Burger.Gpb.GpbType(id, repeated, function() { return PROTO.bool; } );
			},
			sint32: function(id, repeated) {
				return Burger.Gpb.GpbType(id, repeated, function() { return  PROTO.sint32; } );
			},
			sint64: function(id, repeated) {
				return Burger.Gpb.GpbType(id, repeated, function() { return  PROTO.sint64; } );
			},
			int32: function(id, repeated) {
				return  Burger.Gpb.GpbType(id, repeated, function() { return  PROTO.int32; } );
			},
			int64: function(id, repeated) {
				return  Burger.Gpb.GpbType(id, repeated, function() { return  PROTO.int64; } );
			},
			Double: function(id, repeated) {
				return  Burger.Gpb.GpbType(id, repeated, function() { return  PROTO.Double; } );
			},
			cType : Burger.Gpb.GpbType
		},
	}),

	_.extend(Burger.Gpb, {		 
		/*******************************************************************************
		* > Avast Analytics Messaging 
		******************************************************************************/
		Request : PROTO.Message("Burger.Gpb.Request",{
			
			Envelope: PROTO.Message("Burger.Gpb.Request.Envelope",{
				record: Burger.Gpb.GPBD.cType(1, PROTO.repeated, function() { return Burger.Gpb.Request.Envelope.Record;}),  

				Record: PROTO.Message("Burger.Gpb.Request.Envelope.Record",{
					proto_version: Burger.Gpb.GPBD.int32(8,PROTO.optional),
					event: Burger.Gpb.GPBD.cType(2, PROTO.repeated, function() { return Burger.Gpb.Request.Envelope.Event;}), 
					identity: Burger.Gpb.GPBD.cType(1, PROTO.optional, function() { return Burger.Gpb.Request.Envelope.Identity;}),
					product: Burger.Gpb.GPBD.cType(4, PROTO.optional, function() { return Burger.Gpb.Request.Envelope.Product;}), 
					connection: Burger.Gpb.GPBD.cType(10, PROTO.optional, function() { return Burger.Gpb.Request.Envelope.Connection;})
				}),

				Event: PROTO.Message("Burger.Gpb.Request.Envelope.Event",{
					type: Burger.Gpb.GPBD.int32(1,PROTO.repeated),
					time: Burger.Gpb.GPBD.sint64(2,PROTO.optional),
					time_zone: Burger.Gpb.GPBD.sint32(5,PROTO.optional), 		
					blob: Burger.Gpb.GPBD.bytes(11,PROTO.optional),
					blob_type: Burger.Gpb.GPBD.int32(12,PROTO.optional), 
					
				}),

				Identity: PROTO.Message("Burger.Gpb.Request.Envelope.Identity",{					
					guid: Burger.Gpb.GPBD.string(9, PROTO.optional)
					
				}),

				Product: PROTO.Message("Burger.Gpb.Request.Envelope.Product",{
					code: Burger.Gpb.GPBD.int32(7, PROTO.optional),
					version: Burger.Gpb.GPBD.bytes(2, PROTO.optional), 
					internal_version: Burger.Gpb.GPBD.int32(9, PROTO.optional), 
					variant: Burger.Gpb.GPBD.int32(8, PROTO.optional), 
					platform: Burger.Gpb.GPBD.cType(3, PROTO.optional, function() { return Burger.Gpb.Request.Envelope.Product.Platform;}),
					platform_version: Burger.Gpb.GPBD.string(4, PROTO.optional), 

					Platform: PROTO.Enum("Burger.Gpb.Request.Envelope.Product.Platform",{
						WINDOWS: 1,
						OSX: 2,
						IOS: 3,
						LINUX: 4,
						ANDROID: 5
					}),
				}),

				Connection: PROTO.Message("Burger.Gpb.Request.Envelope.Connection",{
					origin: Burger.Gpb.GPBD.cType(1, PROTO.optional, function() { return Burger.Gpb.Request.Envelope.Connection.Origin;}),
					send_time: Burger.Gpb.GPBD.int64(2, PROTO.optional),
					
					Origin: PROTO.Enum("Burger.Gpb.Request.Envelope.Connection.Origin",{
						CLIENT: 1
						
					})
				}),
			}),

			/**************************************************************************/
			/* ende envelope  													      */
			/**************************************************************************/
		}),
		
		Response : PROTO.Message("Burger.Gpb.Response",{
        })
	});
	
	Burger.Build = {
		
		recordMessage : function(eventsToSend){
			var record = new Burger.Gpb.Request.Envelope.Record;
			record.proto_version = Burger.GLOBAL.RECORD_PROTOVERSION; 
			record.event = eventsToSend;
			record.identity = this.identityMessage();
			record.product = this.productMessage();
			record.connection = this.connectionMessage();
			//console.log("recordMessage: " + JSON.stringify(record));
			return record;
		},
		
		connectionMessage : function(){
			var connection = new Burger.Gpb.Request.Envelope.Connection;
			connection.origin = Burger.Gpb.Request.Envelope.Connection.Origin.CLIENT;
			connection.send_time = PROTO.I64.fromNumber(Math.round((new Date).getTime()/1000));
			//console.log("connectionMessage: " + connection);
			return connection;
		},
		
		productMessage : function(productVariant){
			var product  = new Burger.Gpb.Request.Envelope.Product;
			product.code = Burger.GLOBAL.PRODUCT_CODE;
			product.version = PROTO.encodeUTF8(Burger.GLOBAL.PRODUCT_VERSION); //bytes
			product.internal_version = Burger.GLOBAL.PRODUCT_INTERNALVERSION;
			product.variant = Burger.GLOBAL.PRODUCT_VARIANT;
			product.platform = Burger.Gpb.Request.Envelope.Product.Platform[Burger.GLOBAL.PRODUCT_PLATAFORM];
			product.platform_version = Burger.GLOBAL.PRODUCT_PLATAFORMVERSION;
			//console.log("productMessage: " + JSON.stringify(product));
			return product;
		},
		
		identityMessage : function(identityGuid){
			var identity = new Burger.Gpb.Request.Envelope.Identity;
			identity.guid = Burger.GLOBAL.IDENTITY_GUID;
			//console.log("identityMessage: " + JSON.stringify(identity));
			return identity;
		}, 

		eventMessage : function(cliEvent){
			if(!cliEvent || !cliEvent.blob)return null;

			var blobEventInfo = Burger.GLOBAL.BLOB_EVENTS_INFO[cliEvent.type];
			if(blobEventInfo == undefined)return null;

			var eventData = new Burger.Gpb.Request.Envelope.Event;	

			eventData.type.push(blobEventInfo.firstLevel);
			eventData.type.push(blobEventInfo.secondLevel);
			eventData.type.push(blobEventInfo.thirdLevel);
			eventData.blob_type = blobEventInfo.type;

			eventData.blob = cliEvent.blob;

			var now = new Date(); // in case there is no time on the event set the time (now)
			if (cliEvent.time && cliEvent.time_zone){
				eventData.time = PROTO.I64.fromNumber(cliEvent.time);
				eventData.time_zone = cliEvent.time_zone;
			}else{
				var now = new Date(); // in case there is no time on the event set the time (now)
				eventData.time = PROTO.I64.fromNumber(Math.round(now.getTime()/1000.0));
				eventData.time_zone = now.getTimezoneOffset();
			}
			
			
			//console.log("eventMessage: " + JSON.stringify(eventData));

			return eventData;
		}
	};
	
	Burger.Storage = {
		getValue: function (key) {
            return AvastWRC.getStorageAsync(key);
        },
		setValue : function(key, value){
			AvastWRC.setStorage(key, JSON.stringify(value));
		}

	};

	Burger.Collection = {
		events : {
			eventList : [],
			EVENT_MAX_RESEND : 1
		},			
		addEvent : function(eventDetails){
			var blob = Burger.Build.blobMessage(eventDetails);
			if (blob == null){
				console.log("Error unable to bluild blob -- event details: " + eventDetails);
				return;
			}
			/*var event = Burger.Build.eventMessage(eventDetails.eventType, blob)
			if(event == null){
				console.log("Error unable to bluild event-- event type: " + eventDetails.eventType + " blob data: " + blob);
				return;
			}*/
			var eventDate = new Date();
			
			var cliEvent = {
				type: eventDetails.eventType,
				blob: blob,
				time: Math.round(eventDate.getTime()/1000.0),
				time_zone: eventDate.getTimezoneOffset(),
				resended: 0
			}
			
			var numberOfEvents = Burger.Collection.events.eventList.length;
			
			if (numberOfEvents < Burger.Collection.events.BATCH_MAX_MESSAGES){
				Burger.Collection.events.eventList.push(cliEvent);
				Burger.Storage.setValue("BE", Burger.Collection.events.eventList);
			}				
			else {
				Burger.Collection.sendAll(true); //will be send only if the needed variables were initialized
				Burger.Collection.events.eventList.push(cliEvent);
				Burger.Storage.setValue("BE", Burger.Collection.events.eventList);
			}
		},
		
		sendEvents : function(numberOfEvents){
			if(!Burger.GLOBAL.INIT_ME_CALLED){
				console.log("Burger was not initialized yet, can't send events");
				return;
			}
			//copy elements to be send remove all those elemments
			//make the request to burger.
			var eventsToSend = [];
			if(numberOfEvents <= Burger.Collection.events.BATCH_MAX_MESSAGES){
				var eventsToSend = Burger.Collection.events.eventList.splice(0,numberOfEvents);
				Burger.Storage.setValue("BE", Burger.Collection.events.eventList);
				console.log("BURGER-> about to send " + eventsToSend.length + " events and left: " + Burger.Collection.events.eventList.length);	
				if (eventsToSend && eventsToSend.length != 0){
					var eventMessage = [], elem = {};
					for(var i=0; i < eventsToSend.length; i++){
						elem = Burger.Build.eventMessage(eventsToSend[i]);
						if(elem && !_.isEmpty(elem)){
							eventMessage.push(elem);
						}						
						elem = {};
					}
					if(eventMessage && eventMessage.length > 0){
						var record = Burger.Build.recordMessage(eventMessage);
						//console.log("Record: " + JSON.stringify(record));
						var queryOptions = {record: record,
											eventsToSend: eventsToSend};
						new Burger.Query.Envelope(queryOptions);
					}					
				}		
			}else{
				while(numberOfEvents >=  Burger.Collection.events.BATCH_MAX_MESSAGES){
					Burger.Collection.sendEvents(Burger.Collection.events.BATCH_MAX_MESSAGES);
					numberOfEvents = Burger.Collection.events.eventList.length;
				}					
				if(numberOfEvents > 0)
					Burger.Collection.sendEvents(numberOfEvents);
			}			 						
		},

		sendAll : function(isWindowClosing){
			var numberOfEvents = 0;
			if(isWindowClosing && Burger.GLOBAL.INIT_ME_CALLED){
				numberOfEvents = Burger.Collection.events.eventList.length;
				while(numberOfEvents >  Burger.Collection.events.BATCH_MAX_MESSAGES){
					Burger.Collection.sendEvents(Burger.Collection.events.BATCH_MAX_MESSAGES);
					numberOfEvents = Burger.Collection.events.eventList.length;
				}					
				if(numberOfEvents > 0){
					Burger.Collection.sendEvents(numberOfEvents);
				}
					
			}
		},

		addEventsOnError: function(eventsToRestore){
			if(eventsToRestore.length > 0){
				for(var i=0; i < eventsToRestore.length; i++){
					if (eventsToRestore[i].resended < Burger.Collection.events.EVENT_MAX_RESEND){
						eventsToRestore[i].resended = eventsToRestore[i].resended + 1;
						Burger.Collection.events.eventList.push(eventsToRestore[i]);
						Burger.Storage.setValue("BE", Burger.Collection.events.eventList);
					}
				}
			}			
		}


	};

	Burger.Query = {		
		HEADERS : {
			//"Accept": "binary",
			//dataType: 'binary',
			"Content-Type": "application/octet-stream",
			//"Connection": "keep-alive" // refused in Chrome
		},
		SERVER : {
			0 : "https://analytics.ff.avast.com:443/receive3",
			1 : "https://analytics-stage.ff.avast.com:443/receive3",
			2 : "http://analytics-dev.ff.avast.com/receive3"			
		},
	};
	
	Burger.Query.__MASTER__ = {
		completed : false,
		/**
		 * Initialize UrlInfo request.
		 * @return {[type]} [description]
		 */
		init : function(){
			this.headers = _.extend({}, Burger.Query.HEADERS, this.headers);
			// Populate proto message
			this.message();
			// Send it to server
			if(this.options.go) this.post();
		},
		headers : {},
		/**
		 * Set an option value
		 * @param {String} option Property name
		 * @param {}     value  Property value
		 */
		set : function (option, value) {
			this.options[option] = value;
			return this;
		},
		/**
		 * Get an option value
		 * @param  {String} option Property name
		 * @return {}           Property value
		 */
		get : function (option) {
			return this.options[option];
		},
		/**
		 * return json string of the message
		 * @return {Object} Json representation of the GPB message
		 */
		toJSON : function(){
			var protoJSON = function (p) {
				var res = {};
				for(var prop in p.values_) {
				if(p.values_[prop].length) {
					// repeated message
					res[prop] = [];
					for(var i=0, j=p.values_[prop].length; i<j; i++) {
					res[prop].push(protoJSON(p.values_[prop][i]));
					}
				} else if(p.values_[prop].properties_){
					// composite message

					res[prop] = {};
					for(var krop in p.values_[prop].values_) {
					if(p.values_[prop].values_[krop] instanceof PROTO.I64) {
						// convert PROTO.I64 to number
						res[prop][krop] = p.values_[prop].values_[krop].toNumber();
					}else {
						res[prop][krop] = p.values_[prop].values_[krop];
					}
					}
				} else {
					// value :: deprecated - remove it
					res[prop] = p.values_[prop];
				}
				}
				return res;
			};
			return protoJSON(this.response);
		},
		/**
		 * Send request to server
		 * @return {Object} Self reference
		 */
		post : function(){
			if (this.options.server.indexOf(":null") !== -1) {
				return this;
			}

			var buffer = this.getBuffer(this.request);
			//console.log("Request:", JSON.stringify(this.request.message_type_), this.options.server, JSON.stringify(this.request.values_));

			var self = this;
			var xhr = new XMLHttpRequest();
			xhr.open(this.options.method.toUpperCase(), this.options.server, true);
			xhr.responseType = "arraybuffer";
			xhr.withCredentials = true;
			xhr.timeout = this.options.timeout || 0; // default to no timeout

			for(var prop in this.headers) {
				xhr.setRequestHeader(prop, this.headers[prop]);
			}

			xhr.onload = function(e) {    	  
				var status = 0;
				var errorCodes = [400, 401, 403, 405, 406, 408, 413, 414, 500];
				if(typeof e.srcElement !== "undefined"){
					status = e.srcElement.status;
				}
				else if(typeof e.target !== "undefined"){
					status = e.target.status;
				}								
				if(errorCodes.indexOf(status) > -1){
					var bodyEncodedInString = String.fromCharCode.apply(String, new Uint8Array(xhr.response));
					console.log("BURGER-> Response Status: "+status  +" Error: "+ bodyEncodedInString);
					Burger.Collection.addEventsOnError(self.options.eventsToSend);
					self.options.eventsToSend = [];
				} 
				else{
					var bodyEncodedInString = String.fromCharCode.apply(String, new Uint8Array(xhr.response));
					console.log("BURGER-> Response Status: "+status  +" Message: "+ bodyEncodedInString);
				}
				
				//self.callback(xhr.response);
			};
			xhr.onerror = function() {
				Burger.Collection.addEventsOnError(self.options.eventsToSend);
				self.options.eventsToSend = [];
			};
			xhr.ontimeout = function() {
				Burger.Collection.addEventsOnError(self.options.eventsToSend);
				self.options.eventsToSend = [];
			};
			
			xhr.send(buffer);
			
			return this;
		},
		/**
		 * Convert message to ArrayBuffer
		 * @param  {Object} message Message instance
		 * @return {Array}         Array Buffer
		 */
		getBuffer : function(message){

			var stream = new PROTO.ByteArrayStream;
			message.SerializeToStream(stream);
			return this.baToab(stream.getArray());
		},
		/**
		 * Handle server response
		 * @param  {Array}   arrayBuffer Incoming message
		 * @return {void}
		 */
		callback : function (arrayBuffer) {
			var format = this.options.format;
			var res = null;
			if ('string' === format) {
				res = String.fromCharCode.apply(String, this.abToba(arrayBuffer));
			} else {
				console.log('Response:', JSON.stringify(res));
				this.parser(arrayBuffer);

				if(this.updateCache) { this.updateCache(); }

				if('json' === format) {
				res = this.toJSON();
				}
				else if('object' === format) {
				res = this.format();
				}
				else {
				res = this.response;
				}
			}
			
			console.log('Response:', JSON.stringify(res));
			this.options.callback(res);
			this.completed = true;
		},
		/**
		 * Handle error responses
		 * @param  {Object} xhr xmlhttp request object
		 * @return {void}
		 */
		error : function(xhr){			
			if(this.options.error) this.options.error(xhr);
		},
		/**
		 * Placeholder - each Instance can override this to format the message
		 * @return {[type]} [description]
		 */

		format : function(){
			return { error : "This call has now formatting message.", message: this.response };
		},
		/**
		 * parse arrayBuffer into a ProtoJS response
		 * @param  {Array} arrayBuffer
		 * @return {void}
		 */
		parser : function (arrayBuffer){
			this.response.ParseFromStream(new PROTO.ByteArrayStream(this.abToba(arrayBuffer)));
		},
		/**
		 * ByteArray to ArrayBuffer
		 * @param  {Object} data [description]
		 * @return {Array}
		 */
		baToab: function(data){
			var buf = new ArrayBuffer(data.length);

			var bytes = new Uint8Array(buf);
			for(var i = 0; i < bytes.length; i++) {
				bytes[i] = data[i] % 256;
			}

			return bytes;
		},
		/**
		 * ArrayBuffer to ByteArray
		 * @param  {Array} arrayBuffer [description]
		 * @return {Array}             [description]
		 */
		abToba: function(arrayBuffer){
			if(arrayBuffer === null) return [];
			var bytes = new Uint8Array(arrayBuffer);
				var arr = [];
			for(var i = 0; i < bytes.length; i++) {
				arr[i] = bytes[i] % 256;
			}
				return arr;
		},			
	};

	Burger.Query.Envelope = function(options) {
		if (!options) return false; // no record data

		this.options = _.extend({
			server: Burger.Query.SERVER[Burger.GLOBAL.ENV],
			method: "post",
			timeout: 10000, // 10s
			callback: _.noop,
			format: "object", // return response in JSON
			go: true, // true = trigger the request immediately
		}, options);

		this.request = new Burger.Gpb.Request.Envelope;
		this.response = new Burger.Gpb.Response;
		this.init();
	};

	Burger.Query.Envelope.prototype = _.extend({}, Burger.Query.__MASTER__, {
		/**
		 * build PROTO message
		 */
		message: function() {
			this.request.record.push(this.options.record);
	
			return this;
		},
	});

	_.extend(Burger, {
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
	});
	
	Burger.registerEvents(function(ee) {
		ee.on('burger.initme', Burger.initGlobalData); // to initialize some specific data and send all event if it is 
		ee.on('burger.newEvent', Burger.Collection.addEvent); //every time an event occur add it to the list to be send
		ee.on('burger.sendAll', Burger.Collection.sendAll); //to send all remaining events not used from client at the moment
															// use initme instead sending all needed info to be sure all events will
															//be send.
	});
	
	// export as AvastWRC.Burger
	AvastWRC.Burger = Burger;
}).call(this, _, AvastWRC, EventEmitter2);

(function(_, AvastWRC) {
	var Burger = (AvastWRC.Burger) ? AvastWRC.Burger : {};
	var PROTO = (AvastWRC.PROTO) ? AvastWRC.PROTO : {};
	var SafeShopOfferGPB = (AvastWRC.gpb && AvastWRC.gpb.All && AvastWRC.gpb.All.SafeShopOffer) ? AvastWRC.gpb.All.SafeShopOffer : {};
 	_.extend(Burger.GLOBAL, {
		BLOB_EVENTS_INFO : {
			//SPMPClientEvents$ClientEvent
			"SAFE_SHOP_DOMAIN_VISITED" : {firstLevel: 55,secondLevel: 1, thirdLevel: 1, type: 1}, //SPMPClientEvents$ClientEvent 55.1.1
			"SHOW_BAR": {firstLevel: 55,secondLevel: 1, thirdLevel: 2, type: 1}, //SPMPClientEvents$ClientEvent 55.1.2
			"HIDE_ON_THIS_DOMAIN": {firstLevel: 55,secondLevel: 1, thirdLevel: 3, type: 1}, //SPMPClientEvents$ClientEvent 55.1.3
			"SHOW_ON_THIS_DOMAIN": {firstLevel: 55,secondLevel: 1, thirdLevel: 4, type: 1}, //SPMPClientEvents$ClientEvent 55.1.4
			"HIDE_ON_ALL_DOMAINS": {firstLevel: 55,secondLevel: 1, thirdLevel: 5, type: 1}, //SPMPClientEvents$ClientEvent 55.1.5
			"SHOW_ON_ALL_DOMAINS": {firstLevel: 55,secondLevel: 1, thirdLevel: 6, type: 1}, //SPMPClientEvents$ClientEvent 55.1.6
			"SHOW_HELP": {firstLevel: 55,secondLevel: 1, thirdLevel: 7, type: 1}, //SPMPClientEvents$ClientEvent 55.1.7
			"CLOSE_BAR": {firstLevel: 55,secondLevel: 1, thirdLevel: 8, type: 1}, //SPMPClientEvents$ClientEvent 55.1.8
			"BAR_SHOWN": {firstLevel: 55,secondLevel: 1, thirdLevel: 9, type: 1}, //SPMPClientEvents$ClientEvent 55.1.9
			"AVAST_WEBSITE": {firstLevel: 55,secondLevel: 1, thirdLevel: 10, type: 1}, //SPMPClientEvents$ClientEvent 55.1.10
			"RATE_GOOD": {firstLevel: 55,secondLevel: 1, thirdLevel: 11, type: 1}, //SPMPClientEvents$ClientEvent 55.1.11
			"NO_RATE": {firstLevel: 55,secondLevel: 1, thirdLevel: 12, type: 1}, //SPMPClientEvents$ClientEvent 55.1.12
			"RATE_BAD": {firstLevel: 55,secondLevel: 1, thirdLevel: 13, type: 1}, //SPMPClientEvents$ClientEvent 55.1.13
			"SHOW_ON_BOARDING": {firstLevel: 55,secondLevel: 1, thirdLevel: 14, type: 1}, //SPMPClientEvents$ClientEvent 55.1.14
			"HEARTBEAT": {firstLevel: 55,secondLevel: 1, thirdLevel: 15, type: 1}, //SPMPClientEvents$ClientEvent 55.1.15
			"AFSRC_MATCHING": {firstLevel: 55,secondLevel: 1, thirdLevel: 16, type: 1}, //SPMPClientEvents$ClientEvent 55.1.16
			"SHOW_SETTINGS_FROM_BAR": {firstLevel: 55,secondLevel: 1, thirdLevel: 17, type: 1}, //SPMPClientEvents$ClientEvent 55.1.17
			"SHOW_SETTINGS_FROM_CUSTOM_MENU": {firstLevel: 55,secondLevel: 1, thirdLevel: 18, type: 1}, //SPMPClientEvents$ClientEvent 55.1.18
			"BAR_SHOWN_AFTER_FIRST_REQUEST": {firstLevel: 55,secondLevel: 1, thirdLevel: 19, type: 1}, //SPMPClientEvents$ClientEvent 55.1.19
			"BAR_SHOWN_AFTER_SECOND_REQUEST": {firstLevel: 55,secondLevel: 1, thirdLevel: 20, type: 1}, //SPMPClientEvents$ClientEvent 55.1.20			
			"NOTIFICATIONS": {firstLevel: 55,secondLevel: 1, thirdLevel: 21, type: 1}, //SPMPClientEvents$ClientEvent 55.1.21			
			"NOTIFICATIONS_BAR": {firstLevel: 55,secondLevel: 1, thirdLevel: 22, type: 1}, //SPMPClientEvents$ClientEvent 55.1.22			
			"NOTIFICATIONS_MINIMIZED": {firstLevel: 55,secondLevel: 1, thirdLevel: 23, type: 1}, //SPMPClientEvents$ClientEvent 55.1.23			
			"MAIN_UI": {firstLevel: 55,secondLevel: 1, thirdLevel: 24, type: 1}, //SPMPClientEvents$ClientEvent 55.1.24			
			"EXTENSION_ICON": {firstLevel: 55,secondLevel: 1, thirdLevel: 25, type: 1}, //SPMPClientEvents$ClientEvent 55.1.25
			"SETTINGS_EVENTS": {firstLevel: 55,secondLevel: 1, thirdLevel: 26, type: 1}, //SPMPClientEvents$ClientEvent 55.1.26
			//SPMPClientEvents$PickedOfferEvent
			"OFFER_PICKED": {firstLevel: 55,secondLevel: 2, thirdLevel: 1, type: 1}, //SPMPClientEvents$PickedOfferEvent 55.2.1
			//SPMPClientEvents$UserSettingsChanged
			"SAVE_SETTINGS": {firstLevel: 55,secondLevel: 5, thirdLevel: 1, type: 1}, //SPMPClientEvents$UserSettingsChanged 55.5.1
		}
	});
	_.extend(Burger.Gpb,{
		Blob : PROTO.Message("Burger.Gpb.Blob",{	
			/**************************************************************************/
			/* Client Identity												  		  */
			/**************************************************************************/	
			ClientInfo: SafeShopOfferGPB.ClientInfo,
			/**************************************************************************/
			/* ende Client Identity												  	  */
			/**************************************************************************/
			/**************************************************************************/
			/* Picked offer										  					  */
			/**************************************************************************/
			PickedOffer : PROTO.Message("Burger.Gpb.Blob.PickedOffer",{

				GeneralOffer: SafeShopOfferGPB.OfferResponse.GeneralOffer,

				Product: SafeShopOfferGPB.OfferResponse.Product,

				Accommodation: SafeShopOfferGPB.OfferResponse.Accommodation,

				Voucher : SafeShopOfferGPB.Voucher, 

				Redirect : SafeShopOfferGPB.Redirect, 

				Query : SafeShopOfferGPB.OfferResponse.Query,

				product: Burger.Gpb.GPBD.cType(1, PROTO.optional, function() { return Burger.Gpb.Blob.PickedOffer.Product;}),
				voucher: Burger.Gpb.GPBD.cType(2, PROTO.optional, function() { return Burger.Gpb.Blob.PickedOffer.Voucher;}),
				accommodation: Burger.Gpb.GPBD.cType(3, PROTO.optional, function() { return Burger.Gpb.Blob.PickedOffer.Accommodation;}),
				query: Burger.Gpb.GPBD.cType(4, PROTO.optional, function() { return Burger.Gpb.Blob.PickedOffer.Query;}),				
				redirect: Burger.Gpb.GPBD.cType(5, PROTO.optional, function() { return Burger.Gpb.Blob.PickedOffer.Redirect;}),
				show_offer_notification: GPBD.bool(6, PROTO.optional),
				list_position: GPBD.int32(7, PROTO.optional)
			}),
			/**************************************************************************/
			/* ende Picked offer								  					  */
			/**************************************************************************/
			/**************************************************************************/
			/* BLOB-SPMP  	SafepriceMultiprovider Events  					 	      */
			/**************************************************************************/
			/* Container for client events 											  */ 
			ClientEvent : PROTO.Message("Burger.Gpb.Blob.ClientEvent",{		
				client: Burger.Gpb.GPBD.cType(1, PROTO.optional, function() { return Burger.Gpb.Blob.ClientInfo;}),	
				url: Burger.Gpb.GPBD.string(2, PROTO.optional),
				aditional_info: Burger.Gpb.GPBD.cType(3, PROTO.optional, function(){return Burger.Gpb.Blob.ClientEvent.AditionalInfo}),

				AditionalInfo: PROTO.Message("Burger.Gpb.Blob.ClientEvent.AditionalInfo",{
					event_type: Burger.Gpb.GPBD.cType(1, PROTO.optional, function(){return Burger.Gpb.Blob.ClientEvent.AditionalInfo.EventType;}),
					ui_category: Burger.Gpb.GPBD.cType(2, PROTO.optional, function(){return Burger.Gpb.Blob.ClientEvent.AditionalInfo.UiCategory;}),
					
					EventType: PROTO.Enum("Burger.Gpb.Blob.ClientEvent.AditionalInfo.EventType",{
						UNKNOWN_EVENT: 0,
						SHOWN: 1,
						CLICKED_SETTINGS: 2,
						CLICKED_MINIMIZE: 3,
						CLICKED_X: 4,
						CLICKED_CTA: 5,
						DRAGGED: 6,
						HIGHLIGHTED: 7,
						CLICKED_HELP: 8,
						CLICKED_LOGO: 9,
						CLICKED_OFFERS_TAB: 10,
						CLICKED_COUPONS_TAB: 11,
						CLICKED_OTHERS_TAB: 12,
						CLICKED_FAQS: 13
					}),
					UiCategory: PROTO.Enum("Burger.Gpb.Blob.ClientEvent.AditionalInfo.UiCategory",{
						UNKNOWN_CATEGORY: 0,
						LOADING: 1, //not in use
						OFFERS: 2,
						COUPONS: 3,
						OFFERS_AND_COUPONS: 4,
						SPECIAL_DEALS: 5,
						SIMILAR_COUPONS: 6,
						ALTERNATIVE_HOTELS: 7,
						POPULAR_HOTELS: 8,
						DEAL_SEARCH: 9,
						OFFERS_TAB_HIGHLIGHTED: 10,
						COUPONS_TAB_HIGHLIGHTED: 11,
						OTHERS_TAB_HIGHLIGHTED: 12
					})
				})
			}),
			/*Client Event (Picked offer)											  */
			PickedOfferEvent : PROTO.Message("Burger.Gpb.Blob.PickedOfferEvent",{		
				client: Burger.Gpb.GPBD.cType(1, PROTO.optional, function() { return Burger.Gpb.Blob.ClientInfo;}),	
				url: Burger.Gpb.GPBD.string(2, PROTO.optional),
				picked_offer: Burger.Gpb.GPBD.cType(3, PROTO.optional, function() { return Burger.Gpb.Blob.PickedOffer;}),
				provider_id: Burger.Gpb.GPBD.string(4, PROTO.optional),
				query: Burger.Gpb.GPBD.string(5, PROTO.optional), 
				best_offer:  Burger.Gpb.GPBD.bool(6, PROTO.optional),
				clickType:  Burger.Gpb.GPBD.cType(7, PROTO.optional, function() { return Burger.Gpb.Blob.PickedOfferEvent.ClickType;}),

				ClickType: PROTO.Enum("Burger.Gpb.Blob.PickedOfferEvent.ClickType",{
					UNDEFINED: 0,
					LEFT: 1,
					MIDDLE: 2,
					RIGHT: 3
				})
			}),
			/* Container for settings events										  */ 
			UserSettingsChanged : PROTO.Message("Burger.Gpb.Blob.UserSettingsChanged",{		
				client: Burger.Gpb.GPBD.cType(1, PROTO.optional, function() { return Burger.Gpb.Blob.ClientInfo;}),	
				new_settings: Burger.Gpb.GPBD.cType(2, PROTO.optional, function() { return Burger.Gpb.Blob.ClientInfo.UserSettings;}),	
			}),
		})
	});
	_.extend(Burger.Build,{
		browserInfo: function(browserInfo){          
			var _browserInfo = new Burger.Gpb.Blob.ClientInfo.Browser;
			_browserInfo.type = browserInfo.type;
			_browserInfo.version = browserInfo.version;
			_browserInfo.language =browserInfo.language;
			//console.log("browserInfo: " + JSON.stringify(_browserInfo));
			return _browserInfo;
        },

		extensionInfo: function(extensionInfo){
			var _extensionInfo = new Burger.Gpb.Blob.ClientInfo.Extension;
			_extensionInfo.type = extensionInfo.type;
			_extensionInfo.version = extensionInfo.version;   
			//console.log("extensionInfo: " + JSON.stringify(_extensionInfo));
			return _extensionInfo;
		},

		userSettings: function(userSettings){
			var _userSettings = new Burger.Gpb.Blob.ClientInfo.UserSettings;
			_userSettings.show_automatic = userSettings.show_automatic;
			_userSettings.advanced = new Burger.Gpb.Blob.ClientInfo.UserSettings.Advanced;
			_userSettings.advanced.offers_configs = new Burger.Gpb.Blob.ClientInfo.UserSettings.Advanced.OffersConfigs;
			_userSettings.advanced.offers_configs.offer_limit = userSettings.advanced.offers_configs.offer_limit;
			_userSettings.advanced.offers_configs.include_flag = userSettings.advanced.offers_configs.include_flag;
			_userSettings.advanced.offers_configs.offers_visibility = userSettings.advanced.offers_configs.offers_visibility;
			_userSettings.advanced.coupons_configs = new Burger.Gpb.Blob.ClientInfo.UserSettings.Advanced.CouponsConfigs;
			_userSettings.advanced.coupons_configs.coupons_visibility = userSettings.advanced.coupons_configs.coupons_visibility;
			_userSettings.advanced.coupons_configs.include_flag = userSettings.advanced.coupons_configs.include_flag;
			_userSettings.advanced.redirect_configs = new Burger.Gpb.Blob.ClientInfo.UserSettings.Advanced.RedirectConfigs;
			_userSettings.advanced.redirect_configs.redirect_visibility = userSettings.advanced.redirect_configs.redirect_visibility;
			_userSettings.custom_list = userSettings.custom_list;
			console.log("user settings: " + JSON.stringify(_userSettings));
			return _userSettings;
		},

		clientInfoMessage: function(clientInfo){
			var _clientInfo = new Burger.Gpb.Blob.ClientInfo;
			_clientInfo.language = clientInfo.language;
			_clientInfo.referer = clientInfo.referer;
			_clientInfo.transaction_id = clientInfo.transaction_id;
			_clientInfo.extension_guid = clientInfo.extension_guid;
			_clientInfo.browser = this.browserInfo(clientInfo.browser);
			_clientInfo.extension = this.extensionInfo(clientInfo.extension);
			_clientInfo.campaign_id = clientInfo.campaign_id;
			_clientInfo.user_settings = this.userSettings(clientInfo.user_settings);
			//console.log("clientInfoMessage: " + JSON.stringify(_clientInfo));
            return _clientInfo;
		},

		buildAditionalInfoMessage: function(type, category){
			var aditionalInfo = new Burger.Gpb.Blob.ClientEvent.AditionalInfo;
			aditionalInfo.event_type =  Burger.Gpb.Blob.ClientEvent.AditionalInfo.EventType[type] || 0;
			aditionalInfo.ui_category = Burger.Gpb.Blob.ClientEvent.AditionalInfo.UiCategory[category] || 0;
			return aditionalInfo;
		},

		pickedOfferMessage: function (offer, offerQuery, offerCategory){
			
			var pickedOffer = new Burger.Gpb.Blob.PickedOffer;
			
			pickedOffer.product = new Burger.Gpb.Blob.PickedOffer.Product;
			pickedOffer.product.offer = new Burger.Gpb.Blob.PickedOffer.GeneralOffer;

			pickedOffer.voucher = new Burger.Gpb.Blob.PickedOffer.Voucher;

			pickedOffer.accommodation = new Burger.Gpb.Blob.PickedOffer.Accommodation;
			pickedOffer.accommodation.offer = new Burger.Gpb.Blob.PickedOffer.GeneralOffer;

			pickedOffer.redirect = new Burger.Gpb.Blob.PickedOffer.Redirect;

			pickedOffer.query = new Burger.Gpb.Blob.PickedOffer.Query;

			pickedOffer.show_offer_notification = offer.showOffersNotification;

			pickedOffer.list_position = offer.listPosition;
			console.log("added list position" + offer.listPosition);

			if(offerCategory == "PRODUCT"){
				pickedOffer.product.offer["title"] = offer["label"] || "";
				pickedOffer.product.offer["price"] = offer["price"] || 0;
				pickedOffer.product.offer["formatted_price"] = offer["fprice"] || "";
				pickedOffer.product.offer["url"] = offer["url"] || "";
				pickedOffer.product.offer["affiliate"] = offer["affiliate"] || "";
				//pickedOffer.product.offer["recommended"] = offer["recommended"] || 0;
				pickedOffer.product.offer["image"] = offer["image"] || "";
				pickedOffer.product["availability"] = offer["availability"] || "";
				pickedOffer.product["availability_code"] = offer["availability_code"] || "";
				pickedOffer.product["saving"] = offer["saving"] || "";
				pickedOffer.product["shipping"] = offer["shipping"] || "";
			}
			else if(offerCategory == "ACCOMMODATION"){	
				pickedOffer.accommodation.offer["title"] = offer["label"] || "";
				pickedOffer.accommodation.offer["price"] = offer["price"] || 0;
				pickedOffer.accommodation.offer["formatted_price"] = offer["fprice"] || "";
				pickedOffer.accommodation.offer["url"] = offer["url"] || "";
				pickedOffer.accommodation.offer["affiliate"] = offer["affiliate"] || "";
				//pickedOffer.accommodation.offer["recommended"] = offer["recommended"] || 0;
				pickedOffer.accommodation.offer["image"] = offer["image"] || "";
				pickedOffer.accommodation["priority"] = offer["priority"] || 0;
				pickedOffer.accommodation["address"] = offer["address"] || "";
				pickedOffer.accommodation["stars"] = offer["stars"] || 0;
				pickedOffer.accommodation["additional_fees"] = offer["additional_fees"] || 0;
				pickedOffer.accommodation["price_netto"] = offer["price_netto"] || 0;
				pickedOffer.accommodation["saving"] = offer["saving"] || "";
				pickedOffer.accommodation["type"] = offer["type"] || 0;
				pickedOffer.accommodation["stars_precise"] = offer["stars_precise"] || 0;
				pickedOffer.accommodation["city"] = offer["city"] || "";
			}
			else if(offerCategory == "REDIRECT"){	
				pickedOffer.redirect["title"] = offer["label"] || "";
				pickedOffer.redirect["url"] = offer["url"] || "";
				pickedOffer.redirect["image"] = offer["image"] || "";
				pickedOffer.redirect["formatted_price"] = offer["fprice"] || "";
				pickedOffer.redirect["availability"] = offer["availability"] || "";
				pickedOffer.redirect["button_text"] = offer["buttonText"] || 0;
				pickedOffer.redirect["info_text"] = offer["infoText"] || "";
			}
			else if(offerCategory == "VOUCHER"){
				pickedOffer.voucher["title"] = offer["label"] || "";
				//pickedOffer.voucher["category"] = offer["category"] || "";
				pickedOffer.voucher["url"] = offer["url"] || "";
				pickedOffer.voucher["affiliate"] = offer["affiliate"] || "";
				pickedOffer.voucher["expire_date"] = offer["expire_date"] || "";
				pickedOffer.voucher["code"] = offer["coupon_code"] || "";
				pickedOffer.voucher["text"] = offer["coupon_text"] || "";
				pickedOffer.voucher["free_shipping"] = offer["free_shipping"] || 0;
				pickedOffer.voucher["type"] = offer["type"] || 0;
			}
			if(offerQuery){
				pickedOffer.query["price"] = offerQuery["price "] || 0;
				pickedOffer.query["formatted_price"] = offerQuery["formatted_price"] || "";
			}			
			
			//console.log("pickedOfferMessage: " + JSON.stringify(pickedOffer));
			return pickedOffer;
		},

		blobMessage : function(eventDetails){
			// safe price specific blob parameter			
		
			var blobEventInfo =  Burger.GLOBAL.BLOB_EVENTS_INFO[eventDetails.eventType];
			if(blobEventInfo == undefined){
				console.log("error blobMessage type not defined-- eventDetails: " + JSON.stringify(eventDetails));
				return null;
			}
			var blob;
			var offer = eventDetails.offer?eventDetails.offer:null;
			var offerQuery = eventDetails.offerQuery ? eventDetails.offerQuery : null;
			var offerCategory = eventDetails.offerCategory?eventDetails.offerCategory:"";
			if (blobEventInfo.secondLevel == 2  && offer != null && offerCategory != ""){
				blob = new Burger.Gpb.Blob.PickedOfferEvent;
				blob.picked_offer = this.pickedOfferMessage(offer, offerQuery, offerCategory);
				blob.provider_id = eventDetails.providerId?eventDetails.providerId:"";
				blob.query = eventDetails.query?eventDetails.query:"";
				blob.best_offer = eventDetails.bestOffer?eventDetails.bestOffer:"";
				blob.clickType = eventDetails.clickType?eventDetails.clickType:0;
				console.log("PickedOffer details: " + JSON.stringify(eventDetails));
				blob.url = eventDetails.url?eventDetails.url:"";
			}
			else if(blobEventInfo.secondLevel == 1){
				blob = new Burger.Gpb.Blob.ClientEvent;
				blob.url = eventDetails.url?eventDetails.url:"";
				
				if(blobEventInfo.thirdLevel >= 21 && blobEventInfo.thirdLevel <= 26){
					blob.aditional_info = this.buildAditionalInfoMessage(eventDetails.type, eventDetails.category);
				}
			}
			else if(blobEventInfo.secondLevel == 5){
				blob = new Burger.Gpb.Blob.UserSettingsChanged;
				blob.new_settings = this.userSettings(eventDetails.newSettings);
			}
			else{
				//console.log("error on blobMessage type not recognized-- eventDetails: " + JSON.stringify(eventDetails) + " eventTypeSecondLevel: " + blobEventInfo.secondLevel);
				return null;
			}

			var clientInfo = eventDetails.clientInfo?eventDetails.clientInfo:null;
			if(clientInfo != null){
				blob.client = this.clientInfoMessage(clientInfo);
			}
			
			console.log("Burger-> blobMessage: ");
			console.log(blob);
			blob = Burger.Query.__MASTER__.abToba(AvastWRC.Query.__MASTER__.getBuffer(blob));
			return blob;
		}
		
	});
}).call(this, _, AvastWRC);