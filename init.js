const containerFactory = require('./src/containerFactory.js');

// If called directly and not as required
if (require.main === module) {
	main();
}

function main(){
  containerFactory.createContainer().resolve(function (app, config){
		let port = process.env.PORT || config.express.port;
		let host = config.express.host;

    app.listen(port, host, () => {
      console.log('listening on %s:%s ...', host, port);
    });
  });
}
