require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express()
const PORT = process.env.PORT || 5111;

// Middleware

app.use(cors({
    origin: ['http://localhost:5173', 'https://assignment-11-server-green-kappa.vercel.app', 'https://assignment-11-1f30f.web.app', 'http://localhost:4173/'],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.send("ASSIGNMENT-10 SERVER RUNNING")
})

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.db_user}:${process.env.db_pass}@cluster0.x6oak.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.jwt_Secret, {
                expiresIn: '1h'
            })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send(console.log('cookie created'))
        })
        app.get('/jwt', async (req, res) => {
            res.send("jwt /jwt working")
        })
        app.post('/logout', async (req, res) => {
            res
                .clearCookie('token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send(console.log('cookie cleared'))
        })
        app.get('/logout', async (req, res) => {
            res.send("jwt /logout working")
        })

        // TOKEN VERIFIER
        const verifyToken = (req, res, next) => {
            const token = req?.cookies?.token
            if (!token) {
                return res.status(401).send({ message: 'Unauthorization Error' })
            }
            jwt.verify(token, process.env.jwt_Secret, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorization Error' })
                }
                req.user = decoded
                next()
            })
        }

        const MarathonCollection = client.db("MarathonDB").collection('events');

        // Marathons API POST
        app.post('/marathons', async (req, res) => {
            const event = req.body;
            const result = await MarathonCollection.insertOne(event);
            res.send(result);
        });

        // Marathons API FOR Limited Home:
        app.get('/marathons/home', async (req, res) => {
            const today = new Date().toISOString();
            const cursor = MarathonCollection.find({ registrationEnd: { $gte: today } });
            const result = await cursor.limit(6).toArray();
            res.send(result)
        })

        // Marathons API FOR ALL DATA:
        app.get('/marathons', verifyToken, async (req, res) => {
            const cursor = MarathonCollection.find();
            const result = await cursor.toArray();
            console.log(req.user.email)
            res.send(result)
        })

        app.get('/marathons/email/', verifyToken, async (req, res) => {
            const { contactEmail } = req.query;
            const cursor = MarathonCollection.find({ contactEmail });
            const result = await cursor.toArray();
            if (req.user.email !== req.query.contactEmail) {
                return res.status(403).send({ message: "Forbidden access" })
            }
            res.send(result)
        })
        app.get('/marathons/all/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await MarathonCollection.findOne(query)
            res.send(result)
        })

        app.delete('/marathons/all/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await MarathonCollection.deleteOne(query)
            res.send(result)
        })
        app.put('/marathons/all/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: req.body
            };
            const result = await MarathonCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })
        app.patch('/marathons/all/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: req.body
            };
            const result = await MarathonCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        app.get('/marathons/all/sorted/ascending', verifyToken, async (req, res) => {
            try {
                const cursor = MarathonCollection.find().sort({ createdAt: 1 });
                const result = await cursor.toArray();
                res.send(result);
            }
            catch (error) {
                console.error('Error occurred:', error);
                res.status(500).send({ message: 'An error occurred while fetching campaigns.' });
            }
        });
        app.get('/marathons/all/sorted/descending', verifyToken, async (req, res) => {
            try {
                const cursor = MarathonCollection.find().sort({ createdAt: -1 });
                const result = await cursor.toArray();
                res.send(result);
            }
            catch (error) {
                console.error('Error occurred:', error);
                res.status(500).send({ message: 'An error occurred while fetching campaigns.' });
            }
        });


        const Apply = client.db("MarathonDB").collection('Applied');

        app.post('/applied', async (req, res) => {
            const applied = req.body;
            const result = await Apply.insertOne(applied);
            res.send(result);
        });

        app.get('/applied/candidate/', verifyToken, async (req, res) => {
            const { email, search } = req.query;
            const cursor = Apply.find({
                email,
                marathonTitle: { $regex: search || '', $options: 'i' },
            });
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/applied', verifyToken, async (req, res) => {
            const cursor = Apply.find();
            const result = await cursor.toArray();
            res.send(result)
        })

        app.get('/applied/all/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await Apply.findOne(query)
            res.send(result)
        })

        app.delete('/applied/all/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await Apply.deleteOne(query)
            res.send(result)
        })
        app.put('/applied/all/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: req.body
            };
            const result = await Apply.updateOne(filter, updateDoc, options)
            res.send(result)
        })


    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});