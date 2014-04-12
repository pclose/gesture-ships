/*vim ts=2 sw=2
giving up and using jquery/bootstrap -pete 2014-02-21*/


//straight from Angular.js
function isElement(node) {
  return !!(node &&
    (node.nodeName  // we are a direct element
    || (node.on && node.find)));  // we have an on and find method part of jQuery API
}

tablefy=function(t,h,v){
  function doRow(tag1,tag2,e){
    var o1="<"+tag1+">",c1="<"+tag1+"/>",o2="<"+tag2+">",c2="<"+tag2+"/>";
    return o1+o2+e.join(c2+o2)+c2+o1; 
  }
  var head = $("<thead>").html(doRow("tr","th",h));
  var body = $("<tbody>").html(doRow("tr","td",v));
  return head.append(body).html();
}

genUL = function (content) {
  var result = [];
  content.forEach(function(obj){
    var ite = [];
    var keys = Object.keys(obj);
    for (var n=0; n < keys.length; n++ ){
      var v = obj[keys[n]];
      var k = keys[n];
      if (obj.hasOwnProperty(k)) { 
        ite.push(k + " : <small>" + v + "</small>");
      }
    }
    result.push("<li>"+ite.join("</li><li>")+"</li>");
  }); 

  var o = '<ul class="list-unstyled">', e = '</ul>';
  var h = "<h4> count <small>"+content.length+"</small></h4>";
  return h+o+result.join(e+o)+e;
   
}

genCollapsableDiv = function(content,ID,link) {
  var i = ID+newGuid_short();
  var l = document.createElement("a");
  l.setAttribute("data-toggle","collapse");
  l.setAttribute("data-target","#"+i);
  l.setAttribute("data-toggle","collapse");
  l.innerHTML = link;
  var t = document.createElement("div");
  t.setAttribute("class","collapse");
  t.setAttribute("id",i);
  t.innerHTML = content;
  var result = document.createElement("div");
  result.appendChild(l);
  result.appendChild(t);
  return result;
}

jTablefy=function(t,h,v){
  function doRow(tag1,tag2,e){
    var r;
    var o1="<"+tag1+">",o2="<"+tag2+">";
    r=$(o1);
    for (var i=0;i<e.length;i++) {
      //its not a jquery object
      if (isElement(e[i]))
        r.append($(o2).append($(e[i])));
      //its an array
      else if (e[i].length && e[i].forEach)
        $.each(e[i],function(k,v){r.append(v);});
      //its a jquery object
      else
        r.append($(o2).append(e[i]));
    }
    return r;
  }


  var head = $("<thead>").html(doRow("tr","th",h));
  var body = $("<tbody>");
  for (var i=0;i<v.length;i++) {
    body.append(doRow("tr","td",v[i]));
  }
  
  t.append(head);
  t.append(body);
  return t;
}

//var subt;
loadSub=function(){
  
  var result = [];
  $.ajax('/ships/sub',{contentType:"application/json"}).done(function(data){
    //each item from default sub is a game
    $.each(data, function(key,val) {
    
      /*var _seatz=[],seatz; 
      val.seats.forEach(function(v){
        _seatz.push("<li>"+[v.id,v.is_turn,v.team,v.type].join("</li><li>")+"</li>");
      }); 
      seatz="<ul>"+_seatz.join("</ul><ul>")+"</ul>";*/
       
      var container = document.createElement("div");
      container.appendChild(genCollapsableDiv(
        genUL(val.seats),val.id,"seats"));
      container.appendChild(genCollapsableDiv(
        genUL(val.ships),val.id,"ships"));
      
  
      result.push(
      [
        [$("<button id=replay_"+val.I+">#"+val.I+"</button>")
        ,$("<button id=sub_"+val.I+">sub #"+val.I+"</button>")],
        val.ent_arr_count,
        val.event_list_length,
        container
      ]);
     
  
      $(result[result.length-1])[0][0].click(
        function(v){
          game.create();
          game.cur_state=val.I;
          game.comm.cb = gameCbProxy;
          game.comm.sep="_";
          game.comm.uri="/ships/sub";
          game.comm.go(val.I+"_0",game.comm.cb);
          game.run();
      });
      $(result[result.length-1])[0][1].click(
        function(v){
          game.create();
          game.cur_state=val.I;
          game.comm.I = val.event_list_length;
          game.comm.cb = gameCbProxy;
          game.comm.sep="_";
          game.comm.uri="/ships/sub";
          game.comm.go(val.I+"_h",game.comm.cb);
          game.run();
      });
  
  
  
    });
  var subt = jTablefy(
    $("<table>" , { "class":"table", "id":"games", }),
    ["#","entities","events","detail"],
    result
    );
  var div = $("#sub")
  if (!div.length) {
    div = $("<div>");
    $('body').append(div);
    div.attr({"class":"col-md-6", "id":"sub"});
    div.css({ position:"absolute", left:600, top:10 });
  }
  div.html("");
  
  
  div.append(subt);
  });
  
  
}

var evtSource = new EventSource("/ships/ships-stream");
                                                       
evtSource.addEventListener('message', function(e) {
  var data = JSON.parse(e.data); 
  console.log(data);
}, false);                                             


var ui = game.ui;
game.stateCheck=function(){};

var t = '<button type="button" id="load_sub" data-loading-text="load..." class="btn-lg btn-primary"> load </button>'
ui.createGameBar("state","connected",'up<br />^','down<br />v',"yes",t);
//ui.createGameList("0","1","2","3","4");
$("#load_sub").click(loadSub);


