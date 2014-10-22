/*Copyright 2012 Google Inc. All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
#limitations under the License.*/




merge = function(original, extended)
{
    for (var key in extended)
    {
        var ext = extended[key];
        if (
          typeof (ext) != 'object' ||
          ext instanceof Class ||
          ext.forEach/*this might break stuff later. side note: why doesn't*/
        )            /*instanceof Array always work? -pete 2014-02-18*/
        {
            original[key] = ext;
        }
        else
        {
            if (!original[key] || typeof (original[key]) != 'object')
            {
                original[key] = {};
            }
            merge(original[key], ext);
        }
    }
    return original;
};

function copy(object)
{
    if (
   !object || typeof (object) != 'object' ||
   object instanceof Class
    ) {
        return object;
    }
    else if (object instanceof Array) {
        var c = [];
        for (var i = 0, l = object.length; i < l; i++) {
            c[i] = copy(object[i]);
        }
        return c;
    }
    else {
        var c = {};
        for (var i in object) {
            c[i] = copy(object[i]);
        }
        return c;
    }
};

 function ksort(obj) {
     if (!obj || typeof (obj) != 'object') {
         return [];
     }

     var keys = [], values = [];
     for (var i in obj) {
         keys.push(i);
     }

     keys.sort();
     for (var i = 0; i < keys.length; i++) {
         values.push(obj[keys[i]]);
     }

     return values;
    };

// -----------------------------------------------------------------------------
// Class object based on John Resigs code; inspired by base2 and Prototype
// http://ejohn.org/blog/simple-javascript-inheritance/
(function(){
var initializing = false, fnTest = /xyz/.test(function() { xyz; }) ? /\bparent\b/ : /.*/;

this.Class = function() { };
var inject = function(prop)
{
    var proto = this.prototype;
    var parent = {};
    for (var name in prop)
    {
        if (
    typeof (prop[name]) == "function" &&
    typeof (proto[name]) == "function" &&
    fnTest.test(prop[name])
  )
        {
            parent[name] = proto[name]; // save original function
            proto[name] = (function(name, fn)
            {
                return function()
                {
                    var tmp = this.parent;
                    this.parent = parent[name];
                    var ret = fn.apply(this, arguments);
                    this.parent = tmp;
                    return ret;
                };
            })(name, prop[name])
        }
        else
        {
            proto[name] = prop[name];
        }
    }
};

this.Class.extend = function(prop)
{
    var parent = this.prototype;

    initializing = true;
    var prototype = new this();
    initializing = false;

    for (var name in prop)
    {
        if (
    typeof (prop[name]) == "function" &&
    typeof (parent[name]) == "function" &&
    fnTest.test(prop[name])
  )
        {
            prototype[name] = (function(name, fn)
            {
                return function()
                {
                    var tmp = this.parent;
                    this.parent = parent[name];
                    var ret = fn.apply(this, arguments);
                    this.parent = tmp;
                    return ret;
                };
            })(name, prop[name])
        }
        else
        {
            prototype[name] = prop[name];
        }
    }

    function Class()
    {
        if (!initializing)
        {

            // If this class has a staticInstantiate method, invoke it
            // and check if we got something back. If not, the normal
            // constructor (init) is called.
            if (this.staticInstantiate)
            {
                var obj = this.staticInstantiate.apply(this, arguments);
                if (obj)
                {
                    return obj;
                }
            }

            for (var p in this)
            {
                if (typeof (this[p]) == 'object')
                {
                    this[p] = copy(this[p]); // deep copy!
                }
            }

            if (this.init)
            {
                this.init.apply(this, arguments);
            }
        }
        return this;
    }

    Class.prototype = prototype;
    Class.constructor = Class;
    Class.extend = arguments.callee;
    Class.inject = inject;

    return Class;
};
})();

  newGuid_short = function()
  {
    var S4 = function() { return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1); };
    return (S4()).toString();
  };

  newGuid = function()
  {
    var S4 = function() { return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1); };
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4()).toString();
  };



var cssify = function(obj){
  //This is awful!
  //think stringify, but css.. i promise to use jquery next time
  if (!obj) return;

  var val = [],
  result = "",
  is_inline = true,
  sep = "; ",
  keys=Object.keys(obj);

  if (
  keys.indexOf("class") > -1 ||
  keys.indexOf("id") > -1 ||
  keys.indexOf("tag") > -1){
    sep = ';\n';
    is_inline = false;
  }

  for (var n=0; n < keys.length; n++ ){
    var s = obj[keys[n]];
    var i = keys[n];
    if (obj.hasOwnProperty(i)){
      if (i == "class") result+="." + s + " {\n";
      else if(i == "id") result+="#" + s + " {\n";
      else if(i == "tag") result+= s + " {\n";
      else val.push(i);
    }
  }

  for (var i = 0; i < val.length; i++){
    result += val[i] + ":" + obj[val[i]] + sep
  }

  if (!is_inline) {
      result+='}';
      var style = document.createElement('style');
      style.type = 'text/css';
      style.innerHTML=result;
      return style;
  }
  return result
}

var listify = function(obj){

  var result,outer,inner;
  var elm_style=cssify(obj.elm_style);
  var ite_style=cssify(obj.ite_style);

  if (obj.type == "ul"){
    outer="ul";
    inner="li";
  } else if (obj.type == "tr"){
    outer="tr";
    inner="td";
  } else if (obj.type == "th"){
    outer="tr";
    inner="td";
  }

  if (inner && outer) {
    result = document.createElement(outer);
    if (elm_style) result.setAttribute("style",elm_style);
    obj.items.forEach(function(i){
      var t = document.createElement(inner);
      t.innerHTML=i;
      if (obj.ite_style) t.setAttribute("style",ite_style);
      if (obj.ite_callback)
        t.addEventListener(obj.ite_callback.func, obj.ite_callback.callback);
      result.appendChild(t);
    });
  }
  return result
}

//http://jsfiddle.net/dystroy/U3jHd/
function goclone(source) {
    if (Object.prototype.toString.call(source) === '[object Array]') {
        var clone = [];
        for (var i=0; i<source.length; i++) {
            if (source[i]) clone[i] = goclone(source[i]);
        }
        return clone;
    } else if (typeof(source)=="object") {
        var clone = {};
        for (var prop in source) {
            if (source.hasOwnProperty(prop)) {
                clone[prop] = goclone(source[prop]);
            }
        }
        return clone;
    } else {
        return source;
    }
}

