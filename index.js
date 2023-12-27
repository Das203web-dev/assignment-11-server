const express = require('express');
var jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.zolxyx7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: "unauthorized access" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'access denied' })
        }
        console.log("verifying token successful", decoded);

        req.user = decoded;
        console.log("user decoded", decoded)
        next()
    })
}
const logger = (req, res, next) => {
    console.log("log info", req.method, req.url);
    next()
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const database = client.db("jobGenie");
        const category = database.collection("category");
        const myPostedJob = database.collection("myPostedJobs");
        const bidCollection = database.collection("bidCollection");

        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '24h' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            })
                .send({ success: true })
        });
        app.post("/logout", (req, res) => {
            const user = req.body;
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        });
        app.get('/category/:category', async (req, res) => {
            const data = req.params.category;
            const query = { "jobDetails.category": data };
            const result = await myPostedJob.find(query).toArray();
            res.send(result)
        });
        app.get('/jobDetails/:id', verifyToken, async (req, res) => {
            const jobId = req.params.id;
            const query = { _id: new ObjectId(jobId) };
            const result = await myPostedJob.findOne(query);
            res.send(result)
        });
        app.get('/update/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await myPostedJob.findOne(query);
            res.send(result)
        });
        app.get('/jobDetails/:id/placeBid', async (req, res) => {
            const jobId = req.params.id;
            const query = { _id: new ObjectId(jobId) };
            const result = await myPostedJob.findOne(query);
            res.send(result)
        });
        app.post('/myPostedJob', logger, async (req, res) => {
            const job = req.body;
            const result = await myPostedJob.insertOne(job);
            res.send(result)
        });
        app.put('/myPostedJob/:id', verifyToken, async (req, res) => {
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
            const result = await myPostedJob.updateOne(query, updateDoc, options);
            res.send(result)
        });
        app.get('/myPostedJob', logger, verifyToken, async (req, res) => {
            let query = {};
            if (req.query?.email !== req.user?.email) {
                return res.status(401).send({ message: "Forbidden for this user" })
            }
            if (req.query?.email) {
                query = { "jobDetails.email": req.query.email }
            }
            const result = await myPostedJob.find(query).toArray();
            res.send(result)
        });
        app.post("/myBids", verifyToken, async (req, res) => {
            const jobBody = req.body;
            const result = await bidCollection.insertOne(jobBody);
            res.send(result)
        })
        app.get('/myBids', logger, verifyToken, async (req, res) => {
            let query = {};
            if (req?.user?.email !== req?.query?.email) {
                return res.status(401).send({ message: "Access deanied" })
            }
            else if (req?.query?.email) {
                query = { email: req.query.email }
            }
            const result = await bidCollection.find(query).toArray();
            res.send(result)
        })
        app.get('/bidRequest', logger, verifyToken, async (req, res) => {
            let query = {};
            if (req.query?.email !== req.user?.email) {
                return res.status(401).send({ message: "Access Denied from bid request" })
            }
            if (req.query?.email) {
                query = { buyerEmail: req.query.email }
            }
            const result = await bidCollection.find(query).toArray();
            res.send(result)

        })
        app.put("/bidRequest/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const bidJob = req.body;
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: bidJob.status
                }
            }
            const result = await bidCollection.updateOne(query, updateDoc, options);
            res.send(result)
        })

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