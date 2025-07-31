const mongoose = require('mongoose');
const Delivery = require('./server/models/Delivery');

mongoose.connect('mongodb://localhost:27017/agrisync').then(async () => {
  const deliveries = await Delivery.find({transporter: '688bb23afdc7670f4ceb1f37'});
  console.log('All deliveries for transporter:');
  deliveries.forEach((d, i) => {
    console.log(`${i+1}. ID: ${d._id}, Status: ${d.status}, Created: ${d.createdAt}`);
  });
  
  const statusCounts = {};
  deliveries.forEach(d => {
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
  });
  
  console.log('\nStatus distribution:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`${status}: ${count}`);
  });
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
