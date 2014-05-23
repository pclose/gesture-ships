/* vim ts=2 sw=2
*/

var b2Vec2 = Box2D.Common.Math.b2Vec2,
 b2BodyDef = Box2D.Dynamics.b2BodyDef,
 b2Body = Box2D.Dynamics.b2Body,
 b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
 b2Fixture = Box2D.Dynamics.b2Fixture,
 b2World = Box2D.Dynamics.b2World,
 b2MassData = Box2D.Collision.Shapes.b2MassData,
 b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
 b2CircleShape = Box2D.Collision.Shapes.b2CircleShape,
 b2DebugDraw = Box2D.Dynamics.b2DebugDraw,
 b2FilterData = Box2D.Dynamics.b2FilterData,
 b2ContactListener = Box2D.Dynamics.b2ContactListener,
 b2AABB =  Box2D.Collision.b2AABB,
 b2WorldManifold = Box2D.Collision.b2WorldManifold,
 b2Transform = Box2D.Common.Math.b2Transform,
 b2Mat22 = Box2D.Common.Math.b2Mat22,

 TWOPI = Math.PI * 2, PIOTWO = Math.PI / 2,
 QTRPI = Math.PI * 0.25, THREEQTRPI = Math.PI * 0.75,
 _DENSITY = 1.0, _FRICTION = 0.5, _RESTITUTION = 0.2,
 MAX_SEAT = 2, MAX_TEAM_SIZE = 2,
 POLL = 6000,MUST_POLL = 60000,
 FREQ = 1000/60,
 MOVE_FORCE_MULT = 50,
 MOVE_DAMP_BASE = 1,
 UPDATE_INTERVAL = 1,
 MOVE_MAX_LENGTH = 2,
 CLICK_MAX_LENGTH = 1,
 CLICK_BOUND = 0.001,
 STATE_MAX_LENGTH = 1,
 MOTION_LIM_TEST = 0.1,
 INCR = 50,
 ENT_HEALTH_INCR = 1,
 PHY_BASE = 50, PHY_OFS = 20, PHY_SCALE = 50, PHY_BASE = 1,
 PROJ_WIDTH_OFS = 0.2, PROJ_DENSITY_OFS = 0.01,
 COLLISION_CATEGORY = {
  'player' : 0x0001,
  'projectile' : 0x0001 << 1,
  'all' : 0xFFFF
},
 ENT_TYPES = {
  'player' : 0,
  'projectile' : 1
},
 ENT_HEALTH = {
  'init' : 1,
  'ship' : 5,
  'missle' : 2,
  'laser' : 1
},
 SHIP_SYNC_ATTR = [
 'name','x','y',
 'drag','h','w',
 'sh','sw','angle','team','id',
 'velocity_x','velocity_y',
 'health','doodads','shield'
];

