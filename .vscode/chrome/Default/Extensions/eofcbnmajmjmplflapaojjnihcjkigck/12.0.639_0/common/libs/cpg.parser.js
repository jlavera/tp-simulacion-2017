(function(jQuery) {
	if(typeof(AvastWRC) === 'undefined') AvastWRC = { ial : {} };
	
	AvastWRC.ial.comprigoRun = function(rules, url, callback){
		var scan = {result : {},
					message: "",
					error : false};
		var tmpResult = true;
		var rulesVersion = rules.v ? rules.v : "noversion";
		scan.result["v"] = rulesVersion;
		var match = url.match(rules.l);		
		if(match && match.length >= 1){
			scan.result["l"] = true;
			console.log('comprigo productscan called (url match)');
			jQuery.each(rules, function(key,value) {
				if(value.x){
					tmpResult = AvastWRC.ial.comprigoScan(value.x);
					if(value.r == 1 &&  tmpResult == false){					
						scan.error = true;
						scan.message = scan.message.concat("Error parsing KEY: ", key, ", VALUE: ", value.x, ", VERSION: ", rulesVersion,", ");
					}					
					else if (tmpResult != false){				
						scan.result[key] = tmpResult;	
					}					
				}				
			})
		}else{
			console.log('comprigo productscan called (url not match)');
			scan.result["l"] = false;
			scan.error = true;
			scan.message = scan.message.concat("Error: url not match. URL: ", url, " KEY: l, VALUE: ", rules.l, ", VERSION: ", rulesVersion,", ");
		}	
		console.log('parser result: '+ JSON.stringify(scan));
		callback(scan);
		return;
	}
	AvastWRC.ial.comprigoScan = function(pXpath){		
		var evalResult = window.document.evaluate(pXpath, document, null, 0, null);
		var resultValue = '';
		switch (evalResult.resultType) {
			case 1:
				resultValue = evalResult.numberValue.toString();
				break;
			case 2:
				resultValue = evalResult.stringValue;
				break;
			case 3:
				resultValue = evalResult.booleanValue.toString();
				break;
			default:
				selectedNode = evalResult.iterateNext();
				if (!selectedNode) {
					return false;

				} else if (selectedNode.textContent) {
					resultValue = selectedNode.textContent;
				} else if (selectedNode.innerText) {
					resultValue = selectedNode.innerText;
				} else if (selectedNode.value) {
					resultValue = selectedNode.value;
				} else if (selectedNode.text) {
					resultValue = selectedNode.text;
				} else {
					return false;
				}
		}
		return resultValue.replace(/[\t\r\n ]+/gim, ' ').replace(/^[\t\r\n ]+|[\t\r\n ]+$/gim, '');
	}
 }).call(this, jQuery);