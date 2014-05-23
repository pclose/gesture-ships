//vim ts=2 sw=2
CANVAS_ID="game_canvas_01";


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
      "width" : template.sw + "px" ,
      "height" : template.sh + "px" ,
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
    var p = this.game_bar.parent = document.createElement('div');
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
    s.style.height = template.sh*2+"px";

    canv.parentNode.insertBefore(p,canv.nextSibling);
    p.appendChild(this.game_bar.s);

  },
  /* UI.update: should receive events from other objects
   * */
  update : function (op,data){
    if (op == "state") {
      this.game_bar["state"].innerHTML = data;
      this.game_bar["state"].style.background = ""+this.state_color[data];
    } else if (op == "conn") {
      this.game_bar["connected"].innerHTML = "conn:<br/>"+!data;
      this.game_bar["connected"].style.background = data ?
        ""+this.state_color["wait"] : ""+this.state_color["input"];
    }
  }
});

EvListener = Class.extend({//TODO: use input library for cross platform

  /* move : for now this gets called by mousemove or touchmove events
   * */
  move: function (v) {

    this.moved = true;
    if (!this._inp) return;

    if (v.touches && v.touches.length) {

      v.x=v.touches[0].screenX;
      v.y=v.touches[0].screenY;

      v.x = ( v.x / this.touch_offset_X ) * this.canvas.width;
      v.y = ( v.y / this.touch_offset_Y ) * this.canvas.height;

    } else {
      v.x = v.clientX;
      v.y = v.clientY;
    }

    if (this._drag){
      this.move_arr.push({x:v.x,y:v.y});
    }

  },
  mDown : function(v) {

    if (this._inp && v.touches) v.preventDefault();

    this._drag = true;
    this.move_arr = [];
    this.drag_start = this.ticks;
  },
  mUp : function(v) {

    if (!this._inp) {

      var X,Y;

      //touch event
      if (v.targetTouches && v.targetTouches[0]) {
        X = (v.pageX - this.canvas_offset.x) / this.physics_offset;
        Y = (v.pageY - this.canvas_offset.y) / this.physics_offset;

      //mouse event
      } else {
        X = (v.clientX - this.canvas_offset.x) / this.physics_offset;
        Y = (v.clientY - this.canvas_offset.y) / this.physics_offset;
      }

      //triggers selecting entity based on direct clicks
      //this.initDrag(X,Y);

      return;
    }

    this.finishDrag(this.move_arr);

  },
  detectKey : function (e){//just a test generation function for now
    //console.log(e.which);
    if (e.which===70 || e.which==84) {//f apply force
      for ( var i = 0; i < game.ent_arr.length; i ++){
        var plusOrMinus = Math.random() < 0.5 ? -1 : 1;
        //game.ent_arr[i].body.SetFixedRotation(true);
        game.ent_arr[i].body.SetAwake(true);
        var ofs=plusOrMinus*10;
        var t1 = new b2Vec2(Math.random()*ofs,Math.random()*ofs);
        if (e.which == 84) game.ent_arr[i].body.ApplyTorque(10);
        else game.ent_arr[i].body.SetLinearVelocity(t1);
      }
    } else if (e.which==65) {//a "attack"
      var t = game.ent_arr.length;
      for ( var i = 0; i < t; i ++){
        if (game.ent_arr[i].type !== ENT_TYPES["player"]) continue;

        var missle = new Projectile();

        //missle.body.SetBullet(true);
        missle.name = "img/ship_missle.png";
        missle.team = game.ent_arr[i].team;

        game.addEnt(missle);
        missle.body.SetPosition(game.ent_arr[i].body.GetPosition());

        var pm = Math.random() < 0.5 ? -1 : 1;
        var ofs=pm*10;
        var v = new b2Vec2(Math.random()*ofs,Math.random()*ofs);
        /*var v = new b2Vec2(
          game.ent_arr[i].move_force_mult*MOVE_FORCE_MULT,
          game.ent_arr[i].move_force_mult*MOVE_FORCE_MULT
        );*/
        var d = Math.atan2(v.x,-v.y);
        missle.destination_radians = d;
        missle.body.SetLinearVelocity(v);
      }
    } else if (e.which==69) {//e "end"
      game.stop();
      //game.go = false;
    } else if (e.which==83) {//s "start"
      //if (game.int) return;
      //else game.run();
      game.run();
      //game.go = true;
    } else if (e.which==71) {//g for go
      //game.phyGo = !game.phyGo;
      game.cur_state = 1;
    } else if (e.which==67) {//c for collision
      var c = []
      game.ent_arr.forEach(function (i) {
          c.push([i,i.body.GetFixtureList().GetFilterData()]);
      });
      c.forEach(function (i) {
        var s = /.*\/(.*)/;
        console.log(i[0].name.replace(s,'$1') + ": can these collide? " +
        i[1].categoryBits.toString(2) + " " + i[1].maskBits.toString(2));
        c.forEach(function (b) {
            if (i[0] === b[0]) return;
            var collide = false;
            if ((i[1].maskBits & b[1].categoryBits) != 0 &&
              (b[1].maskBits & i[1].categoryBits) != 0)
              collide = true;
            console.log(b[0].name.replace(s,'\u0009$1') + " " + collide + " " +
              b[1].categoryBits.toString(2) + " " + b[1].maskBits.toString(2));
            });
        });

    } else if (e.which==73) {//i for info
        game.ent_arr.forEach(function (i) {
          var p = i.body.GetPosition();
          var a = i.body.GetAngle();
          var f = i.body.GetFixtureList().GetFilterData()
          var v = i.body.GetLinearVelocity();
          //a *= (180 / Math.PI)
          console.log("NAME: " + i.name + "\n" +
                      "POSTION: " + p.x + " " + p.y + "\n" +
                      "ANGLE: " + a + "\n" +
                      "VELOCITY: x/y " + v.x + "/" + v.y + "\n" +
                      "DRAG: " + i.drag + "\n" +
                      "COLLISION CAT: " + f.categoryBits.toString(2) + "\n" +
                      "COLLISION MASK: " + f.maskBits.toString(2) + "\n" +
                      "COLLISION GROUP: " + f.groupIndex + "\n" +
                      "TEAM: " + i.team + "\n" +
                      "HEALTH: " + i.health + "\n" +
                      "ID: " + i.id
          );
          console.log("------------------------------------");
        });
    } else if (e.which==27) {//esc
        game.cur_state = 0;
        game.toggleUI();
        //game.clearUI();
    } else if (e.which==82) {//r for reset to center
      var t1 = new b2Vec2(game.pX / 2 , game.pY / 2);
      for ( var i = 0; i < game.ent_arr.length; i ++){
        game.ent_arr[i].body.SetPosition(t1);
      }
    } else if (e.which==49) {//1 for get ships
      game.comm.getReq();
    } else return;
  }
});


