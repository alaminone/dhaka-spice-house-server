const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.DB_SECRET_KEY);

// console.log('0909090', process.env.DB_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ufduuil.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const menuCollection = client.db("dhakaspiceDB").collection("fullmenu");
    const reviewsCollection = client.db("dhakaspiceDB").collection("reviews");
    const cartsCollection = client.db("dhakaspiceDB").collection("carts");
    const usersCollection = client.db("dhakaspiceDB").collection("users");
    const paymentCollection = client.db("dhakaspiceDB").collection("payments");

    // mideallwaaere

    const verifyToken = (req, res, next) => {
      console.log("inside token", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbeden access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.JWT_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }

        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      console.log(email);
      const query = { email: email };
      const users = await usersCollection.findOne(query);
      console.log("55", users);
      const isAdmin = users?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden accesss" });
      }
      next();
    };

    // // jwt token api

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // user info
    // verifyToken,
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    );

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      // if(email !== req.decoded.email){
      //   return res.status(403).send({message: "unauthorizede access"})
      // }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existinguser = await usersCollection.findOne(query);
      if (existinguser) {
        return res.send({ message: "allredy exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // menu item get
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.findOne(query);
      res.send(result);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });
    app.patch("/menu/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedoc = {
        $set: {
          name: item.name,
          category: item.category,
          price: item.price,
          image: item.image,
        },
      };
      const result = await menuCollection.updateOne(query, updatedoc);
      res.send(result);
    });

    app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    // reviews item get
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // cart oparation

    // app.get('/cart', async (req, res) => {
    //   const result = await cartsCollection.find().toArray();
    //   res.send(result);
    // })

    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (req.query.email) {
        query = { email: email };
      }

      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/cart", async (req, res) => {
      const cartitem = req.body;
      const result = await cartsCollection.insertOne(cartitem);
      res.send(result);
    });

    app.delete("/cart/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    // payment system

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log("taka", amount);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payments

    app.get("/payments/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };

      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: "fobeden" });
      }

      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      // lalalala
      console.log("info", payment);
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await cartsCollection.deleteMany(query);
      res.send({ paymentResult, deleteResult });
    });

    // uuuuuuu

    // admin home matarial

  //   app.get('/adminstats', async (req, res) => {
  //     try {
  //         // Count the total number of users
  //         const users = await usersCollection.estimatedDocumentCount();
  
  //         // Count the total number of menu items
  //         const totalItem = await menuCollection.estimatedDocumentCount();
  
  //         // Count the total number of orders
  //         const totalOrder = await paymentCollection.estimatedDocumentCount();
  
  //         // Calculate the total revenue by summing the 'price' field in paymentCollection
  //         const result = await paymentCollection.aggregate([
  //             {
  //                 $group: {
  //                     _id: null,
  //                     totalRevenue: {
  //                         $sum: '$price'
  //                     }
  //                 }
  //             }
  //         ]).toArray();
  
  //         const revenue = result.length > 0 ? result[0].totalRevenue : 0;
  
  //         // Send the statistics as a JSON response
  //         res.send({
  //             users,
  //             totalItem,
  //             totalOrder,
  //             revenue
  //         });
  //     } catch (error) {
  //         console.error('Error fetching admin statistics:', error);
  //         res.status(500).send({ message: 'Internal Server Error' });
  //     }
  // });
  



    app.get('/adminstats',verifyToken,verifyAdmin, async(req,res)=>{
      const users = await usersCollection.estimatedDocumentCount();
      const totlaitem = await menuCollection.estimatedDocumentCount();
      const totalorder = await paymentCollection.estimatedDocumentCount();

      const result = await paymentCollection.aggregate([
        {
          $group:{
            _id:null,
            totalrevenue:{
              $sum:'$price'
            }
          }
        }
      ]).toArray();
      const revenue = result.length > 0 ? result[0].totalrevenue:0;

      res.send({
        users,
        totlaitem,
        totalorder,
        revenue
      })
    })

    // r=end

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Dhaka Spice House Resturent server is running");
});

app.listen(port, () => {
  console.log(`Dhaka Spice House Resturent server is running on port ${port}`);
});
