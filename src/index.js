const express = require("express");
const app = express();
const streamifier = require("streamifier");
const mongoose = require("mongoose");
const fileupload = require("express-fileupload");

// JSON Middleware
app.use(express.json());

// use fileupload middleware for `req.files`
app.use(fileupload());

// Database URI string
const URI =
  "mongodb+srv://ashutosh:3r9UYyPW43Z2dYLA@cluster0.szosu.mongodb.net/resources?retryWrites=true&w=majority";

// Connect to database
mongoose.connect(
  URI,
  {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  // Error handler
  function (err) {
    if (err) {
      console.log("Error connecting to database");
    } else {
      console.log("Connection to database successful");
    }
    // Listening on port
    app.listen(process.env.PORT || 5000, function () {
      console.log("Server started at 5000");
    });
  }
);

// root route
app.get("/", function (_req, res) {
  res.send("<h1>Server</h1>");
});

// stream route
app.get("/stream/:name", (req, res) => {
  const db = mongoose.connection.db;
  const range = req.headers.range;
  const name = req.params.name;

  db.collection("fs.files").findOne({ filename: name }, (err, video) => {
    if (!err) {
      if (!video) {
        res.status(404).send("No video uploaded!");
        return;
      }

      const videoSize = video.length;
      const start = Number(range.replace(/\D/g, ""));
      const end = videoSize - 1;

      const contentLength = end - start + 1;

      // prepare headers
      const headers = {
        "Content-Range": `bytes ${start}-${end}/${videoSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
      };

      // set headers
      res.writeHead(206, headers);

      // get bucket ans start downloading stream
      const bucket = new mongoose.mongo.GridFSBucket(db);
      const downloadStream = bucket.openDownloadStreamByName(name, {
        start,
      });

      // Stream the video
      downloadStream.pipe(res);
    } else {
      res.status(500).send(err);
    }
  });
});

// upload route
app.post("/upload-video/:name", function (req, res) {
  const name = req.params.name;
  const db = mongoose.connection.db;

  if (!req.files) {
    res.send("File was not found");
    return;
  }
  const file = req.files.file;

  // Upload file to GridFS
  // - Create a GridFS bucket
  const bucket = new mongoose.mongo.GridFSBucket(db);

  // - Create upload stream
  const videoUploadStream = bucket.openUploadStream(name);

  // - Create read stream
  const videoReadStream = streamifier.createReadStream(file.data);

  videoReadStream.pipe(videoUploadStream);
  res.status(200).send("Done...");
});
