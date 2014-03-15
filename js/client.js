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
  create : function () {
  
    this.state_color = {
      "move" : "rgb(200, 200, 240)",
      "fire" : "rgb(200, 200, 240)",
      "input" :"rgb(200, 240, 200)",
      "wait" : "rgb(240, 200, 200)",
    };
  
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
    
    this.createGameBar("state","connected","-","-","-","-")
    
  },
  scrollText : function (data) {
    var c = this.game_bar_context;
    c.font = "12pt Monospace";
    c.strokeText(data,10,10);
  },
  /* createGameBar: initilizes the html UI and sets up "game_bar" JSON
   * for now this is the thingie along the bottom of the canvas
   * TODO: not use this*/
  createGameBar : function () {
    this.template = new UIElement();
    var template = this.template;
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
  /* createGameList: initilizes the html UI and sets up "game_list" JSON
   * for now this is the thingie on the right of the canvas
   * TODO: not use this*/
  createGameList : function() {
    this.template = new UIElement();
    var template = this.template;
    if (arguments.length > 0) template.items=[];
    for (var i=0;i<arguments.length;i++) {
      template.items.push(arguments[i]);
    }
  
    //remove game_bar if it is already around
    var t = document.getElementById("game_list");
    if (t) t.parentNode.removeChild(t)
  
  
    var canv = document.getElementById(CANVAS_ID);
    this.game_list= {};    
    var p = this.game_list.parent = document.createElement('div');
    p.setAttribute("id","game_list");
    p.style.position = "absolute";
    p.style.left = canv.offsetLeft + canv.width + 5 + "px";
    p.style.top = canv.offsetTop + "px";
    p.style.width = template.sw*6 + "px";
    p.style.height = canv.height + "px";
    p.style.border = "1px solid black";
    template.elm_style.width = template.sw*6 + "px";
    template.ite_style.width = template.sw*6 + "px";
    template.ite_style.height = template.sh*2 + "px";
    template.ite_style["padding-top"] = "15px";
    template.ite_style.display = "table-row";
    template.ite_style.border = "1px solid black";
    var s = this.game_list.s = listify(template);
    for (e in s.childNodes) {
      var c = s.childNodes[e];
      this.game_list[c.innerHTML]= c;
    }
    //s.style.width = template.sw*2+"px";
    //s.style.height = template.sh*2+"px";
        
    canv.parentNode.insertBefore(p,canv.nextSibling.nextSibling);
    p.appendChild(this.game_list.s);
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
  },
  ship_input : null,//dynamic hover
  game_list : null,//right side
  game_bar : null//bottom
});

