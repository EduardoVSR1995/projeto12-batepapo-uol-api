import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import dayjs from 'dayjs';
import { get } from 'https';
dotenv.config();

const mongoClient = new MongoClient(process.env.SERVER_URI)

let db;

mongoClient.connect().then(() => { db = mongoClient.db("participants"); });

const server = express();
server.use(cors());
server.use(express.json());

function getArreyDB(){
    const list1 = db.collection("messages").find().toArray();
    const list2 = db.collection("participants").find().toArray();
    
    return [list1,list2] ;
}


server.get("/messages", async (req,res)=>{ 
    const limit = Number(req.query.limit);
    const list = await getArreyDB()[0];
    res.send(list.slice(-limit));  

});

server.post('/participants', async (req,res)=>{    
    const name = req.body.name;
    if(name === ''){
        return res.sendStatus(422);
    }
    const list = await getArreyDB()[1];
    console.log(list);
    const check = list.filter((value)=>{return `${value.from}`.toUpperCase() === `${name}`.toUpperCase()} )
    if(check.length>0){
        return res.sendStatus(409);
    }
    const objUser = {
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: dayjs().format('HH:mm:ss')
    }
    try{
        await db.collection("participants").insertOne({name: name, lastStatus: Date.now() });
        await db.collection("messages").insertOne(objUser);
        return res.sendStatus(201);
    }catch(error){
        return res.sendStatus(422);
    }
});

server.listen(5000)