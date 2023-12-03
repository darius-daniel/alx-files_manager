import express from 'express';

const route = require('./routes');

let port = process.env.PORT;
if (!port) {
  port = 5000;
}

const app = express();
app.use(express.json());

route(app);
app.listen(port, () => {
  console.log(`Running express server on port ${port}`);
});

module.exports = app;
