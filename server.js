var bodyParser = require('body-parser');
var express = require('express');
var morgan = require('morgan');
var nunjucks = require('nunjucks');
var redis = require('redis');
var shortid = require('shortid');

var db = require('./lib/db');


var NODE_ENV = process.env.NODE_ENVIRONMENT || 'development';
var app = express();


app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.static('public'));

var textBodyParser = bodyParser.text();

// For parsing JSON.
app.use(bodyParser.json({type: 'json'}))

// For parsing `application/x-www-form-urlencoded`.
app.use(bodyParser.urlencoded({extended: true}));


var server = app.listen(process.env.PORT || '3000', function () {
  var address = server.address();
  console.log('Listening at %s:%s', address.address, address.port);
});


function checkFormat(body, format) {
  if (format === 'json') {
    try {
      // Parse the response to test if it's valid JSON.
      JSON.parse(body);
      return true;
    } catch (e) {}

    return false;
  }

  if (format === 'md') {
    // Quick hack to auto-detect (most) Markdown.
    return body.match(/(^|\r|\n|\r\n)(#|=|\*)* /);
  }

  if (format === 'html') {
    return body.indexOf('<html') !== -1;
  }
}

function detectType(body) {
  if (checkFormat(body, 'json')) {
    return 'application/json';
  }

  if (checkFormat(body, 'md')) {
    return 'text/html';
  }

  if (checkFormat(body, 'html')) {
    return 'text/html';
  }

  return 'text/plain';
}

function getHost(req) {
  return (NODE_ENV === 'development' ? 'http://' : 'https://') + req.headers.host;
}


function addCustomRoute(req, res) {
  var body = req.body;

  var finish = function () {
    var id = shortid.generate();
    db.redis.set(id, body).then(function (data) {
      res.location(getHost(req) + '/api/' + id);
      res.sendStatus(201);
    }).catch(function (err) {
      console.error(err);
      res.status(400).send({success: false, error: 'Could not submit route'});
    });
  };

  if (checkFormat(body, 'md')) {
    request({
      uri: 'https://api.github.com/markdown/raw',
      headers: {'Content-Type': 'text/plain'},
      body: body
    }, function (err, res, bodyFromMarkdown) {
      if (err || res.statusCode !== 200) {
        finish();
        return;
      }

      body = bodyFromMarkdown;

      finish();
    });
  } else {
    finish();
  }
}

function returnCustomRoute(req, res) {
  var hasBody = req.body && typeof req.body === 'object' && Object.keys(req.body).length;
  var values = hasBody ? req.body : req.query;
  var id = req.params.id;
  console.log('id', id);
  db.redis.get(id).then(function (reply) {
    if (reply === null) {
      return res.status(404).send({
        success: false,
        error: 'Could not find route'
      });
    }
    var body = nunjucks.renderString(reply, values);
    res.set('Content-Type', detectType(body));
    res.send(body);
  }).catch(function (err) {
    console.error(err);
    res.status(400).send({
      success: false,
      error: 'Could not fetch route'
    });
  });
}


app.post('/api', textBodyParser, addCustomRoute);

app.get('/api/:id', returnCustomRoute);
app.post('/api/:id', returnCustomRoute);
