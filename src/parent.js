/* Check LICENSE for details. Developed by Oratio.io */

//Node Standard Modules
var child_process = require('child_process');
var path = require('path');
var fs = require('fs');

//NPM Modules
var Promise = require('bluebird');

//Promisified Functions
var readFile = Promise.promisify(fs.readFile);
var nextTick = Promise.promisify(process.nextTick);

//Internal dependencies
var util = require('./util');
var messageAdapter = require('../messages');

function Child(_code, _pool, _timeout){
  this.code = _code || '';
  this.pool = _pool || new Child.Pool(1);
  this.timeout = _timeout;
  this.process = this.pool.getProcess();
  this.adapter = new Child.Adapter(this);
}

Child.prototype.start = function(){
  if(typeof this.adapter.init === 'function')
    this.adapter.init();

  this.process.send({
    type: 'init',
    code: this.code,
    timeout: this.timeout,
    isSafe: Child.isSafe,
    messageHandler: this.adapter.contactHandler //Will be run before code on process.
  });
}

Child.prototype.kill = function(signal){
  this.process.kill(signal); //New process creation is handled by pool.
}

//Inter-process communication
Child.prototype.contact = function(handler, message){
  return this.adapter.contact(handler, message);
}

var cache = {};
function ChildFile(location, _pool, _timeout){
  this.pool = _pool || new Child.Pool(1);
  this.timeout = _timeout;
  this.process = this.pool.getProcess();
  this.adapter = new Child.Adapter(this);


  if(ChildFile.usesCache === false || (ChildFile.usesCache === true && cache[location] == undefined)){
    return readFile(location, Child.encoding)
    .then(function(file){
      this.code = file;
      cache[location] = file;
      return Promise.resolve();
    }.bind(this))
  }else{
    this.code = cache[location];
    return nextTick();
  }
}

ChildFile.prototype = Object.create(Child.prototype);
ChildFile.prototype.constructor = ChildFile;

//Child's Constructor Properties
Child.logs = true;
Child.isSafe = false;
Child.Adapter = messageAdapter; //Default Adapter.
Child.Pool = require('./pool');
Child.encoding = 'utf8';
Child.File = ChildFile;

Child.clearCache = function(){
  cache = {};
}

//Exported functions
module.exports = Child;
