


EvListener = Class.extend({//TODO: use input library for cross platform

  /* move : for now this gets called by mousemove or touchmove events
   * */
  move: function (v) {

    this.moved = true;
    if (!this._drag_inp) return;

    v = getCords(this,v);

    if (this._drag){
      this.move_arr.push({x:v.x,y:v.y});
    }

  },
  mDown : function(v) {

    //if touch don't let the screen scroll
    if (this._drag_inp && v.touches) v.preventDefault();

    this._drag = true;
    this.move_arr = [];
    this.drag_start = this.ticks;
  },
  mUp : function(v) {

    if (!this._drag_inp && v.target.id == CANVAS_ID) {

      v = getCords(this,v);
      this.checkAndToggleEnt(v.x,v.y)
      return;

    }

    this.finishDrag(this.move_arr);

  },



  deviceMove : function(v) {
    if (!v.acceleration) return;
    //this is for mobile.. wake up the game if movement detected
    if (v.acceleration.z >= 1.5)
      this.moved = true;
  },



  orientCanvas : function (is_during_game) {

    var gw = this.gsize.w;
    var gh = this.gsize.h;
    var cw = window.innerWidth - 25;
    var ch = window.innerHeight - 125;
    this.abs_size = cw < ch ? cw : ch
    this.canvas.width=this.abs_size;
    this.canvas.height=this.abs_size;

    this.draw_scale = {
      x: this.abs_size / this.gsize.w,
      y: this.abs_size / this.gsize.h
    }

    this.canvas.getContext('2d').scale(this.draw_scale.x,this.draw_scale.y);

    if (is_during_game) {
      this.drawAll();
      this.ui.game_bar.div.style.width = this.canvas.width + "px";
      this.ui.game_bar.s.style.width = this.canvas.width + "px";
    }



  }

});



/* checkAndToggleEnt: detects if an entity has been clicked and
 * if so target it */
GameClient.prototype.checkAndToggleEnt = function (mouseX,mouseY) {

  if (typeof(mouseX)=="undefined" || typeof(mouseY)=="undefined") return;

  mouseX = mouseX/(this.physics_offset*this.draw_scale.x);
  mouseY = mouseY/(this.physics_offset*this.draw_scale.y);

  var t = new b2Vec2(mouseX,mouseY);
  var aabb = new b2AABB();

  aabb.lowerBound.Set(mouseX - CLICK_BOUND, mouseY - CLICK_BOUND);
  aabb.upperBound.Set(mouseX + CLICK_BOUND, mouseY + CLICK_BOUND);
  //aabb.lowerBound.Set(mouseX, mouseY);
  //aabb.upperBound.Set(mouseX, mouseY);

  var result = null;
  this.physics.world.QueryAABB(
    function (bdy) {result = bdy;},
    aabb
  );

  if (result) {

    this.uiDrawSelect(result.GetBody().GetUserData().ent);
    this.ent_toggled = result.GetBody().GetUserData().ent;
    return true;

  } else {


    this.uiUnselectTarget();
    return false;

  }

}



/* getCords: normalize click event x/y data
 * */
function getCords(game,v) {

  //touch
  if (v.touches && v.touches.length) {

    v.x=v.touches[0].screenX;
    v.y=v.touches[0].screenY;

    v.x = ( v.x / game.touch_offset_X ) * game.canvas.width;
    v.y = ( v.y / game.touch_offset_Y ) * game.canvas.height;

  //mouse move
  } else {
    v.x = v.clientX;
    v.y = v.clientY;
  }

  return v;
}



//just a test generation function for now
EvListener.prototype.detectKey = function (e){
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
    } else if (e.which==85) {//u "update"
      game.update();
    } else if (e.which==69) {//e "end"
      game.stop();
    } else if (e.which==83) {//s "start"
      game.run();
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
        game.uiSetSelector();
    } else if (e.which==82) {//r for reset to center
      var t1 = new b2Vec2(game.pX / 2 , game.pY / 2);
      for ( var i = 0; i < game.ent_arr.length; i ++){
        game.ent_arr[i].body.SetPosition(t1);
      }
    } else if (e.which==49) {//1 for get ships
      game.comm.getReq();
    } else return;
  }

