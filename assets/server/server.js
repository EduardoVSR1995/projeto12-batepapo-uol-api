import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import dayjs from 'dayjs';
import joi from 'joi';
dotenv.config();

const mongoClient = new MongoClient(process.env.SERVER_URI)

let db;

mongoClient.connect().then(() => { db = mongoClient.db("participants"); });

const server = express();
server.use(cors());
server.use(express.json());

function getArreyDB(value) {
    const list1 = db.collection("messages").find().toArray();
    const list2 = db.collection("participants").find().toArray();

    return [list1, list2];
}
async function insertObj(value) {
    await db.collection("messages").insertOne(value);
}


server.get("/participants", async (req, res) => {
    const list = await getArreyDB()[1];
    return res.send(list).status(200);
});


server.get("/messages", async (req, res) => {
    try{
    const limit = Number(req.query.limit);

    const list = await getArreyDB()[0];

    return res.send(list.slice(-limit));
}catch(error){
    return res.sendStatus(401);
}

});

server.post('/messages', (req, res) => {
    try {
        const userSchema = joi.object({ to: joi.string().required(), text: joi.string().required(), type: joi.string().valid("message", "private_message").required() })
        const validation = userSchema.validate(req.body);
        if (validation.error) {
            return res.sendStatus(422);
        }
        const objUser = {
            from: req.headers.user,
            to: req.body.to,
            text: req.body.text,
            type: req.body.type,
            time: dayjs().format('HH:mm:ss')
        }

        insertObj(objUser);
        return res.sendStatus(201)
    } catch (error) {
        return res.sendStatus(422);
    }
})


server.post('/participants', async (req, res) => {
    try {
        const name = req.body.name;

        const userSchema = joi.object({ name: joi.string().required() })

        const validation = userSchema.validate(req.body, { abortEarly: true });

        if (validation.error) {
            return res.sendStatus(422);
        }

        const list = await getArreyDB()[1];
        const check = list.filter((value) => `${value.name}`.toUpperCase() === `${name}`.toUpperCase())

        if (check.length > 0) {
            return res.sendStatus(409);
        }

        const objUser = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        }


        await db.collection("participants").insertOne({ name: name, lastStatus: Date.now() });

        insertObj(objUser);

        return res.sendStatus(201);

    } catch (error) {
        return res.sendStatus(422);
    }

});

server.listen(5000)