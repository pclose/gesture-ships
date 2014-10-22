




Projectile = Ship.extend({
  phy_type:"dynamic",type:ENT_TYPES["projectile"],what:"missle",team : 0,
  collision_group : 0,
  //density : _DENSITY * (PROJ_DENSITY_OFS),
  density : _DENSITY, //seems to act funny if between 1 and 0
  friction : _FRICTION, restitution : _RESTITUTION,
  sw : INCR * PROJ_WIDTH_OFS , sh : INCR,
  w :  PHY_BASE * PROJ_WIDTH_OFS , h : PHY_BASE,
  drag : MOVE_DAMP_BASE * 5,
  move_force_mult : 5,
  proj_force_mult : 5,
  health : ENT_HEALTH['init'] * ENT_HEALTH['laser'],
  dmg : -ENT_HEALTH['init'] * ENT_HEALTH['laser'],
  init : function () {
    this.parent();
    //if (!IS_SERVER) this.img = new Image();
    //this.img.src = this.name;
    var p = COLLISION_CATEGORY["projectile"],
      b = COLLISION_CATEGORY["player"],
      t = this.team ? 1 : 0,
      nt = this.team ? 0 : 1;
    this.collision_category =
      b << t << p;
    this.collision_mask =
      (b << nt) | (b << t << p);
  },
  onCollide : function(other_ent) {
    this.dead = true;
  },
  /*procEdges : function (){
    //test if the body fell off the canvas
    var pos = this.body.GetPosition();
    var ang = this.body.GetAngle();
    if (pos.x > this.physXY.pW)
      this.dead = true;
    else if (pos.x < this.physXY.pW_)
      this.dead = true;
    else if (pos.y > this.physXY.pH)
      this.dead = true;
    else if (pos.y < this.physXY.pH_)
      this.dead = true;
  },*/
  procUpdate : function (){
    this.parent();
    var t = this.body.GetLinearVelocity();
    // if missles come to a stop just kill them off
    if (Math.abs(t.x) < MOTION_LIM_TEST ||  Math.abs(t.y) < MOTION_LIM_TEST)
      this.dead = true;
  },
});
