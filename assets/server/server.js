import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import dayjs from 'dayjs';
import joi from 'joi';
import  { strict as assert }  from  "assert" ;
import  { stripHtml }  from  "string-strip-html" ;

dotenv.config();

const mongoClient = new MongoClient(process.env.SERVER_URI)

let db;
let time;

mongoClient.connect().then(() => { db = mongoClient.db("batepapoUou"); });

const server = express();
server.use(cors());
server.use(express.json());



async function timeNowDel() {
    time = Date.now();
    try {
        const list1 = await getArreyDB()[1];
        const list2 = list1.filter((value) => Number(Date.now() - value.lastStatus) > 10000);
        if (list2.length > 0) {
            list2.map(async (value) => {
                await insertObj({
                    from: value.name,
                    to: "Todos",
                    text: 'sai da sala...',
                    type: 'status',
                    time: dayjs().format('HH:mm:ss')
                });
                await db.collection("participants").deleteOne(value);
                return
            })
        };
    } catch (error) {
        console.log("ola")
    }
}

function getArreyDB(value) {
    const list1 = db.collection("messages").find(value).toArray();
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
    try {

        const limit = Number(req.query.limit);

        const list1 = await getArreyDB()[0];

        const list2 = list1.filter((value) => value.to === "Todos" || value.to === req.headers.user || value.from === req.headers.user)

        return res.send(list2.slice(-limit));
    }
    catch (error) {
        return res.sendStatus(401);
    }

});

server.post("/status", async (req, res) => {
    setInterval(timeNowDel, 15000);
    try {
        await db.collection("participants").updateOne({ name: req.headers.user }, { $set: { lastStatus: Date.now() } })
        return res.sendStatus(200)
    } catch (error) {
        return res.sendStatus(404)
    }
})

server.post('/messages', (req, res) => {
    try {
        const texto = req.body.text;
        assert.equal(stripHtml( `${texto}`).result, texto);
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
        const name = (req.body.name).trim();

        assert.equal(stripHtml( `${name}`).result, name);

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

        const { _id } = await db.collection("participants").findOne({ name: name });

        return res.send(_id).status(201);

    } catch (error) {
        return res.sendStatus(422);
    }

});

server.listen(5000)