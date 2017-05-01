require('dotenv').config();

const bodyParser = require('body-parser');
const express = require('express');

module.exports = function $app(
  config
){
  const app = express();

  app.use(express.static(__dirname + '/../public'));
  app.use(bodyParser.json());
  app.engine('html', require('ejs').renderFile);

  app.get('/', (req, res) => res.render('index.html'));

  return app;
};
