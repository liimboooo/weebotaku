const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = require('./app');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 AnimeWch API running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
});
