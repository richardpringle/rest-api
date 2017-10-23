'use strict';

const url = require('url');
const { Url } = url;

const Promise = require('bluebird');

class RestApi {
  constructor(baseUrl, options) {
    const { authorization } = options;
    if (baseUrl.slice(-1) !== '/') baseUrl += '/';

    this.url = url.parse(baseUrl);

    this.basePath = this.url.path;

    this.headers = {};
    this.headers['Authorization'] = authorization ?
      `${authorization.type} ${authorization.value}` :
      null;
    this.headers['Content-Type'] = 'application/json';
    this.headers['user-agent'] = 'pring';

    this.request = require(this.url.protocol.match(/[a-z]*/)[0]).request;

    this.req = null;
    this.res = null;
  }

  get() {
    return request.call(this, 'GET', ...arguments);
  }

  post() {
    return Object.assign({}, {
      send: (body) => {
        this.body = JSON.stringify(body);
        return request.call(this, 'POST', ...arguments);
      },
    }, getPromiseProtoMethods(this));
  }

  put() {
    return Object.assign({}, {
      send: (body) => {
        this.body = JSON.stringify(body);
        return request.call(this, 'PUT', ...arguments);
      },
    }, getPromiseProtoMethods(this));
  }

  patch() {
    return Object.assign({}, {
      send: (body) => {
        this.body = JSON.stringify(body);
        return request.call(this, 'PATCH', ...arguments);
      },
    }, getPromiseProtoMethods(this));
  }

  delete() {
    return request.call(this, 'DELETE', ...arguments);
  }

  head() {
    return request.call(this, 'HEAD', ...arguments);
  }
}

module.exports = RestApi;

function request(method, path, cb) {
  const body = this.body || '';
  const deferred = Promise.defer();

  this.headers['Content-Length'] = Buffer.byteLength(body);

  const options = {};
  options.method = method;
  const url = {};

  Object.assign(url, this.url);

  url.path += path;
  Object.assign(options, url);

  options.headers = this.headers;
  this.options = options;

  this.req = this.request(options);

  this.req.on('response', res => {
    this.res = res;

    const isJson = /json/.test(res.headers['content-type']);

    res.setEncoding('utf8');

    let data = '';

    res.on('data', chunk => {
      data += chunk;
    });

    res.on('error', err => {
      err.headers = res.headers;
      deferred.reject(err);
    });

    res.on('end', () => {
      data = isJson && data ? JSON.parse(data) : data;
      deferred.resolve(data);
    });
  });

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    this.req.write(body);
  }

  this.req.end();

  return deferred.promise;
}

function getPromiseProtoMethods(context) {
  const fns = {};

  Object.keys(Promise.prototype).forEach(method => {
    fns[method] = (...args) => {
      return request.call(context, 'POST', ...arguments)[method](...args);
    };
  });

  return fns;
}
