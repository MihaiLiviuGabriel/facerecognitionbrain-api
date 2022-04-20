const express =require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const Clarifai = require('clarifai');

const api = new Clarifai.App({
  apiKey: '487bf681eb4d4e9cb497081dbaa5411d'
});


const db = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    port : 5432,
    user : 'postgres',
    password : 'databasetest',
    database : 'smart-brain'
  }
});

	 // db.select('*').from('users').then(data => {
	 // 	console.log(data);
	 // });
	// app.get('/', (req,res) => {
	// 	...
	// })

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.post('/imageurl', (req, res) => {
 	api.models.predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
 	.then(data => {
 		res.json(data);
 	})
 	.catch(err => res.ststus(400).json('unable to work with api'));
})

app.post('/signin', (req,res) =>{
	const {email, password} = req.body;
	db.select('email','hash').from('login')
	.where('email','=', email)
	.then(data => {
		const isValid = bcrypt.compareSync(password, data[0].hash);
		if(isValid){
			db.select('*').from('users')
			.where('email', '=', email)
			.then(user => {
					res.json(user[0]);
			})	
		} else {
			res.status(400).json('unable to get user')
		}
	})
	.catch(err => res.status(400).json('wrong credentials'));
})

app.post('/register', (req,res) => {
	const {email, name, password} = req.body;
	const hash = bcrypt.hashSync(password);
	if(!email || !name || !password) {
		return res.status(400).json('incorrect form submision');
	} 
	db.transaction(trx => {
		trx.insert({
			hash: hash,
			email: email
		})
		.into('login').returning('email').then(loginEmail => {
			trx('users').returning('*').insert({
				email:loginEmail[0].email,
				name: name,
				joined: new Date()
			}).then(user => {
					res.json(user[0]);
		})
			}).then(trx.commit).catch(trx.rollback)
		})
		.catch(err => res.status(400).json("unable to register"));

})

app.get('/profile/:id', (req, res) => {
	const {id} = req.params;
	db.select('*').from('users').where({id})
		.then(user => {
			if(user.length){
				res.json(user[0])
			} else {
				res.status(400).json('unable to display user')
			}
		})
})

app.put('/image', (req,res) => {
	const {id} = req.body;
	db('users').where('id', '=', id)
		.increment('entries', 1)
		.returning('entries')
		.then(entries => {
			res.json(entries[0].entries);
		})
		.catch(err => res.status(400).json('unable to get entries'))
})

app.listen(process.env.PORT || 3000, () =>{
	console.log(`app is running on port ${process.env.PORT}`);
})


// / --> res = this is working
// /signin --> POST = success/fail
// /register --> POST = user object
// /profile/:id --> GET = user
// /image --> PUT --> user //PUT IS UPTADEING THE OBJECT