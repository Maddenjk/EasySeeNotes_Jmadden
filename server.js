const express = require("express");
const path = require("path");

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.listen(port, () => {
    console.log(`server running on port ${port}`);
    console.log(`access at http://localhost:${port}`)
});