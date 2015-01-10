//vim ts=2 sw=2
var CANVAS_ID="game_canvas_01";
var UI_ID="ui_canvas_01";
var CLICK_BOUND = 1;
var UI_TEXT_SCALE = 12;
var UI_MOBILE_TEXT_SCALE = 4;
BORDER_STYLE = "1px solid black";
IS_SERVER=false;



/*GameClient
 *extends the Game object to make it do things like render to an html canvas */
GameClient = Game.extend({

last_update : null,
has_to_draw : true,
moved : false,
ui_text_scale : UI_TEXT_SCALE,

/* createClient:
 * */
createClient : function () {

  //parent class create function
  this.create();

  //static css stuff. why is this here?
  setupCSS();

  //detect browser type
  this.mobile = isMobile();
  if (this.mobile) this.ui_text_scale *= UI_MOBILE_TEXT_SCALE;

  //preload some assets
  this.fireUpCache();

  //should cause the client to update on start
  this.moved=true;

  //these are used if on android mobile/chrome
  this.touch_offset_X = window.screen.width == document.documentElement.clientWidth
    ? window.screen.width : window.outerWidth;
  this.touch_offset_Y = window.screen.height == document.documentElement.clientHeight
    ? window.screen.height : window.outerHeight;

  //input listeners
  this.ev = new EvListener();
  window.addEventListener('keydown', this.ev.detectKey.bind(this))

  window.addEventListener('mousedown', this.ev.mDown.bind(this));
  window.addEventListener('mouseup', this.ev.mUp.bind(this));
  window.addEventListener('touchstart', this.ev.mDown.bind(this), false);
  window.addEventListener('touchend', this.ev.mUp.bind(this), false);

  window.addEventListener('touchmove', this.ev.move.bind(this), false);
  window.addEventListener('mousemove', this.ev.move.bind(this));

  window.addEventListener('resize', this.ev.orientCanvas.bind(this,true), false);

  if (window.DeviceMotionEvent)
    window.addEventListener('devicemotion', this.ev.deviceMove.bind(this), false);

  //html tags
  var body = document.getElementById('body');
  this.canvas = document.createElement('canvas');
  this.canvas.style.border=BORDER_STYLE;
  this.canvas.setAttribute("tabindex",'0');
  this.canvas.setAttribute("id",CANVAS_ID);
  //this.canvas.setAttribute("style" , cssify({ "background-image" : 'url("img/lined-paper.gif")'}));
  //this.canvas.setAttribute("style" , cssify({ "background-image" : 'url("img/graph-tile.png")'}));
  //this.canvas.setAttribute("style" , cssify({ "background-image" : 'url("img/graph-tile-trans.png")'}));
  //document.body.setAttribute("style", cssify({"background-image" : 'url("img/space.jpg")'}));


  this.ev.orientCanvas.call(this);

  body.appendChild(this.canvas);

  //UI .. more html content
  this.ui = new UI();
  this.ui.create(this);

  //create game_bar
  this.ui.createGameBar("state","connected","up","down","move","fire")

  this.uiSetSelector();
  this.ui.setupInit();

  this.ev.orientCanvas.call(this,true);

  //other important stuff
  this.canvas_offset = {x : this.canvas.offsetLeft,y : this.canvas.offsetTop};
  this.last_update = this.now;


},


/* drawAll: loops through ent_arr
 */
drawAll : function (clear_flag) {

  var cw = this.canvas.width;
  var ch = this.canvas.height;
  var c = this.canvas.getContext("2d");
  if (!this.tester&&!clear_flag) c.clearRect(0,0,this.gsize.w ,this.gsize.h);

  //draw physics bodies
  for (var i=0; i < this.ent_arr.length; i++) {
    this.drawPhy(i,c,cw,ch);
  }

  //draw doodads
  for (var i=0; i < this.doodad_arr.length; i++) {
    this.doodad_arr[i].draw(c);
  }

  this.has_to_draw = !this.tester ? false : true;

},


/* drawPhy: rotates canvas and calls the entities draw function
 *  */
drawPhy : function(i,c,cw,ch) {

  var
    pos = this.ent_arr[i].body.GetPosition();
    ang = this.ent_arr[i].body.GetAngle();
    dx = pos.x * this.physics_offset;
    dy = pos.y * this.physics_offset;


  //---
  c.save()
  c.translate(dx,dy);
  c.rotate(ang);

  this.ent_arr[i].draw(
    c,
    this.ent_arr[i].sw,
    this.ent_arr[i].sh,
    this.draw_health
  );

  c.restore();
  //---


  if (this.ent_arr[i].clip) {
    for (var n = 0; n < this.ent_arr[i].clip.length; n++) {
      c.save();
      c.translate(
        this.ent_arr[i].clip[n].x * this.physics_offset,
        this.ent_arr[i].clip[n].y * this.physics_offset);
      c.rotate(ang);
      this.ent_arr[i].draw(
        c,
        this.ent_arr[i].sw,
        this.ent_arr[i].sh,
        this.draw_health
      );
      c.restore();
    }
  }

},



/* updateClient: do animation frames and network calls
 * separate from main game loop */
updateClient : function() {

  //uncomment to always comm server regardless of input
  //this.moved = true;

  if (this.has_to_draw || !this.pollMotion()){
    this.drawAll();
    this.ui.drawAll();
  }

  var now = this.now;
  this.now = new Date().getTime();

  if (this.moved &&
     ((now - this.last_update) > this.poll) &&
      !this.paused)
  {
    this.comm.go(
      this.cur_state.id+this.comm.sep+this.comm.I,
      this.comm.cb.bind(this)
    );
    this.moved = false;
    this.last_update = now;

  } else if (now - this.last_update > this.must_poll) {
    this.moved = true;
  }

  //recursive call
  window.rAF(this.updateClient.bind(this));

},



/* setupHello: basically saves the /hello thing being in body of html
 * */
setupHello : function () {
  this.comm.go("/hello",this.comm.cb.bind(this));
},



/* run: begins the main game loop
 * */
run : function () {

  //register main game loop
  clearInterval(this.int);
  this.main(this);

  var rAF =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

  if (typeof(rAF) === "undefined") {
    rAF = function(cb) {setTimeout(cb,FREQ);}
  }

  window.rAF = rAF;
  window.rAF(this.updateClient.bind(this));
},


/* stop: main loop
 */
stop : function () {
  clearInterval(this.int);
  window.cancelAnimationFrame(window.rAF);
},



/* finishDrag: draws a path to the game canvas
 * also determine the speed of the drag to be used for a physics force
 * TODO: compensate for the size of the device via pixels
 * TODO: recognize and/or normalize path for gestures */
finishDrag : function (path) {
  
  if (!path.length) return;

  this._drag_inp = false;
  this._drag = false;
  this.drag_end = this.ticks;
  this.has_to_draw = true;
  this.uiSetSelector();

  var
    ofs = {x : this.canvas.offsetLeft,y : this.canvas.offsetTop},
    ctx = this.canvas.getContext("2d"),
    dist = 0,
    force;

  var time = this.drag_end - this.drag_start;
  var pos = this.ent_toggled.body.GetWorldCenter();

  var beg = {//beginning of path
    x : path[0].x / this.physics_offset,
    y : path[0].y / this.physics_offset
  };

  var end = {//end of path
    x : path[path.length-1].x / this.physics_offset,
    y : path[path.length-1].y / this.physics_offset
  };

  //transfer the path vectors over top of the target entities position
  beg.x -= end.x;
  beg.y -= end.y;

  end.x = pos.x - beg.x;
  end.y = pos.y - beg.y;


  ctx.strokeStyle = "rgb(0,0,255)";
  ctx.beginPath();

  ctx.moveTo(path[0].x - ofs.x, path[0].y - ofs.y);

  for (var i=1;i<path.length;i++) {

    var a = path[i],
        b = path[i-1];

    ctx.lineTo(a.x - ofs.x, b.y - ofs.y);

    //dist += Math.sqrt(Math.pow((b.x - a.x),2) + Math.pow((b.y - a.y),2));
    dist += Math.pow((b.x - a.x),2) + Math.pow((b.y - a.y),2);

  }

  ctx.stroke();

  this.drag_vec = {
    force : Math.round( dist / time ),
    end : end
  };

},



/* stateCheck: flow control for client - called by main update/step loop
 * */
stateCheck : function () {

  //update ui status bar
  this.ui.update("state",this.cur_state.name,this.seats[0]);

  //triggered by a swipe
  if (this.drag_vec) {

    //save command
    this.command =
      this.genSwipeCommand(
        this.queued_command,
        this.drag_vec,
        this.ent_toggled
      );
    //unset globals
    this.queued_command = null;
    this.drag_vec = null;

  }

  //triggered by a saved command
  if (this.cur_state.id > 0 && this.command) {
    //while(!this.pollMotion()) {console.log("hi");}
    this.sendCommand();
  }

},



/* stepState: called from pushState() and cur_state changes
 * */
stepState : function() {
  var qc = this.queued_command;
  //call the cancel function if available
  if (qc && this.checkCommand({fn:qc.cancel_fn}))
    this[qc.cancel_fn]();
  this.command = null;
  this.queued_command = null;
  this.uiSetSelector();
},



/* sendCommand: sends a command back to the game and resets global ready flag
 * */
sendCommand : function (comm) {

  //override queued command
  this.command = comm || this.command;

  //send command to game and server
  this.comm.msg_out.push(this.command);
  this.comm.msg_in.push(this.command);

  //unset global
  this.command = null;

},



/* generateCommand: checks and returns a mapped game command
 * @q_comm: queued command
 * @d_vec: queued drag vector
 * @ent: toggled entity */
genSwipeCommand : function (q_comm,d_vec,ent) {

  //override queued command
  var comm = q_comm;
  
  //exit early if comm doesn't map to a function on the game object
  if (!this.checkCommand(comm)) return null;

  //create swipe command result
  var result = {};
  result[comm.game_fn] = {
    x:d_vec.end.x,
    y:d_vec.end.y,
    id:ent.id,
    force:d_vec.force
  };

  return result;

},



/* checkCommand: ensure command maps to a function
 * returns true if value maps to a function or false */
checkCommand : function (val) {

  //override queued command
  var comm = val || this.queued_command;
    
  if (!comm) {console.log("nota real command");return;}
  
  //exit early if it doesn't map to a function on the game object
  if (!comm.game_fn || typeof this[comm.game_fn] != "function") {
    //console.log("no mapped function for " + comm.fn);
    return false;
  }

  return true;

},



/* clientMoveShield: wrapper for moveShield
 * */
clientMoveShield : function(ent) {
  if (!this.ent_toggled) return;
  return {"moveShield": {id:this.ent_toggled.id,shield:this.ent_toggled.shield} }
},


});

