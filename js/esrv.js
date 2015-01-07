//vim ts=2 sw=2

var  fs = require("fs");
var  vm = require("vm");
var  qs = require("querystring");
var  url = require("url");
var path = require("path");
var repl = require("repl");
var WS_INDEX = "/game.html";
var HTTP_INDEX = "/ships";
var LISTEN_ADDR = "0.0.0.0";
var LISTEN_PORT = "1337";
var GAME_AGE = 2*60*1000; //2min
var GAME_CULL_FREQ = 6000; //6sec
var subsrv = require("./subsrv.js");
var EventEmitter = require('events').EventEmitter;
var util = require('util');

//new for express v4
var express = require("express");
var session = require('express-session');
var body_parser = require('body-parser');
var cookie_parser = require('cookie-parser');

var logger = util;

var server_context = vm.createContext({
  IS_SERVER : true,
  console : {log : function(v) {logger.log(v);}},
  setTimeout : setTimeout,
  setInterval : setInterval,
  clearInterval : clearInterval
});

//these are shared with client hence no module
['core.js','box2D.js','game.js','ship.js','projectile.js','phys.js'].forEach(function (v) {
  vm.runInContext(fs.readFileSync(__dirname+'/'+v),server_context);
});

var s = server_context;

/* Comm.go: servers Comm object
 * successful request */
s.Comm.prototype.go = function (callb,obj){
  if (typeof callb == "function")
    callb(obj);
  else
    this.callb(obj);
}



GameSrv = s.Game.extend({



  step : null,
  event_list : [],
  has_new_ships : false,



  /* getShips: gets a list of ships for this game
   * filter attributes also */
  getShips : function (no_comm) {
    result = [];
    for (var i = 0; i < this.ent_arr.length; i++) {
      if (this.ent_arr[i].type == s.ENT_TYPES["player"])
        var t = this.ent_arr[i];
        var res = {};
        s.SHIP_SYNC_ATTR.forEach(
          function(val) {
            res[val] = t[val];
          });
        res = no_comm ? res : {"addEnt":res};
        result.push(res);
      }
    return result;
  },


  /* getSeats: returns a list of the seats for this game
   * includes the fillSeat game function as well */
  getSeats : function (filter,val,fn) {
    fn = fn ? fn : "fillSeat";
    result = [];
    for (var e=0; e<this.seats.length;e++) {
      if (this.seats[e][filter] == val) {
        var o = {};
        o[fn] = this.seats[e];
        result.push(o);
      }
    }
    return result;
  },



  /* getTurn: for the seat corresponding to the argument passed
   * return the command to send back to the client */
  getTurn : function (rid) {
    result = [];
    var i = this.getSeatIndexById(rid);

    //would rather this run into the main event_list queue
    if (i >= 0 && this.seats[i].removable) {
      this.removeSeat(i);
      result.push({"removeSeat": i});
    }

    //if it is this seats turn send the input state change command
    else if (i >= 0 && this.seats[i].is_turn)
      result.push({"pushState": this.state_map["input"].name});

    //remind the client that it is not their turn
    else
      result.push({"pushState": this.state_map["wait"].name});

    return result;
  },



  /* cleanSeats: remove seats to prepare for the next in line
   *  */
  cleanSeats : function () {
    for (var i=0;i<this.seats.length;i++) {
      var t = this.seats[i].team;
      var rem = false;
      for (var e=0;e<this.ent_arr.length;e++) {
        if (t == this.ent_arr[e].team)
          rem = true;
      }
      if (!rem)
        this.seats[i].removable=true;
        //this.removeSeat(i);
    }
  },


  /* stateCheck: every game tick check if we can remove a seat
   * */
  stateCheck : function () {
    this.cleanSeats();
  },


  /* run: wrapper for starting the main game loop
   * */
  run : function () {
    this.main(this);
  },


  /* stop: wrapper for stopping the main game loop
   *  */
  stop : function () {
    this.step = function () {};
  },



  /* getComms: return a subset of the games event_list
   * with no arguments passed in will return the entire event_list */
  getComms : function (s,e) {
    if (!this.event_list.forEach) return "";
    if (!s) s = 0;
    if (!e || e == 0) e = this.event_list.length;

    var result_arr = [];
    var i = parseInt(s);
    this.event_list.slice(s,e).forEach(function (v){

      i++;
      var t = JSON.parse(v);
      t.I = i;
      result_arr.push(t);

    });

    return result_arr;
  },



  /* putComms:
   * */
  putComms : function (obj,comm) {
    var val = {};
    if (comm) val = {comm:obj};
    else val = obj;
    this.comm.msg_in.push(val);
    this.event_list.push(JSON.stringify(val));
  },



  /* cb: fires the call back for the servers Comm object
   * */
  e: new EventEmitter(),
  cb : function (e) {
    this.e.emit('comm',e);
  }



});



