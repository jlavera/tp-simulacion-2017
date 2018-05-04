/************************************************
 * content.js - register mousedown.
 ***********************************************/

function FilterText(text) {
    if (text.length > 100) text = text.substr(0, 100);
    return text.trim();
}

window.addEventListener('mousedown', function (e) {
    try {
        var obj = {};
        if (e.srcElement === undefined) {
            obj = e.originalTarget;
        } else {
            obj = e.srcElement;
        }
       
        var msg = {
        		type: 'ajax',
        		time: new Date().getTime(),
                className: obj.className,
                event: "mousedown"
        };
      
        chrome.runtime.sendMessage(msg);
    } catch (ee) {
        console.log(JSON.stringify(ee));
    }
}, true);

window.addEventListener('keydown', function (e) {
    try {
        if (e.keyCode != 13) {
            return;
        }
        var obj = {};
        if (e.srcElement === undefined) {
            obj = e.originalTarget;
        } else {
            obj = e.srcElement;
        }
       
        var msg = {
        		type: 'ajax',
        		time: new Date().getTime(),
                className: obj.className,
                event: "enterdown"
        };
      
        chrome.runtime.sendMessage(msg);
    } catch (ee) {
        console.log(JSON.stringify(ee));
    }
}, true);


window.addEventListener ('load', function (e) {
	 try 
	 {
		 if(document.title === "") return;
		 var msg = {
     type: "pageTitle",
     title: document.title
		 };      
		 chrome.runtime.sendMessage(msg);
	 } catch (ee) {
     console.log(JSON.stringify(ee));
 }
}, false);