Comm.prototype.go = function (data,fn) {
  var req = new XMLHttpRequest();

  //objects denote an operation from the server or client
  if (typeof data == "object") {
    req.open("POST", this.uri, this.async);
    data = JSON.stringify(data);
    req.setRequestHeader("Content-Type","application/json");

  //empty data means access to the static server content
  } else if (typeof data == "undefined") {
    req.open("GET", this.uri, this.async);

  //a string will request specific urls - should be state strings
  } else if (typeof data == "string") {
    req.open(
      "GET",
      this.uri + "/" + encodeURI(data.replace(/^\//,'')),
      this.async);
    data ="";

  //default to static contet
  } else {
    req.open("GET", this.uri, this.async);
  }

  if (this.async) {
    req.onreadystatechange = function () {
      if (req.readyState == 4 && req.status == 200){
        var response = null;
        try {
         response = JSON.parse(req.responseText);
        } catch (e) {
         response = req.responseText;
        }
        fn(response);

      } else if (req.readyState == 4 && req.status >= 400 && req.status < 500) {
        fn("paused");
      } else if (req.readyState == 4 && req.status >= 500) {
        fn("paused");
      } else if (req.readyState == 4) {
        fn("paused");
      }
    }
  }
  req.send(data);
}

Ship.prototype.draw = function (ctx,w,h,draw_health) {
  //try catch block here .. sometimes mobile android browser craps out
  try {

    //draw ship img
    ctx.drawImage(this.img,this.ctx,this.cty,w,h);

    //draw missles
    if (this.doodads) {
      for (var i=0;i<this.doodads.length;i++) {
        ctx.drawImage(
          this.doodads[i].img,
          this.ctx + this.doodads[i].ctx,
          this.cty + this.doodads[i].cty,
          this.doodads[i].sw,
          this.doodads[i].sh
        );
      }
    }

    //draw health bar
    if (draw_health) {//TODO: colors
      ctx.fillStyle = "rgba(0,150,75,0.5)";
      ctx.fillRect(+Math.abs(this.ctx),-Math.abs(this.cty),w*0.1,this.health*2);
    }


    //draw shields
    if (this.shield) {

      var base = this.sw / 5;
      var incr = base / 5;
      ctx.strokeStyle = "rgba(0,150,75,0.5)";

      if (this.shield.front && this.shield.front > 0) {
        for (var i=1;i < this.shield.front+1; i++){
          ctx.beginPath();
          ctx.arc(0, 0, (this.sw - base) + (incr * i), Math.PI + QTRPI  , Math.PI + THREEQTRPI );
          ctx.stroke();
        }

      }

      if (this.shield.back && this.shield.back > 0) {
        for (var i=1;i < this.shield.back+1; i++){
          ctx.beginPath();
          ctx.arc(0, 0, (this.sw - base) + (incr * i), QTRPI  , THREEQTRPI );
          ctx.stroke();
        }
      }

    }

  } catch (e) {
    //console.log(e);
  }
}

function cb_fn2(v) {
try {
  if (typeof(v)=="object")
    return v;
  else if (typeof(v)=="string")
    return JSON.parse(v);
  else
    return v;
} catch (e) {
  return v;
}
}

Comm.prototype.cb = function (v){
  //returns "paused" if there was an HTTP error
  if(v == "paused") {
    this.paused = true;
    this.ui.update("conn",true);
  } else if (!this.paused) {
    this.paused = false;
    this.ui.update("conn",false);
  }

  if(v == "repoll") {
    this.moved = true;
  }


  if (!v.forEach) {
    //this.comm.msg_in.push(v);
    this.comm.msg_in.push(cb_fn2(v));
  } else {
    for (var i=0;i<v.length;i++) {
      //this.comm.msg_in.push(v[i])
      this.comm.msg_in.push(cb_fn2(v[i]));
    }
  }
}

//FIXME:
Ship.prototype.img_onload_proxy = function () {game.has_to_draw = true;}
Ship.prototype._game_ref = function () { return game; }

//FIXME:
Ent.prototype.init = function () {

  if (this instanceof Ship) {
    this.sw = this.w * PHY_OFS;// * 2;
    this.sh = this.h * PHY_OFS;// * 2;
  }

  this.ctx = -(this.sw*0.5);
  this.cty = -(this.sh*0.5);
}

GameClient.prototype._is_server = IS_SERVER;
GameClient.prototype.img_cache = {};
GameClient.prototype.loadImg = function (value) {

  this.has_to_draw = true;

  //return value if it is in cache
  if (this.img_cache.hasOwnProperty(value)) {
    return this.img_cache[value];
  }
  
  //add value to cache
  var img;
  img = new Image();
  img.src = value;
  if (value) this.total_req++;
  g = this;
  img.onload = function () {g.total_loaded++};
  this.img_cache[value] = img;

  return img;

}

GameClient.prototype.fireUpCache = function(values) {

  var values = values ? values :[
    "img/ship_a_body0.png",
    "img/ship_missle.png",
    "img/ship_b_body0.png",
    "img/blue.gif",
    "img/point.gif"
  ];

  this.total_loaded=0;
  this.total_req=0;

  for (var i=0;i<values.length;i++)
    this.loadImg(values[i]);

  g=this;

  this.cache_interval = window.setInterval(
    function () {
      if (g.total_loaded >= values.length) {
        window.clearInterval(g.cache_interval);
        g.has_to_draw=true;
      }
    }, CACHE_INTERVAL
  );


}



var setupCSS = function () {
  document.getElementsByTagName('head')[0].appendChild(
  cssify({
    "tag" : "canvas,div",
    "-webkit-touch-callout" : "none",
    "-webkit-user-select" : "none",
    "-khtml-user-select" : "none",
    "-moz-user-select" : "none",
    "-ms-user-select" : "none",
    "user-select" : "none",
    "outline" : "none",
    "-webkit-tap-highlight-color" : "rgba(255, 255, 255)",
  }));

  document.getElementsByTagName('head')[0].appendChild(
  cssify({
    "tag" : ".flip-horizontal",
    "-moz-transform": "scaleX(-1)",
    "-webkit-transform": "scaleX(-1)",
    "-o-transform": "scaleX(-1)",
    "transform": "scaleX(-1)",
    "-ms-filter": "fliph", /*IE*/
    "filter": "fliph" /*IE*/
  }));

  document.getElementsByTagName('head')[0].appendChild(
  cssify({
    "tag":".flip-vertical",
    "-moz-transform": "scaleY(-1)",
    "-webkit-transform": "scaleY(-1)",
    "-o-transform": "scaleY(-1)",
    "transform": "scaleY(-1)",
    "-ms-filter": "flipv", /*IE*/
    "filter": "flipv" /*IE*/
  }));

  document.getElementsByTagName('head')[0].appendChild(
  cssify({
    "tag":".rotate-90",
    "-ms-transform": "rotate(90deg)",
    "-webkit-transform": "rotate(90deg)",
    "transform": "rotate(90deg)"
  }));

  document.getElementsByTagName('head')[0].appendChild(
  cssify({
    "tag":".rotate-270",
    "-ms-transform": "rotate(270deg)",
    "-webkit-transform": "rotate(270deg)",
    "transform": "rotate(270deg)"
  }));

}

/* isMobile: 
 * */
function isMobile() {
  if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    return true;
  } else {
    return false;
  }
}

//var c = game.canvas.getContext("2d");game.physics.tester(c);game.tester=true;
