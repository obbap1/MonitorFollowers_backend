//Apollo server

const {ApolloServer, gql} = require('apollo-server')
const Imap = require('imap')
const simpleParser = require('mailparser').simpleParser

let graphPoints = []

//Function to connect to IMAP
async function connectToImap(user,password) {
	
	let resolveGraph = new Promise((resolve,reject)=>{
		const imap = new Imap({
			user: user,
			password: password,
			host: 'imap.gmail.com',
			port: 993,
			tls: true
		})
  
		function openInbox(cb) {
			imap.openBox('INBOX', true, cb)
		}
	
		imap.once('ready', function() {
			openInbox(function(err, box) {
				if (err) throw new Error('Invalid Login. Please Try again.')
				
				imap.search([['FROM',
					'noreply@medium.com',
				]], async (err,result) =>{
					var f = await imap.fetch(result, {
						bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)'],
						struct: true
					})
			
					f.on('message', function(msg, seqno) {
						msg.on('body', function(stream, info) {
							let buffer = ''
						
							stream.on('data', function(chunk) {
								buffer += chunk.toString('utf8')
								simpleParser(buffer)
									.then(parsed => {
										if(parsed.subject && parsed.subject.includes('started following you')){

											let numberOfFollowers = parsed.subject.split(/,|and/).filter(v=>v!=' ').length

											if(/\d others/.test(parsed.subject)) {
												let otherNumber = /\d/.exec(parsed.subject)
												numberOfFollowers += (Number(otherNumber[0]) - 1)
											}
											
											let dataPoint = {
												numberOfFollowers: numberOfFollowers,
												date: parsed.date
											}
											graphPoints.push(dataPoint)
										}
									})
									.catch(err =>{throw err})	
							})
						})
					
					})
					f.once('error', function(err) {
						reject(new Error('Fetching results failed'))
					})
					f.once('end', function() {
						console.log('Done fetching all messages!')
						imap.end()	
					})
				})
			})
		})
	
		imap.once('error', function(err) {
			reject(new Error('Failed Imap connection'))
		})
  
		imap.once('end', function() {
			console.log('Connection ended')
			resolve(graphPoints)
		})
  
		imap.connect()
	})

	return await resolveGraph
	
}

const typeDefs = gql`

	scalar Date

    # Make a type user
    type User {
        email: String!
        password: String!
        data: [Graph!]
	}
	
	type Graph {
		numberOfFollowers: Int!
		date: Date!
	}

    type Query {
        users: [User]
    }

    type Mutation {
        imapMutation(email: String!, password: String!): User!
    }
`
const resolvers = {
	Mutation:{
		imapMutation: (parent, args) => {
			
			graphPoints = []

			return connectToImap(args.email,args.password)
				.then(response =>{
					const user = {
						email: args.email,
						data: response
					}
					
					return user
				})
				.catch(error =>{
					return new Error('Invalid Credentials. Please Try again.')
				})
		}
	}
}



const server = new ApolloServer({typeDefs, resolvers})

server.listen({port: process.env.PORT || 4000}).then(({url})=>{
	console.log(`Server started at ${url}, \n Unai Way ✈️ ✈️ ✈️` )
})
