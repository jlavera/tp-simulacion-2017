module.exports = function config() {
	if (!process.env.NODE_CONFIG_DIR) {
		process.env.NODE_CONFIG_DIR = `${__dirname}/../config`;
	}

	// eslint-disable-next-line global-require
	return require('config');
};
