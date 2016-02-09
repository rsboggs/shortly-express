var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  //specify table name
  tableName: 'users',
  //initialize and manipulate actual database
  initialize: function(){
    this.on('creating', function(model, attrs, options){
      //
      model.set('username', "bigbabyjesus");
      console.log('>>>>>>>>>>>',model.get("username"));
      // db.knex('users').insert({username : '', password : 'e'});
    });
  }
});

module.exports = User;