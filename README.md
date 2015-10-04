This was built in HEROKU, so you may see some remants of that.

index.js is the main ndoe application, with the web API

Here is how you search, but it doesn't return the search result--it just logs it on the server:
curl "https://mycoolherokuapp.herokuapp.com/search?searchTerm=frank"

It stores a task list in redis, as well as populates a lightweight search engine.


I wrote the search engine (SubstringSearchEngine) as a work thing in java, but I liked it so much, that I wanted my own copy, to learn a bit about JS, Node, and stuff, so I built most of a searchable task list.

I'm putting this up in it's current state so I can share it with the world.  There is some example code of some things I had trouble finding, and just generally doing, as a JS noob.