const express = require("express");
const app = express();
const port = 3000;
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.get("/posts", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  let posts = [];
  db.collection("posts")
    .orderBy("date", "desc")
    .get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        console.log(doc.id, "=>", doc.data());
        posts.push(doc.data());
      });
      res.send(posts);
    });
});

app.post("/createpost", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.send(req.headers);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
