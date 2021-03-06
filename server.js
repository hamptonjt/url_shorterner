'use strict';

var express = require('express');
var mongo = require('mongodb');
var bodyParser = require('body-parser')
var config = require('dotenv').config()
var dns = require('dns')
var url = require('url')

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
var MongoClient = mongo.MongoClient
var getDB = async function (MongoClient) {
  let client = await MongoClient.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology: true})
  return client.db('urlshortener')
}

app.use(cors());

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(async(req, res, next) => {
  console.log('url->', req.url)
  console.log('body->', req.body)
  console.log('params->', req.params)
  console.log('query->', req.query)
  next()
})

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

app.get("/api/shorturl", async function (req, res) {
  // fetch the original URL based on the id and redirect to the orignal URL
  const db = await getDB(MongoClient)
  const urls = db.collection('urls')
  var data = await urls.find({})
  var dataArray = await data.toArray()
  res.send(dataArray)
})

app.get("/api/shorturl/:id", async function (req, res) {
  // fetch the original URL based on the id and redirect to the orignal URL
  const db = await getDB(MongoClient)
  const id = req.params.id * 1 // force the id to be a number
  var data = await db.collection('urls').findOne({short_url: id})
  res.redirect(data.original_url)
})

app.post("/api/shorturl/new", function (req, res) {
  // store the new original URL with a new ID
  let options = {}
  options.all = true
  let new_url = new URL(req.body.url)
  let host = new_url.host
  console.log(host)
  dns.lookup(host, options, async(err, addr) => {
    console.log('err:', err)
    console.log('addr:', addr)
    if (err) {
      console.error(err)
      res.send({"error":"invalid URL"})
      return
    } else {
      const db = await getDB(MongoClient)
      const urls = db.collection('urls')
      // check if the url already exists and get max 'short_url' to increment if it doesn't exist
      var exists = await urls.find({original_url: req.body.url})
      var existsVal = await exists.toArray()
      if (existsVal.length && existsVal[0].short_url > 0) {
        const retVal = {
          orignal_url: existsVal[0].original_url,
          short_url: existsVal[0].short_url
        }
        res.send(retVal)
      } else {
        var cursor = await urls.find({})
        var docs = await cursor.toArray()
        var sortedDocs = docs.sort((a, b) => a.short_url - b.short_url)
        var val = sortedDocs[sortedDocs.length - 1].short_url
        var new_post =  {
          original_url: req.body.url,
          short_url: val+1
        }
        let retVal = {
          original_url: new_post.original_url,
          short_url: new_post.short_url
        }
        await urls.insertOne(new_post)
        res.send(retVal)
      }
    }
  })
})

app.listen(port, function () {
  console.log('Node.js listening ...');
});