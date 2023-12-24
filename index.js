const express = require('express');
const cookieParser = require('cookie-parser')
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const cookieParser = require('cookie-parser');
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.zolxyx7.mongodb.net/?retryWrites=true&w=majority`;

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
        const database = client.db("jobGenie");
        const category = database.collection("category");
        const myPostedJob = database.collection("myPostedJobs");

        app.post("/jwt", async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
            res
                .cookie('Access token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none'
                })
                .send({ success: true })
        })

        app.get('/category/:category', async (req, res) => {
            const data = req.params.category;
            const query = { "jobDetails.category": data };
            const result = await myPostedJob.find(query).toArray();
            res.send(result)
        })
        app.get('/jobDetails/:id', async (req, res) => {
            const jobId = req.params.id;
            const query = { _id: new ObjectId(jobId) };
            const result = await myPostedJob.findOne(query);
            res.send(result)
        })
        app.get('/update/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await myPostedJob.findOne(query);
            res.send(result)
        })
        app.get('/jobDetails/:id/placeBid', async (req, res) => {
            const jobId = req.params.id;
            console.log('getting job id', jobId)
            const query = { _id: new ObjectId(jobId) };
            console.log("job query", query)
            const result = await myPostedJob.findOne(query);
            console.log("job result", result)
            res.send(result)
        })
        app.post('/myPostedJob', async (req, res) => {
            const job = req.body;
            const result = await myPostedJob.insertOne(job);
            res.send(result)
        })
        app.put('/myPostedJob/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const job = req.body;
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    "jobDetails.category": job.jobDetails.category,
                    "jobDetails.date": job.jobDetails.date,
                    "jobDetails.description": job.jobDetails.description,
                    "jobDetails.jobTitle": job.jobDetails.jobTitle,
                    "jobDetails.email": job.jobDetails.email,
                    "jobDetails.maximumPrice": job.jobDetails.maximumPrice,
                    "jobDetails.minimumPrice": job.jobDetails.minimumPrice
                }
            }
            console.log(updateDoc)
            const result = await myPostedJob.updateOne(query, updateDoc, options);
            res.send(result)
        })
        // app.get('/myPostedJob/:email', (req, res) => {

        // })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})