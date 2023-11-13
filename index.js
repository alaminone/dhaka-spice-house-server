const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5001



app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ufduuil.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db("dhakaspiceDB").collection("fullmenu");
    const reviewsCollection = client.db("dhakaspiceDB").collection("reviews");
    const cartsCollection = client.db("dhakaspiceDB").collection("carts");

// menu item get
    app.get('/menu', async (req, res) => {
        const result = await menuCollection.find().toArray();
        res.send(result);
      })
// reviews item get
app.get('/reviews', async (req, res) => {
    const result = await reviewsCollection.find().toArray();
    res.send(result);
  })





  // cart oparation

  app.get('/cart', async (req, res) => {
    const result = await cartsCollection.find().toArray();
    res.send(result);
  })


  app.post('/cart' , async (req,res) =>{
    const cartitem = req.body
    const result = await cartsCollection.insertOne(cartitem)
    res.send(result)
  })



    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('Dhaka Spice House Resturent server is running')
})

app.listen(port, () => {
  console.log(`Dhaka Spice House Resturent server is running on port ${port}`)
})