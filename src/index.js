const express = require("express");
const app = express();
const streamifier = require("streamifier");
const mongoose = require("mongoose");
const fileupload = require("express-fileupload");

app.use(express.json());
app.use(fileupload());

const url =
  "mongodb+srv://ashutosh:3r9UYyPW43Z2dYLA@cluster0.szosu.mongodb.net/resources?retryWrites=true&w=majority";

mongoose.connect(
  url,
  {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  function (err) {
    if (err) {
      console.log("Error connecting to database");
    } else {
      console.log("Connection to database successful");
    }
    app.listen(5000, function () {
      console.log("Server started at 5000");
    });
  }
);

app.get("/", function (_req, res) {
  res.send("<h1>Server</h1>");
});

app.get("/stream/:name", (req, res) => {
  const db = mongoose.connection.db;
  const range = req.headers.range;
  const name = req.params.name;
  db.collection("fs.files").findOne({ filename: name }, (err, video) => {
    if (!video) {
      res.status(404).send("No video uploaded!");
      return;
    }

    const videoSize = video.length;
    const start = Number(range.replace(/\D/g, ""));
    const end = videoSize - 1;

    const contentLength = end - start + 1;
    const headers = {
      "Content-Range": `bytes ${start}-${end}/${videoSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": "video/mp4",
    };

    // HTTP Status 206 for Partial Content
    res.writeHead(206, headers);

    const bucket = new mongoose.mongo.GridFSBucket(db);
    const downloadStream = bucket.openDownloadStreamByName(name, {
      start,
    });

    // Finally pipe video to response
    downloadStream.pipe(res);
  });
});

app.post("/upload-video/:name", function (req, res) {
  const name = req.params.name;
  const db = mongoose.connection.db;

  if (!req.files) {
    res.send("File was not found");
    return;
  }
  const file = req.files.file;

  const bucket = new mongoose.mongo.GridFSBucket(db);
  const videoUploadStream = bucket.openUploadStream(name);
  const videoReadStream = streamifier.createReadStream(file.data);
  videoReadStream.pipe(videoUploadStream);
  res.status(200).send("Done...");
});