GameBucket = function (ss){
  this.session_store = ss;
  this.games = [];
  this.sessions = [];
  this.ship_templates = {
    "t0" : JSON.parse(fs.readFileSync(__dirname+'/ship1.json'))[0],
    "t1" : JSON.parse(fs.readFileSync(__dirname+'/ship2.json'))[0]
  }
  this.e = new EventEmitter();
}



GameBucket.prototype.cull = function () {
  var ss = this.session_store.sessions || {};
  var now = new Date().getTime();
  if (!this.games) return;
  for (var i=0;i<this.games.length;i++) {
    var g = this.games[i];
    for (var e=0;e<g.seats.length;e++) {
      var s = g.seats[e];
      var t;
      if (ss[s.id]) t = JSON.parse(ss[s.id]);
      if (t && t.gb_time < now - GAME_AGE) {
        logger.log(util.format("seat culled - game: %s session: %s last: %s", i,s.id,t.gb_time));
        g.removeSeat(e,true);
        gss.destroy(s.id);
      }
    }
  }
}



GameBucket.prototype.newGame=function (g){
  var g = new GameSrv();
  g.create();
  g.event_list=[];
  //g.comm.cb = function (v) {s.game.event_list.push(JSON.stringify(v));}
  g.comm.cb = function (v) {this.event_list.push(JSON.stringify(v));console.log("asdf");}
  g.run();
  this.games.push(g);
  this.e.emit('newGame',this.games.length - 1);
  return this.games.length - 1;//return index
}

GameBucket.prototype.findGame=function () {
  for (var e = 0; e < this.games.length; e++) {
    if (this.games[e].seats.length < this.games[e].max_seat)
      return e;
  }
  return -1
}

GameBucket.prototype.genShip = function (team) {
  var result = {};
  var y = s.goclone(this.ship_templates["t"+team]);
  s.SHIP_SYNC_ATTR.forEach(function(v) {
    result[v] = y[v];
  });
  result.id = s.newGuid_short();
  return result;
}


/* begin defining server
 * starts with static web server. can also just run behind proxy */
server = express();
server
  .use(express.static(
    process.cwd(),
    {index : WS_INDEX,
     //maxAge : COOKIE_AGE,
     redirect : true}
  ));



/* define more server stuff
 * cookieParser + session go together
 * TODO: replace MemoryStore with something better
 *   */
gss = new session.MemoryStore();
server.use(cookie_parser());
server.use(body_parser.json());
server.use(
  session(
  {
    secret:"EKPKvu0iYI/H0iFHlmsfdpQtvsRMKcBj",
    store:gss,
    saveUninitialized:true,
    resave:true
  }
));



/* findGame: pre-route check that parses session info first
 *  */
findGame = function(req,res,next) {

  var g;
  //no game found
  if (typeof req.session.gb_index === 'undefined'||
      typeof gb.games[req.session.gb_index] === 'undefined')
  {
    res.sendStatus(400);
    return;
  } else {
    g = gb.games[req.session.gb_index];
  }

  //sort of replaces session.touch() .. can't thing of a better way
  req.session.gb_time = new Date().getTime();

  if (!g) {
    throw Error("game " +req.method+" failed... game doesn't exist. sessionID: " +
    req.sessionID + " gb_index: " + req.session.gb_index +
    " data: " + JSON.stringify(req.body));
  }

  var seat = g.seats[g.getSeatIndexById(req.sessionID)];
  if (!seat) {
    res.sendStatus(400);
    return;
  }

  req.g = g;
  req.seat = seat;
  next();
}

