
function createIcon(text) {
var r= document.createElement('div');
r.innerHTML = text;
return r;
}

GameClient.prototype.ui_history=[];

//ui constants for ship commands
var UI_FUNCTION_MAP = {
  "ship":{id:0,fn:"moveEnt",name:"move",input_type:"swipe"},
  "shield":{id:1,fn:"clientMoveShield",name:"shield",
    cancel_fn:"uiCancelMoveShield",click_fn:"uiMoveShield",
    confirm_fn:"uiConfirmMoveShield",input_type:"arrow"},
  "laser":{id:2,fn:"fireProjectile",name:"fire",input_type:"swipe"},
  "missle":{id:3,fn:"fireMissle",name:"missle",input_type:"swipe",
    confirm_fn:"uiConfirmFireMissle"},
  "info":{id:4,fn:"getInfo",name:"info",input_type:"display"},
  "cancel":{id:5,fn:"cancel",name:"cancel",input_type:"cancel"},
  "confirm":{id:6,fn:"confirm",name:"confirm",input_type:"confirm"}
}
GameClient.prototype.cancel = function () {};
GameClient.prototype.confirm = function () {};
var UI_DEFAULT = {
  "name": "start",
  "children": ["select","a ship"]
}
var
ICON_MOVE=createIcon('<img src="img/icon_move.png"></img><br />move'),
ICON_FIRE=createIcon('<img src="img/icon_fire.png"></img><br />fire'),
ICON_SHIP=createIcon('<img src="img/icon_ship.png"></img><br />move ship'),
ICON_SHIELD=createIcon('<img src="img/icon_shield.png"></img><br />move shield'),
ICON_LASER=createIcon('<img src="img/icon_laser.png"></img><br />fire laser'),
ICON_MISSLE=createIcon('<img src="img/icon_missle.png"></img><br />fire missle'),
ICON_CANCEL=createIcon('<img src="img/icon_cancel.png"></img><br />cancel'),
ICON_CONFIRM=createIcon('<img src="img/icon_confirm.png"></img><br />confirm')

var UI_SHIP_PLAYER = {
  "name": "start",
  "children": [
    {
    "name":"move",
    "content":ICON_MOVE,
    "children":
      [{
        "name": "ship",
        "content":ICON_SHIP,
        "fn":UI_FUNCTION_MAP["ship"],
        "children":
        [
          {"name":"cancel","content":ICON_CANCEL},
          {"name":"confirm","children":["SWIPE!",""],"input_ready":true,"content":ICON_CONFIRM}
        ],
      },
      {
        "name":"shield",
        "fn":UI_FUNCTION_MAP["shield"],
        "input_ready":true,
        "content":ICON_SHIELD,
        "children":
        [
          {"name":"cancel","input_ready":true,"fn":UI_FUNCTION_MAP["cancel"],"content":ICON_CANCEL},
          {"name":"confirm","input_ready":true,"fn":UI_FUNCTION_MAP["confirm"],"content":ICON_CONFIRM}
        ],
      }]
    },
    {
      "name":"fire",
      "content":ICON_FIRE,
      "children":
      [{
        "name": "laser",
        "content":ICON_LASER,
        "children":
        [
          {"name":"cancel","content":ICON_CANCEL},
          {"name":"confirm","children":["SWIPE!",""],"input_ready":true,"content":ICON_CONFIRM}
        ],
        "fn":UI_FUNCTION_MAP["laser"]
      },
      {
        "name":"missle",
        "content":ICON_MISSLE,
        "children":
        [
          {"name":"cancel","content":ICON_CANCEL},
          //{"name":"confirm","input_ready":true,"fn":UI_FUNCTION_MAP["confirm"],"content":ICON_CONFIRM,"children":["SWIPE!",""]}
          {"name":"confirm","children":["SWIPE!",""],"input_ready":true,"content":ICON_CONFIRM}
        ],
        "fn":UI_FUNCTION_MAP["missle"]
      }]
    }
  ]
}
var UI_SHIP_ENEMY = {
  "name": "start",
  "children": [{"name":"info","input_ready":true,"fn":UI_FUNCTION_MAP["info"]},""]
}



/* uiSelectTeam: check if the selected entity is the proper team
 * */
GameClient.prototype.uiSelectTeam = function () {

  if (!this.ent_toggled)
    return false;

  if (this.ent_toggled.team != this.seats[0].team)
    return false;

  return true;

}



/* uiInputPoll: returns true if game client is ready for input
 * */
GameClient.prototype.uiInputPoll = function () {

  if (this.ui_history.length == 0)
    return false;

  if (this.ui_history[this.ui_history.length - 1].input_ready)
    return true

  return false;

}



GameClient.prototype.ui_history=[];
GameClient.prototype.ui_selector=UI_DEFAULT;
/* uiComm: cycles through ui "tree" like objects
 * */