/*GameClient
 *extends the Game object to make it do things like render to an html canvas
 */
GameClient = Game.extend({
  last_update : null,
  has_to_draw : true,
  moved : false,

  /* createClient: called after generic create
   * */
  createClient : function () {

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

    //html tags
    var body = document.getElementById('body');
    this.canvas = document.createElement('canvas');
    this.canvas.style.border="1px dashed black";
    this.canvas.setAttribute("tabindex",'0');
    this.canvas.setAttribute("id",CANVAS_ID);
    //this.canvas.setAttribute("style" , cssify({ "background-image" : 'url("img/lined-paper.gif")'}));
    //this.canvas.setAttribute("style" , cssify({ "background-image" : 'url("img/graph-tile.png")'}));

    var w = this.gsize.w;
    var h = this.gsize.h;
    //var w = window.innerWidth - 25;
    //var h = window.innerHeight - 25;
    this.canvas.width=w;
    this.canvas.height=h;

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


    body.appendChild(this.canvas);

    //UI .. more html content
    this.ui = new UI();
    this.ui.create();

    //create game_bar
    this.ui.createGameBar("state","connected","up","down","move","fire")

    //create game_bar functions
    this.ui.game_bar["up"].onclick = this.uiIncrementTarget.bind(this,1);
    this.ui.game_bar["down"].onclick = this.uiIncrementTarget.bind(this,-1);
    this.ui.game_bar["move"].onclick = this.uiComm.bind(this,"move");
    this.ui.game_bar["fire"].onclick = this.uiComm.bind(this,"fire");

    //modify the game bar to add arrows
    this.ui.game_bar["up"].innerHTML = '<img src = "img/point.gif"></img>';
    this.ui.game_bar["down"].innerHTML = '<img class = "flip-vertical" src = "img/point.gif"></img>'

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
    if (!this.tester&&!clear_flag) c.clearRect(0,0,cw,ch);

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

    /*--- this took way to long to figure out for rotation
    basically 1. save() the canvas 2.translate() to the point
    we want to draw 3. rotate() and then 4. drawImage() at the
    that spot (minus halfwidth/height for it to be centered)
    5. restore() canvas. important part is that by translating
    we are right on top of the destination coordinates*/

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
  /* toggleUI: the UI class on/off
   */
  toggleUI: function() {

    if (this.ent_tar == null) {
      //if (this.ui_toggled) this.clearUI();
      return;
    }

    if (!this.ent_tar.type === ENT_TYPES["player"]) {
      //if (this.ui_toggled) this.clearUI();
      return;
    }

    if (this.ent_tar != this.ent_toggled){// && !this.ui_toggled){
      this.ui_toggled = true;
      this.ent_toggled = this.ent_tar;
      this.drawUI(this.ent_toggled);
    } else {
      return; //this.ui_toggled = false;
    }

  },
  /* clearUI: makes sure the UI is toggled off
   */
  clearUI : function() {
    this.ui.ship_input.style.display="none";
    this.ui_toggled = false;
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

  /* drawUI: display UI
   * so far only for ships -way to much code for such a simple thing
   * TODO: make sure we're drawing on the canvas  */
  drawUI : function(ent) {
    var num_inputs = ent.ui_data.items.length;
    var pos = ent.body.GetWorldCenter();
    var hlf = {x:ent.ctx,y:ent.cty};
    var ofs = this.canvas_offset;
    var s = this.ui.ship_input;
    var ui_ofs = {
      x:this.ui.template.sw / num_inputs,
      y:this.ui.template.sh /// num_inputs
        };
    var l = (pos.x * this.physics_offset) + ofs.x + hlf.x - ui_ofs.x;
    var t = (pos.y * this.physics_offset) + ofs.y + hlf.y - ui_ofs.y;

    s.style.top = t + "px";
    s.style.left = l + "px";
    s.style.display = "inline";//"block";
    s.style.width = ui_ofs.y * num_inputs + "px";

    s.innerHTML="";
    var ui_html = listify(ent.ui_data);
    ui_html.setAttribute("id",this.ent_toggled.name);

    s.appendChild(ui_html);

  },
  /* initDrag: should be called when mouse / touch is detected
   * sets up entities and coordinates */
  initDrag : function (mouseX,mouseY) {
    var t = new b2Vec2(mouseX,mouseY);
    var aabb = new b2AABB();
    aabb.lowerBound.Set(mouseX - CLICK_BOUND, mouseY - CLICK_BOUND);
    aabb.upperBound.Set(mouseX + CLICK_BOUND, mouseY + CLICK_BOUND);

    var result = null;
    this.physics.world.QueryAABB(
      function (bdy) {result = bdy;},
      aabb
    );

    if (result) {
      this.ent_tar = result.GetBody().GetUserData().ent;
    } else {this.ent_tar = null;}

  },
  /* finishDrag: draws a path to the game canvas
   * also determine the speed of the drag to be used for a physics force
   * TODO: compensate for the size of the device via pixels
   * TODO: recognize and/or normalize path for gestures */
  finishDrag : function (path) {

    if (!path.length) return;

    this._inp = false;
    this._drag = false;
    this.drag_end = this.ticks;
    this.has_to_draw = true;

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
   * TODO: figure out events for this */
  stateCheck : function () {

    //update ui status bar
    this.ui.update("state",this.getStateStr());



    // toggle UI
    if (this.cur_state === this.state_map["input"]){

      if (this.state_arr.length > 0)
      {
        this.cur_state = this.state_map[this.state_arr[0][0]];
        this.state_arr = [];
        this.clearUI();
        this.goent = false;
        this._inp=true;

      } else if (this.toggleUI &&
                this.ent_tar &&
                this.seats[0].team == this.ent_tar.team)
      {
        this.toggleUI();
      }



    // turn is over
    } else if (
      !this.ent_toggled &&
      this.pollMotion() &&
      (this.cur_state === this.state_map["move"] ||
      this.cur_state === this.state_map["fire"]))
    {
      this.cur_state = this.state_map["wait"];



    // a command has been sent
    } else if (
      this.drag_vec &&
      (this.cur_state === this.state_map["fire"] ||
      this.cur_state === this.state_map["move"]))
    {

      var dv = this.drag_vec;
      var subj = this.cur_state === this.state_map["move"] ?
        "moveEnt" : "fireProjectile";

      var result = {};
      result[subj] = {
          x:dv.end.x,
          y:dv.end.y,
          id:this.ent_toggled.id,
          force:dv.force
      };

      this.comm.msg_out.push(result);
      this.comm.msg_in.push(result);

      this.ent_tar = null;
      this.ent_toggled = null;
      this.drag_vec = null;
      this._inp = null;
      //this.t_ent = null;
    }

  },
  /* updateClient: do animation frames and network calls
   * separate from main game loop */
  updateClient : function() {

    if (this.has_to_draw || !this.pollMotion())
      this.drawAll();

    var now = this.now;
    this.now = new Date().getTime();


    if (this.moved &&
       ((now - this.last_update) > this.poll) &&
        !this.paused)
    {
      this.comm.go(
        this.cur_state+this.comm.sep+this.comm.I,
        this.comm.cb.bind(this)
      );
      this.moved = false;
      this.last_update = now;


    } else if(now - this.last_update > this.must_poll) {
      this.moved = true;
    }

    //recursive call
    window.rAF(this.updateClient.bind(this));

  },
  /* init: basically saves the /hello thing being in body of html
   * */
  _init : function () {
    this.comm.go("/hello",this.comm.cb.bind(this));
  },


  /* uiIncrementTarget: select the next entity
   * */
  uiIncrementTarget : function (dir) {

    var
      ctx = this.canvas.getContext("2d"),
      prev_tar,
      tar,
      subj;

    //initialize
    if (typeof this.t_ent != "number") this.t_ent = -1;
    //save previous target
    prev_tar = this.t_ent;

    // set target entity based on dir
    this.t_ent += dir;
    if (this.t_ent >= this.ent_arr.length)
      this.t_ent = 0;
    else if (this.t_ent < 0)
      this.t_ent = this.ent_arr.length + dir;

    tar = this.ent_arr[this.t_ent]

    if (typeof this.ent_arr[this.t_ent] == "undefined" ||
        this.t_ent == prev_tar)
      return; //give up! TODO:not

    subj = {
      x:this.ent_arr[this.t_ent].body.GetWorldCenter().x * this.physics_offset,
      y:this.ent_arr[this.t_ent].body.GetWorldCenter().y * this.physics_offset,
      s:this.ent_arr[this.t_ent].sw,
      c:this.ent_arr[this.t_ent].team == this.seats[0].team ?
        this.ui.state_color["input"] : this.ui.state_color["wait"]
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

  },
  /* uiComm: send commands from the game bar
   * */
  uiComm : function (comm) {

    var tar;

    if (typeof this.t_ent == "undefined" || typeof this.ent_arr[this.t_ent] == "undefined")
      return;
    else
      tar = this.ent_arr[this.t_ent];

    if (tar.team != this.seats[0].team)
      return;

    this.ent_toggled = tar;
    this.pushState(comm);
    this.t_ent = null;
  }
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

Ship.prototype.ui_data = { //FIXME
  type : "ul",
  items : ["move","fire"],
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
    "background-color" : "rgba(180, 178, 178, 0.5)",
    "border" : "1px solid black",
    "text-align" : "center",
  },
  ite_callback : {
    callback : function (e) {game.pushState(e.target.innerHTML);},
    func : "mouseup"
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
    this.comm.msg_in.push(v);
  } else {
    for (var i=0;i<v.length;i++) {
      this.comm.msg_in.push(v[i])
    }
  }
}

//FIXME:
Ship.prototype.img_onload_proxy = function () {game.has_to_draw = true;}


//var c = game.canvas.getContext("2d");game.physics.tester(c);game.tester=true;

