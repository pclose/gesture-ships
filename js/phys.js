






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
    this.d.SetDrawScale(PHY_OFS);
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
    //this is a major gotcha ... SetAsBox takes the midpoint essentially
    fixt.shape.SetAsBox(settings.w/2,settings.h/2);

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
