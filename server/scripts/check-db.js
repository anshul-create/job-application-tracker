import 'dotenv/config';
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGO_URI);

const docs = await mongoose.connection.collection('applications').find({}).toArray();

console.log('Total application records:', docs.length);
docs.forEach((d, i) => {
  console.log(`\nRecord ${i + 1}:`);
  console.log('  id       :', d._id.toString());
  console.log('  userId   :', d.userId.toString());
  console.log('  company  :', d.company);
  console.log('  role     :', d.role);
  console.log('  status   :', d.status);
  console.log('  createdAt:', d.createdAt);
  console.log('  updatedAt:', d.updatedAt);
});

await mongoose.disconnect();