Seat = Class.extend({
  type : "player",
  id : null,
  team : 0,
  is_turn : false
});

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

    this.parent();

    if (!IS_SERVER) this.img = new Image();
    else this.img = {};
    this.img.src = this.name;

    //TODO: make generic asset loading function
    this.img.onload = this.img_onload_proxy;

    //loop through doodads (eg. missles) and set rendering attr
    //TODO: not in ship definition
    if (this.doodads) {
      for (var i=0;i<this.doodads.length;i++) {
        var d = this.doodads[i]
        if (!IS_SERVER) d.img = new Image();
        else d.img = {};
        d.img.src = d.name;
        d.img.onload = this.img_onload_proxy;
        d.sw = (d.w * INCR);
        d.sh = (d.h * INCR);
        d.dx = (d.x * this.sw);
        d.dy = (d.y * this.sh);

        d.ctx = d.dx + -(d.sw * 0.5)
        d.cty = d.dy + -(d.sh * 0.5)
      }
    }

    /*"physXY" defines the entities maximum X and Y positions
     *for creating a scrolling world. think "asteroids"
     *TODO: set all entities to use the same maximums effeciently.. or
     *TODO: create scrolling canvas function rather than transpose*/

    /*this.ofs_size = ((this.sh + this.sw) / 2) / 2;
    this.physXY.pW = (game_width + this.ofs_size)/physics_offset;
    this.physXY.pH = (game_height + this.ofs_size)/physics_offset;
    this.physXY.pW_ = (-this.ofs_size) / physics_offset;
    this.physXY.pH_ = (-this.ofs_size) / physics_offset;*/

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


    /*
    * generate bit masks for collision. projectiles from the other team
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
    //(http://gamedev.stackexchange.com/questions/74561/determine-collision-angle-on-a-rotating-body)
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
  }
});

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
  health : ENT_HEALTH['init'] * ENT_HEALTH['missle'],
  dmg : -ENT_HEALTH['init'] * ENT_HEALTH['missle'],
  init : function () {
    this.parent();
    if (!IS_SERVER) this.img = new Image();
    this.img.src = this.name;
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



Phys = Class.extend({
  d : null, world : null,step : 1/60,
  addContactListener: function (callbacks) {
  // copied this right out of gritsgame src..
    var listener = new b2ContactListener;
    if (callbacks.BeginContact) {
      listener.BeginContact = function (contact) {
        callbacks.BeginContact.call(callbacks.obj,contact);
      }
    }
    if (callbacks.EndContact)
      listener.EndContact = function (contact) {
        callbacks.EndContact(
          contact.GetFixtureA().GetBody(),
          contact.GetFixtureB().GetBody());
        }
    if (callbacks.PostSolve)
      listener.PostSolve = function (contact, impulse) {
        callbacks.PostSolve(
          contact.GetFixtureA().GetBody(),
          contact.GetFixtureB().GetBody(),
          impulse.normalImpulses[0]);
        }
    this.world.SetContactListener(listener);
},
  create : function () {
    this.world = new b2World(
      new b2Vec2(0,0),
      true
    );
  },
  tester : function (c) {
    this.d = new b2DebugDraw();
    this.d.SetSprite(c);
    this.d.SetDrawScale(20.0);
    this.d.SetFillAlpha(0.5);
    this.d.SetLineThickness(1.0);
    this.d.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    this.world.SetDebugDraw(this.d);
    this.world.DrawDebugData();
  },
  addBody : function (settings) {
    // real simple like.. just polygons for now
    var gBody = new b2BodyDef();
    if (settings.phy_type == "static")
      gBody.type = b2Body.b2_staticBody;
    else if (settings.phy_type == "dynamic")
      gBody.type = b2Body.b2_dynamicBody;

    //gBody.bullet = true;


    gBody.position.Set(settings.x,settings.y);
    gBody.angle = settings.angle;
    var fixt = new b2FixtureDef();

    fixt.density = settings.density;
    fixt.friction = settings.friction;
    fixt.restitution = settings.restitution;
    fixt.shape = new b2PolygonShape;
    fixt.shape.SetAsBox(settings.w,settings.h);

    fixt.filter.categoryBits = settings.collision_category;
    fixt.filter.maskBits = settings.collision_mask;
    //fixt.filter.groupIndex = settings.collision_group;

    body = this.world.CreateBody(gBody);
    body.CreateFixture(fixt);

    return body;
  },
  update : function () {
    var w = this.world;
    w.Step(this.step, 10 , 10);
    w.DrawDebugData();
    w.ClearForces();
  }
});

/* Game: generic class for a game
 * extended by the client or server */