/* initial page load should request this
 */
server.get(/.*\/hello$/,function (req,res){

  var g;
  var can_go=true;
  req.session.gb_time = new Date().getTime();

  //no game found in session try to find one or create one
  if (typeof req.session.gb_index === 'undefined'||
      typeof gb.games[req.session.gb_index] === 'undefined')
  {
    var join_game = gb.findGame();
    if (join_game >= 0) req.session.gb_index = join_game;
    else req.session.gb_index = gb.newGame();
    g = gb.games[req.session.gb_index];
    can_go=false;
  } else {
    g = gb.games[req.session.gb_index];
  }

  //assign or find the seat for this session
  var rid = req.sessionID;
  var iseat = g.getSeatIndexById(rid);
  if (iseat<0) {
    var b = new s.Seat();
    b.id = rid;
    b.type = "player";
    var t_seat = g.fillSeat(b);
    var team = g.seats[t_seat].team
    var ship = gb.genShip(team);
    g.putComms({"addEnt":ship});

    //FIXME:
    //g.stepTurn();

    logger.log(util.format("client hello - session: %s game: %s seat: %s",
      req.sessionID,req.session.gb_index, t_seat));
    can_go=false;
  }

  function h_go(){
    //send list of seats and ships
    var re=[{"setCommI":g.event_list.length}]
    re = re.concat(g.getSeats("id",rid));
    re = re.concat(g.getShips());
    re = re.concat(g.getTurn(req.sessionID));
    res.json(re);
    return;
  }

  if (can_go) h_go();//didn't add anything so event will probably never fire
  else g.e.once('comm',h_go);//this should fire on the next game step

});


/* represents a client requesting an update
 * url matches format "/1/2" */
server.get(/\/\d+\/\d+$/,findGame,function (req,res){
  var g = req.g;
  var result = req.url.match(/\d+\/\d+?$/)[0].split(/\//)

  function h_go() {
    var re = [];
    re = re.concat(g.getComms(result[1]));
    re = re.concat(g.getTurn(req.sessionID));

    re = re.concat(g.getSeats("id",req.sessionID,"updateSeat"));

    if (result[1] != g.event_list.length)
      re = re.concat([{"setCommI":g.event_list.length}]);
    res.json(re);
    return;
  }

  //form response if any of these conditions are met
  if (req.seat.is_turn ||
     result[1] < g.event_list.length ||
     parseInt(result[0]) != g.cur_state) h_go();

  //wait to form response until something has happened
  else g.e.once('comm',h_go);

  setTimeout(function () {
    req.session.gb_time = new Date().getTime();
    g.e.removeListener('comm',h_go);
    res.end('repoll');
  },GAME_AGE - 10000);

});


/* post request is a client sending data
 */
server.post("*",findGame,function (req,res){
  if (typeof(req.body) != "object") {
    res.send(400);
    res.end();
    return;
  }

  var g = req.g;
  var seat = req.seat;

  if (!seat.is_turn) {
    res.send(500, 'Not your turn!');
    return;
  }

  g.putComms(req.body);
  //g.stepTurn();
  g.stepMove();

  re = [];
  re = re.concat({"setCommI":g.event_list.length});
  re = re.concat(g.getTurn(req.sessionID));
  re = re.concat(g.getSeats("id",req.sessionID,"updateSeat"));
  res.json(re);

});



gb = new GameBucket(gss);

server.use(function(err, req, res, next){
  logger.log(err.stack);
  res.status(500).send('Something broke!');
});

server.listen(LISTEN_PORT,LISTEN_ADDR);
logger.log('Server running at http://'+LISTEN_ADDR+':'+LISTEN_PORT+'/');

setInterval(gb.cull.bind(gb),GAME_CULL_FREQ);

subsrv = new subsrv(gb);
server.get(/\/sub.*/,subsrv.sub);

m=[];
t = s;
repl.start({
  prompt: "ships> ",
  input: process.stdin,
  output: process.stdout,
});
