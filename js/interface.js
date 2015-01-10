
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

var UI_SHIP_PLAYER = "player"
var UI_SHIP_ENEMY = "enemy"



/* uiSelectTeam: check if the selected entity is the proper team
 * */
GameClient.prototype.uiSelectTeam = function () {

  if (!this.ent_toggled)
    return false;

  if (this.ent_toggled.team != this.seats[0].team)
    return false;

  return true;

}



/* uiSetSelector: processes ui objects for display
 * */
GameClient.prototype.uiSetSelector = function (value) {

  //selected player
  if (value == UI_SHIP_PLAYER) {
    
    this.ui.drawCell(4,this.ui.elements["move"]);
    this.ui.drawCell(5,this.ui.elements["fire"]);
  
  //selected enemy
  } else if (value == UI_SHIP_ENEMY) {
    
    this.ui.drawCell(4,{text:"info"});
    this.ui.drawCell(5,{text:""});
  
  //no selection
  } else {
    this.ui.setupInit();
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
  if (!this._arrow_inp_triggered) {this.uiCancelMoveShield();return;}
  //for good measure poll the click function again
  this.command = this.clientMoveShield()
  this.queued_command = null;
}



/* uiMoveShield: process shield move for client click_fn
 * */
GameClient.prototype.uiMoveShield = function(dir) {

  if (!this.cur_state.id > 0) return;
  //if (!this.arrow_queue || this.arrow_queue.length < 1) return;

  var ent = this.ent_toggled || {};

  if (ent == {} || !ent.shield) {
    console.log("uiMoveShield called with invalid entity selected");
    this.uiSetSelector();
    return;
  }

  if (!this._arrow_inp_triggered)
    ent.saved_shield = {front:ent.shield.front,back:ent.shield.back};

  this._arrow_inp_triggered = true;

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





var UI = Class.extend({

  /* UI.state_color: for color constants
   * */
  state_color : {
    "move" : "rgb(200, 200, 240)",//blue
    "fire" : "rgb(200, 200, 240)",//blue
    "input" :"rgb(200, 240, 200)",//green
    "wait" : "rgb(240, 200, 200)",//red
    "selected" : "rgb(0, 0, 255)",//dark blue
  },

  /* UI.create: creates html and JS objects
   * */
  create : function (_game) {

    this.game = _game;

    //setup canvas+2dcontext
    this.canvas = document.createElement('canvas');
    this.canvas.style.border=BORDER_STYLE;
    this.canvas.setAttribute("tabindex",'0');
    this.canvas.setAttribute("id",UI_ID);
    this.ctx = this.canvas.getContext('2d');

    //setup and attach DOM elements
    var div = document.createElement('div');
    div.style.paddingTop = "5px";
    div.appendChild(this.canvas);
    document.getElementById('body').appendChild(div);

    //setup ghetto JS objects which are buttons for the UI
    this.elements = {};
    var _elements = Object.keys(UIElements);
    for (var i=0; i<_elements.length; i++) {
      var e = _elements[i];
      this.elements[e] = new UIElements[e](this.game);
    }

  },

  /* UI.createGameBar: init the game_bar object and some internal stuff
   * */
  createGameBar : function () {

    this.game_bar = {};
    this.game_bar_list = [];

    //setup some placeholder text objects
    for (var i=0;i<arguments.length;i++) {

      this.game_bar[arguments[i]] = {};
      this.game_bar[arguments[i]].style={}; //just temp
      this.game_bar[arguments[i]].text = arguments[i];
      this.game_bar_list[i] = this.game_bar[arguments[i]];

    }

    this.game_bar_size = arguments.length;

  },



  /* UI.drawCell: clears and then draws an image and/or text to a game_bar cell
   * @n: index of the cell to be drawn (left to right)
   * @obj: optional UIElements member that will replace the cell */
  drawCell : function (n,obj){

    if (!obj) {obj = this.game_bar_list[n];}
    else this.game_bar_list[n] = obj;

    var w = this.cell_width;
    var h = this.canvas.height;

    var x = n*w;
    var xc = x+(w/2);
    var yc = h/2;

    this.ctx.clearRect(x,0,w,h)

    //draw background color if needed
    if (obj.bg) {
      this.ctx.fillStyle = this.state_color[obj.bg];
      this.ctx.fillRect(x,0,w,h)
    }

    //draw cell highlight border if needed
    if (obj.border) {
      this.ctx.strokeStyle = this.state_color["selected"]
      this.ctx.lineWidth = 5;
      this.ctx.strokeRect(x,0,w,h)
    }

    //draw text to game bar
    if (obj.text) {

      var f = obj.fontpx ? obj.fontpx : this.game.ui_text_scale;
      if (f > h) f = h;
      this.ctx.font = f + "px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillStyle = "black";

      this.ctx.fillText(obj.text,xc,yc,w);

    //draw images to game bar
    } else if (obj.img) {

      //save image ratio
      if (!obj.ratio) obj.ratio = 0.75;
      var rw = w*obj.ratio;
      var rh = h*obj.ratio;

      //save half width/height for center of image location
      var hx = -(rw/2);
      var hy = -(rh/2);
      if (obj.imgtext) hy -= ICON_BUFF;

      //translate and rotate to image location
      this.ctx.save();
      this.ctx.translate(xc,yc);
      this.ctx.rotate(obj.angle);
      this.ctx.drawImage(obj.img,hx,hy,rw,rh);
      this.ctx.restore();

      //draw additional text if need be
      if (obj.imgtext) {

        var f = obj.fontpx ? obj.fontpx : this.game.ui_text_scale;
        if (f > h) f = h;
        this.ctx.font = f + "px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "black";

        //offset by half height and buffer space
        var tyc = yc - hy - ICON_BUFF;
        this.ctx.fillText(obj.imgtext,xc,tyc,w);
      }

    }

  },


  drawAll : function () {

    this.cell_width = this.canvas.width / this.game_bar_size;

    for (var i=0; i < this.game_bar_list.length; i++) {
      this.drawCell(i,this.game_bar_list[i]);
    }

  },

  drawItem : function () {

  },

  getCellText : function(n) {

    return this.game_bar_list[n].text || "none";
    
  },
  getCellBg : function(n) {

    return this.game_bar_list[n].bg || null;
    
  },

  update : function (op,data,seat) {

    //update moves available box
    if (op == "state"){
      
      //draw the number of moves available
      if (seat) {
        if (seat.moves != this.getCellText(0) || data != this.getCellBg(0)) {
          this.drawCell(0, { text:seat.moves.toString(), fontpx:75, bg:data });
        }
      }

    //update the connection test box
    } else if (op = "conn") {
      var bg = data ? "wait" : "input";
      
      this.drawCell(1, { text:!data?"connected":"disconnected", bg:bg } );
    }

  },

  execComm : function (n) {
    if (typeof this.game_bar_list[n].fn == "function")
      this.game_bar_list[n].fn();
  },

  goClick : function (e) {

    e.preventDefault();
    e = getCords(this.game,e);

    var click_cell = Math.ceil(e.x / this.cell_width) - 1;

    if (click_cell >= 0)
      this.game.ui.execComm(click_cell);

  },

  setupInit : function () {

    this.drawCell(2,this.elements["up"]);
    this.drawCell(3,this.elements["down"]);
    this.drawCell(4,{text:"select"});
    this.drawCell(5,{text:"a ship"});

  },

  spellSwipe : function () {
    this.drawCell(2,{text:"S",fontpx:75});
    this.drawCell(3,{text:"W",fontpx:75});
    this.drawCell(4,{text:"IP",fontpx:75});
    this.drawCell(5,{text:"E!",fontpx:75});
  },

});
