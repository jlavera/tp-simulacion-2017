'use strict';
const dependable = require('dependable');
const path = require('path');
const config = require('./config.js')();

module.exports = {
	createContainer
};

function createContainer(){
	const container = dependable.container();
	config.dependencies.forEach( entry => container.load(path.join(__dirname, entry)));

	return container;
}
