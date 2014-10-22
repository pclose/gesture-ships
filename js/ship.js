
Ent = Class.extend({
  name:""/*"img/red.gif"*/,id:null,
  x : 0,  y : 0,  w : PHY_BASE,   h : PHY_BASE,
  z : 1,
  dead : false,
  ctx : null, cty : null,
  sw : INCR,sh : INCR,
  init : function () {

    this.ctx = -(this.sw*0.5);
    this.cty = -(this.sh*0.5);

  }
});
var s;
Ship = Ent.extend({
  phy_type:"dynamic",type:ENT_TYPES["player"],what:"ship",team : 0,
  collision_group : 0,
  density : _DENSITY, friction : _FRICTION, restitution : _RESTITUTION,
  sw : INCR, sh : INCR,
  w : PHY_BASE, h : PHY_BASE,
  drag : MOVE_DAMP_BASE * 5,
  move_force_mult : 5,
  proj_force_mult : 5,
  body : null ,
  angle : 0,
  health : ENT_HEALTH['init'] * ENT_HEALTH['ship'],
  dmg : -ENT_HEALTH['init'] * ENT_HEALTH['missle'],
  facing : null, destination_radians : null,
  img : null,
  physXY : {pW : null, pW_ : null, pH : null, pH_ : null},

  /*Ship.init: initialize the ship entity
   * */
  init : function () {
if (this.name == "") {s = this;}
    this.parent();

    if (!IS_SERVER) this.img = this._game_ref().loadImg(this.name);

    //loop through doodads (eg. missles) and set rendering attr
    //TODO: not in ship definition
    if (this.doodads) {
      for (var i=0;i<this.doodads.length;i++) {
        var d = this.doodads[i]

        if (!IS_SERVER) d.img = this._game_ref().loadImg(d.name);

        d.sw = d.w * PHY_OFS;// * 2;
        d.sh = d.h * PHY_OFS;// * 2 ;

        d.dx = (d.x * this.sw);
        d.dy = (d.y * this.sh);

        d.ctx = d.dx + -(d.sw * 0.5)
        d.cty = d.dy + -(d.sh * 0.5)
      }
    }

    /*"physXY" defines the entities maximum X and Y positions
     *for creating a scrolling world. think asteroids
     *TODO: set all entities to use the same maximums effeciently.. or
     *TODO: create scrolling canvas function rather than transpose*/

    this.ofs_size = 0;
    this.physXY.pW = this.game_width/this.physics_offset;
    this.physXY.pH = this.game_height/this.physics_offset;
    this.physXY.pW_ = 0;
    this.physXY.pH_ = 0;


    //saves the max/min for drawing clips across the screen
    if (!IS_SERVER) {
      this.draw_ofs = this.sh ;
      this.drawXY = {};
      this.drawXY.pW = (this.game_width - this.draw_ofs) / this.physics_offset;
      this.drawXY.pH = (this.game_height - this.draw_ofs) / this.physics_offset;
      this.drawXY.pW_ = this.draw_ofs / this.physics_offset;
      this.drawXY.pH_ = this.draw_ofs / this.physics_offset;

      this.draw_ofs /= this.physics_offset;
    }



    /* generate bit masks for collision. projectiles from the other team
     * should not collide with the team that fired the projectile.
     * as an example : if walls are category 0x01, and ghosts are category 0x02,
     * you can set ghost.maskBits = 0x01 to have ghosts only check collisions
     * with walls (and anything else that is in category 1).
                cat  mask
    team0       0001 1010
    team1       0010 0101
    projectile0 0100 0110
    projectile1 1000 1001
    */
    var p = COLLISION_CATEGORY["projectile"],
      b = COLLISION_CATEGORY["player"],
      t = this.team ? 1 : 0;
      nt = this.team ? 0 : 1;
    this.collision_category =
      b << t;                    /*offset by 1 per team. collide with*/
    this.collision_mask =        /*entities by OR operation allow collision*/
      (b << nt) | (b << nt << p);/*with the other team and its projectiles*/

  },



  onCollide : function(other_ent,cx,cy) {

    //begin figuring out what side of this object the collision is closest to
    //http://gamedev.stackexchange.com/questions/74561/determine-collision-angle-on-a-rotating-body
    var pos = this.body.GetPosition();

    //rotation can be more than PI
    var ang = this.body.GetAngle() % TWOPI;

    //negative rotation
    if (ang < 0) { ang = TWOPI + ang; }

    //body position relative to collision position
    var d_cx = pos.x - cx;
    var d_cy = pos.y - cy;

    //length of collision vector
    var len = Math.sqrt(Math.pow(pos.x - cx, 2) + Math.pow(pos.y - cy, 2));

    //vector representing the bodies angle (http://www.mathsisfun.com/polar-cartesian-coordinates.html)
    var b_vx = Math.cos(ang - PIOTWO);
    var b_vy = Math.sin(ang - PIOTWO);

    //dot product of collision and body vectors
    var dot_prod = d_cx * b_vx + d_cy * b_vy;
    dot_prod /= len;

    //resulting angle
    var d_ang = Math.acos(dot_prod);

    //result!
    var side;
    if (Math.abs(d_ang) > PIOTWO )
      side = "front";
    else
      side = "back";

    //apply damage to shield or entity
    if (typeof this.shield != "undefined") {
      if (this.shield[side] <= 0) {
        this.health += other_ent.dmg;
      } else {
        this.shield[side] += other_ent.dmg;
        if (this.shield[side] < 0) {
          this.health += this.shield[side];
        }
      }
    }

    if (this.health <= 0) this.dead = true;

  },
  procEdges : function () {
    //test if the body fell off the canvas
    var pos = this.body.GetPosition();
    if (pos.x > this.physXY.pW)
      var b = new b2Vec2(this.physXY.pW_,pos.y);
    else if (pos.x < this.physXY.pW_)
      var b = new b2Vec2(this.physXY.pW,pos.y);
    else if (pos.y > this.physXY.pH)
      var b = new b2Vec2(pos.x,this.physXY.pH_);
    else if (pos.y < this.physXY.pH_)
      var b = new b2Vec2(pos.x,this.physXY.pH);

    if (b) {//transpose across to the other side
      var ang = this.body.GetAngle();
      var bb = new b2Mat22(20,20)//still don't understand this
      var t = new b2Transform(b,bb);//or this
      this.body.SetTransform(t);
      this.body.SetAngle(ang);
    }

    //set clipping draw values
    if (!IS_SERVER) {
      this.clip = null;
      var clips = [];

      //crossing min/max X (width)
      if (pos.x > this.drawXY.pW)
        clips.push({x:-this.draw_ofs + (pos.x - this.drawXY.pW) , y:pos.y});
      else if (pos.x < this.drawXY.pW_)
        clips.push({x:this.drawXY.pW + this.draw_ofs + pos.x,y:pos.y});

      //crossing min/max Y (height)
      if (pos.y > this.drawXY.pH)
        clips.push({x:pos.x, y:-this.draw_ofs + (pos.y - this.drawXY.pH)});
      else if (pos.y < this.drawXY.pH_)
        clips.push({x:pos.x, y:this.drawXY.pH + this.draw_ofs + pos.y});

      //non null .. will be drawn
      if (clips.length > 0)
        this.clip = clips;

      //literal corner case :)
      if (clips.length == 2)
        this.clip.push({x:clips[0].x , y:clips[1].y});
    }



  },



  procUpdate : function () {
    this.procEdges();

    var v = this.body.GetLinearVelocity();
    var av = this.body.GetAngularVelocity();
    this.angle = this.body.GetAngle();
    this.velocity_x = v.x;
    this.velocity_y = v.y;

    //slow the body down
    //TODO: easing
    //if (Math.abs(v.x) > MOTION_LIM_TEST || Math.abs(v.y) > MOTION_LIM_TEST) {
      //for some reason the check above completely breaks between browser and node...
      this.body.SetLinearDamping(this.drag);
    //}
    //set position if the body is stopped.
    //} else {
      var l = this.body.GetPosition();
      this.x = l.x;
      this.y = l.y;
    //}

    //if (Math.abs(av) > MOTION_LIM_TEST) {
      this.body.SetAngularDamping(this.drag);
    //}

    //sets the angle to our heading
    //TODO: easing
    if (this.destination_radians) {
      this.body.SetAngle(this.destination_radians);
      this.destination_radians = null;
    }
  },



  /* checkMissle: check if ship has any missles
   * */
  getMissleId : function() {

    if (!this.doodads) return;

    var result;
    for (var i=0; i<this.doodads.length; i++) {

      if (this.doodads[i].type == "projectile")
        return i;

    }

    return -1

  }


});
