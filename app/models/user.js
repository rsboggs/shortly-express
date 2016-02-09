var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  //specify table name
  tableName: 'users',
  //initialize and manipulate actual database
  initialize: function(){
    this.on('creating', function(model, attrs, options){
      var shasum = bcrypt.hashSync(model.get('password'));
      model.set('password', shasum);
    });
  }
});

module.exports = User;