EvListener = Class.extend({//TODO: use input library for cross platform
  saveMouse : function (e){
      var mouseX = (e.clientX - game.canvas_offset.x) / game.physics_offset;
      var mouseY = (e.clientY - game.canvas_offset.y) / game.physics_offset;
  
      if (e.type=="mousemove"){
          //nothing for now.. push X,Y later
      } else if (e.type=="mousedown") {
          window.addEventListener('mousemove', this.saveMouse);
          game.move_arr = [];
          game.goent=false;
          game.initDrag(mouseX,mouseY);
      } else if (e.type=="mouseup") {
          window.removeEventListener('mousemove', this.saveMouse);
          game.goent=true;
      }
  
      if (game.move_arr.length >= MOVE_MAX_LENGTH) game.move_arr.pop();
      game.move_arr.push({x:mouseX,y:mouseY});
      game.moved = true;
      //if (game.click_arr.length >= CLICK_MAX_LENGTH) game.click_arr.pop();
      //game.click_arr.push(e);
  },
  saveTouch : function (e){
      //console.log(" TOUCH " + e.type + " NUM : " + e.touches.length);
  
      var move_arr = game.move_arr;
      if (!e.targetTouches[0] && e.type!="touchend")
          return;
      else if (e.targetTouches[0]) {
          var m = e.targetTouches[0];
          var mouseX = (m.pageX - game.canvas_offset.x) / game.physics_offset;
          var mouseY = (m.pageY - game.canvas_offset.y) / game.physics_offset;
      } else {
          var temp = move_arr.pop();
          var mouseX = temp.x;
          var mouseY = temp.y;
      }
  
      if (e.type=="touchmove"){
          //nothing for now.. push X,Y later
      } else if (e.type=="touchstart") {
          //e.preventDefault();
          window.addEventListener('touchmove', this.saveTouch);
          game.move_arr = [];
          game.goent=false;
          game.initDrag(mouseX,mouseY);
  
      } else if (e.type=="touchend") {
          window.removeEventListener('touchmove', this.saveTouch);
          game.goent=true;
      }
      if (game.move_arr.length >= MOVE_MAX_LENGTH) game.move_arr.pop();
      game.move_arr.push({x:mouseX,y:mouseY});
      game.moved = true;
      //if (game.click_arr.length >= CLICK_MAX_LENGTH) game.click_arr.pop();
      //game.click_arr.push(e);
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
      //game.stop();
      game.go = false;
    } else if (e.which==83) {//s "start"
      //if (game.int) return;
      //else game.run();
      //game.run();
      game.go = true;
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
          a *= (180 / Math.PI)
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
 *extends the Game object to make it do things like render to a html5 canvas
 */
GameClient = Game.extend({
  last_update : null,
  has_to_draw : true,
  moved : false,
 
  /* createClient: called after generic create
   * */
  createClient : function () {
  
    //input listeners
    this.ev = new EvListener();
    window.addEventListener('mousedown', this.ev.saveMouse);
    window.addEventListener('mouseup', this.ev.saveMouse);
    window.addEventListener('mousemove', this.ev.saveMouse);
    window.addEventListener('touchstart', this.ev.saveTouch, false);
    window.addEventListener('touchend', this.ev.saveTouch, false);
    window.addEventListener('touchmove', this.ev.saveTouch, false);
    window.addEventListener('keydown', this.ev.detectKey)
  
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
    cssify({//ninja skills or stupid as fk?
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
  
    body.appendChild(this.canvas);
  
    //UI .. more html content
    this.ui = new UI();
    this.ui.create();
  
    //extra
    this.canvas_offset = {x : this.canvas.offsetLeft,y : this.canvas.offsetTop};
    this.last_update = this.now;
  },
  /* drawAll: loops through ent_arr
   */
  drawAll : function () {
  
    var cw = this.canvas.width;
    var ch = this.canvas.height;
    var c = this.canvas.getContext("2d");
    if (!this.tester) c.clearRect(0,0,cw,ch);
  
    /*var l = this.move_arr.length;
    if (l > 0) {
      this.drawDrag(this.ent_tar,this.move_arr[l-1]);
    }*/
  
    //draw physics bodies
    for (var i=0; i < this.ent_arr.length; i++) {this.drawPhy(i,c,cw,ch);}
    this.has_to_draw = !this.tester ? false : true;
  },
  /* drawPhy: rotates canvas and calls the entities draw function
   *  */
  drawPhy : function(i,c,cw,ch) {
  
    var e = this.ent_arr;
    var pos = e[i].body.GetPosition();
    var ang = e[i].body.GetAngle();
    var w = e[i].sw;
    var h = e[i].sh;
  
    /*--- this took way to long to figure out for rotation
    basically 1. save() the canvas 2.translate() to the point
    we want to draw 3. rotate() and then 4. drawImage() at the
    that spot (minus halfwidth/height for it to be centered)
    5. restore() canvas. important part is that by translating
    we are right on top of the destination coordinates*/
    //var hlf = {x:e[i].ctx,y:e[i].cty};
    var ofs = this.physics_offset;
    var dx = pos.x * ofs;
    var dy = pos.y * ofs;
    //var val = e[i].img;
  
    //---
    c.save()
    c.translate(dx,dy);
    c.rotate(ang);
  
    //c.drawImage(val,hlf.x,hlf.y,w,h);
    //e[i].draw(c,hlf.x,hlf.y,w,h,this.draw_health);
    e[i].draw(c,w,h,this.draw_health);
  
    //c.fillStyle = "rgba(0,150,75,0.5)";
    //c.fillRect(hlf.x,hlf.y,w,h);
  
    c.restore();
    //---
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
    window.cancelAnimationFrame();
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
    var aabb = new Box2D.Collision.b2AABB();
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
  /* stateCheck: flow control for client - called by main update/step loop
   * TODO: figure out events for this */
  stateCheck : function () {
    //update ui status bar
    this.ui.update("state",this.getStateStr());
    // toggle UI
    if (this.cur_state === this.state_map["input"]){
      if (this.state_arr.length > 0) {
        this.cur_state = this.state_map[this.state_arr[0][0]];
        this.state_arr = [];
        this.clearUI();
        this.goent = false;
      } else if (this.toggleUI &&
                this.ent_tar && 
                this.seats[0].team == this.ent_tar.team) {
        this.toggleUI();
      }       
    // fire or move
    } else if (this.cur_state === this.state_map["move"] ||
               this.cur_state === this.state_map["fire"]) 
    { 
      if (this.goent && 
          this.ent_toggled &&
          this.move_arr.length > 0 &&
          this.ent_toggled.type === ENT_TYPES["player"])
      {
        var subj = this.move_arr.shift();
        if (this.move_arr.length==0){
          this.drawDrag(subj,this.ent_toggled);
          if (this.cur_state === this.state_map["fire"]) {
            this.comm.msg_out.push(
              {"fireProjectile":{x:subj.x,y:subj.y,id:this.ent_toggled.id}});
            this.fireProjectile(this.ent_toggled,subj);            
          } else if (this.cur_state === this.state_map["move"]) {              
            this.comm.msg_out.push(
              {"moveEnt":{x:subj.x,y:subj.y,id:this.ent_toggled.id}});
            this.moveEnt(this.ent_toggled,subj);
          }
          this.ent_toggled = null;
          this.ent_tar = null;
        }
      } else if (!this.ent_toggled && this.pollMotion())
          this.cur_state = this.state_map["wait"];
    }
  },
  /* drawDrag: generates doo-dads based on input
   * TODO: */
  drawDrag: function (dest,src){
    if (!dest || !src) return;
    var ctx = this.canvas.getContext("2d"),
      _dest = {x:(dest.x*this.physics_offset)-game.canvas_offset.x,
               y:(dest.y*this.physics_offset)-game.canvas_offset.y},
      _src = {x:(src.x*this.physics_offset)-game.canvas_offset.x,
              y:(src.y*this.physics_offset)-game.canvas_offset.y}
    ;
    
    ctx.strokeStyle = "rgb(0,0,255)";
    ctx.beginPath();
    ctx.moveTo(_src.x,_src.y)
    ctx.lineTo(_dest.x,_dest.y);
    ctx.closePath();
    ctx.stroke();
  
  },
  /* updateClient: do animation frames.. separating from main game loop
   * */
  updateClient : function() {
  
    if (this.has_to_draw || !this.pollMotion())
      this.drawAll();
  
    var now = this.now;
    this.now = new Date().getTime();
    if (this.moved &&
       ((now - this.last_update) > this.poll) &&
        !this.paused) 
    {
      this.comm.go(this.cur_state+this.comm.sep+this.comm.I,this.comm.cb);
      this.moved = false;
      this.last_update = now;
    } else if(now - this.last_update > this.must_poll) {
      this.moved = true;
    }
    window.rAF(this.updateClient.bind(this));
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
  try { 
    ctx.drawImage(this.img,this.ctx,this.cty,w,h); 
  
    if (this.doodads) {
      for (var i=0;i<this.doodads.length;i++) {
        var d,_x,_y,_w,_h;
        d = this.doodads[i];
        _x = this.ctx + d.ctx;
        _y = this.cty + d.cty;
        _w = d.sw;
        _h = d.sh;
        ctx.drawImage(d.img,_x,_y,_w,_h);
      }
    }
    
    if (draw_health) {//TODO: colors
      ctx.fillStyle = "rgba(0,150,75,0.5)";
      ctx.fillRect(+Math.abs(this.ctx),-Math.abs(this.cty),w*0.1,this.health*2);
    }  
  
  } catch (e) {
    console.log(e);
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


  
var game = new GameClient();
game.physics_offset = PHY_OFS;//20;
game.physics_scale = PHY_SCALE;//50;
IS_SERVER=false;
game.create();
game.createClient();
game.moved = true;

//FIXME:
Ship.prototype.img_onload_proxy = function () {game.has_to_draw = true;}


//this is the callback for the xhr
var gameCbProxy = game.comm.cb = function (v){
  //returns "paused" if there was an HTTP error 
  if(v == "paused") {
    game.paused = true;
    game.ui.update("conn",true);
  } else if (!game.paused) {
    game.paused = false;
    game.ui.update("conn",false);
  }
  
  if(v == "repoll") {
    game.moved = true;
  }
  
  if (!v.forEach) {
    game.comm.msg_in.push(v);
  } else {
    v.forEach(function(i){
      game.comm.msg_in.push(i)
    });
  }
}

//var c = game.canvas.getContext("2d");game.physics.tester(c);game.tester=true;