Game = Class.extend({
  game_id: null, ticks: 0,
  ent_arr : [], state_arr : [], doodad_arr : [],
  ent_toggled : null, ui_toggled : false,

  pX : null,  pY : null,
  canvas : null,c : {},draw_health : true,

  int: null, now : null, poll : POLL, must_poll : MUST_POLL,
  move_arr : [], ent_tar : null, goent : false, go : true,
  drag_start:null,drag_end:null,_inp:null,_drag:null,
  canvas_offset : null, physics_offset : PHY_OFS, physics_scale : PHY_SCALE,

  physics : null,tester : false,
  ev : null,ui : null,comm : null,

  state_map : {"wait":0,"input":1,"move":2,"fire":3}, cur_state : 0,
  seats : [], max_seat : MAX_SEAT, max_team_size : MAX_TEAM_SIZE,
  turn : 0,

  event_list : [],

  /* create:
   */
  create : function (settings) {

    //physics world and bodies
    this.physics = new Phys();
    this.physics.create();
    this.go = true;
    this.physics.addContactListener({
      obj : this, // object that will be bound as "this" in the function below
      BeginContact: function (contact) {

        //solve world collision points and midpoint
        var manifold = new b2WorldManifold();
        contact.GetWorldManifold(manifold);
        var midpoint = {x:0,y:0}
        /*NOTE: m_pointCount is compared and not "m_points.length"
        basically the b2WorldManifold starts with 2 points
        but does not necessarily solve them */
        var point_count = contact.GetManifold().m_pointCount;

        for (var i=0;i<point_count;i++){
          midpoint.x += manifold.m_points[i].x;
          midpoint.y += manifold.m_points[i].y;
        }
        if (!(point_count <= 1)) {
          midpoint.x = midpoint.x / point_count;
          midpoint.y = midpoint.y / point_count;
        } else {
          midpoint.x = manifold.m_points[0].x;
          midpoint.y = manifold.m_points[0].y;
        }

        //get user data (entities)
        var bA = contact.GetFixtureA().GetBody().GetUserData();
        var bB = contact.GetFixtureB().GetBody().GetUserData();
        if (!bA || !bB) return;
        var A = bA.ent, B = bB.ent;

        //call each entities collision function
        A.onCollide(B,midpoint.x,midpoint.y);
        B.onCollide(A,midpoint.x,midpoint.y);
      }
    });

    //client/server communication
    this.comm = new Comm();

    //override some stuff
    this.ent_arr=[];
    this.has_to_draw=true;

    //TODO: make size dynamic or scrolling
    this.now = new Date().getTime();
    if (settings && (!settings.x||!settings.y)) this.gsize = {w : 600, h : 600};
    else this.gsize = {w : 600, h : 600};
    this.pX=(this.gsize.w+this.physics_scale)/this.physics_offset;
    this.pY=(this.gsize.h+this.physics_scale)/this.physics_offset;
  },
  /* fireProjectile: from an entity
   */
  fireProjectile : function(ent,subj) {
    if (!subj && !!ent.id) ent = this.ent_arr[this.getEntIndexById(ent.id)];
    if (typeof ent == "undefined")
      throw Error("fireProjectile failed entity not found");

    var move = new b2Vec2(subj.x,subj.y);
    var pos = ent.body.GetWorldCenter();

    move.Subtract(pos);

    if (subj.force)
      move.Multiply(subj.force);
    else
      move.Multiply(MOVE_FORCE_MULT * ent.move_force_mult);

    ent.destination_radians = Math.atan2(move.x,-move.y);

    var laser = new Projectile();
    laser.team = ent.team;
    laser.destination_radians = ent.destination_radians;
    laser.name = "img/blue.gif";

    this.addEnt(laser);

    laser.body.SetPosition(pos);
    laser.body.ApplyForce(move,pos);
  },
  /* moveEnt: moves an entity
   */
  moveEnt : function(ent,subj) {
    if (!subj && !!ent.id) ent = this.ent_arr[this.getEntIndexById(ent.id)];
    if (typeof ent == "undefined")
      throw Error("moveEnt failed entity not found");

    var move = new b2Vec2(subj.x,subj.y);
    var pos = ent.body.GetWorldCenter();

    move.Subtract(pos);

    if (subj.force)
      move.Multiply(subj.force);
    else
      move.Multiply(MOVE_FORCE_MULT * ent.move_force_mult);

    ent.destination_radians = Math.atan2(move.x,-move.y);

    ent.body.ApplyForce(move,pos);
    //ent.body.SetAwake(true);
  },
  /* updateEnt: updates all entities
   */
  update : function (pre) {
    this.ticks++;
    //step changes to physics world
    this.physics.update()
    //step changes to entities
    for (var i=0; i < this.ent_arr.length; i++) {
      this.ent_arr[i].procUpdate();
    }

    //if (this.cur_state == this.state_map["wait"])
      if (this.pollMotion())
        this.procMsg();

    this.procKills();

    //process new changes if needed
    //var n = new Date().getTime();//TODO: this time interval should do something
    //if (n - pre > UPDATE_INTERVAL){
      this.stateCheck();
    //}
  },
  deleteEnt : function(i) {
    var id = this.getEntIndexById(i);
    if (id < 0) return;
    this.has_to_draw = true;
    if (this.ent_arr[id].type == ENT_TYPES["player"])
      this.event_list.push({"deleteEnt" : this.ent_arr[id].id});
    this.physics.world.DestroyBody(this.ent_arr[id].body);
    this.ent_arr.splice(id,1);
  },
  /* addEnt:
   */
  addEnt : function (ent,subj) {
    this.has_to_draw = true;

    if (ent.id == {} || !ent.id ) {//new entity - new id
      ent.id = newGuid_short();
    } else {
      //check if element already exists
      var index = this.getEntIndexById(ent.id);
      if (index >=0) {//already exists
        this.physics.world.DestroyBody(this.ent_arr[index].body);
        this.ent_arr.splice(index,1);
        //override old entity
        ent = !!subj? subj:ent;
      }
    }

    if (!(ent instanceof Ship))//if needed merge ship class with ent
      ent = merge((new Ship()),ent)

    //initialize the body
    ent.game_width = this.gsize.w;
    ent.game_height = this.gsize.h;
    ent.physics_offset = this.physics_offset;
    ent.init();

    ent.body = this.physics.addBody(ent);
    ent.body.SetUserData({"ent":ent});//refer back to the game ent
    this.ent_arr.push(ent);           //hopefully this is efficient
    return ent;
  },

  /* fillSeat: (ie add player)
   * assigns the seat to the next team based on size of game*/
  fillSeat : function (seat){

    var count = 0,
      team_size = this.max_team_size,
      max_seat = this.max_seat,
      ceil = this.max_team_size - 1,
      seat_ceil = 0,
      num_incr = max_seat / team_size;

    //sanity check
    var id = this.getSeatIndexById(seat.id);
    if (id >= 0 || this.seats.length >= max_seat) return -1;

    //initialize
    for (var i=0; i < ceil;i++) seat_ceil++;
    for (var i=0; i < this.seats.length; i++) count += this.seats[i].team;
    //var count_total = seat_ceil * num_incr;

    //quickest team pick, just modulo the current # of seats
    seat.team = typeof seat.team == "number" ? seat.team
      : this.seats.length % team_size;

    //check team pick - is there a way better way to do this?
    var t_count=0;
    this.seats.forEach(function(v){if(v.team===seat.team)t_count++;});
    while (t_count >= num_incr){
      t_count=0;
      //increment team by 1 or reset to 0
      seat.team = ++seat.team <= seat_ceil ? seat.team : 0;
      //recount
      this.seats.forEach(function(v){if(v.team===seat.team)t_count++;});
    }

    this.seats.push(seat);
    return this.getSeatIndexById(seat.id);

  },
  /* removeSeat:
   * @rid : id or index of seat to remove
   * @yes_ent : set true if to remove entities along with seat*/
  removeSeat : function (rid,yes_ent) {
    var id = typeof rid == 'number' ? rid : this.getSeatIndexById(rid);
    if (id < 0 || rid >= this.seats.length) return;

    if (yes_ent) //also remove entities
      for (var i=0;i<this.ent_arr.length;i++)
        if (this.ent_arr[i].team == this.seats[id].team)
          this.deleteEnt(this.ent_arr[i].id);

    if (this.seats[id].is_turn)
      this.stepTurn();

    this.seats.splice(id,1);
  },
  /* stepTurn: essentially just increments the seat by 1
   * TODO: add sorting function to fillSeat to make this accurate*/
  stepTurn : function () {
    this.turn = ++this.turn <= this.seats.length ? this.turn : 1;
    for (var i=0;i<this.seats.length;i++)
      this.seats[i].is_turn=false;
    if (this.turn-1 >= 0)
      this.seats[this.turn-1].is_turn=true;
  },
  /* procKills: remove entites marked
   */
  procKills : function () {
    for (var i=0; i < this.ent_arr.length; i++) {
      if (this.ent_arr[i].dead){
        this.deleteEnt(this.ent_arr[i].id);
      }
    }
  },
  /* pollMotion: test if all entities have stopped
   */
  pollMotion : function () {
    for (var i=0; i < this.ent_arr.length; i++) {
      var t = this.ent_arr[i].body.GetLinearVelocity();
      if (Math.abs(t.x) > MOTION_LIM_TEST || Math.abs(t.y) > MOTION_LIM_TEST) {
        return false;
      }
    }
    return true;
  },
  /* pushState: changes game state
   */
  pushState : function(comm) {
    if (this.cur_state != this.state_map["input"]
      && this.cur_state != this.state_map["wait"]) return;
    if (typeof comm == "number") this.cur_state = comm;
    else if (typeof comm == "string") {//FIXME
      if (this.state_arr.length >= STATE_MAX_LENGTH) this.state_arr.pop();
      this.state_arr.push([comm,this.ent_toggled]);
    }
  },
  /* getEntIndexById:
   */
  getEntIndexById : function (id) {// return the first entity
    for (var i=0; i < this.ent_arr.length; i++) {
      if (this.ent_arr[i].id == id) return i;
    }
    return -1
  },
  /* getSeatIndexById:
   */
  getSeatIndexById : function (id){
    for (var i=0; i < this.seats.length; i++) {
      if (this.seats[i].id == id) return i;
    }
    return -1
  },
  getStateStr : function (state) {
    if (typeof state === "undefined")
      state = this.cur_state;
    var k = Object.keys(this.state_map);
    for (var i = 0; i < k.length; i++)
      if (this.state_map[k[i]] == state)
        return k[i];
  },
  /* setCommI: sets location in the communication queue
   * */
  setCommI : function (c) {
    this.comm.I = c;
  },
  /* procMsg: generic message passing
   * including communication between server and client */
  procMsg : function () {

    if (this.comm.msg_in.length > 0) {
      var t = this.comm._in();

      if (typeof(t) != "object" || t == null) return;
      keys=Object.keys(t);
      if (keys.length != 1) return;
      if (typeof(this[keys[0]]) != "function") return;
      var val = t[keys[0]];

      //  call the game function
      var ent = this.ent_arr[this.getEntIndexById(val.id)];
      if (ent) {
        try {
          this[keys[0]](ent,val);
        } catch (e) {
          console.log(e.stack);
        }
      } else {
        try {
          this[keys[0]](val);
        } catch (e) {
          console.log(e.stack);
        }
      }

      if (this.cb) this.cb(t);
    }

    //communication to srv or client
    if (this.comm.msg_out.length > 0) {
      //TODO: don't shift here. shift after we make sure go is good
      var t = this.comm._out();
      //this.comm.go(function () {}, t);
      this.comm.go(t,this.comm.cb.bind(this));
    }
  },
  /* Game.main: initializes main game loop
   * */
  main: function(cb){
    clearInterval(this.int);
    this.int = setInterval(cb.update.bind(cb),FREQ);
  }
});

Comm = Class.extend({
  uri : '/ships',
  async : true,
  I : 0,
  sep : "/",
  /* _in: checks the index of the most recent msg
   *  and records it before returning it to the game */
  _in : function () {
    var result = this.msg_in.shift();
    if (typeof result.I == "number")
      if (result.I > this.I) this.I = result.I;
      else return;
    delete result["I"];
    return result;
  },
  _out : function () {
    //this.I++;
    return this.msg_out.shift();
  },
  msg_in : [],
  msg_out : [],
  cb : function () {},
  go : null,//will be overidden by client or srv
});
