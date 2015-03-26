(function() {
  var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  (function(global, factory) {
    var Backbone, _, autobahn, ref;
    if (typeof define === "function" && define.amd) {
      return define(["underscore", "backbone", "autobahn"], function(_, Backbone, autobahn) {
        var ref;
        return ref = factory(global, _, Backbone, autobahn), global.Backbone.WAMP_Model = ref[0], global.Backbone.WAMP_Collection = ref[1], ref;
      });
    } else if (typeof module !== "undefined" && module.exports) {
      _ = require("underscore");
      Backbone = require("backbone");
      autobahn = require("autobahn");
      return module.exports = factory(global, _, Backbone, autobahn);
    } else {
      return ref = factory(global, global._, global.Backbone, autobahn), global.Backbone.WAMP_Model = ref[0], global.Backbone.WAMP_Collection = ref[1], ref;
    }
  })((function() {
    return this;
  })(), function(global, _, Backbone, autobahn) {
    var WAMP_Collection, WAMP_Model, action_map, attach_handlers, backbone_ajax_original, mixin_wamp_options, wamp_get_uri;
    action_map = {
      "POST": "create",
      "PUT": "update",
      "PATCH": "patch",
      "DELETE": "delete",
      "GET": "read"
    };
    attach_handlers = function() {
      var connection;
      connection = this.wamp_connection || global.WAMP_CONNECTION;
      return _.each(_.values(action_map), (function(_this) {
        return function(action) {
          var get_uri;
          get_uri = _.has(_this, "wamp_get_uri") || _.has(_this.constructor.prototype, "wamp_get_uri") ? _this.wamp_get_uri : global.WAMP_GET_URI || _this.wamp_get_uri;
          return connection.session.register(get_uri.call(_this, _.result(_this, "url") || _.result(_this, "urlRoot"), _.result(_this, "wamp_my_id") || global.WAMP_MY_ID, action), function(args, kwargs, details) {
            var name;
            if (kwargs.data) {
              kwargs.data = JSON.parse(kwargs.data);
            }
            return (typeof _this[name = "wamp_" + action] === "function" ? _this[name](kwargs, details) : void 0) || new autobahn.Error("Not defined procedure for action: " + action);
          });
        };
      })(this));
    };
    mixin_wamp_options = function(method, entity, options) {
      var ref, ref1;
      return _.extend(options, {
        wamp: true,
        wamp_connection: entity.wamp_connection,
        wamp_get_uri: _.has(entity, "wamp_get_uri") || _.has(entity.constructor.prototype, "wamp_get_uri") ? _.bind(entity.wamp_get_uri, entity) : global.WAMP_GET_URI || _.bind(entity.wamp_get_uri, entity),
        wamp_my_id: ((ref = entity.collection) != null ? ref.wamp_my_id : void 0) || entity.wamp_my_id || global.WAMP_MY_ID,
        wamp_other_id: ((ref1 = entity.collection) != null ? ref1.wamp_other_id : void 0) || entity.wamp_other_id || global.WAMP_OTHER_ID
      });
    };
    wamp_get_uri = function(uri, wamp_id, action) {
      return uri + "." + wamp_id + "." + action;
    };
    backbone_ajax_original = Backbone.ajax;
    Backbone.ajax = function(ajax_options) {
      var connection, defer, uri;
      if (!ajax_options.wamp) {
        return backbone_ajax_original(ajax_options);
      }
      connection = ajax_options.wamp_connection || global.WAMP_CONNECTION;
      uri = ajax_options.wamp_model_id ? ajax_options.url.replace(new RegExp("/" + ajax_options.wamp_model_id + "$"), "") : ajax_options.url;
      defer = connection.defer();
      connection.session.call(ajax_options.wamp_get_uri(uri, _.result(ajax_options, "wamp_other_id"), action_map[ajax_options.type]), [], {
        data: ajax_options.data,
        extra: _.extend(ajax_options.wamp_extra || {}, {
          wamp_model_id: ajax_options.wamp_model_id,
          wamp_my_id: ajax_options.wamp_my_id
        })
      }, ajax_options.wamp_options).then(function(obj) {
        if (obj != null ? obj.error : void 0) {
          ajax_options.error(obj);
          return defer.reject(obj);
        } else {
          ajax_options.success(obj);
          return defer.resolve(obj);
        }
      }, function(obj) {
        ajax_options.error(obj);
        return defer.reject(obj);
      });
      if (_.isFunction(defer.promise)) {
        return defer;
      } else if (_.isObject(defer.promise)) {
        return defer.promise;
      }
    };
    WAMP_Model = (function(superClass) {
      extend(WAMP_Model, superClass);

      function WAMP_Model(attributes, options) {
        if (options == null) {
          options = {};
        }
        WAMP_Model.__super__.constructor.apply(this, arguments);
        if (!options.collection) {
          this.wamp_attach_handlers();
        }
      }

      WAMP_Model.prototype.sync = function(method, model, options) {
        if (options == null) {
          options = {};
        }
        return WAMP_Model.__super__.sync.call(this, method, model, _.extend(mixin_wamp_options(method, model, options), {
          wamp_model_id: model.id
        }));
      };

      WAMP_Model.prototype.wamp_attach_handlers = function() {
        if (this.collection) {
          return console.warn("wamp_create, wamp_read, wamp_update, wamp_delete, wamp_patch handlers were not registered for `" + this.constructor.name + "`, because it contained in `" + this.collection.constructor.name + "`");
        }
        if (_.result(this, "urlRoot") && (this.wamp_my_id || global.WAMP_MY_ID)) {
          return attach_handlers.call(this);
        } else {
          return console.warn("wamp_create, wamp_read, wamp_update, wamp_delete, wamp_patch handlers were not registered for `" + this.constructor.name + "`. Check `urlRoot` / global `WAMP_MY_ID` or `wamp_my_id` property/method");
        }
      };

      WAMP_Model.prototype.wamp_get_uri = wamp_get_uri;

      return WAMP_Model;

    })(Backbone.Model);
    WAMP_Collection = (function(superClass) {
      extend(WAMP_Collection, superClass);

      function WAMP_Collection() {
        WAMP_Collection.__super__.constructor.apply(this, arguments);
        this.wamp_attach_handlers();
      }

      WAMP_Collection.prototype.model = WAMP_Model;

      WAMP_Collection.prototype.sync = function(method, collection, options) {
        if (options == null) {
          options = {};
        }
        return WAMP_Collection.__super__.sync.call(this, method, collection, mixin_wamp_options(method, collection, options));
      };

      WAMP_Collection.prototype.wamp_attach_handlers = function() {
        if (_.result(this, "url") && (this.wamp_my_id || global.WAMP_MY_ID)) {
          return attach_handlers.call(this);
        } else {
          return console.warn("wamp_create, wamp_read, wamp_update, wamp_delete, wamp_patch handlers were not registered for `" + this.constructor.name + "`. Check `url` / global `WAMP_MY_ID` or `wamp_my_id` property/method");
        }
      };

      WAMP_Collection.prototype.wamp_get_uri = wamp_get_uri;

      return WAMP_Collection;

    })(Backbone.Collection);
    return [WAMP_Model, WAMP_Collection];
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,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