GameClient.prototype.uiComm = function (string) {

  var ui = this.ui_selector.children;

  if (!ui) return;

  for (var i=0;i<ui.length;i++){

    var name = ui[i].name || ui[i];

    if (name == string){

      if (typeof ui[i] == "object") {

        this.uiSetSelector(ui[i]);

      } else {

        this.uiSetSelector();

      }
    }
  }
}



/* uiSetSelector: processes ui objects for display
 * */
GameClient.prototype.uiSetSelector = function (value) {

  //reset or set the global ui object
  this.ui_selector = value || UI_DEFAULT;

  //reset or append global ui history
  if (this.ui_selector.name == "start")
    this.ui_history = [];
  else
    this.ui_history.push(this.ui_selector);

  //global ui html elements
  var one = this.UI_ONE;
  var two = this.UI_TWO;

  //ui_selector children should be an array of other objects or strings
  var val = this.ui_selector.children;

  //exit early if not
  if (!val || val.length < 2) {
    //this means the cancel button was clicked
    if (!this.ui_selector.input_ready) this.uiSetSelector();
    return;
  }

  //update html elements
  var _1 = val[0].name || val[0];
  var _2 = val[1].name || val[1];
  one.onclick = this.uiComm.bind(this,_1);
  two.onclick = this.uiComm.bind(this,_2);


  //more html elements to add to the game bar
  if (val[0].content || val[1].content){
    one.innerHTML = "";
    two.innerHTML = "";
    one.appendChild(val[0].content || _1);
    two.appendChild(val[1].content || _2);
  //fall back to text
  } else {
    one.innerHTML = _1;
    two.innerHTML = _2;
  }

}



/* arrowClick: process arrow clicks
 * */
GameClient.prototype.uiArrowClick = function(dir) {

  if (this._arrow_inp)
    this.uiQueueArrow(dir);
  else
    this.uiIncrementTarget(dir);

}



/* queueArrow: add arrow clicks to queue
 * */
GameClient.prototype.uiQueueArrow = function (dir) {
  this.arrow_queue.push(dir);
}



/* uiCancelMoveShield: undo shield move from client view
 * */
GameClient.prototype.uiCancelMoveShield = function() {

  this._arrow_inp = false;

  var ent = this.ent_toggled || {};

  if (ent == {} || !ent.shield) {
    console.log("uiCancelMoveShield called with invalid entity selected");
    this.uiSetSelector();
    return;
  }

  if (!ent.saved_shield) return;
  ent.shield = ent.saved_shield;
  ent.saved_shield = null;
  this.has_to_draw=true;

}



/* uiConfirmMoveShield: confirm shield move from client view
 * */
GameClient.prototype.uiConfirmMoveShield = function() {
  if (!this.cur_state.id > 0) return;
  if (!this._arrow_inp_triggered) {this[this.queued_command.cancel_fn]();return;}
  //for good measure poll the click function again
  this[this.queued_command.click_fn]();
  this.arrow_queue = [];
  this._arrow_inp = false;
  this.arrow_done = true;
  this.command=this[this.queued_command.fn]();
  this.queued_command = null;
}



/* uiMoveShield: process shield move for client click_fn
 * */
GameClient.prototype.uiMoveShield = function() {

  if (!this.cur_state.id > 0) return;
  if (!this.arrow_queue || this.arrow_queue.length < 1) return;

  var ent = this.ent_toggled || {};

  if (ent == {} || !ent.shield) {
    console.log("uiMoveShield called with invalid entity selected");
    this.uiSetSelector();
    return;
  }

  if (!this._arrow_inp_triggered)
    ent.saved_shield = {front:ent.shield.front,back:ent.shield.back};

  this._arrow_inp_triggered = true;

  var dir = this.arrow_queue.shift();

  var f = ent.shield.front;
  var b = ent.shield.back;
  if (dir>0) {
    ++f;
    --b;
    if (b<0) return false;
  } else {
    --f;
    ++b;
    if (f<0) return false;
  }

  ent.shield.front = f;
  ent.shield.back = b;
  this.has_to_draw = true;
  return true;

}



/* uiIncrementTarget: select the next entity
 * */
GameClient.prototype.uiIncrementTarget = function (dir) {

  var tar;

  //initialize if need be
  if (typeof this.t_ent != "number") this.t_ent = -1;

  //only 1 entity, not much to do
  if (this.ent_arr.length == 1) {

    this.t_ent = 0;

  // set target entity based on dir
  } else {

    this.t_ent += dir;
    if (this.t_ent >= this.ent_arr.length)
      this.t_ent = 0;
    else if (this.t_ent < 0)
      this.t_ent = this.ent_arr.length + dir;

  }

  tar = this.ent_arr[this.t_ent];

  if (typeof this.ent_arr[this.t_ent] == "undefined") return;

  this.ent_toggled = tar;

  this.uiDrawSelect(this.ent_arr[this.t_ent]);

}



/* uiUnselectTarget: clear the selection
 * */
GameClient.prototype.uiUnselectTarget = function() {
  this.t_ent = null;
  this.drawAll();
  this.uiSetSelector();
}



/* uiDrawSelect: draws the target thing
 * */
