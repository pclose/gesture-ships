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
 STATE_MAX_LENGTH = 1,
 MOTION_LIM_TEST = 0.1,
 INCR = 50,
 ENT_HEALTH_INCR = 1,
 PHY_OFS = 20, PHY_SCALE = 50, PHY_BASE = 2,
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
  'missle' : 3,
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

  state_map : {
    "wait":{id:0,fn:null,name:"wait"},
    "input":{id:1,fn:null,name:"input"},
  },

  cur_state : null,
  seats : [], max_seat : MAX_SEAT, max_team_size : MAX_TEAM_SIZE,
  turn : 0,

  event_list : [],


  /* create:
   */
  create : function (settings) {

    this.cur_state = this.state_map["wait"];

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
    this.now = new Date().getTime();

    //TODO: make size dynamic or scrolling
    if (settings && (!settings.x||!settings.y)) this.gsize = {w : 600, h : 600};
    else this.gsize = {w : 600, h : 600};

    //this.pX=(this.gsize.w+this.physics_scale)/this.physics_offset;
    //this.pY=(this.gsize.h+this.physics_scale)/this.physics_offset;
  },



  /* Game.main: initializes main game loop
   * */
  main: function(cb){
    clearInterval(this.int);
    this.int = setInterval(cb.update.bind(cb),FREQ);
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



  /* fireMissle: fire a missle
   * */
  fireMissle : function(ent,subj) {
    if (!subj && !!ent.id) ent = this.ent_arr[this.getEntIndexById(ent.id)];
    if (typeof ent == "undefined")
      throw Error("fireMissle failed entity not found");

    //get missle id exit if none found
    var missle_id = ent.getMissleId();
    if (missle_id < 0) {
      console.log("fireMissle failed, no missles");
      return;
    }

    var missle = ent.doodads[missle_id];
    var move = new b2Vec2(subj.x,subj.y);
    var pos = ent.body.GetWorldCenter();

    pos.x += missle.x;
    pos.y += missle.y;


    move.Subtract(pos);

    if (subj.force)
      move.Multiply(subj.force);
    else
      move.Multiply(MOVE_FORCE_MULT * ent.move_force_mult);

    ent.destination_radians = Math.atan2(move.x,-move.y);

    var projectile = new Projectile();
    projectile.team = ent.team;
    projectile.destination_radians = ent.destination_radians;
    projectile.name = missle.name;

    projectile.health = -ENT_HEALTH['init'] * ENT_HEALTH['missle'];

    this.addEnt(projectile);

    projectile.body.SetPosition(pos);
    projectile.body.ApplyForce(move,pos);

    //remove missle fired
    ent.doodads.splice(missle_id,1);

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



  /* moveShield: saves the shields of a given entity
   * */
  moveShield : function(ent,subj) {
    if (!subj && !!ent.id) ent = this.ent_arr[this.getEntIndexById(ent.id)];
    if (typeof ent == "undefined")
      throw Error("moveShield failed entity not found");

    ent.shield = subj.shield || {"front":0,"back":0};
    this.has_to_draw = true;

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


  /* deleteEnt:
   * */
  deleteEnt : function(i) {
    var id = this.getEntIndexById(i);
    if (id < 0) return;
    this.has_to_draw = true;
    if (this.ent_arr[id].type == ENT_TYPES["player"])
      this.event_list.push(JSON.stringify({"deleteEnt" : this.ent_arr[id].id}));
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

    ent.game = this;
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

    if (typeof comm != "string")
      {throw Error("pushState did not receive a string");return;}

    //if game state changed
    if (this.cur_state.name != comm) this.stepState();

    //change state
    this.cur_state = this.state_map[comm];

  },



  /* stepState: override on client side
   * */
  stepState : function() {return;},



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
      if (typeof(this[keys[0]]) != "function") {
        console.log("input function doesn't exist " + keys[0]);
        return;
      }
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



});


/* Comm "communication" object
 * to be extended by server or client */
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
