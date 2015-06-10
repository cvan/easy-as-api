;(function () {

(function(c, v, a, n) {
  c.GoogleAnalyticsObject = n;

  c[n] = c[n] || function() {
    (c[n].q = c[n].q || []).push(arguments);
  }, c[n].l = 1 * new Date();

  var s = v.createElement('script');
  s.async = true;
  s.src = a;

  var m = v.getElementsByTagName('script')[0];
  m.parentNode.insertBefore(s, m);
})(window, document, 'https://www.google-analytics.com/analytics.js', 'ga');

ga('create', 'UA-63829147-1', 'auto');
ga('send', 'pageview');


function $(sel) {
  return document.querySelector(sel);
}

function $$(sel) {
  return Array.prototype.slice.call(document.querySelectorAll(sel));
}


var SELECT_ON_FOCUS = false;


if (SELECT_ON_FOCUS) {
  $$('input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])').forEach(function (el) {
    el.addEventListener('click', function () {
      this.select();
    });
  });
}


$$('input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])').forEach(function (el) {
  el.addEventListener('focus', function () {
    success.classList.add('hidden');
    generatedUrl.textContent = '';
  });
});

var form = $('#form');
var response = $('#response');
var sampleData = $('#sample_data');
var sampleResponse = $('#sample_response');
var sampleResponseCT = $('#sample_response_ct');
var success = $('#success');
var generatedUrl = $('#generatedUrl');


form.addEventListener('submit', function (e) {
  e.preventDefault();
  e.stopPropagation();

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/api');
  xhr.onload = function() {
    if (xhr.status === 201) {
      success.classList.remove('hidden');
      var uri = xhr.getResponseHeader('location');
      generatedUrl.textContent = uri;
      generatedUrl.href = uri;
    } else {
      console.error(Error(xhr.statusText));
    }
  };
  xhr.onerror = function() {
    console.error(Error('Network Error'));
  };
  xhr.send(response.value);
});


response.addEventListener('input', previewResponse);
sampleData.addEventListener('input', previewResponse);

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

function parseQS(input, isindex) {
  var sequences = input.split('&');
  if (isindex && sequences[0].indexOf('=') === -1) {
    sequences[0] = '=' + sequences[0];
  }
  var pairs = [];
  sequences.forEach(function (bytes) {
    if (bytes.length === 0) return;
    var index = bytes.indexOf('=');
    if (index !== -1) {
      var name = bytes.substring(0, index);
      var value = bytes.substring(index + 1);
    } else {
      name = bytes;
      value = '';
    }
    name = name.replace(/\+/g, ' ');
    value = value.replace(/\+/g, ' ');
    pairs.push({ name: name, value: value });
  });
  var output = {};
  pairs.forEach(function (pair) {
    output[decodeURIComponent(pair.name)] = decodeURIComponent(pair.value);
  });
  return output;
}

function previewResponse() {
  // TODO: Do Markdown previewing.
  sampleResponse.value = nunjucks.renderString(response.value, parseQS(sampleData.value));
  sampleResponseCT.value = 'Content-Type: ' + detectType(sampleResponse.value);
}

})();