GameClient.prototype.uiDrawSelect = function(ent) {

  var is_team = ent.team == this.seats[0].team ?  true : false;

  if (is_team) {
    this.uiSetSelector(UI_SHIP_PLAYER)
  } else {
    this.uiSetSelector(UI_SHIP_ENEMY)
  }

  var ctx = this.canvas.getContext("2d");

  var subj = {
    x:ent.body.GetWorldCenter().x * this.physics_offset,
    y:ent.body.GetWorldCenter().y * this.physics_offset,
    s:ent.sw,
    c: is_team ? this.ui.state_color["input"] : this.ui.state_color["wait"]
  };

  //clear and draw entities again
  this.drawAll();

  //draw circle
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(subj.x,subj.y,subj.s,0,2*Math.PI,false);
  ctx.fillStyle = subj.c;
  ctx.fill();
  ctx.globalAlpha = 1;
}



/* uiConfirmFireMissle: makes sure that the ship selected has missles
 * */
GameClient.prototype.uiConfirmFireMissle = function() {

  if (!this.ent_toggled) return;

  if (this.ent_toggled.getMissleId() < 0) {
    return false;
  }

  return true;

}



UIElement = Ent.extend({
  type:"Rect",
  data : [],
  z : 2,
  style : "rgba(0,150,75,0.5)",
  type : "ul",
  items : ["state"],
  elm_style : {
    "display" : "table",
    "width" : "100%",
    "height" : "100%",
    "margin" : "0",
    "padding" : "0",
  },
  ite_style : {
    "font-family" : "monospace",
    "display" : "table-cell",
    "padding-top" : "15px",
    //"background-color" : "grey",
    //"border" : "1px solid black",
    "text-align" : "center",
  },
});

UI = Class.extend({
  template : null,
  style_conf : null,
  ship_input : null,//dynamic hover
  game_list : null,//right side
  game_bar : null,//bottom
  state_color : {
      "move" : "rgb(200, 200, 240)",//blue
      "fire" : "rgb(200, 200, 240)",//blue
      "input" :"rgb(200, 240, 200)",//green
      "wait" : "rgb(240, 200, 200)",//red
    },

  /* UI.create : sets up the hover box thing
   * */
  create : function () {

    this.template = new UIElement();
    var template = this.template;
    //template.init();

    this.style_conf = {
      //"class" : 'ship_input' ,
      "position": "absolute",
      "z-index": "1" ,
      "left" : template.sw + "px" ,
      "top" : template.sh + "px" ,
      //"width" : template.sw + "px" ,
      //"height" : template.sh + "px" ,
      "display" : "none" ,
    };


    this.ship_input = document.createElement('div');
    this.ship_input.setAttribute("style", cssify(this.style_conf));
    this.ship_input.setAttribute("id", "ship_input");
    document.getElementsByTagName("body")[0].appendChild(this.ship_input);

    //this.createGameBar("state","connected","^","v","move","fire")

  },
  /* createGameBar: initilizes the html UI and sets up "game_bar" JSON
   * for now this is the thingie along the bottom of the canvas
   * TODO: not use this*/
  createGameBar : function () {

    this.template = new UIElement();
    var template = this.template;

    //arguments are
    if (arguments.length > 0) template.items=[];
    for (var i=0;i<arguments.length;i++) {
      template.items.push(arguments[i]);
    }

    //remove game_bar if it is already around
    var t = document.getElementById("game_bar");
    if (t) t.parentNode.removeChild(t)


    var canv = document.getElementById(CANVAS_ID);
    this.game_bar = {};
    var p = this.game_bar.div = document.createElement('div');
    p.setAttribute("id","game_bar");
    //this.game_bar.style.width = canv.width + "px";
    p.style.width = canv.width + "px";
    p.style.height = template.sh*2 + "px";
    p.style.border = "1px solid black";
    //p.style["border-image"] = "url(img/pencil-border.png) 30 30 stretch";
    //p.style["background"] = "url(img/pencil-border.png) repeat-x";
    template.ite_style.width = template.sw + "px";
    var s = this.game_bar.s = listify(template);
    for (e in s.childNodes) {
      var c = s.childNodes[e];
      this.game_bar[c.innerHTML]= c;
    }
    s.style.width = canv.width+"px";
    //s.style.height = template.sh*2+"px";

    canv.parentNode.insertBefore(p,canv.nextSibling);
    p.appendChild(this.game_bar.s);

    this.game_bar.list = this.game_bar.s;

  },
  /* UI.update: should receive events from other objects
   * */
  update : function (op,data,seat){
    if (op == "state") {
      if (seat) this.game_bar["state"].innerHTML = ""+seat.moves;
      this.game_bar["state"].style.background = ""+this.state_color[data];

    } else if (op == "conn") {
      this.game_bar["connected"].innerHTML = "conn:<br/>"+!data;
      this.game_bar["connected"].style.background = data ?
        ""+this.state_color["wait"] : ""+this.state_color["input"];
    }
  }
});
