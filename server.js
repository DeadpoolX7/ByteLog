const express = require("express");
const path = require("path");
const app = express();

// Cache middleware
const cacheControl = (req, res, next) => {
    res.set('Cache-Control', 'public, max-age=31536000');
    next();
};

app.use(express.static("public", {
    maxAge: '1y',
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0');
        }
    }
}));

app.use(express.json());

app.get("/posts/:slug", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "posts", `${req.params.slug}.html`));
});

app.get("/page/:number", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "page", req.params.number, "index.html"));
});

app.get("*", (req, res) => {
    res.status(404).sendFile(__dirname + "/public/404.html");
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
