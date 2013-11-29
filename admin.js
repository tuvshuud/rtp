var mongodb = require('mongodb');
var dbserver = '127.0.0.1';
var dbport = '27017';
var dbname = 'test';

var util = require('util');
    
function add(_table, _values, callback){
  var server = new mongodb.Server(dbserver, dbport, {});
  new mongodb.Db(dbname, server, {w: 1}).open(function (error, client) {
    if (error) throw error;
    var collection = new mongodb.Collection(client, _table);
      collection.insert(_values, {safe:true}, function(err, objects) {
        if (err) console.warn(err.message);
        if (err && err.message.indexOf('E11000 ') !== -1) {
           //this _id was already inserted in the database
        }
        callback(1);
        console.log(util.inspect(_values) + ' are inserted into ' + _table);
      });
  });
}

function select(_table, _criteria, callback){
  var server = new mongodb.Server(dbserver, dbport, {});
  new mongodb.Db(dbname, server, {w: 1}).open(function (error, client) {
    if (error) throw error;
    var collection = new mongodb.Collection(client, _table);
    collection.find(_criteria).toArray(function(err, data){
      if(err) throw err;
      else callback(data);
    });
  });
}

function del(_table, _criteria, callback){
  var server = new mongodb.Server(dbserver, dbport, {});
  new mongodb.Db(dbname, server, {w: 1}).open(function (error, client) {
    if (error) throw error;
    var collection = new mongodb.Collection(client, _table);
    collection.remove(_criteria, function(err, data){
      if(err) throw err;
      else callback(data);
    });
  });
}

exports.add = add;
exports.select = select;
exports.del = del;