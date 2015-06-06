var express = require('express');
var nunjucks = require('nunjucks');
var uuid = require('uuid');


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
    return body.match(/(^|\r|\n|\r\n)(#|=|\*)* /);
  }

  if (format === 'html') {
    return body.indexOf('<html') !== -1;
  }
}


function addCustomRoute(req, res) {
  redis.set(uuid.uuid(), req.params.body).then(function (data) {
    res.send(200, {success: true});
  }).catch(function (err) {
    console.error(err);
    res.send(400, {success: false, error: 'Could not submit route'});
  });
}


function renderCustomRoute(req, res) {
  var body = nunjucks.render(req.params.id) || '';
  var type = '';

  if (checkFormat(body, 'json')) {
    type = 'application/json';
    finish();
  }

  // Quick hack to auto-detect (most) Markdown.
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
      type = 'text/html';

      finish();
    });
  }

  function finish() {
    if (!type) {
      if (checkFormat(body, 'html')) {
        type = 'text/html';
      } else {
        type = 'text/plain';
      }
    }

    res.setHeader('Content-Type', type);
    res.send(body);
  }
}

// add server-side analytics/logs
