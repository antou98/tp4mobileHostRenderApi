var express = require("express");
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

var mysql = require('mysql');

const bcrypt = require('bcrypt');

const session = require('express-session');

const cors = require("cors");


app.use(
    cors({
      origin: ["http://localhost:3000"],
      methods: 'GET,POST,PUT,DELETE', 
      //allowedHeaders: 'Content-Type,Authorization',
      credentials: true,
    })
);
  
// gestion de session
const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
      secret: "thisismysecrctekek34321",
      saveUninitialized:true,
      resave: false ,
      cookie:{
        maxAge:oneDay
      }
}));
  

//pool de connection permet d'avoir plusieurs connections et les réutiliser
var connPool = mysql.createPool({
      connectionLimit: 15,
      database: 'tp4_mobile',
      host: "mysql-1ae6b180-antou98-d35e.aivencloud.com",
      user: "user-formatif",
      password: "AVNS_HOMMmMbEe4mV3SMTm_n",
      port : "20509"
});

//connexion utilisateur
app.get("/connexion",(req,res)=>{
    let requete = "select * from tp4_mobile.client where courriel = ? and password = ? limit 1"
    console.log(req.query.email+ ""+req.query.password)
   
    //console.log(req.query.id)
    connPool.query(requete, [req.query.email,req.query.password],(err,data)=>{
        if(err){
            console.log("select user by id erreur : "+err);
            res.status(400).send("sql error:"+err).end();
        }

        if(data.length >0){
        console.log(data[0].id)
        var userData = data[0]
        req.session.id_bd_user = data[0].id;
        req.session.save((err)=>{
            if(err){
                console.log("session save error:"+err);
                res.status(400).json({connectionData:false}).end();
            }
            
            //console.log("session created :");
            //console.log(req.session);
            //console.log(req.sessionStore)
            console.log("session saved connexion");
            res.status(200).json({connectionData:{connected:true},userData}).end();

        })}
        else{
            console.log("bad password and email combination");
            res.status(400).json({connectionData:false}).end();
        }

    });

})

app.post('/create-client', (req, res) => {
    const {nom, courriel, adresse, telephone, password, points} = req.body;

    //creation client
    const sql = 'INSERT INTO tp4_mobile.client (nom, courriel, adresse, telephone, password, points) VALUES( ? , ? , ? , ? , ? , ? )';
    connPool.query(sql, [nom, courriel, adresse, telephone, password, points], (err, result) => {
        if (err) {
            console.error('Error creating client :', err);
            res.status(500).json({retMessage:{ message: 'Internal Server Error' }});
        } else {
            console.log('Client créé :', result);
            res.status(201).json({retMessage:{ message: 'Client created' }});
        }
    });
});

//update les points d'un client
app.post("/updatePoints", (req, res) => {
    const {points, id} = req.body
    var requeteUpdatePoints = "UPDATE tp4_mobile.client SET points TO ? WHERE id = ?";
    console.log(req.body);

    connPool.query(requeteUpdatePoints, [points, id], (err, result) => {
        if (err) {
            console.error('Error updating client'+id+' points :', err);
            res.status(500).json({retMessage:{ message: 'Internal Server Error' }});
        } else {
            console.log('Client point updated :', result);
            res.status(201).json({retMessage:{ message: 'Client point created' }});
        }
    })
})

//retourne tous les pizzas
app.get("/pizzas",(req,res)=>{
    let requete = "select * from tp4_mobile.pizza";
    connPool.query(requete,[],(err,data)=>{
        if(err){
            console.log("select all pizzas erreur : "+err);
            res.status(400).send("sql error:"+err).end();
        }

        console.log("tous les pizzas envoyés");
        res.status(200).json({pizzas:data}).end();

    })
})

app.get("/test",(req,res)=>{
    const today = new Date();
    console.log(today.getFullYear()+"-"+today.getMonth()+"-"+today.getDay())
    res.status(200).send("test").end();
})

//creer commande et les commande_pizza associés - req.body.arrayPizzaIds prend les ids pizzas en array pour associé à la commande 
app.post("/createCommande",(req,res)=>{

    const today = new Date();
    const dateNow = today.getFullYear()+"-"+today.getMonth()+"-"+today.getDay();
    var requeteCreateCommande = "INSERT INTO tp4_mobile.commande (date_commande,id_user) VALUES ("+"\'"+dateNow+"\'"+", ?)"

    console.log(req.body)
    //req.session.id_bd_user !== undefined
    if(req.body.id_bd_user !== undefined){
        let userId = req.body.id_bd_user
        console.log(userId)
        connPool.query(requeteCreateCommande,[userId],(err,result,fields)=>{
            if(err){
                console.log("create commande erreur"+err);
                res.status(400).send("create commande erreur"+err).end();
            }

            console.log("commande created id = "+result.insertId);
            
            var requeteCreatePizzaCommande = "INSERT INTO tp4_mobile.pizza_commande (pizza_id, commande_id) values (?,?)"
            var arrayPizzaIds = req.body.arrayPizzaIds;

            for(var id of arrayPizzaIds){
                console.log(result.insertId);
                console.log(id);
                connPool.query(requeteCreatePizzaCommande,[id,result.insertId],(err,result,fields)=>{
                    if(err){
                        console.log("error insertion pizza_commande"+err);
                        return;
                        //res.status(400).send("error").end();
                    }
                    console.log("pizza_commande id : "+result.insertId +" as been inserted");
                })
            }
            res.status(200).send({ret:"commande créé"}).end();
        })
    }
    else{
        res.status(500).send("internal server error:"+"  probably does not have a id_bd_use in session = req.session.id_bd_user === undefined").end();
    }
})




app.listen(5000 ,()=>{
    console.log("server listening on port 5000")
});
