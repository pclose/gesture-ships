
UIElements = {

//connected/disconnected messages
"connected" : function (_game) {
  this.name = "connected";
  this.img = _game.loadImg('img/connected.gif');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    location.reload();
  }
},
"disconnected" : function (_game) {
  this.name = "disconnected";
  this.img = _game.loadImg('img/disconnected.gif');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    location.reload();
  }
},

//up down
"up" : function (_game) {
  this.name = "up";
  this.img = _game.loadImg('img/point.gif');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game.uiArrowClick(1);
  }
},
"down" : function (_game) {
  this.name = "down";
  this.img = _game.loadImg('img/point.gif');
  this.angle = Math.PI;
  this.ratio = 0.5;
  this.fn = function (){
    _game.uiArrowClick(-1);
  }
},

//generic confirm cancel
"confirm" : function (_game) {
  this.name = "confirm";
  this.imgtext = this.name;
  this.img = _game.loadImg('img/icon_confirm.png');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game.ui.spellSwipe();
  }
},
"cancel" : function (_game) {
  this.name = "cancel";
  this.imgtext = this.name;
  this.img = _game.loadImg('img/icon_cancel.png');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game.ui.spellSwipe();
  }
},


//movement related things
"move" : function (_game) {
  this.name = "move";
  this.imgtext = this.name;
  this.img = _game.loadImg('img/icon_move.png');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game.ui.drawCell(4,_game.ui.elements["ship"]);
    _game.ui.drawCell(5,_game.ui.elements["shield"]);
  }
},
"ship" : function (_game) {
  this.name = "ship";
  this.imgtext = this.name;
  this.img = _game.loadImg('img/icon_ship.png');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game._drag_inp = true;
    _game.queued_command = this;
    _game.ui.spellSwipe();
    this.game_fn = "moveEnt";
  }
},


//shooting related things
"fire" : function (_game) {
  this.name = "fire";
  this.imgtext = this.name;
  this.img = _game.loadImg('img/icon_fire.png');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game.ui.drawCell(4,_game.ui.elements["laser"]);
    _game.ui.drawCell(5,_game.ui.elements["missle"]);
  }
},
"laser" : function (_game) {
  this.name = "laser";
  this.imgtext = this.name;
  this.img = _game.loadImg('img/icon_laser.png');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game._drag_inp = true;
    _game.queued_command = this;
    _game.ui.spellSwipe();
    this.game_fn = "fireProjectile";
  }
},
"missle" : function (_game) {
  this.name = "missle";
  this.imgtext = this.name;
  this.img = _game.loadImg('img/icon_missle.png');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game._drag_inp = true;
    _game.queued_command = this;
    _game.ui.spellSwipe();
    this.game_fn = "fireMissle";
  }
},


//shield related stuff
"shield" : function (_game) {
  this.name = "shield";
  this.imgtext = this.name;
  this.img = _game.loadImg('img/icon_shield.png');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game.ui.drawCell(2,_game.ui.elements["shield_up"]);
    _game.ui.drawCell(3,_game.ui.elements["shield_down"]);
    _game.ui.drawCell(4,_game.ui.elements["shield_cancel"]);
    _game.ui.drawCell(5,_game.ui.elements["shield_confirm"]);
    _game._arrow_inp_triggered = false;
  }
},

"shield_up" : function (_game) {
  this.name = "shield_up";
  this.img = _game.loadImg('img/point.gif');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game.queued_command = "uiConfirmMoveShield"
    _game.uiMoveShield(1);
  }
},
"shield_down" : function (_game) {
  this.name = "shield_down";
  this.img = _game.loadImg('img/point.gif');
  this.angle = Math.PI;
  this.ratio = 0.5;
  this.fn = function (){
    _game.queued_command = "uiConfirmMoveShield"
    _game.uiMoveShield(-1);
  }
},
"shield_confirm" : function (_game) {
  this.name = "confirm";
  this.imgtext = this.name;
  this.img = _game.loadImg('img/icon_confirm.png');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game.uiConfirmMoveShield();
  }
},
"shield_cancel" : function (_game) {
  this.name = "cancel";
  this.imgtext = this.name;
  this.img = _game.loadImg('img/icon_cancel.png');
  this.angle = 0;
  this.ratio = 0.5;
  this.fn = function (){
    _game.uiCancelMoveShield();
    _game.ui.setupInit()
  }
},



}
