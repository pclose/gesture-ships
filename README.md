# ships!
personal project to build a browser based game
learning both javascript and game design
it has been a lot of fun so far

- multiplayer
- works in most browsers that i can test
- more to come...

install dependency:
```
  $ npm install
```

start it up with:
```
  $ node js/esrv.js
```

point your browser to the url and voilà!

should run nicely behind reverse proxy too 
-eg apache config:
```
  # Define the balancer
  <Proxy balancer://ships>
    BalancerMember http://localhost:1337
  </Proxy>
  # Forward requests to /ships to the balancer
  Redirect /g /ships/
  <Location /ships>
    ProxyPass balancer://ships
  </Location>
```
