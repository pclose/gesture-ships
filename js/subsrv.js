/* 2014-2-5 -pete
 * provides "subscription" to the existing games
 * basically an admin console
 */
var gb;
var subsrv = module.exports = function (g) {
  gb = g;
  this.gb = g;
}


subsrv.prototype.sub = function (req,res) {
  var url = req.url.replace(/\/sub/,"");

  //return a list of games
  if (url == "/" || url == "") {
    res.json(getGames());

  //replay a game
  } else if (url.match(/\/\d+_\d+/)) {
    var result = url.match(/\d+_\d+?$/)[0].split(/_/);
    var g = this.gb.games[result[0]];
    var re = [];
    if (g)
       re = g.getComms(result[1]);
    res.json(re);

  //subscribe to a game
  } else if (url.match(/\/\d+_h/)) {
    var result = url.match(/\d+_h$/)[0].split(/_/);
    var g = this.gb.games[result[0]];
    var re = [];
    if (g) {
      re = g.getShips();
      re = re.concat(g.getComms(g.event_list.length));
    }
    res.json(re);


  } else {
    res.send(400);
  }

}


getGames = function() {
  var result = [];
  for (var i=0;i < gb.games.length;i++) {
    var e = {};
    e.I = i;
    e.seats = gb.games[i].seats;
    e.ent_arr_count = gb.games[i].ent_arr.length;
    e.event_list_length = gb.games[i].event_list.length;
    e.ships = gb.games[i].getShips(true);
    result.push(e);
  }
  return result;
}

z = function () {
  for (var n=0;n<gb.games.length;n++)
  for (var i=0;i<gb.games[n].seats.length;i++){
    var g = gb.games[n].seats[i];
    var t = JSON.parse(gss.sessions[g.id]).gb_time;
    var now = new Date().getTime();
    var z = now - t;
    var b = z > GAME_AGE;
  console.log(g.id,z,b);
  }
}
