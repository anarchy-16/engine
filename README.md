# engine

build

```
docker build -t a16bot1 .
```

run

```
docker run -d -p 1616:1616 --name a16bot1-container a16bot1
```

view logs 

```
docker logs -f a16bot1-container
```

---

run the bot manually

```
node bot.js
```